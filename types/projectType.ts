import { z } from 'zod';

export const PROJECT_TIERS = ['economy', 'standard', 'premium', 'enterprise'] as const;
export type ProjectTier = (typeof PROJECT_TIERS)[number];

export const PROJECT_CATEGORIES = [
  'tubitak',
  'eu',
  'ipa',
  'horizon',
  'teknofest',
  'national',
  'kosgeb',
  'kalkinma_ajansi',
  'custom',
] as const;
export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export const PROJECT_OUTPUT_LANGUAGES = ['tr', 'en', 'es', 'auto'] as const;
export type ProjectOutputLanguage = (typeof PROJECT_OUTPUT_LANGUAGES)[number];

export const PROJECT_VISIBILITIES = ['public', 'org_only'] as const;
export type ProjectVisibility = (typeof PROJECT_VISIBILITIES)[number];

export const SECTION_OUTPUT_TYPES = [
  'markdown',
  'budget_table',
  'gantt',
  'image',
  'json',
] as const;
export type SectionOutputType = (typeof SECTION_OUTPUT_TYPES)[number];

export const MODEL_OVERRIDES = ['flash', 'pro', 'sonnet', 'opus'] as const;
export type ModelOverride = (typeof MODEL_OVERRIDES)[number];

const localizedString = z.object({
  tr: z.string().min(1),
  en: z.string().min(1),
  es: z.string().min(1),
});
export type LocalizedString = z.infer<typeof localizedString>;

const userInputSchemaSchema = z.object({
  fields: z
    .array(
      z.object({
        id: z.string().min(1),
        label: localizedString,
        type: z.enum(['text', 'textarea', 'number', 'select', 'date']),
        required: z.boolean().default(false),
        placeholder: localizedString.optional(),
        options: z
          .array(
            z.object({
              value: z.string(),
              label: localizedString,
            }),
          )
          .optional(),
      }),
    )
    .default([]),
});

// A formal evaluation rubric (Horizon's Excellence/Impact/Implementation,
// TÜBİTAK 1507's "yenilik/özgün değer" axes, etc.). When present on a
// section, the AI's draft is judged against each dimension and a
// scorecard is persisted alongside the section content. This is the
// machine-checkable analogue to `criteria` (which is just a prompt hint).
const rubricDimensionSchema = z.object({
  id: z.string().min(1),
  name: localizedString,
  // Plain-language scoring rubric, e.g. "5: Outstanding clarity, references
  // EU green deal goals; 3: Adequate; 1: Vague or off-topic". The judge
  // model uses this to anchor its scores, so be specific.
  descriptor: localizedString,
  maxPoints: z.number().int().positive().max(20),
});

const rubricSchema = z.object({
  dimensions: z.array(rubricDimensionSchema).min(1).max(8),
  // Pass threshold as a fraction of total possible (e.g. 0.7 = 70%).
  passingThreshold: z.number().min(0).max(1).default(0.7),
  // How many revise attempts the auto-loop is allowed when the score is
  // below threshold. 0 means judge-only (record score, never revise).
  // Phase 8B.1 ships with the loop disabled in code regardless; this
  // field is wired for 8B.2.
  maxRevisionAttempts: z.number().int().min(0).max(3).default(2),
});

export const sectionSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().nonnegative(),
  title: localizedString,
  description: localizedString,
  // Mustache-style placeholders accepted: {{userIdea}}, {{section.summary}}, ...
  agentPromptTemplate: z.string().min(20),
  criteria: z.array(z.string().min(1)).default([]),
  rubric: rubricSchema.nullish(),
  outputType: z.enum(SECTION_OUTPUT_TYPES).default('markdown'),
  modelOverride: z.enum(MODEL_OVERRIDES).nullish(),
  // True when the wizard should pause and collect extra info from the user
  // before this section runs.
  requiresUserInput: z.boolean().default(false),
  userInputSchema: userInputSchemaSchema.nullish(),
  // Soft target — used for budgeting + UI hints. Real billing happens after.
  estimatedTokens: z.number().int().positive().nullish(),
});
export type Section = z.infer<typeof sectionSchema>;
export type Rubric = z.infer<typeof rubricSchema>;
export type RubricDimension = z.infer<typeof rubricDimensionSchema>;

export const projectTypeSchema = z.object({
  id: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'lower-kebab-case'),
  name: localizedString,
  description: localizedString,
  category: z.enum(PROJECT_CATEGORIES),
  tier: z.enum(PROJECT_TIERS),
  outputLanguage: z.enum(PROJECT_OUTPUT_LANGUAGES),
  visibility: z.enum(PROJECT_VISIBILITIES),
  allowedOrgIds: z.array(z.string()).nullish(),
  // For UI / search hints — not enforced. Nullish so AI drafts can pass
  // explicit nulls without tripping validation.
  budgetHint: localizedString.nullish(),
  callDatesHint: localizedString.nullish(),
  whoCanApplyHint: localizedString.nullish(),
  // Lucide icon name — UI maps to component.
  iconName: z.string().default('FolderGit2'),
  active: z.boolean().default(true),
  sections: z.array(sectionSchema).min(1),
  // For traceability: whether the template was AI-drafted from a guide.
  generatedFromGuide: z.boolean().default(false),
  version: z.string().default('1.0.0'),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
});
export type ProjectType = z.infer<typeof projectTypeSchema>;

export const projectTypeWriteSchema = projectTypeSchema.omit({
  createdAt: true,
  updatedAt: true,
});
export type ProjectTypeWrite = z.infer<typeof projectTypeWriteSchema>;
// Input shape — fields with `.default()` are optional here. Use this when
// authoring data (seed templates, admin form drafts, etc.) so callers don't
// have to spell out every default.
export type ProjectTypeWriteInput = z.input<typeof projectTypeWriteSchema>;
