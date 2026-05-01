import 'server-only';
import { readFileSync } from 'node:fs';
import { VertexAI } from '@google-cloud/vertexai';

let _client: VertexAI | null = null;

function loadServiceAccount(): {
  client_email: string;
  private_key: string;
  project_id: string;
} | null {
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (path) {
    const txt = readFileSync(path, 'utf8');
    return JSON.parse(txt);
  }
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) return JSON.parse(json);
  return null;
}

/**
 * Returns a process-wide Vertex AI client. Uses the Firebase service account
 * for auth so we ride on the project's existing Blaze billing — no separate
 * AI Studio key needed.
 *
 * Default region is `us-central1` for the broadest model availability. Set
 * `VERTEX_AI_LOCATION=europe-west4` to keep traffic inside the EU once the
 * required models are GA there.
 */
export function getVertexClient(): VertexAI {
  if (_client) return _client;

  const sa = loadServiceAccount();
  const projectId =
    sa?.project_id ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error(
      'Vertex AI: project id is missing — set NEXT_PUBLIC_FIREBASE_PROJECT_ID or provide a service account.',
    );
  }

  const location = process.env.VERTEX_AI_LOCATION ?? 'us-central1';

  _client = new VertexAI({
    project: projectId,
    location,
    googleAuthOptions: sa
      ? {
          credentials: {
            client_email: sa.client_email,
            private_key: sa.private_key,
          },
          projectId,
        }
      : undefined,
  });

  return _client;
}

export function getVertexLocation(): string {
  return process.env.VERTEX_AI_LOCATION ?? 'us-central1';
}
