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
