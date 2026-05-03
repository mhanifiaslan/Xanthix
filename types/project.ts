import { z } from 'zod';

export const PROJECT_STATUSES = [
  'draft',
  'generating',
  'paused',
  'ready',
  'failed',
  'archived',
] as const;
export type ProjectStatusV2 = (typeof PROJECT_STATUSES)[number];

export const SECTION_STATUSES = [
  'pending',
  'generating',
  'ready',
  'revising',
  'failed',
] as const;
export type SectionStatusV2 = (typeof SECTION_STATUSES)[number];

const userInputValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const projectDocSchema = z.object({
  id: z.string(),
  ownerUid: z.string(),
  orgId: z.string().nullable().optional(),
  projectTypeId: z.string(),
  projectTypeSlug: z.string(),
  title: z.string(),
  idea: z.string(),
  outputLanguage: z.enum(['tr', 'en', 'es', 'auto']),
  status: z.enum(PROJECT_STATUSES),
  currentSectionIndex: z.number().int().nonnegative(),
  totalSections: z.number().int().positive(),
  /** Wizard-collected per-section user inputs (sectionId → fieldId → value). */
  userInputs: z.record(z.string(), z.record(z.string(), userInputValueSchema)).default({}),
  /** Total tokens spent so far (server-tracked, never trusted from client). */
  tokensSpent: z.number().int().nonnegative().default(0),
  /**
   * Snapshot of the project type's active guide (if any) at project start.
   * Pinned for the project's lifetime so re-uploads of the program guide
   * mid-flight don't shift the ground under in-progress drafts.
   */
  guideId: z.string().nullable().optional(),
  /** Last failure message — surfaced in the UI when status='failed'. */
  failureReason: z.string().nullable().optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
});
export type ProjectDoc = z.infer<typeof projectDocSchema>;
export type ProjectDocInput = z.input<typeof projectDocSchema>;

export const sectionDocSchema = z.object({
  id: z.string(),
  order: z.number().int().nonnegative(),
  status: z.enum(SECTION_STATUSES),
  title: z.string(),
  content: z.string().default(''),
  outputType: z.string().default('markdown'),
  generationMeta: z
    .object({
      model: z.string(),
      tokensIn: z.number().int().nonnegative(),
      tokensOut: z.number().int().nonnegative(),
      durationMs: z.number().int().nonnegative(),
      paiTokensCharged: z.number().int().nonnegative(),
    })
    .nullable()
    .optional(),
  failureReason: z.string().nullable().optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
});
export type SectionDoc = z.infer<typeof sectionDocSchema>;

export const EXPORT_FORMATS = ['docx', 'pdf', 'xlsx', 'gantt-png'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const EXPORT_STATUSES = ['pending', 'ready', 'failed'] as const;
export type ExportStatus = (typeof EXPORT_STATUSES)[number];

export const exportDocSchema = z.object({
  id: z.string(),
  format: z.enum(EXPORT_FORMATS),
  status: z.enum(EXPORT_STATUSES),
  storagePath: z.string().nullable().optional(),
  /** Signed URL — re-issued on demand; treat as short-lived. */
  downloadUrl: z.string().nullable().optional(),
  downloadUrlExpiresAt: z.union([z.string(), z.date()]).nullable().optional(),
  fileName: z.string().nullable().optional(),
  failureReason: z.string().nullable().optional(),
  /** Bytes — populated once the file is uploaded. */
  sizeBytes: z.number().int().nonnegative().nullable().optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
});
export type ExportDoc = z.infer<typeof exportDocSchema>;

export const messageDocSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  sectionId: z.string().nullable().optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
});
export type MessageDoc = z.infer<typeof messageDocSchema>;
