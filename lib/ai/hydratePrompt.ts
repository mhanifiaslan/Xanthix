import type { Section, ProjectType } from '@/types/projectType';

export interface HydrateContext {
  userIdea: string;
  outputLanguage: string;
  /** Map of sectionId → { title, content } for sections already produced. */
  previousSections: Record<string, { title: string; content: string }>;
  /** Wizard inputs collected from earlier steps for THIS section. */
  userInputs: Record<string, string | number | boolean | null>;
}

/**
 * Replaces {{userIdea}}, {{outputLanguage}}, {{previousSections}},
 * {{userInputs}}, and {{previousSections.<sectionId>}} placeholders inside
 * the section's prompt template.
 *
 * `previousSections` and `userInputs` are JSON-stringified so the model can
 * parse them as needed (it usually treats them as plain reference text).
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

  return out;
}

/** Default system prompt prepended to every section run. */
export function buildSystemPrompt(projectType: ProjectType): string {
  return [
    `You are an expert grant writer drafting a section of a "${projectType.name.en}" funding application.`,
    'Match the tone and conventions expected by program reviewers.',
    'Be concrete, evidence-driven, and avoid filler.',
    'When you need a fact you do not have, surface it as a clearly-marked TODO so the user can fill it in.',
    'Never fabricate references, citations, statistics, or numbers.',
  ].join(' ');
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
