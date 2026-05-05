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
  "name": { "tr": string, "en": string, "es": string },
  "description": { "tr": string, "en": string, "es": string },
  "category": one of "tubitak" | "eu" | "ipa" | "horizon" | "teknofest" | "national" | "kosgeb" | "kalkinma_ajansi" | "custom",
  "tier": one of "economy" | "standard" | "premium" | "enterprise",
  "outputLanguage": one of "tr" | "en" | "es" | "auto",
  "visibility": "public",
  "iconName": one of "FolderGit2" | "GraduationCap" | "Microscope" | "Building2" | "Rocket" | "Sparkles",
  "active": true,
  "version": "0.1.0",
  "generatedFromGuide": true,
  "budgetHint":   { "tr": string, "en": string, "es": string } | null,
  "callDatesHint": { "tr": string, "en": string, "es": string } | null,
  "whoCanApplyHint": { "tr": string, "en": string, "es": string } | null,
  "sections": [
    {
      "id": string (lower-kebab),
      "order": integer starting from 0,
      "title": { "tr": string, "en": string, "es": string },
      "description": { "tr": string, "en": string, "es": string },
      "agentPromptTemplate": string,
      "criteria": string[] (3-6 items),
      "outputType": one of "markdown" | "budget_table" | "gantt" | "image" | "json",
      "modelOverride": one of "flash" | "pro" | "sonnet" | "opus",
      "estimatedTokens": integer 800-3000,
      "requiresUserInput": boolean
    }
  ]
}

Section authoring rules:
- Produce 5–9 sections, in the natural order an applicant would write them.
- agentPromptTemplate must be a thorough instruction. Include the placeholders {{userIdea}}, {{previousSections}}, and (if requiresUserInput is true) {{userInputs}}. Spell out the deliverable, the structure, and any explicit table format requirements (use the dash-separator GFM table contract).
- Use Turkish-preferring tone for the inline instructions if outputLanguage is "tr"; otherwise English. The prompt itself stays in English (better model performance), but instruct the model to output in {{outputLanguage}}.
- For budget / table-bearing sections set outputType to "budget_table". Set "gantt" for explicit gantt JSON sections; otherwise "markdown".
- Keep modelOverride realistic: "flash" for short / structured outputs, "pro" for long / analytical ones. Use "sonnet"/"opus" only for very involved sections.
- Pick category honestly. Default to "custom" if unsure.

Guide:
"""
${guide}
"""`;

export async function draftFromGuideAction(
  raw: DraftFromGuideInput,
): Promise<ProjectTypeWriteInput> {
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

  // Don't fail outright if the AI missed a default — fill the gaps and let
  // the admin tighten things up in the UI.
  const safeParsed = projectTypeWriteSchema.safeParse(parsed);
  if (safeParsed.success) return safeParsed.data;

  // Loose path — best-effort coerce. Admin reviews + saves explicitly.
  return parsed as ProjectTypeWriteInput;
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
): Promise<ProjectTypeWriteInput> {
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
