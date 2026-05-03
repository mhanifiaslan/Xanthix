import type { Rubric, Section, ProjectType } from '@/types/projectType';
import type { GuideChunkHit } from '@/types/projectTypeGuide';

export interface HydrateContext {
  userIdea: string;
  outputLanguage: string;
  /** Map of sectionId → { title, content } for sections already produced. */
  previousSections: Record<string, { title: string; content: string }>;
  /** Wizard inputs collected from earlier steps for THIS section. */
  userInputs: Record<string, string | number | boolean | null>;
  /**
   * Top-K relevant chunks pulled from the project type's active guide.
   * Empty when no guide is configured. Already ordered by similarity.
   */
  guideChunks?: GuideChunkHit[];
}

/**
 * Replaces {{userIdea}}, {{outputLanguage}}, {{previousSections}},
 * {{userInputs}}, {{previousSections.<sectionId>}}, and {{guideContext}}
 * placeholders inside the section's prompt template.
 *
 * `previousSections` and `userInputs` are JSON-stringified so the model can
 * parse them as needed (it usually treats them as plain reference text).
 *
 * `guideContext` is rendered as a numbered list of citation-ready blocks,
 * e.g.:
 *   [Kılavuz s.42-43 — 3.2 Methodology]
 *   <chunk text>
 *
 *   [Kılavuz s.51 — 4 Impact]
 *   <chunk text>
 *
 * If the template doesn't use {{guideContext}} explicitly, the chunks are
 * appended at the end under a "## Kılavuz alıntıları" heading so the
 * model still has them in context. This makes RAG opt-out (set the
 * placeholder to "" in the template) but on by default.
 */
export function hydratePrompt(section: Section, ctx: HydrateContext): string {
  let out = section.agentPromptTemplate;

  out = out.replace(/\{\{userIdea\}\}/g, ctx.userIdea);
  out = out.replace(/\{\{outputLanguage\}\}/g, ctx.outputLanguage);

  out = out.replace(
    /\{\{previousSections\}\}/g,
    JSON.stringify(ctx.previousSections, null, 2),
  );
  out = out.replace(
    /\{\{userInputs\}\}/g,
    JSON.stringify(ctx.userInputs, null, 2),
  );

  out = out.replace(
    /\{\{previousSections\.([a-zA-Z0-9_-]+)\}\}/g,
    (_, id: string) => ctx.previousSections[id]?.content ?? '',
  );

  const guideBlock = formatGuideContext(ctx.guideChunks ?? []);
  const hadPlaceholder = /\{\{guideContext\}\}/.test(out);
  out = out.replace(/\{\{guideContext\}\}/g, guideBlock);
  if (!hadPlaceholder && guideBlock) {
    out = `${out}\n\n## Kılavuz alıntıları (referans olarak kullan)\n\n${guideBlock}`;
  }

  return out;
}

function formatGuideContext(chunks: GuideChunkHit[]): string {
  if (chunks.length === 0) return '';
  return chunks
    .map((c) => {
      const heading = c.headingPath.length ? c.headingPath.join(' › ') : '';
      const pages =
        c.pageStart === c.pageEnd
          ? `s.${c.pageStart}`
          : `s.${c.pageStart}-${c.pageEnd}`;
      const label = heading
        ? `[Kılavuz ${pages} — ${heading}]`
        : `[Kılavuz ${pages}]`;
      return `${label}\n${c.text.trim()}`;
    })
    .join('\n\n');
}

/**
 * Default system prompt prepended to every section run.
 *
 * `hasGuide` swaps in citation-discipline language when the section is being
 * generated against a guide-equipped project type. Without a guide, the
 * model would invent fake "[Kılavuz s.X]" labels just to look thorough,
 * which is the opposite of what we want.
 */
export function buildSystemPrompt(
  projectType: ProjectType,
  opts: { hasGuide?: boolean } = {},
): string {
  const lines = [
    `You are an expert grant writer drafting a section of a "${projectType.name.en}" funding application.`,
    'Match the tone and conventions expected by program reviewers.',
    'Be concrete, evidence-driven, and avoid filler.',
    'When you need a fact you do not have, surface it as a clearly-marked TODO so the user can fill it in.',
    'Never fabricate references, citations, statistics, or numbers.',
  ];

  if (opts.hasGuide) {
    lines.push(
      'You have been given direct quotations from the program guide under "Kılavuz alıntıları" or inline as [Kılavuz s.X] blocks. Treat these as the authoritative source for what the funder expects.',
      'When the guide informs a claim or framing, cite it inline using the EXACT same bracket format you were given (e.g. "[Kılavuz s.42]"). Do NOT invent page numbers — only cite pages that appeared in the provided chunks.',
      'If the guide chunks do not cover a topic the section needs, say so explicitly with a TODO rather than guessing what the funder wants.',
    );
  }

  return lines.join(' ');
}

// ---- Judge / scorecard prompts --------------------------------------------

/**
 * System prompt for the judge model. Independent of the writer system
 * prompt because the judge is grading, not generating — different role,
 * different temperature, different output contract.
 */
export function buildJudgeSystemPrompt(): string {
  return [
    'You are a strict grant-program reviewer scoring a section of a funding application.',
    'You score against the rubric exactly as written — never invent dimensions or shift weights.',
    'Be honest: a high score must be earned. Average drafts deserve middle scores.',
    'Output strict JSON matching the schema in the user message. No prose, no markdown fences.',
  ].join(' ');
}

interface BuildJudgePromptArgs {
  content: string;
  rubric: Rubric;
  projectTypeName: string;
  sectionTitle: string;
  sectionDescription: string;
  outputLanguage: string;
}

/**
 * Builds the user prompt for the judge. The contract is intentionally
 * verbose about the JSON shape because Gemini's jsonMode is strict but
 * not psychic — we still need to spell out every field name.
 *
 * The rationale + suggestions strings are written in `outputLanguage` so
 * end users can read the scorecard naturally; field names stay English
 * for parser stability.
 */
export function buildJudgePrompt(args: BuildJudgePromptArgs): string {
  const lang = args.outputLanguage;

  const dimensionLines = args.rubric.dimensions
    .map((d) => {
      const name = pickLocalized(d.name, lang);
      const desc = pickLocalized(d.descriptor, lang);
      return `- id: "${d.id}" (max ${d.maxPoints} pts) — ${name}\n  Scoring guide: ${desc}`;
    })
    .join('\n');

  const exampleDimensions = args.rubric.dimensions
    .map(
      (d) =>
        `    {"id": "${d.id}", "score": <0..${d.maxPoints}>, "rationale": "<short ${lang} text>", "suggestions": "<short ${lang} text — what would lift this dimension>"}`,
    )
    .join(',\n');

  return [
    `Project type: ${args.projectTypeName}`,
    `Section: ${args.sectionTitle}`,
    `Section purpose: ${args.sectionDescription}`,
    '',
    '## Rubric',
    dimensionLines,
    '',
    '## Section draft to score',
    '```',
    args.content,
    '```',
    '',
    '## Output format (strict JSON, no fences)',
    '{',
    '  "dimensions": [',
    exampleDimensions,
    '  ]',
    '}',
    '',
    'Rules:',
    `- Score every dimension listed above. Use only ids that appeared in the rubric.`,
    `- Score must be an integer or .5 increment between 0 and the dimension's maxPoints.`,
    `- Rationale: 1-3 sentences in ${lang}, citing concrete passages of the draft.`,
    `- Suggestions: 1-2 sentences in ${lang} on what would raise this dimension's score. Empty string if it's already at max.`,
    '- Do not include any text outside the JSON object.',
  ].join('\n');
}

function pickLocalized(
  loc: { tr: string; en: string; es: string },
  lang: string,
): string {
  if (lang === 'tr' || lang === 'en' || lang === 'es') return loc[lang];
  return loc.en;
}

interface BuildJudgeRevisionPromptArgs {
  /** The fully-hydrated original generation prompt (post-{{guideContext}}). */
  originalPrompt: string;
  /** The draft we want to improve. */
  currentContent: string;
  /** Per-dimension feedback from the previous judge pass. Empty
   *  rationale/suggestions skipped silently. */
  scorecardDimensions: Array<{
    id: string;
    score: number;
    maxPoints: number;
    rationale: string;
    suggestions: string;
  }>;
  /** Which attempt this is (1-indexed; 2 means "first revise"). Surfaced
   *  to the model so it knows it has been here before. */
  attemptNumber: number;
  outputLanguage: string;
}

/**
 * Builds the auto-revise prompt that runs after a sub-threshold judge pass.
 * Differs from buildRevisionPrompt (user-driven) in two ways:
 *  - Driver is the judge's per-dimension suggestions, not user instruction
 *  - Tone is "fix specifically these gaps", not "respond to this request"
 *
 * The prompt asks for a full rewrite (not a diff) so the next judge pass
 * can score the whole thing against the rubric without diffing logic.
 */
export function buildJudgeRevisionPrompt(
  args: BuildJudgeRevisionPromptArgs,
): string {
  const feedbackLines = args.scorecardDimensions
    .filter((d) => d.suggestions.trim() || d.score < d.maxPoints)
    .map((d) => {
      const scoreFrag = `${d.score % 1 === 0 ? d.score : d.score.toFixed(1)}/${d.maxPoints}`;
      const rationale = d.rationale.trim()
        ? ` Eksik: ${d.rationale.trim()}`
        : '';
      const suggestions = d.suggestions.trim()
        ? ` Yapılması gereken: ${d.suggestions.trim()}`
        : '';
      return `- ${d.id} (${scoreFrag}).${rationale}${suggestions}`;
    })
    .join('\n');

  return [
    '## Original task',
    args.originalPrompt,
    '',
    '## Previous draft',
    '```',
    args.currentContent,
    '```',
    '',
    `## Reviewer feedback (attempt ${args.attemptNumber - 1} scored below threshold)`,
    feedbackLines || '(No specific feedback — rewrite for clarity and concreteness.)',
    '',
    '## Output instructions',
    `Rewrite the section in full so the reviewer's gaps above are closed. Do NOT mention the feedback in the output. Keep the same structure and Markdown rules. Output language: ${args.outputLanguage}. Output ONLY the revised section, no commentary.`,
  ].join('\n');
}

/**
 * Builds the user prompt for a section revision. Wraps the original task,
 * the current content, and the user's revision instruction in a structure
 * that lets the model reproduce the section as a whole — not just the
 * patch — while still respecting the section's original criteria.
 */
export function buildRevisionPrompt(opts: {
  originalPrompt: string;
  currentContent: string;
  userInstruction: string;
}): string {
  return [
    '## Original task',
    opts.originalPrompt,
    '',
    '## Current draft of this section',
    '```',
    opts.currentContent,
    '```',
    '',
    '## Revision request from the user',
    opts.userInstruction.trim(),
    '',
    '## Output instructions',
    'Apply the revision request faithfully while keeping the section structurally consistent with the original task and its acceptance criteria. Output the FULL revised section, not a diff. Maintain the same Markdown rules (proper tables with separator rows, one row per line, blank lines between blocks).',
  ].join('\n');
}
