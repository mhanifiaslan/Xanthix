import 'server-only';
import { readFileSync } from 'node:fs';
import { GoogleGenAI } from '@google/genai';
import {
  EMBEDDING_DIMENSIONS,
  type EmbeddingModel,
} from '@/types/projectTypeGuide';

let _client: GoogleGenAI | null = null;

function loadServiceAccount(): {
  client_email: string;
  private_key: string;
  project_id: string;
} | null {
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (path) return JSON.parse(readFileSync(path, 'utf8'));
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) return JSON.parse(json);
  return null;
}

/**
 * Returns a process-wide @google/genai client wired to Vertex AI. Uses ADC
 * in production (App Hosting / Cloud Run) and the Firebase service account
 * locally — same auth pattern as lib/ai/vertex.ts.
 */
function getClient(): GoogleGenAI {
  if (_client) return _client;

  const sa = loadServiceAccount();
  const project =
    sa?.project_id ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!project) {
    throw new Error(
      'Embeddings: project id missing — set NEXT_PUBLIC_FIREBASE_PROJECT_ID or provide a service account.',
    );
  }

  const location = process.env.VERTEX_AI_LOCATION ?? 'us-central1';

  _client = new GoogleGenAI({
    vertexai: true,
    project,
    location,
    googleAuthOptions: sa
      ? {
          credentials: {
            client_email: sa.client_email,
            private_key: sa.private_key,
          },
          projectId: project,
        }
      : undefined,
  });

  return _client;
}

/** Vertex AI's batch limit for text-multilingual-embedding-002. */
const BATCH_SIZE = 100;

/** Hard timeout per batch — embeddings are usually <2s, but tail latency exists. */
const BATCH_TIMEOUT_MS = 60_000;

const DEFAULT_MODEL: EmbeddingModel = 'text-multilingual-embedding-002';

interface EmbedOptions {
  /** Override the default model. */
  model?: EmbeddingModel;
  /**
   * Hint for what the embedding will be used for. Vertex returns slightly
   * different vectors per task type — RETRIEVAL_DOCUMENT for stored chunks,
   * RETRIEVAL_QUERY for live user queries.
   */
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' | 'SEMANTIC_SIMILARITY';
}

/**
 * Embeds a batch of texts and returns vectors in the same order.
 *
 * Vertex AI's multilingual embedding model is well-suited to grant guides
 * that mix Turkish + English (Horizon, IPA programs publish bilingual PDFs).
 * Output is 768-dim, matching EMBEDDING_DIMENSIONS.
 */
export async function embedTexts(
  texts: string[],
  opts: EmbedOptions,
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const client = getClient();
  const model = opts.model ?? DEFAULT_MODEL;

  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const vectors = await withTimeout(
      embedBatch(client, model, batch, opts.taskType),
      BATCH_TIMEOUT_MS,
      `embedTexts batch ${i / BATCH_SIZE}`,
    );
    out.push(...vectors);
  }
  return out;
}

async function embedBatch(
  client: GoogleGenAI,
  model: EmbeddingModel,
  texts: string[],
  taskType: EmbedOptions['taskType'],
): Promise<number[][]> {
  const response = await client.models.embedContent({
    model,
    contents: texts,
    config: { taskType, outputDimensionality: EMBEDDING_DIMENSIONS },
  });

  const embeddings = response.embeddings ?? [];
  if (embeddings.length !== texts.length) {
    throw new Error(
      `Embeddings: expected ${texts.length} vectors, got ${embeddings.length}`,
    );
  }

  return embeddings.map((e, idx) => {
    const v = e.values;
    if (!v || v.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Embeddings: vector ${idx} has wrong dimensionality (got ${v?.length ?? 0}, expected ${EMBEDDING_DIMENSIONS})`,
      );
    }
    return v;
  });
}

/** Convenience: embed one query string. */
export async function embedQuery(
  text: string,
  opts: { model?: EmbeddingModel } = {},
): Promise<number[]> {
  const [v] = await embedTexts([text], {
    model: opts.model,
    taskType: 'RETRIEVAL_QUERY',
  });
  return v;
}

function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms,
      ),
    ),
  ]);
}
