'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireServerSession } from '@/lib/server/getServerSession';
import {
  deleteProjectType,
  getProjectTypeById,
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

  revalidatePath('/admin/project-types', 'page');
  revalidatePath(`/admin/project-types/${stored.id}`, 'page');
  revalidatePath(`/project-types/${stored.slug}`, 'page');

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
  revalidatePath('/admin/project-types', 'page');
  return { ok: true };
}

// ----- Draft template from a guide via Vertex AI ----------------------------

const draftSchema = z.object({
  guide: z.string().min(80, 'Lütfen rehberden en az 80 karakter yapıştır.'),
  hintLanguage: z.enum(['tr', 'en', 'es', 'auto']).default('auto'),
});

export type DraftFromGuideInput = z.input<typeof draftSchema>;

const DRAFT_SYSTEM = `
You extract project-application templates from a program guide. You must
return a single JSON object that matches the requested schema exactly.
Never wrap the JSON in prose; never add Markdown fences. Strings remain
plain text — do not escape outside of standard JSON rules.
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
    maxOutputTokens: 8192,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.text);
  } catch (e) {
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
