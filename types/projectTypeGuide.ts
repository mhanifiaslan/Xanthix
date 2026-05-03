import { z } from 'zod';

/**
 * Reference documents (program guides, RFPs, evaluation rubrics) attached to
 * a project type. Stored once, embedded once, then queried during section
 * generation so the AI can ground its output in the program's own language
 * and cite sources by page number.
 *
 * One project type may have multiple guide *versions* over time (admin
 * re-uploads when the funder publishes a new call). Only one is `active`
 * at any moment — projects snapshot the active guideId at creation and keep
 * using it for their lifetime, so re-uploading mid-flight is safe.
 */

export const EMBEDDING_MODELS = [
  // Vertex AI multilingual model — 768 dims, GA in us-central1 + europe-west4.
  // Picked over text-embedding-005 because grant docs span TR/EN/ES.
  'text-multilingual-embedding-002',
] as const;
export type EmbeddingModel = (typeof EMBEDDING_MODELS)[number];

export const EMBEDDING_DIMENSIONS = 768;

export const guideChunkSchema = z.object({
  // Stored on the chunk for collection-group queries; redundant with parent.
  guideId: z.string().min(1),
  projectTypeId: z.string().min(1),
  // Position in the original document, 0-indexed.
  ordinal: z.number().int().nonnegative(),
  // 1-indexed page numbers (matches how reviewers cite "s.42" in TR/EN guides).
  pageStart: z.number().int().positive(),
  pageEnd: z.number().int().positive(),
  // Heading trail leading to this chunk, e.g. ["3 Excellence", "3.2 Methodology"].
  // Empty when the document has no detectable heading structure.
  headingPath: z.array(z.string()).default([]),
  // Plain text of the chunk. Length kept under ~3000 chars (~750 tokens).
  text: z.string().min(1),
  // Approximate token count, used for budgeting at query time.
  approxTokens: z.number().int().positive(),
  // The embedding lives on the doc as a Firestore VectorValue. We don't
  // model it in the zod schema because VectorValue isn't serializable —
  // callers handle it explicitly when reading/writing.
});
export type GuideChunk = z.infer<typeof guideChunkSchema>;

export const guideStatuses = ['processing', 'ready', 'failed'] as const;
export type GuideStatus = (typeof guideStatuses)[number];

export const projectTypeGuideSchema = z.object({
  id: z.string().min(1),
  projectTypeId: z.string().min(1),
  // Display label admins set when uploading ("Horizon Europe 2025-2027 Call").
  title: z.string().min(1),
  // gs:// path inside the default Storage bucket.
  storagePath: z.string().min(1),
  // Original filename, kept for the admin UI.
  originalFilename: z.string().min(1),
  pageCount: z.number().int().nonnegative(),
  chunkCount: z.number().int().nonnegative(),
  embeddingModel: z.enum(EMBEDDING_MODELS),
  embeddingDimensions: z.number().int().positive(),
  status: z.enum(guideStatuses),
  // When status === 'failed', short message for the admin UI.
  statusMessage: z.string().nullish(),
  // Only one guide per project type can be `active: true` at a time. Enforced
  // in setActiveGuide() with a Firestore transaction.
  active: z.boolean().default(false),
  uploadedByUid: z.string().min(1),
  uploadedAt: z.union([z.string(), z.date()]).optional(),
  // When the chunking + embedding pipeline finished (or failed).
  processedAt: z.union([z.string(), z.date()]).nullish(),
});
export type ProjectTypeGuide = z.infer<typeof projectTypeGuideSchema>;

/** Result row returned by findRelevantChunks — slim view for prompt building. */
export interface GuideChunkHit {
  chunkId: string;
  guideId: string;
  ordinal: number;
  pageStart: number;
  pageEnd: number;
  headingPath: string[];
  text: string;
  /** Cosine distance from the query (lower = more similar). */
  distance: number;
}
