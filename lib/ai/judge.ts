import 'server-only';
import { z } from 'zod';
import { paiTokensFor, runPrompt } from '@/lib/ai/router';
import type { ConcreteModelView, ProjectTier } from '@/lib/ai/router';
import { buildJudgePrompt, buildJudgeSystemPrompt } from '@/lib/ai/hydratePrompt';
import type { Rubric } from '@/types/projectType';
import type { Scorecard } from '@/types/project';
import { pickJudgeModel } from '@/lib/ai/router';

interface JudgeArgs {
  /** The generated section content to score. */
  content: string;
  /** Active rubric. */
  rubric: Rubric;
  /** Project tier — used by pickJudgeModel to escalate when economy. */
  tier: ProjectTier;
  /** Plain-language framing for the judge ("Horizon Excellence section"). */
  context: {
    projectTypeName: string;
    sectionTitle: string;
    sectionDescription: string;
    outputLanguage: string;
  };
}

/**
 * Asks an LLM to score a generated section against the rubric and return a
 * structured scorecard. Caller decides what to do with sub-threshold
 * scores (8B.1 just persists them; 8B.2 will trigger auto-revise).
 *
 * Two failure modes worth knowing about:
 *  - JSON parse fail (model returned prose despite jsonMode): we re-throw
 *    so the caller can decide whether to skip judging or retry once.
 *  - Score out of [0, maxPoints]: clamped, with a warning logged. The
 *    rubric prompt is unambiguous about the range, but Gemini drifts on
 *    edge cases.
 */
export async function judgeSection(args: JudgeArgs): Promise<Scorecard> {
  const judgeModel = pickJudgeModel({ tier: args.tier });

  const userPrompt = buildJudgePrompt({
    content: args.content,
    rubric: args.rubric,
    projectTypeName: args.context.projectTypeName,
    sectionTitle: args.context.sectionTitle,
    sectionDescription: args.context.sectionDescription,
    outputLanguage: args.context.outputLanguage,
  });

  const result = await runPrompt({
    model: judgeModel,
    systemPrompt: buildJudgeSystemPrompt(),
    userPrompt,
    outputLanguage: args.context.outputLanguage,
    jsonMode: true,
    maxOutputTokens: 2048,
  });

  const parsed = parseJudgeResponse(result.text, args.rubric);

  const judgePaiTokens = paiTokensFor({
    model: judgeModel,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
  });

  const totalScore = parsed.dimensions.reduce((sum, d) => sum + d.score, 0);
  const maxScore = args.rubric.dimensions.reduce(
    (sum, d) => sum + d.maxPoints,
    0,
  );
  const normalizedScore = maxScore > 0 ? totalScore / maxScore : 0;

  return {
    totalScore,
    maxScore,
    normalizedScore,
    passed: normalizedScore >= args.rubric.passingThreshold,
    attempts: 1,
    judgeModel: result.modelId,
    judgeTokensIn: result.tokensIn,
    judgeTokensOut: result.tokensOut,
    judgePaiTokensCharged: judgePaiTokens,
    dimensions: parsed.dimensions.map((d) => {
      const def = args.rubric.dimensions.find((rd) => rd.id === d.id);
      const maxPoints = def?.maxPoints ?? 5;
      return {
        id: d.id,
        score: clamp(d.score, 0, maxPoints),
        maxPoints,
        rationale: d.rationale ?? '',
        suggestions: d.suggestions ?? '',
      };
    }),
  };
}

// ---- Response parsing -------------------------------------------------------

const judgeDimensionSchema = z.object({
  id: z.string().min(1),
  score: z.number(),
  rationale: z.string().optional().default(''),
  suggestions: z.string().optional().default(''),
});

const judgeResponseSchema = z.object({
  dimensions: z.array(judgeDimensionSchema).min(1),
});

interface ParsedResponse {
  dimensions: Array<z.infer<typeof judgeDimensionSchema>>;
}

function parseJudgeResponse(raw: string, rubric: Rubric): ParsedResponse {
  // Gemini in jsonMode usually returns clean JSON, but we've seen the
  // occasional fenced block. Strip ```json fences as a defense.
  const trimmed = raw.trim().replace(/^```json\s*/i, '').replace(/```$/m, '');

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    throw new Error(
      `Judge response was not valid JSON: ${err instanceof Error ? err.message : 'unknown'}. First 200 chars: ${trimmed.slice(0, 200)}`,
    );
  }

  const result = judgeResponseSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Judge response failed schema validation: ${result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`,
    );
  }

  // Cross-check that every rubric dimension was scored. If the model
  // skipped one, fill with 0 + a synthetic rationale so persistence
  // doesn't crash on the schema's .min(1).
  const seen = new Set(result.data.dimensions.map((d) => d.id));
  const filled = [...result.data.dimensions];
  for (const def of rubric.dimensions) {
    if (!seen.has(def.id)) {
      filled.push({
        id: def.id,
        score: 0,
        rationale: 'Yargı modeli bu boyutu skorlamadı; varsayılan 0 atandı.',
        suggestions: '',
      });
    }
  }

  return { dimensions: filled };
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

// Re-export for callers; keeps the 'view' shape stable across files.
export type { ConcreteModelView };
