import type { Section, ProjectType } from '@/types/projectType';
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
