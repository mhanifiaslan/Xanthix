import { z } from 'zod';

export const PROJECT_TIERS = ['economy', 'standard', 'premium', 'enterprise'] as const;
export type ProjectTier = (typeof PROJECT_TIERS)[number];

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

// ─── Section-level scoring rubric (judge loop) ───────────────────────────────
// Anchors numerical scoring against named dimensions for the inner generate →
// judge → revise loop. Distinct from `evaluationCriteria` (project-level
// final QA — see below).
const rubricDimensionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  // Plain-language scoring rubric, e.g. "5: Outstanding clarity, references
  // EU green deal goals; 3: Adequate; 1: Vague or off-topic".
  descriptor: z.string().min(1),
  maxPoints: z.number().int().positive().max(20),
});

const rubricSchema = z.object({
  // Tolerate empty arrays so AI-drafted templates with no rubric can save.
  // Downstream code treats `dimensions.length === 0` as "no rubric".
  dimensions: z.array(rubricDimensionSchema).max(8),
  passingThreshold: z.number().min(0).max(1).default(0.7),
  maxRevisionAttempts: z.number().int().min(0).max(3).default(2),
});

export const sectionSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().nonnegative(),
  title: z.string().min(1),
  description: z.string().min(1),
  // Mustache-style placeholders accepted: {{userIdea}}, {{section.summary}}, ...
  agentPromptTemplate: z.string().min(20),
  criteria: z.array(z.string().min(1)).default([]),
  rubric: rubricSchema.nullish(),
  outputType: z.enum(SECTION_OUTPUT_TYPES).default('markdown'),
  modelOverride: z.enum(MODEL_OVERRIDES).nullish(),
  // Soft target — used for budgeting + UI hints. Real billing happens after.
  estimatedTokens: z.number().int().positive().nullish(),
});
export type Section = z.infer<typeof sectionSchema>;
export type Rubric = z.infer<typeof rubricSchema>;
export type RubricDimension = z.infer<typeof rubricDimensionSchema>;

// ─── Project-level final QA criteria ─────────────────────────────────────────
// After every section is generated, the AI does a holistic quality pass
// against these criteria and may auto-revise weak sections.
export const evaluationCriterionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  weight: z.number().min(0).max(10).default(1),
});
export type EvaluationCriterion = z.infer<typeof evaluationCriterionSchema>;

// ─── Report templates ────────────────────────────────────────────────────────
// Admin uploads a DOCX/PDF skeleton + filling instructions. After the
// project is generated, the AI fills the template per the instructions and
// the user downloads the populated file.
export const reportTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  fileFormat: z.enum(['docx', 'pdf']),
  /** `gs://bucket/path` reference to the uploaded skeleton in Firebase Storage. */
  storagePath: z.string().min(1),
  /** Original filename — shown in the admin UI as a hint. */
  originalFilename: z.string().nullish(),
  /** Plain-language instructions to the AI: which placeholders/fields map
   *  to which sections, tone, length, etc. */
  fillingInstructions: z.string().min(1),
});
export type ReportTemplate = z.infer<typeof reportTemplateSchema>;

// ─── Project type ────────────────────────────────────────────────────────────
export const projectTypeSchema = z.object({
  id: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'lower-kebab-case'),
  name: z.string().min(1),
  description: z.string().min(1),

  // Dynamic categories live in the `projectCategories` Firestore collection.
  // categoryId points at a top-level category; subCategoryId is optional and
  // must reference a category whose parentId === categoryId.
  categoryId: z.string().min(1).nullish(),
  subCategoryId: z.string().min(1).nullish(),

  tier: z.enum(PROJECT_TIERS),
  outputLanguage: z.enum(PROJECT_OUTPUT_LANGUAGES),
  visibility: z.enum(PROJECT_VISIBILITIES),
  allowedOrgIds: z.array(z.string()).nullish(),

  // For UI / search hints — single string (admin writes in the same language
  // as the project's outputLanguage).
  budgetHint: z.string().nullish(),
  callDatesHint: z.string().nullish(),
  whoCanApplyHint: z.string().nullish(),

  // Lucide icon name — UI maps to component.
  iconName: z.string().default('FolderGit2'),
  active: z.boolean().default(true),
  sections: z.array(sectionSchema).min(1),

  // Project-level final QA + downloadable report templates (start empty;
  // admin fills these on the new editor's tabs 3 + 4).
  evaluationCriteria: z.array(evaluationCriterionSchema).default([]),
  reportTemplates: z.array(reportTemplateSchema).default([]),

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
export type ProjectTypeWriteInput = z.input<typeof projectTypeWriteSchema>;
