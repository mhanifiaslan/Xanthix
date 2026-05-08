'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireServerSession } from '@/lib/server/getServerSession';
import {
  deleteProjectType,
  getProjectTypeById,
  PROJECT_TYPES_CACHE_TAG,
  upsertProjectType,
} from '@/lib/server/projectTypes';
import {
  projectTypeWriteSchema,
  type ProjectTypeWriteInput,
} from '@/types/projectType';
import { pickModel, runPrompt } from '@/lib/ai/router';
import { extractPdfText } from '@/lib/server/extractPdfText';

function assertAdmin(role: string): void {
  if (role !== 'admin' && role !== 'super_admin') {
    throw new Error('Forbidden: admin role required');
  }
}

export async function upsertProjectTypeAction(
  raw: ProjectTypeWriteInput,
): Promise<{ id: string; slug: string }> {
  const session = await requireServerSession();
  assertAdmin(session.role);

  // Re-run the schema parse on the server. The client form already does this
  // via react-hook-form, but we can't trust it.
  const parsed = projectTypeWriteSchema.parse(raw);

  // Slug uniqueness — if a different doc already has this slug, refuse.
  const existing = await getProjectTypeById(parsed.id);
  // Basic protection: only the doc with id == this one may use this slug.
  // For full uniqueness checks across other docs we'd need a query; accept
  // that risk for now (admin-driven, low cardinality).
  void existing;

  const stored = await upsertProjectType(parsed);

  // Force-dynamic on the touched pages already gives us fresh reads on the
  // next navigation; one layout-level invalidation keeps any nested cached
  // data honest without pinging three separate paths. The unstable_cache
  // wrappers around listProjectTypes need a separate tag invalidation.
  revalidatePath('/[locale]/admin/project-types', 'layout');
  revalidateTag(PROJECT_TYPES_CACHE_TAG, 'max');

  return { id: stored.id, slug: stored.slug };
}

const deleteSchema = z.object({ id: z.string().min(1) });

export async function deleteProjectTypeAction(
  raw: z.input<typeof deleteSchema>,
): Promise<{ ok: true }> {
  const session = await requireServerSession();
  assertAdmin(session.role);
  const { id } = deleteSchema.parse(raw);
  await deleteProjectType(id);
  revalidatePath('/[locale]/admin/project-types', 'layout');
  revalidateTag(PROJECT_TYPES_CACHE_TAG, 'max');
  return { ok: true };
}

// ----- Draft template from a guide via Vertex AI ----------------------------

const draftSchema = z.object({
  guide: z.string().min(80, 'Lütfen rehberden en az 80 karakter yapıştır.'),
  hintLanguage: z.enum(['tr', 'en', 'es', 'auto']).default('auto'),
});

export type DraftFromGuideInput = z.input<typeof draftSchema>;

const DRAFT_SYSTEM = `
You extract project-application templates from a program guide. You MUST
return a single raw JSON object — nothing else. Specifically:
- No surrounding prose, commentary, or apology text.
- No Markdown code fences (no \`\`\`json, no \`\`\`).
- No leading whitespace before { and no trailing text after }.
- Only standard JSON escaping inside string values.

The output MUST be parseable by JSON.parse on its own without any
post-processing.
`.trim();

const DRAFT_PROMPT_TEMPLATE = (guide: string) =>
  `Read the program guide below carefully and produce a project-application
template. Output ONLY a single JSON object with this exact shape (omit no
keys):

{
  "id": string (lower-kebab, ≤30 chars, e.g. "tubitak-1507"),
  "slug": same as id,
  "name": string (the program / template name, in the guide's language),
  "description": string (1-2 sentences),
  "categoryHint": string | null (a short, lower-kebab tag like "tubitak", "horizon", "kosgeb", or "custom" — admin will resolve to a real categoryId after preview),
  "tier": one of "economy" | "standard" | "premium" | "enterprise",
  "outputLanguage": one of "tr" | "en" | "es" | "auto",
  "visibility": "public",
  "iconName": one of "FolderGit2" | "GraduationCap" | "Microscope" | "Building2" | "Rocket" | "Sparkles",
  "active": true,
  "version": "0.1.0",
  "generatedFromGuide": true,
  "budgetHint": string | null,
  "callDatesHint": string | null,
  "whoCanApplyHint": string | null,
  "sections": [
    {
      "id": string (lower-kebab),
      "order": integer starting from 0,
      "title": string,
      "description": string,
      "agentPromptTemplate": string,
      "criteria": string[] (3-6 items),
      "outputType": one of "markdown" | "budget_table" | "gantt" | "image" | "json",
      "modelOverride": one of "flash" | "pro" | "sonnet" | "opus",
      "estimatedTokens": integer 800-3000
    }
  ],
  "evaluationCriteria": [
    { "name": string, "description": string, "weight": number 1-5 }
  ]
}

Authoring rules:
- All user-facing strings (name, description, section titles, criteria, etc.)
  use a SINGLE language — match the guide's language.
- Produce 5–9 sections, in the natural order an applicant would write them.
- agentPromptTemplate must be a thorough instruction. Use placeholders
  {{userIdea}} and {{previousSections}}. Spell out the deliverable, structure,
  and any explicit table requirement (dash-separator GFM table contract).
- For budget / table-bearing sections set outputType to "budget_table".
  Use "gantt" for explicit gantt JSON sections; otherwise "markdown".
- Keep modelOverride realistic: "flash" for short / structured, "pro" for
  long / analytical. Use "sonnet"/"opus" only for very involved sections.
- evaluationCriteria are project-LEVEL (3-5 items): what a reviewer judges
  the whole package on (Innovation, Budget realism, etc.). Weight 1-5.

Guide:
"""
${guide}
"""`;

export interface DraftFromGuideResult {
  draft: ProjectTypeWriteInput;
  /** Lower-kebab tag the AI inferred from the guide — admin resolves it
   *  to a real categoryId in the builder. */
  categoryHint: string | null;
}

export async function draftFromGuideAction(
  raw: DraftFromGuideInput,
): Promise<DraftFromGuideResult> {
  const session = await requireServerSession();
  assertAdmin(session.role);
  const input = draftSchema.parse(raw);

  const model = pickModel({ tier: 'standard', override: 'pro' });

  const result = await runPrompt({
    model,
    systemPrompt: DRAFT_SYSTEM,
    userPrompt: DRAFT_PROMPT_TEMPLATE(input.guide),
    outputLanguage: input.hintLanguage,
    jsonMode: true,
    maxOutputTokens: 16384,
  });

  const parsed = parseDraftJson(result.text);
  if (!parsed) {
    console.error('[draftFromGuide] non-JSON response from AI', {
      length: result.text.length,
      preview: result.text.slice(0, 800),
    });
    throw new Error(
      'AI taslağı geçerli JSON döndürmedi. Tekrar deneyebilir veya rehbere ek bağlam ekleyebilirsin.',
    );
  }

  return normalizeAiDraft(parsed);
}

interface RawAiDraft {
  id?: string;
  slug?: string;
  name?: string;
  description?: string;
  categoryHint?: string | null;
  tier?: string;
  outputLanguage?: string;
  visibility?: string;
  iconName?: string;
  active?: boolean;
  version?: string;
  generatedFromGuide?: boolean;
  budgetHint?: string | null;
  callDatesHint?: string | null;
  whoCanApplyHint?: string | null;
  sections?: Array<{
    id?: string;
    order?: number;
    title?: string;
    description?: string;
    agentPromptTemplate?: string;
    criteria?: string[];
    outputType?: string;
    modelOverride?: string;
    estimatedTokens?: number;
  }>;
  evaluationCriteria?: Array<{
    name?: string;
    description?: string;
    weight?: number;
  }>;
}

function normalizeAiDraft(raw: unknown): DraftFromGuideResult {
  const ai = (raw ?? {}) as RawAiDraft;

  // Map sections — drop the now-removed requiresUserInput field, ensure
  // criteria default + sane types. Coerce free-form enum-ish strings into
  // valid enum members; the schema parse below catches anything left.
  const VALID_OUTPUT_TYPES = [
    'markdown',
    'budget_table',
    'gantt',
    'image',
    'json',
  ] as const;
  type ValidOutputType = (typeof VALID_OUTPUT_TYPES)[number];
  const VALID_MODELS = ['flash', 'pro', 'sonnet', 'opus'] as const;
  type ValidModel = (typeof VALID_MODELS)[number];

  const sections = (ai.sections ?? []).map((s, i) => {
    const outputType: ValidOutputType = (
      VALID_OUTPUT_TYPES as readonly string[]
    ).includes(s.outputType ?? '')
      ? (s.outputType as ValidOutputType)
      : 'markdown';
    const modelOverride: ValidModel | undefined = (
      VALID_MODELS as readonly string[]
    ).includes(s.modelOverride ?? '')
      ? (s.modelOverride as ValidModel)
      : undefined;
    return {
      id: s.id || `sec-${i + 1}`,
      order: typeof s.order === 'number' ? s.order : i,
      title: s.title ?? '',
      description: s.description ?? '',
      agentPromptTemplate: s.agentPromptTemplate ?? '',
      criteria: Array.isArray(s.criteria) ? s.criteria : [],
      outputType,
      modelOverride,
      estimatedTokens: s.estimatedTokens,
    };
  });

  const evaluationCriteria = (ai.evaluationCriteria ?? []).map((c, i) => ({
    id: `eval-${i + 1}`,
    name: c.name ?? '',
    description: c.description ?? '',
    weight: typeof c.weight === 'number' ? c.weight : 1,
  }));

  const draftCandidate = {
    id: ai.id ?? '',
    slug: ai.slug ?? ai.id ?? '',
    name: ai.name ?? '',
    description: ai.description ?? '',
    categoryId: null as string | null,
    subCategoryId: null as string | null,
    tier: (ai.tier as ProjectTypeWriteInput['tier']) ?? 'standard',
    outputLanguage:
      (ai.outputLanguage as ProjectTypeWriteInput['outputLanguage']) ?? 'auto',
    visibility:
      (ai.visibility as ProjectTypeWriteInput['visibility']) ?? 'public',
    iconName: ai.iconName ?? 'FolderGit2',
    active: ai.active ?? true,
    sections,
    evaluationCriteria,
    reportTemplates: [],
    generatedFromGuide: true,
    version: ai.version ?? '0.1.0',
    budgetHint: ai.budgetHint ?? null,
    callDatesHint: ai.callDatesHint ?? null,
    whoCanApplyHint: ai.whoCanApplyHint ?? null,
  } satisfies ProjectTypeWriteInput;

  // Validate but don't fail outright — admin will fix gaps in the builder.
  const safeParsed = projectTypeWriteSchema.safeParse(draftCandidate);
  const draft = safeParsed.success
    ? safeParsed.data
    : (draftCandidate as ProjectTypeWriteInput);

  return {
    draft,
    categoryHint: ai.categoryHint ?? null,
  };
}

/**
 * Coerces a raw model response into a JSON object. Tries, in order:
 *   1. Strict JSON.parse on the trimmed text.
 *   2. JSON inside the first ```json fenced block.
 *   3. The substring from the first '{' to the last '}'.
 * Returns null when nothing parses.
 */
function parseDraftJson(raw: string): unknown {
  const text = raw.trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    // fall through
  }

  const fence = /```(?:json)?\s*([\s\S]+?)\s*```/i.exec(text);
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1]);
    } catch {
      // fall through
    }
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const slice = text.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(slice);
    } catch {
      // give up
    }
  }

  return null;
}

// ----- Same flow, but the guide arrives as an uploaded PDF ------------------

const MAX_PDF_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_LANGS = ['tr', 'en', 'es', 'auto'] as const;

export async function draftFromGuidePdfAction(
  formData: FormData,
): Promise<DraftFromGuideResult> {
  const session = await requireServerSession();
  assertAdmin(session.role);

  const file = formData.get('pdf');
  if (!(file instanceof File)) {
    throw new Error('PDF dosyası bulunamadı.');
  }
  if (file.size === 0) {
    throw new Error('PDF dosyası boş.');
  }
  if (file.size > MAX_PDF_BYTES) {
    throw new Error(
      `PDF en fazla ${Math.round(MAX_PDF_BYTES / (1024 * 1024))} MB olabilir.`,
    );
  }
  const isPdf =
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    throw new Error('Yüklenen dosya PDF değil.');
  }

  const rawLang = String(formData.get('hintLanguage') ?? 'auto');
  const hintLanguage = (ALLOWED_LANGS as readonly string[]).includes(rawLang)
    ? (rawLang as (typeof ALLOWED_LANGS)[number])
    : 'auto';

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = (await extractPdfText(buffer)).trim();

  if (text.length < 200) {
    throw new Error(
      'PDF\'den anlamlı metin çıkarılamadı (taranmış olabilir). Lütfen metni doğrudan yapıştır veya OCR ile okunmuş PDF yükle.',
    );
  }

  // Re-use the text path. Truncate hard if the PDF is enormous so we don't
  // blow past Vertex's input window.
  const trimmed = text.slice(0, 80_000);

  return draftFromGuideAction({ guide: trimmed, hintLanguage });
}

// ----- Prompt Tester --------------------------------------------------------

const testPromptSchema = z.object({
  systemPrompt: z.string(),
  userPrompt: z.string(),
  outputLanguage: z.enum(['tr', 'en', 'es', 'auto']).default('tr'),
  modelOverride: z.enum(['flash', 'pro', 'sonnet', 'opus']).optional(),
});

export type TestPromptInput = z.input<typeof testPromptSchema>;

export async function testPromptAction(raw: TestPromptInput) {
  const session = await requireServerSession();
  assertAdmin(session.role);
  const input = testPromptSchema.parse(raw);

  const model = pickModel({
    tier: 'standard',
    override: input.modelOverride || 'flash',
  });

  try {
    const result = await runPrompt({
      model,
      systemPrompt: input.systemPrompt,
      userPrompt: input.userPrompt,
      outputLanguage: input.outputLanguage,
    });
    
    return { success: true, text: result.text, tokensIn: result.tokensIn, tokensOut: result.tokensOut };
  } catch (err) {
    console.error('[testPromptAction] failed', err);
    return { success: false, error: err instanceof Error ? err.message : 'Prompt testi başarısız oldu.' };
  }
}
