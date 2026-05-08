'use server';

// Project-level "final QA" pass.
//
// Runs after every section is generated and the user clicks "Quality
// check". The action takes the project type's evaluationCriteria and the
// concatenated section content, sends them to Vertex Pro with a strict
// JSON contract, and persists the response under
// `projects/{id}/qaReports/{nanoid}`. The returned shape feeds a modal
// that shows the score table + which sections likely need revision.

import { z } from 'zod';
import { nanoid } from 'nanoid';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { requireServerSession } from '@/lib/server/getServerSession';
import { getProjectDoc, listSectionsByProject } from '@/lib/server/projects';
import { getProjectTypeById } from '@/lib/server/projectTypes';
import { pickModel, runPrompt } from '@/lib/ai/router';
import { reviseSectionAction } from '@/lib/actions/projects';

const inputSchema = z.object({
  projectId: z.string().min(1),
});

export interface QaCriterionScore {
  criterionId: string;
  name: string;
  score: number;
  maxPoints: number;
  rationale: string;
}

export interface QaSectionFlag {
  sectionId: string;
  title: string;
  reason: string;
}

export interface QaReportResult {
  reportId: string;
  totalScore: number;
  maxScore: number;
  normalizedScore: number;
  scores: QaCriterionScore[];
  weakSections: QaSectionFlag[];
  summary: string;
}

const aiOutputSchema = z.object({
  scores: z
    .array(
      z.object({
        criterionId: z.string().min(1),
        score: z.number().min(0).max(10),
        rationale: z.string().default(''),
      }),
    )
    .min(1),
  weakSections: z
    .array(
      z.object({
        sectionId: z.string().min(1),
        reason: z.string().default(''),
      }),
    )
    .default([]),
  summary: z.string().default(''),
});

const SYSTEM_PROMPT = `
You are a senior reviewer running a final-quality pass over a generated
grant-application package. Score the entire project against the rubric
provided and flag any sections that likely need revision.

Return ONE raw JSON object — no prose, no Markdown fences:
{
  "scores": [{ "criterionId": string, "score": number 0-10, "rationale": string }],
  "weakSections": [{ "sectionId": string, "reason": string }],
  "summary": string
}

The output MUST be parseable by JSON.parse without post-processing.
`.trim();

const MAX_CONTENT_PER_SECTION = 4_000;

export async function evaluateProjectQualityAction(
  raw: z.input<typeof inputSchema>,
): Promise<QaReportResult> {
  const session = await requireServerSession();
  const { projectId } = inputSchema.parse(raw);

  const project = await getProjectDoc(projectId);
  if (!project) throw new Error('Project not found');
  if (
    project.ownerUid !== session.uid &&
    session.role !== 'admin' &&
    session.role !== 'super_admin'
  ) {
    throw new Error('Forbidden');
  }
  if (project.status !== 'ready') {
    throw new Error(
      'Quality check only runs once the project is fully generated.',
    );
  }

  const projectType = await getProjectTypeById(project.projectTypeId);
  if (!projectType) throw new Error('Project type not found');

  const criteria = projectType.evaluationCriteria ?? [];
  if (criteria.length === 0) {
    throw new Error(
      'Bu proje türü için değerlendirme kriteri tanımlı değil.',
    );
  }

  const sections = (await listSectionsByProject(projectId)).filter(
    (s) => s.status === 'ready',
  );

  // Build the user prompt — keep it tight enough for the model window.
  const criteriaText = criteria
    .map(
      (c, i) =>
        `${i + 1}. id="${c.id}" name="${c.name}" weight=${c.weight}\n   ${c.description}`,
    )
    .join('\n');
  const sectionsText = sections
    .map(
      (s) =>
        `[id="${s.id}" title="${s.title}"]\n${s.content.slice(0, MAX_CONTENT_PER_SECTION)}`,
    )
    .join('\n\n---\n\n');

  const userPrompt = `
Project title: ${project.title}
Project idea: ${project.idea.slice(0, 1000)}
Output language: ${project.outputLanguage}

Evaluation criteria (use the provided ids verbatim):
${criteriaText}

Project sections (use the provided ids verbatim):
${sectionsText}

Score every criterion (0-10) and list every section you would flag for
revision. The "score" rationale should reference concrete evidence from
the sections. Keep "summary" to 2-3 sentences. Match the output language
above when writing rationale + summary.
`.trim();

  const model = pickModel({ tier: 'standard', override: 'pro' });
  const result = await runPrompt({
    model,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    outputLanguage:
      project.outputLanguage === 'auto' ? 'en' : project.outputLanguage,
    jsonMode: true,
    maxOutputTokens: 4096,
  });

  const parsed = parseJson(result.text);
  if (parsed === null) {
    console.error('[projectQA] non-JSON response', {
      preview: result.text.slice(0, 600),
    });
    throw new Error('AI geçerli JSON döndürmedi.');
  }
  const validated = aiOutputSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error('AI yanıtı QA şemasına uymuyor.');
  }

  // Compute weighted totals against the project type's defined criteria.
  const criteriaMap = new Map(criteria.map((c) => [c.id, c]));
  let totalScore = 0;
  let maxScore = 0;
  const scores: QaCriterionScore[] = [];
  for (const s of validated.data.scores) {
    const def = criteriaMap.get(s.criterionId);
    if (!def) continue;
    const weight = def.weight || 1;
    totalScore += s.score * weight;
    maxScore += 10 * weight;
    scores.push({
      criterionId: def.id,
      name: def.name,
      score: s.score,
      maxPoints: 10,
      rationale: s.rationale,
    });
  }
  const normalized = maxScore > 0 ? totalScore / maxScore : 0;

  const sectionMap = new Map(sections.map((s) => [s.id, s]));
  const weakSections: QaSectionFlag[] = validated.data.weakSections
    .map((w) => {
      const sec = sectionMap.get(w.sectionId);
      if (!sec) return null;
      return {
        sectionId: sec.id,
        title: sec.title,
        reason: w.reason,
      };
    })
    .filter((w): w is QaSectionFlag => w !== null);

  // Persist the report under projects/{id}/qaReports.
  const reportId = `qa_${nanoid(10)}`;
  await getAdminFirestore()
    .collection('projects')
    .doc(projectId)
    .collection('qaReports')
    .doc(reportId)
    .set({
      reportId,
      totalScore,
      maxScore,
      normalizedScore: normalized,
      scores,
      weakSections,
      summary: validated.data.summary,
      modelId: result.modelId,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      createdAt: FieldValue.serverTimestamp(),
    });

  return {
    reportId,
    totalScore,
    maxScore,
    normalizedScore: normalized,
    scores,
    weakSections,
    summary: validated.data.summary,
  };
}

// ─── Auto-revise from QA findings ───────────────────────────────────────────

const autoReviseInputSchema = z.object({
  projectId: z.string().min(1),
  weakSections: z
    .array(
      z.object({
        sectionId: z.string().min(1),
        reason: z.string().min(1),
      }),
    )
    .min(1)
    .max(10),
});

export interface AutoReviseResult {
  revised: number;
  failed: { sectionId: string; reason: string }[];
}

/**
 * Loop through the `weakSections` returned by `evaluateProjectQualityAction`
 * and run the standard `reviseSectionAction` for each one, using the QA
 * rationale as the user instruction. We run sequentially so Vertex's per-
 * project rate limits don't trip and so the user sees one section flip at
 * a time in the live transcript.
 */
export async function autoReviseFromQAAction(
  raw: z.input<typeof autoReviseInputSchema>,
): Promise<AutoReviseResult> {
  const session = await requireServerSession();
  const { projectId, weakSections } = autoReviseInputSchema.parse(raw);

  const project = await getProjectDoc(projectId);
  if (!project) throw new Error('Project not found');
  if (
    project.ownerUid !== session.uid &&
    session.role !== 'admin' &&
    session.role !== 'super_admin'
  ) {
    throw new Error('Forbidden');
  }

  let revised = 0;
  const failed: { sectionId: string; reason: string }[] = [];

  for (const w of weakSections) {
    // The instruction has to clear the 8-char min in reviseSectionAction
    // and ideally read like a plain-language fix request.
    const instruction = [
      'Quality-check pass flagged this section for revision.',
      `Reviewer notes: ${w.reason}`,
      'Address the notes while keeping previously-correct content intact.',
    ].join('\n');

    try {
      await reviseSectionAction({
        projectId,
        sectionId: w.sectionId,
        instruction,
      });
      revised += 1;
    } catch (err) {
      failed.push({
        sectionId: w.sectionId,
        reason: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return { revised, failed };
}

// ─── JSON parser used for AI eval response ──────────────────────────────────

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
  return null;
}
