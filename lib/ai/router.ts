import 'server-only';

import type { ModelOverride, ProjectTier } from '@/types/projectType';
import { getVertexClient } from '@/lib/ai/vertex';

// -----------------------------------------------------------------------------
// AI router
//
// Picks a concrete model based on (project tier × per-section override) and
// runs the prompt against it. Returns text + token accounting so callers can
// charge the user fairly.
//
// Sprint 3.0 supports Gemini only. The Anthropic path is wired so future
// `sonnet`/`opus` overrides can light up by setting ANTHROPIC_API_KEY.
// -----------------------------------------------------------------------------

export type ModelTag = 'flash' | 'pro' | 'sonnet' | 'opus';

interface ConcreteModel {
  tag: ModelTag;
  provider: 'vertex' | 'anthropic';
  /** Resolved model identifier — what we actually pass to the SDK. */
  id: string;
  /** Cost per 1M input tokens in USD (rough — used for PaiToken accounting). */
  costInPer1M: number;
  /** Cost per 1M output tokens in USD. */
  costOutPer1M: number;
}

const MODELS: Record<ModelTag, ConcreteModel> = {
  flash: {
    tag: 'flash',
    provider: 'vertex',
    id: 'gemini-2.5-flash',
    costInPer1M: 0.3,
    costOutPer1M: 2.5,
  },
  pro: {
    tag: 'pro',
    provider: 'vertex',
    id: 'gemini-2.5-pro',
    costInPer1M: 1.25,
    costOutPer1M: 5.0,
  },
  sonnet: {
    tag: 'sonnet',
    provider: 'anthropic',
    id: 'claude-sonnet-4-6',
    costInPer1M: 3.0,
    costOutPer1M: 15.0,
  },
  opus: {
    tag: 'opus',
    provider: 'anthropic',
    id: 'claude-opus-4-7',
    costInPer1M: 15.0,
    costOutPer1M: 75.0,
  },
};

const TIER_DEFAULT: Record<ProjectTier, ModelTag> = {
  economy: 'flash',
  standard: 'pro',
  premium: 'sonnet',
  enterprise: 'opus',
};

export function pickModel(opts: {
  tier: ProjectTier;
  override?: ModelOverride;
}): ConcreteModel {
  const tag = opts.override ?? TIER_DEFAULT[opts.tier];
  return MODELS[tag];
}

export interface RunPromptInput {
  model: ConcreteModel;
  systemPrompt?: string;
  userPrompt: string;
  outputLanguage: string;
  maxOutputTokens?: number;
  /** When true, the model is instructed to return strict JSON. */
  jsonMode?: boolean;
}

export interface RunPromptResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
  durationMs: number;
  modelId: string;
}

export async function runPrompt(input: RunPromptInput): Promise<RunPromptResult> {
  const t0 = Date.now();
  if (input.model.provider === 'vertex') {
    return runVertex(input, t0);
  }
  // Anthropic path is intentionally minimal until Sprint 3.1.
  throw new Error(
    `Provider "${input.model.provider}" not yet wired. Set ANTHROPIC_API_KEY and rebuild to enable.`,
  );
}

// Hard ceiling per section. Anything longer than this tends to be a
// hung connection, not real work — far better to fail fast and let the
// user retry than to keep a Server Action open indefinitely.
const VERTEX_TIMEOUT_MS = 90_000;

async function runVertex(input: RunPromptInput, t0: number): Promise<RunPromptResult> {
  const vertex = getVertexClient();

  const generativeModel = vertex.getGenerativeModel({
    model: input.model.id,
    systemInstruction: input.systemPrompt
      ? { role: 'system', parts: [{ text: input.systemPrompt }] }
      : undefined,
    generationConfig: {
      temperature: input.jsonMode ? 0.2 : 0.5,
      topP: 0.95,
      maxOutputTokens: input.maxOutputTokens ?? 8192,
      ...(input.jsonMode ? { responseMimeType: 'application/json' } : {}),
    },
  });

  const generation = generativeModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: input.userPrompt }] }],
  });

  const result = await Promise.race([
    generation,
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              `Vertex AI request timed out after ${VERTEX_TIMEOUT_MS / 1000}s — retry from the UI`,
            ),
          ),
        VERTEX_TIMEOUT_MS,
      ),
    ),
  ]);

  const candidate = result.response.candidates?.[0];
  const text =
    candidate?.content?.parts
      ?.map((p) => ('text' in p ? p.text : ''))
      .join('') ?? '';
  const usage = result.response.usageMetadata;

  if (!text) {
    const finishReason = candidate?.finishReason ?? 'unknown';
    throw new Error(`Vertex AI returned an empty response (finish reason: ${finishReason})`);
  }

  return {
    text,
    tokensIn: usage?.promptTokenCount ?? 0,
    tokensOut: usage?.candidatesTokenCount ?? 0,
    durationMs: Date.now() - t0,
    modelId: input.model.id,
  };
}

/**
 * Convert raw model token counts to "PaiTokens" — our internal billing unit.
 * 1 PaiToken ≈ ~$0.001 USD with a 30% markup. Floor of 1 per call so even
 * trivial generations have a measurable cost.
 */
export function paiTokensFor(opts: {
  model: ConcreteModel;
  tokensIn: number;
  tokensOut: number;
}): number {
  const usd =
    (opts.tokensIn / 1_000_000) * opts.model.costInPer1M +
    (opts.tokensOut / 1_000_000) * opts.model.costOutPer1M;
  const withMarkup = usd * 1.3;
  return Math.max(1, Math.ceil(withMarkup * 1000));
}
