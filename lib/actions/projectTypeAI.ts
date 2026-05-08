'use server';

// AI helpers for the admin "Project Type Builder" UI.
//
// Each action reads either a chunk of pasted text or an uploaded PDF (the
// caller picks one) and asks Vertex Pro to draft a structured value for
// some part of the project type schema. Output shape is enforced via Zod
// because the model cannot be trusted to follow a schema description alone.

import { z } from 'zod';
import { nanoid } from 'nanoid';
import { requireServerSession } from '@/lib/server/getServerSession';
import { pickModel, runPrompt } from '@/lib/ai/router';
import { extractPdfText } from '@/lib/server/extractPdfText';
import {
  evaluationCriterionSchema,
  type EvaluationCriterion,
} from '@/types/projectType';

// ─── Common helpers ─────────────────────────────────────────────────────────

function assertAdmin(role: string): void {
  if (role !== 'admin' && role !== 'super_admin') {
    throw new Error('Forbidden: admin role required');
  }
}

const MAX_PDF_BYTES = 15 * 1024 * 1024; // 15 MB

// Cap source text we send to the model. Vertex has a generous input window
// but past ~80k tokens response quality degrades and latency creeps up.
const SOURCE_TEXT_CAP = 60_000;

const sourceTextField = z.string().min(1).max(200_000);

const generationContextSchema = z.object({
  projectTypeName: z.string().optional().default(''),
  projectTypeDescription: z.string().optional().default(''),
  sectionTitle: z.string().optional().default(''),
  sectionDescription: z.string().optional().default(''),
  reportTemplateName: z.string().optional().default(''),
  outputLanguage: z.enum(['tr', 'en', 'es', 'auto']).optional().default('auto'),
});

type GenerationContext = z.infer<typeof generationContextSchema>;

const SYSTEM_PROMPT = `
You assist an admin who is authoring a "project type" template inside a
grant-writing tool. The admin has uploaded a program guide (or pasted some
text) and now wants you to draft a specific piece of the template.

You MUST return a single raw JSON object — nothing else.
- No surrounding prose, commentary, or apology text.
- No Markdown code fences (no \`\`\`json, no \`\`\`).
- No leading whitespace before { and no trailing text after }.
- Only standard JSON escaping inside string values.

The output MUST be parseable by JSON.parse on its own without any
post-processing.
`.trim();

async function readSource(input: {
  sourceText?: string;
  pdfFile?: File;
}): Promise<string> {
  if (input.pdfFile) {
    const file = input.pdfFile;
    if (file.size === 0) throw new Error('PDF dosyası boş.');
    if (file.size > MAX_PDF_BYTES) {
      throw new Error(
        `PDF en fazla ${Math.round(MAX_PDF_BYTES / (1024 * 1024))} MB olabilir.`,
      );
    }
    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) throw new Error('Yüklenen dosya PDF değil.');
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = (await extractPdfText(buffer)).trim();
    if (text.length < 200) {
      throw new Error(
        "PDF'den anlamlı metin çıkarılamadı (taranmış olabilir). Metni doğrudan yapıştır veya OCR ile okunmuş PDF yükle.",
      );
    }
    return text.slice(0, SOURCE_TEXT_CAP);
  }
  if (input.sourceText) {
    const text = sourceTextField.parse(input.sourceText).trim();
    if (text.length < 30) {
      throw new Error('Kaynak metin çok kısa — en az 30 karakter gerekli.');
    }
    return text.slice(0, SOURCE_TEXT_CAP);
  }
  throw new Error('Kaynak metin veya PDF gerekli.');
}

function parseJson(raw: string): unknown {
  const text = raw.trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // continue
  }
  const fence = /```(?:json)?\s*([\s\S]+?)\s*```/i.exec(text);
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1]);
    } catch {
      // continue
    }
  }
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try {
      return JSON.parse(text.slice(first, last + 1));
    } catch {
      // give up
    }
  }
  // also try the array form
  const firstA = text.indexOf('[');
  const lastA = text.lastIndexOf(']');
  if (firstA !== -1 && lastA > firstA) {
    try {
      return JSON.parse(text.slice(firstA, lastA + 1));
    } catch {
      // give up
    }
  }
  return null;
}

async function callModel(
  systemAddon: string,
  userPrompt: string,
  outputLanguage: GenerationContext['outputLanguage'],
): Promise<unknown> {
  const model = pickModel({ tier: 'standard', override: 'pro' });
  const result = await runPrompt({
    model,
    systemPrompt: `${SYSTEM_PROMPT}\n\n${systemAddon}`,
    userPrompt,
    outputLanguage: outputLanguage === 'auto' ? 'en' : outputLanguage,
    jsonMode: true,
    maxOutputTokens: 4096,
  });
  const json = parseJson(result.text);
  if (json === null) {
    console.error('[projectTypeAI] non-JSON response from AI', {
      preview: result.text.slice(0, 600),
    });
    throw new Error('AI geçerli JSON döndürmedi. Tekrar deneyebilirsin.');
  }
  return json;
}

function langInstruction(lang: GenerationContext['outputLanguage']): string {
  if (lang === 'tr') return 'Tüm metinleri Türkçe yaz.';
  if (lang === 'es') return 'Escribe todo el texto en español.';
  if (lang === 'en') return 'Write all text in English.';
  return 'Match the language of the source material.';
}

// ─── Mode 1: Prompt template for a section ──────────────────────────────────

const promptTemplateInputSchema = generationContextSchema.extend({
  sourceText: z.string().optional(),
});

export interface PromptTemplateResult {
  promptTemplate: string;
}

const promptTemplateOutputSchema = z.object({
  promptTemplate: z.string().min(40),
});

export async function generatePromptTemplateAction(
  formData: FormData,
): Promise<PromptTemplateResult> {
  const session = await requireServerSession();
  assertAdmin(session.role);

  const ctx = generationContextSchema.parse({
    projectTypeName: formData.get('projectTypeName') ?? '',
    projectTypeDescription: formData.get('projectTypeDescription') ?? '',
    sectionTitle: formData.get('sectionTitle') ?? '',
    sectionDescription: formData.get('sectionDescription') ?? '',
    outputLanguage: formData.get('outputLanguage') ?? 'auto',
  });

  const pdfFile = formData.get('pdf');
  const source = await readSource({
    sourceText: (formData.get('sourceText') as string | null) ?? undefined,
    pdfFile: pdfFile instanceof File && pdfFile.size > 0 ? pdfFile : undefined,
  });

  void promptTemplateInputSchema; // keep schema referenced for future explicit parsing

  const userPrompt = `
You are drafting the agentPromptTemplate for ONE section of a grant-writing
project template.

Project type name: ${ctx.projectTypeName || '(unspecified)'}
Project type description: ${ctx.projectTypeDescription || '(unspecified)'}
Section title: ${ctx.sectionTitle || '(unspecified)'}
Section description: ${ctx.sectionDescription || '(unspecified)'}

Use the source guide below to make the prompt SPECIFIC to that program —
mention named criteria, scoring weights, page limits, structural
requirements, etc. that the guide actually demands.

Output a single JSON object: { "promptTemplate": "<long instruction>" }.

The promptTemplate must:
- Be a thorough instruction that an LLM will follow to generate this section.
- Use mustache placeholders {{userIdea}}, {{previousSections}}, {{userInputs}}
  where it makes sense.
- Spell out the deliverable, structure, and any explicit table format
  (use the dash-separator GFM table contract for tables).
- Be ~150-400 words.
- ${langInstruction(ctx.outputLanguage)}

SOURCE GUIDE:
"""
${source}
"""
`.trim();

  const json = await callModel(
    'You produce a single JSON object with one key: promptTemplate (string).',
    userPrompt,
    ctx.outputLanguage,
  );

  const parsed = promptTemplateOutputSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(
      'AI yanıtı beklenen şemaya uymuyor (promptTemplate eksik veya çok kısa).',
    );
  }
  return parsed.data;
}

// ─── Mode 2: Acceptance criteria (string[]) for a section ───────────────────

export interface CriteriaResult {
  criteria: string[];
}

const criteriaOutputSchema = z.object({
  criteria: z.array(z.string().min(3)).min(2).max(8),
});

export async function generateCriteriaAction(
  formData: FormData,
): Promise<CriteriaResult> {
  const session = await requireServerSession();
  assertAdmin(session.role);

  const ctx = generationContextSchema.parse({
    projectTypeName: formData.get('projectTypeName') ?? '',
    projectTypeDescription: formData.get('projectTypeDescription') ?? '',
    sectionTitle: formData.get('sectionTitle') ?? '',
    sectionDescription: formData.get('sectionDescription') ?? '',
    outputLanguage: formData.get('outputLanguage') ?? 'auto',
  });

  const pdfFile = formData.get('pdf');
  const source = await readSource({
    sourceText: (formData.get('sourceText') as string | null) ?? undefined,
    pdfFile: pdfFile instanceof File && pdfFile.size > 0 ? pdfFile : undefined,
  });

  const userPrompt = `
Draft acceptance criteria for ONE section of a grant-writing project
template. These are concise, evaluable bullets a reviewer (or our judge LLM)
would use to decide whether the section is good enough.

Project type: ${ctx.projectTypeName || '(unspecified)'}
Section title: ${ctx.sectionTitle || '(unspecified)'}
Section description: ${ctx.sectionDescription || '(unspecified)'}

Output a single JSON object: { "criteria": [ "...", "...", ... ] }.

Rules:
- Produce 3 to 6 criteria.
- Each criterion is a single short imperative sentence (≤ 18 words).
- Tie criteria back to the source guide where possible (e.g. "Names at
  least one TRL-aligned milestone", "Includes the budget table required
  on page 7").
- ${langInstruction(ctx.outputLanguage)}

SOURCE GUIDE:
"""
${source}
"""
`.trim();

  const json = await callModel(
    'You produce a single JSON object with one key: criteria (array of strings).',
    userPrompt,
    ctx.outputLanguage,
  );

  const parsed = criteriaOutputSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error('AI yanıtı kriter listesi şemasına uymuyor.');
  }
  return parsed.data;
}

// ─── Mode 3: Project-level evaluation criteria (EvaluationCriterion[]) ──────

export interface EvaluationCriteriaResult {
  criteria: EvaluationCriterion[];
}

const evaluationOutputSchema = z.object({
  criteria: z
    .array(
      z.object({
        name: z.string().min(2),
        description: z.string().min(8),
        weight: z.number().min(0).max(10).optional(),
      }),
    )
    .min(2)
    .max(10),
});

export async function generateEvaluationCriteriaAction(
  formData: FormData,
): Promise<EvaluationCriteriaResult> {
  const session = await requireServerSession();
  assertAdmin(session.role);

  const ctx = generationContextSchema.parse({
    projectTypeName: formData.get('projectTypeName') ?? '',
    projectTypeDescription: formData.get('projectTypeDescription') ?? '',
    outputLanguage: formData.get('outputLanguage') ?? 'auto',
  });

  const pdfFile = formData.get('pdf');
  const source = await readSource({
    sourceText: (formData.get('sourceText') as string | null) ?? undefined,
    pdfFile: pdfFile instanceof File && pdfFile.size > 0 ? pdfFile : undefined,
  });

  const userPrompt = `
Draft project-LEVEL evaluation criteria for the FINAL quality pass that
runs after every section is generated. The AI will score the whole project
against these criteria and may auto-revise weak sections.

Project type: ${ctx.projectTypeName || '(unspecified)'}
Project description: ${ctx.projectTypeDescription || '(unspecified)'}

Output a single JSON object:
{ "criteria": [ { "name": string, "description": string, "weight": number 0-10 }, ... ] }

Rules:
- Produce 3 to 6 criteria.
- Names are short labels (e.g. "Innovation", "Budget realism").
- Descriptions are 1-2 sentences explaining what a high score looks like.
- Weights are integers 1-5 reflecting the source guide's emphasis.
- ${langInstruction(ctx.outputLanguage)}

SOURCE GUIDE:
"""
${source}
"""
`.trim();

  const json = await callModel(
    'You produce a single JSON object with one key: criteria (array).',
    userPrompt,
    ctx.outputLanguage,
  );

  const parsed = evaluationOutputSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error('AI yanıtı değerlendirme kriterleri şemasına uymuyor.');
  }

  const criteria: EvaluationCriterion[] = parsed.data.criteria.map((c) =>
    evaluationCriterionSchema.parse({
      id: `eval_${nanoid(6)}`,
      name: c.name,
      description: c.description,
      weight: c.weight ?? 1,
    }),
  );

  return { criteria };
}

// ─── Mode 4: Filling instructions for a report template ─────────────────────

export interface FillingInstructionsResult {
  instructions: string;
}

const fillingOutputSchema = z.object({
  instructions: z.string().min(40),
});

export async function generateFillingInstructionsAction(
  formData: FormData,
): Promise<FillingInstructionsResult> {
  const session = await requireServerSession();
  assertAdmin(session.role);

  const ctx = generationContextSchema.parse({
    projectTypeName: formData.get('projectTypeName') ?? '',
    projectTypeDescription: formData.get('projectTypeDescription') ?? '',
    reportTemplateName: formData.get('reportTemplateName') ?? '',
    outputLanguage: formData.get('outputLanguage') ?? 'auto',
  });

  const pdfFile = formData.get('pdf');
  const source = await readSource({
    sourceText: (formData.get('sourceText') as string | null) ?? undefined,
    pdfFile: pdfFile instanceof File && pdfFile.size > 0 ? pdfFile : undefined,
  });

  const userPrompt = `
Draft "filling instructions" for a downloadable report template. After the
project sections are generated, an AI step will fill the template
(DOCX or PDF placeholders) using these instructions.

Project type: ${ctx.projectTypeName || '(unspecified)'}
Report template: ${ctx.reportTemplateName || '(unspecified)'}

Output: { "instructions": "<long instruction text>" }

Rules:
- ~120-300 words.
- Map each placeholder you imply to a specific section / data point
  (e.g. "{{projectTitle}} → project name", "{{section.budget.content}} →
  the budget_table section's content").
- Mention tone, length, and any number formatting the form expects.
- ${langInstruction(ctx.outputLanguage)}

SOURCE GUIDE:
"""
${source}
"""
`.trim();

  const json = await callModel(
    'You produce a single JSON object with one key: instructions (string).',
    userPrompt,
    ctx.outputLanguage,
  );

  const parsed = fillingOutputSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error('AI yanıtı doldurma talimatı şemasına uymuyor.');
  }
  return parsed.data;
}
