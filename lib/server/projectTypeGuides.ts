import 'server-only';
import { randomUUID } from 'node:crypto';
import { FieldValue, type Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore, getAdminStorage } from '@/lib/firebase/admin';
import { extractPdfTextWithPages } from '@/lib/server/extractPdfText';
import { chunkGuidePages } from '@/lib/server/guideChunker';
import { embedTexts, embedQuery } from '@/lib/ai/embeddings';
import {
  EMBEDDING_DIMENSIONS,
  type EmbeddingModel,
  type GuideChunkHit,
  type ProjectTypeGuide,
  projectTypeGuideSchema,
  guideChunkSchema,
} from '@/types/projectTypeGuide';

const GUIDES_COLLECTION = 'projectTypeGuides';
const CHUNKS_SUBCOLLECTION = 'chunks';

const DEFAULT_EMBEDDING_MODEL: EmbeddingModel = 'text-multilingual-embedding-002';

interface UploadGuideArgs {
  projectTypeId: string;
  uploadedByUid: string;
  /** Display label, e.g. "Horizon Europe Pillar 2 — Cluster 4 (2026)". */
  title: string;
  /** Original filename for the admin UI. */
  originalFilename: string;
  /** PDF bytes. Caller is responsible for the size cap (existing 15MB). */
  pdfBuffer: Buffer;
  /** When true, this guide is also marked active for its project type. */
  setAsActive?: boolean;
}

/**
 * Full ingestion pipeline:
 *   1. Persist the original PDF to Storage (gs://.../projectTypes/{id}/guides/{guideId}.pdf)
 *   2. Extract per-page text
 *   3. Chunk into ~750-token retrieval units with heading + page metadata
 *   4. Batch-embed via Vertex AI multilingual embeddings
 *   5. Persist guide doc + chunk subcollection (each chunk carries a
 *      Firestore VectorValue for findNearest queries)
 *   6. Optionally flip the active flag (transactionally — only one active
 *      guide per project type)
 *
 * Returns the persisted guide doc. On any failure after the Storage upload
 * the guide doc is left in `status: 'failed'` so the admin UI can surface
 * the error and offer retry/delete.
 */
export async function uploadGuide(
  args: UploadGuideArgs,
): Promise<ProjectTypeGuide> {
  const db = getAdminFirestore();
  const storage = getAdminStorage();

  const guideId = randomUUID();
  const storagePath = `projectTypes/${args.projectTypeId}/guides/${guideId}.pdf`;

  // Step 1 — upload the source PDF first so we always have it for retry.
  const bucket = storage.bucket();
  const file = bucket.file(storagePath);
  await file.save(args.pdfBuffer, {
    contentType: 'application/pdf',
    resumable: false,
    metadata: {
      metadata: {
        projectTypeId: args.projectTypeId,
        uploadedByUid: args.uploadedByUid,
        title: args.title,
      },
    },
  });

  // Step 2 — write the guide doc in 'processing' state up front so the
  // admin UI shows the upload immediately even while embeddings run.
  const guideRef = db.collection(GUIDES_COLLECTION).doc(guideId);
  const baseDoc = {
    projectTypeId: args.projectTypeId,
    title: args.title,
    storagePath: `gs://${bucket.name}/${storagePath}`,
    originalFilename: args.originalFilename,
    pageCount: 0,
    chunkCount: 0,
    embeddingModel: DEFAULT_EMBEDDING_MODEL,
    embeddingDimensions: EMBEDDING_DIMENSIONS,
    status: 'processing' as const,
    statusMessage: null,
    active: false,
    uploadedByUid: args.uploadedByUid,
    uploadedAt: FieldValue.serverTimestamp(),
    processedAt: null,
  };
  await guideRef.set(baseDoc);

  try {
    // Step 3 — extract + chunk + embed.
    const parsed = await extractPdfTextWithPages(args.pdfBuffer);
    if (parsed.pages.length === 0) {
      throw new Error('PDF parsed to zero pages — file may be corrupt or image-only.');
    }

    const chunks = chunkGuidePages(parsed.pages);
    if (chunks.length === 0) {
      throw new Error('Chunker produced zero chunks — guide appears to be empty.');
    }

    const vectors = await embedTexts(
      chunks.map((c) => c.text),
      { taskType: 'RETRIEVAL_DOCUMENT' },
    );

    // Step 4 — persist chunks. Chunked writes (max 500 ops per batch).
    let written = 0;
    for (let i = 0; i < chunks.length; i += 400) {
      const batch = db.batch();
      for (let j = i; j < Math.min(i + 400, chunks.length); j++) {
        const chunk = chunks[j];
        const vector = vectors[j];
        const chunkRef = guideRef
          .collection(CHUNKS_SUBCOLLECTION)
          .doc(String(chunk.ordinal).padStart(6, '0'));
        batch.set(chunkRef, {
          guideId,
          projectTypeId: args.projectTypeId,
          ordinal: chunk.ordinal,
          pageStart: chunk.pageStart,
          pageEnd: chunk.pageEnd,
          headingPath: chunk.headingPath,
          text: chunk.text,
          approxTokens: chunk.approxTokens,
          embedding: FieldValue.vector(vector),
        });
      }
      await batch.commit();
      written += Math.min(400, chunks.length - i);
    }

    // Step 5 — finalize guide doc.
    await guideRef.update({
      pageCount: parsed.total || parsed.pages.length,
      chunkCount: written,
      status: 'ready',
      processedAt: FieldValue.serverTimestamp(),
    });

    if (args.setAsActive) {
      await setActiveGuide(args.projectTypeId, guideId);
    }

    const fresh = await guideRef.get();
    return toGuide(fresh.data() as DocShape, fresh.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await guideRef
      .update({
        status: 'failed',
        statusMessage: message.slice(0, 500),
        processedAt: FieldValue.serverTimestamp(),
      })
      .catch(() => {
        // best-effort; the guide doc is already in processing state
      });
    throw err;
  }
}

/**
 * Atomically marks one guide as active for its project type and clears the
 * flag on every other guide for the same type. Throws if the target guide
 * isn't ready or doesn't exist.
 */
export async function setActiveGuide(
  projectTypeId: string,
  guideId: string,
): Promise<void> {
  const db = getAdminFirestore();
  const targetRef = db.collection(GUIDES_COLLECTION).doc(guideId);

  await db.runTransaction(async (tx) => {
    const target = await tx.get(targetRef);
    if (!target.exists) {
      throw new Error(`Guide ${guideId} not found.`);
    }
    const data = target.data() as DocShape;
    if (data.projectTypeId !== projectTypeId) {
      throw new Error(
        `Guide ${guideId} belongs to a different project type.`,
      );
    }
    if (data.status !== 'ready') {
      throw new Error(
        `Guide ${guideId} is not ready (status: ${data.status}).`,
      );
    }

    // Demote every other active guide for this project type. We read INSIDE
    // the transaction so a concurrent activation can't slip through.
    const others = await tx.get(
      db
        .collection(GUIDES_COLLECTION)
        .where('projectTypeId', '==', projectTypeId)
        .where('active', '==', true),
    );
    for (const other of others.docs) {
      if (other.id !== guideId) {
        tx.update(other.ref, { active: false });
      }
    }
    tx.update(targetRef, { active: true });
  });
}

export async function getActiveGuideId(
  projectTypeId: string,
): Promise<string | null> {
  const snap = await getAdminFirestore()
    .collection(GUIDES_COLLECTION)
    .where('projectTypeId', '==', projectTypeId)
    .where('active', '==', true)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0].id;
}

export async function getGuide(guideId: string): Promise<ProjectTypeGuide | null> {
  const snap = await getAdminFirestore()
    .collection(GUIDES_COLLECTION)
    .doc(guideId)
    .get();
  if (!snap.exists) return null;
  return toGuide(snap.data() as DocShape, snap.id);
}

export async function listGuidesForType(
  projectTypeId: string,
): Promise<ProjectTypeGuide[]> {
  const snap = await getAdminFirestore()
    .collection(GUIDES_COLLECTION)
    .where('projectTypeId', '==', projectTypeId)
    .orderBy('uploadedAt', 'desc')
    .get();
  return snap.docs.map((d) => toGuide(d.data() as DocShape, d.id));
}

/**
 * Deletes a guide, all its chunks, and the underlying PDF in Storage.
 * No-op if the guide doesn't exist.
 */
export async function deleteGuide(guideId: string): Promise<void> {
  const db = getAdminFirestore();
  const storage = getAdminStorage();
  const guideRef = db.collection(GUIDES_COLLECTION).doc(guideId);
  const snap = await guideRef.get();
  if (!snap.exists) return;
  const data = snap.data() as DocShape;

  // Delete chunks in batches.
  const chunksRef = guideRef.collection(CHUNKS_SUBCOLLECTION);
  while (true) {
    const page = await chunksRef.limit(400).get();
    if (page.empty) break;
    const batch = db.batch();
    page.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    if (page.size < 400) break;
  }

  await guideRef.delete();

  // Best-effort PDF cleanup.
  if (data.storagePath) {
    const path = data.storagePath.replace(/^gs:\/\/[^/]+\//, '');
    await storage
      .bucket()
      .file(path)
      .delete()
      .catch(() => {
        // file may have been removed by lifecycle rules; ignore
      });
  }
}

interface FindRelevantChunksArgs {
  guideId: string;
  /** The query text — usually a section's title + description + criteria. */
  query: string;
  /** Max chunks to return. Defaults to 5. */
  limit?: number;
}

/**
 * Embeds the query and returns the top-K most similar chunks from the given
 * guide via Firestore vector search (cosine distance).
 *
 * Distance values: 0 = identical, 2 = opposite. Practical cutoff for "this
 * is actually relevant" is around 0.4-0.6 depending on the corpus.
 */
export async function findRelevantChunks(
  args: FindRelevantChunksArgs,
): Promise<GuideChunkHit[]> {
  const db = getAdminFirestore();
  const limit = args.limit ?? 5;

  const queryVector = await embedQuery(args.query);

  const result = await db
    .collection(GUIDES_COLLECTION)
    .doc(args.guideId)
    .collection(CHUNKS_SUBCOLLECTION)
    .findNearest({
      vectorField: 'embedding',
      queryVector,
      limit,
      distanceMeasure: 'COSINE',
      distanceResultField: '_distance',
    })
    .get();

  return result.docs.map((d) => {
    const raw = d.data() as ChunkDocShape & { _distance?: number };
    return {
      chunkId: d.id,
      guideId: raw.guideId,
      ordinal: raw.ordinal,
      pageStart: raw.pageStart,
      pageEnd: raw.pageEnd,
      headingPath: raw.headingPath ?? [],
      text: raw.text,
      distance: raw._distance ?? Number.NaN,
    };
  });
}

// ---- Internal shapes + converters ------------------------------------------

interface DocShape {
  projectTypeId: string;
  title: string;
  storagePath: string;
  originalFilename: string;
  pageCount: number;
  chunkCount: number;
  embeddingModel: EmbeddingModel;
  embeddingDimensions: number;
  status: 'processing' | 'ready' | 'failed';
  statusMessage?: string | null;
  active: boolean;
  uploadedByUid: string;
  uploadedAt?: Timestamp;
  processedAt?: Timestamp | null;
}

interface ChunkDocShape {
  guideId: string;
  projectTypeId: string;
  ordinal: number;
  pageStart: number;
  pageEnd: number;
  headingPath?: string[];
  text: string;
  approxTokens: number;
}

function toGuide(raw: DocShape, id: string): ProjectTypeGuide {
  // safeParse drops Firestore Timestamps cleanly via the union schema.
  const parsed = projectTypeGuideSchema.safeParse({
    id,
    projectTypeId: raw.projectTypeId,
    title: raw.title,
    storagePath: raw.storagePath,
    originalFilename: raw.originalFilename,
    pageCount: raw.pageCount,
    chunkCount: raw.chunkCount,
    embeddingModel: raw.embeddingModel,
    embeddingDimensions: raw.embeddingDimensions,
    status: raw.status,
    statusMessage: raw.statusMessage ?? null,
    active: !!raw.active,
    uploadedByUid: raw.uploadedByUid,
    uploadedAt: raw.uploadedAt?.toDate?.().toISOString(),
    processedAt: raw.processedAt?.toDate?.().toISOString() ?? null,
  });
  if (!parsed.success) {
    throw new Error(
      `projectTypeGuide ${id} failed schema validation: ${parsed.error.message}`,
    );
  }
  return parsed.data;
}

// Re-export so callers don't have to reach into types/.
export { guideChunkSchema };
