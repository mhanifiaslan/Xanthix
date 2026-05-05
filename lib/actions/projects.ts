'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireServerSession } from '@/lib/server/getServerSession';
import {
  getProjectTypeBySlug,
  getProjectTypeById,
} from '@/lib/server/projectTypes';
import {
  InsufficientTokensError,
  appendAssistantMessage,
  createProjectDoc,
  getProjectDoc,
  getTokenBalance,
  listSectionsByProject,
  markSectionFailed,
  recordGeneratedSection,
  recordRevisedSection,
  setSectionStatus,
  spendTokens,
} from '@/lib/server/projects';
import { pickModel, runPrompt, paiTokensFor } from '@/lib/ai/router';
import { judgeSection } from '@/lib/ai/judge';
import {
  buildJudgeRevisionPrompt,
  buildRevisionPrompt,
  buildSystemPrompt,
  hydratePrompt,
} from '@/lib/ai/hydratePrompt';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { getMemberDoc } from '@/lib/server/organizations';
import {
  findRelevantChunks,
  getActiveGuideId,
} from '@/lib/server/projectTypeGuides';
import type { ProjectDoc } from '@/types/project';
import type { Section } from '@/types/projectType';
import type { Locale } from '@/i18n/routing';

// -----------------------------------------------------------------------------

const startProjectSchema = z.object({
  projectTypeSlug: z.string().min(1),
  idea: z.string().min(20, 'Lütfen fikrinizi en az 20 karakterle anlatın.'),
  /** sectionId → fieldId → value */
  userInputs: z
    .record(z.string(), z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])))
    .optional(),
  /** Optional: run this project on behalf of an organisation. Tokens come
   *  from the org wallet and the project becomes visible to all org
   *  members with read access. */
  orgId: z.string().min(1).optional(),
});

export type StartProjectInput = z.input<typeof startProjectSchema>;

export async function startProjectAction(
  rawInput: StartProjectInput,
  locale: Locale,
): Promise<{ projectId: string }> {
  const session = await requireServerSession();
  const input = startProjectSchema.parse(rawInput);

  // Validate org context — the session claim might be stale, so we re-check
  // membership in Firestore directly.
  const orgId = input.orgId ?? null;
  if (orgId) {
    const member = await getMemberDoc(orgId, session.uid);
    if (!member) {
      throw new Error(
        'Bu kuruma üye değilsin; proje açamazsın. Önce kurum üyesi olarak eklenmelisin.',
      );
    }
  }

  const type = await getProjectTypeBySlug(input.projectTypeSlug, {
    orgIds: orgId ? [orgId, ...session.orgIds] : session.orgIds,
  });
  if (!type) throw new Error('Project type not found or not accessible');
  if (type.visibility === 'org_only' && !orgId) {
    throw new Error(
      'Bu proje türü kuruma özel — bir kurum bağlamında başlatılmalı.',
    );
  }

  // Bare-minimum upfront check on the wallet that will pay for it.
  const balance = await getTokenBalance({ userId: session.uid, orgId });
  if (balance < 1) {
    throw new InsufficientTokensError(balance, 1);
  }

  const outputLanguage =
    type.outputLanguage === 'auto' ? locale : type.outputLanguage;

  const title = deriveTitle(input.idea);

  // Pin the active guide (if any) at project creation. Re-uploading the
  // guide later won't shift the ground under this draft.
  const guideId = await getActiveGuideId(type.id).catch(() => null);

  const projectId = await createProjectDoc({
    ownerUid: session.uid,
    orgId,
    projectTypeId: type.id,
    projectTypeSlug: type.slug,
    totalSections: type.sections.length,
    outputLanguage,
    title,
    idea: input.idea,
    userInputs: input.userInputs ?? {},
    guideId,
  });

  revalidatePath(`/${locale}/projects`);
  if (orgId) revalidatePath(`/${locale}/organizations/${orgId}`);
  return { projectId };
}

// -----------------------------------------------------------------------------

/**
 * Returns true when the calling session may act on this project. Owners
 * always pass, super_admins always pass, and any org member of the
 * project's org passes too.
 */
async function canActOnProject(
  project: ProjectDoc,
  session: { uid: string; role: string; orgIds: readonly string[] },
): Promise<boolean> {
  if (project.ownerUid === session.uid) return true;
  if (session.role === 'super_admin') return true;
  if (project.orgId) {
    if (session.orgIds.includes(project.orgId)) return true;
    // Claim might be stale; double-check Firestore.
    const member = await getMemberDoc(project.orgId, session.uid);
    if (member) return true;
  }
  return false;
}

export async function generateNextSectionAction(
  projectId: string,
): Promise<{ done: boolean; sectionId: string | null }> {
  const session = await requireServerSession();

  const project = await getProjectDoc(projectId);
  if (!project) throw new Error('Project not found');
  if (!(await canActOnProject(project, session))) {
    throw new Error('Forbidden');
  }
  if (project.status !== 'generating') {
    return { done: project.status === 'ready', sectionId: null };
  }
  if (project.currentSectionIndex >= project.totalSections) {
    return { done: true, sectionId: null };
  }

  const type = await getProjectTypeById(project.projectTypeId);
  if (!type) throw new Error('Project type missing');

  const orderedSections = [...type.sections].sort((a, b) => a.order - b.order);
  const currentIndex = project.currentSectionIndex;
  const section = orderedSections[currentIndex];
  if (!section) {
    throw new Error(`No section defined at order ${currentIndex}`);
  }

  const previousSections = await listSectionsByProject(projectId);
  const previousById: Record<string, { title: string; content: string }> = {};
  for (const s of previousSections) {
    if (s.status === 'ready') {
      previousById[s.id] = { title: s.title, content: s.content };
    }
  }

  const model = pickModel({
    tier: type.tier,
    override: section.modelOverride ?? undefined,
  });

  // Retrieve guide context for this specific section. Query is built from
  // the section's structural metadata (title + description + criteria) so
  // we get chunks that match the section's intent, not the user's idea.
  // Failure here is non-fatal — we generate without RAG rather than block.
  const guideChunks = project.guideId
    ? await findRelevantChunks({
        guideId: project.guideId,
        query: buildGuideQuery(section, project.outputLanguage),
        limit: 5,
      }).catch((err) => {
        console.error(
          `[rag] findRelevantChunks failed for project=${projectId} section=${section.id}`,
          err,
        );
        return [];
      })
    : [];

  const userPrompt = hydratePrompt(section, {
    userIdea: project.idea,
    outputLanguage: project.outputLanguage,
    previousSections: previousById,
    userInputs: (project.userInputs?.[section.id] ?? {}) as Record<string, string | number | boolean | null>,
    guideChunks,
  });

  const systemPrompt = buildSystemPrompt(type, {
    hasGuide: guideChunks.length > 0,
  });

  try {
    // Initial generation (attempt 1).
    const initial = await runPrompt({
      model,
      systemPrompt,
      userPrompt,
      outputLanguage: project.outputLanguage,
    });
    let bestText = initial.text;
    let bestMeta = initial;
    let writerCostTotal = paiTokensFor({
      model,
      tokensIn: initial.tokensIn,
      tokensOut: initial.tokensOut,
    });

    await spendTokens({
      userId: session.uid,
      orgId: project.orgId ?? null,
      amount: writerCostTotal,
      reason: `generate:${type.slug}:${section.id}`,
      relatedProjectId: projectId,
      relatedSectionId: section.id,
    });

    // Judge → revise loop. Only runs when the section has a rubric AND the
    // first judge pass scores below threshold AND maxRevisionAttempts > 0.
    //
    // Bookkeeping notes:
    //  - `scorecard` always reflects the LAST successful judge pass; if a
    //    later judge throws, we keep the prior pass's scorecard rather
    //    than overwriting with null.
    //  - `attempts` counts how many writer passes ran (1 = no revise, 2
    //    = one revise, etc.). The scorecard's attempts field is set
    //    explicitly at persist time.
    //  - Each writer call and each judge call gets its own spendTokens
    //    row so the audit log stays granular.
    //  - Wall-time worst case: 2 revises = 6 LLM calls (3 writer + 3
    //    judge). At ~20s/call that's ~2 minutes — within Cloud Run's
    //    default 5min ceiling but tight. If we ever brush it, split the
    //    judge loop into a follow-up Server Action.
    let scorecard: Awaited<ReturnType<typeof judgeSection>> | null = null;
    let judgeCostTotal = 0;
    let attemptsRun = 1;

    if (section.rubric) {
      const rubric = section.rubric;
      const judgeContext = {
        projectTypeName: type.name.en,
        sectionTitle:
          section.title[project.outputLanguage as 'tr' | 'en' | 'es'] ??
          section.title.en,
        sectionDescription:
          section.description[project.outputLanguage as 'tr' | 'en' | 'es'] ??
          section.description.en,
        outputLanguage: project.outputLanguage,
      };
      const maxAttempts = 1 + Math.max(0, rubric.maxRevisionAttempts ?? 0);

      try {
        scorecard = await judgeSection({
          content: bestText,
          rubric,
          tier: type.tier,
          context: judgeContext,
        });
        judgeCostTotal += scorecard.judgePaiTokensCharged;
        await spendTokens({
          userId: session.uid,
          orgId: project.orgId ?? null,
          amount: scorecard.judgePaiTokensCharged,
          reason: `judge:${type.slug}:${section.id}:1`,
          relatedProjectId: projectId,
          relatedSectionId: section.id,
        });

        // Auto-revise while we're below threshold and have attempts left.
        while (
          scorecard &&
          !scorecard.passed &&
          attemptsRun < maxAttempts
        ) {
          attemptsRun += 1;

          const revisePrompt = buildJudgeRevisionPrompt({
            originalPrompt: userPrompt,
            currentContent: bestText,
            scorecardDimensions: scorecard.dimensions,
            attemptNumber: attemptsRun,
            outputLanguage: project.outputLanguage,
          });

          const revised = await runPrompt({
            model,
            systemPrompt,
            userPrompt: revisePrompt,
            outputLanguage: project.outputLanguage,
          });
          const reviseCost = paiTokensFor({
            model,
            tokensIn: revised.tokensIn,
            tokensOut: revised.tokensOut,
          });
          writerCostTotal += reviseCost;
          bestText = revised.text;
          bestMeta = revised;

          await spendTokens({
            userId: session.uid,
            orgId: project.orgId ?? null,
            amount: reviseCost,
            reason: `revise:${type.slug}:${section.id}:${attemptsRun}`,
            relatedProjectId: projectId,
            relatedSectionId: section.id,
          });

          // Re-judge the new draft. If the judge call itself fails, keep
          // the previous scorecard rather than nulling everything out;
          // the user still benefits from the first pass's diagnostics.
          try {
            const nextScorecard = await judgeSection({
              content: bestText,
              rubric,
              tier: type.tier,
              context: judgeContext,
            });
            judgeCostTotal += nextScorecard.judgePaiTokensCharged;
            await spendTokens({
              userId: session.uid,
              orgId: project.orgId ?? null,
              amount: nextScorecard.judgePaiTokensCharged,
              reason: `judge:${type.slug}:${section.id}:${attemptsRun}`,
              relatedProjectId: projectId,
              relatedSectionId: section.id,
            });
            scorecard = nextScorecard;
          } catch (err) {
            console.error(
              `[judge] revise-judge attempt=${attemptsRun} failed for project=${projectId} section=${section.id}`,
              err,
            );
            // Loop exits because we can't tell if the revision passed.
            break;
          }
        }
      } catch (err) {
        console.error(
          `[judge] initial pass failed for project=${projectId} section=${section.id}`,
          err,
        );
        scorecard = null;
      }
    }

    // Stamp the final attempts count so the UI can show "3. denemede 4.5/5".
    if (scorecard) scorecard.attempts = attemptsRun;

    await recordGeneratedSection({
      projectId,
      sectionId: section.id,
      arrayIndex: currentIndex,
      order: section.order,
      title: section.title[project.outputLanguage as 'tr' | 'en' | 'es'] ?? section.title.en,
      content: bestText,
      outputType: section.outputType,
      generationMeta: {
        model: bestMeta.modelId,
        tokensIn: bestMeta.tokensIn,
        tokensOut: bestMeta.tokensOut,
        // durationMs reflects the LAST writer call only; if we tracked
        // total wall time the UI's per-section timing would be misleading.
        durationMs: bestMeta.durationMs,
        // paiTokensCharged reflects ALL writer attempts so the project
        // total stays accurate.
        paiTokensCharged: writerCostTotal,
      },
      // Override scorecard.judgePaiTokensCharged with the SUM of every
      // judge call (the field on a single Scorecard tracks one call;
      // here we want the section total for display.tokensSpent math).
      scorecard: scorecard
        ? { ...scorecard, judgePaiTokensCharged: judgeCostTotal }
        : null,
    });

    await appendAssistantMessage(
      projectId,
      section.id,
      `✅ ${section.title[project.outputLanguage as 'tr' | 'en' | 'es'] ?? section.title.en}`,
    );

    const done = section.order + 1 >= type.sections.length;
    return { done, sectionId: section.id };
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Unknown error';
    await markSectionFailed({
      projectId,
      sectionId: section.id,
      arrayIndex: currentIndex,
      order: section.order,
      title:
        section.title[project.outputLanguage as 'tr' | 'en' | 'es'] ?? section.title.en,
      reason,
    });
    if (err instanceof InsufficientTokensError) {
      // Re-throw so the client can route to billing.
      throw err;
    }
    throw err;
  }
}

// -----------------------------------------------------------------------------

const reviseSectionSchema = z.object({
  projectId: z.string().min(1),
  sectionId: z.string().min(1),
  instruction: z
    .string()
    .min(8, 'Lütfen revizyon talebini en az 8 karakterle yaz.')
    .max(2000),
});

export type ReviseSectionInput = z.input<typeof reviseSectionSchema>;

export async function reviseSectionAction(
  rawInput: ReviseSectionInput,
): Promise<{ ok: true }> {
  const session = await requireServerSession();
  const input = reviseSectionSchema.parse(rawInput);

  const project = await getProjectDoc(input.projectId);
  if (!project) throw new Error('Project not found');
  if (!(await canActOnProject(project, session))) {
    throw new Error('Forbidden');
  }
  if (project.status === 'generating') {
    throw new Error(
      'Bu proje hâlâ üretiliyor. Tüm bölümler bittikten sonra revize edebilirsin.',
    );
  }

  const sectionRef = getAdminFirestore()
    .collection('projects')
    .doc(input.projectId)
    .collection('sections')
    .doc(input.sectionId);
  const sectionSnap = await sectionRef.get();
  if (!sectionSnap.exists) throw new Error('Section not found');
  const sectionDocData = sectionSnap.data() as {
    status?: string;
    content?: string;
    title?: string;
  };
  if (sectionDocData.status !== 'ready') {
    throw new Error(
      `Bu bölüm şu anda revize edilemez (durum: ${sectionDocData.status}).`,
    );
  }

  const type = await getProjectTypeById(project.projectTypeId);
  if (!type) throw new Error('Project type missing');
  const sectionTemplate = type.sections.find((s) => s.id === input.sectionId);
  if (!sectionTemplate) throw new Error('Section template not found');

  const previousSections = await listSectionsByProject(input.projectId);
  const previousById: Record<string, { title: string; content: string }> = {};
  for (const s of previousSections) {
    if (s.status === 'ready' && s.id !== input.sectionId) {
      previousById[s.id] = { title: s.title, content: s.content };
    }
  }

  // Same RAG retrieval as initial generation — revising shouldn't lose the
  // grounding the original draft had access to.
  const guideChunks = project.guideId
    ? await findRelevantChunks({
        guideId: project.guideId,
        query: buildGuideQuery(sectionTemplate, project.outputLanguage),
        limit: 5,
      }).catch((err) => {
        console.error(
          `[rag] findRelevantChunks failed during revise for project=${input.projectId} section=${input.sectionId}`,
          err,
        );
        return [];
      })
    : [];

  const originalPrompt = hydratePrompt(sectionTemplate, {
    userIdea: project.idea,
    outputLanguage: project.outputLanguage,
    previousSections: previousById,
    userInputs: ((project as ProjectDoc).userInputs?.[input.sectionId] ?? {}) as Record<
      string,
      string | number | boolean | null
    >,
    guideChunks,
  });

  const userPrompt = buildRevisionPrompt({
    originalPrompt,
    currentContent: sectionDocData.content ?? '',
    userInstruction: input.instruction,
  });

  const model = pickModel({
    tier: type.tier,
    override: sectionTemplate.modelOverride ?? undefined,
  });

  // Optimistically flip the section into "revising" so the UI can show a
  // spinner; the snapshot listener picks the change up immediately.
  await setSectionStatus(input.projectId, input.sectionId, 'revising');

  try {
    const result = await runPrompt({
      model,
      systemPrompt: buildSystemPrompt(type, { hasGuide: guideChunks.length > 0 }),
      userPrompt,
      outputLanguage: project.outputLanguage,
    });

    const cost = paiTokensFor({
      model,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
    });

    await spendTokens({
      userId: session.uid,
      orgId: project.orgId ?? null,
      amount: cost,
      reason: `revise:${type.slug}:${input.sectionId}`,
      relatedProjectId: input.projectId,
      relatedSectionId: input.sectionId,
    });

    await recordRevisedSection({
      projectId: input.projectId,
      sectionId: input.sectionId,
      newContent: result.text,
      generationMeta: {
        model: result.modelId,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        durationMs: result.durationMs,
        paiTokensCharged: cost,
      },
    });

    await appendAssistantMessage(
      input.projectId,
      input.sectionId,
      `🔁 Revize: ${sectionDocData.title ?? input.sectionId}`,
    );

    return { ok: true };
  } catch (err) {
    // Restore the section to its previous ready state — content is unchanged.
    await setSectionStatus(input.projectId, input.sectionId, 'ready');
    throw err;
  }
}

// -----------------------------------------------------------------------------

function deriveTitle(idea: string): string {
  const cleaned = idea.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 60) return cleaned;
  // Cut at the nearest sentence boundary if any, else hard truncate.
  const firstSentence = cleaned.split(/[.!?]\s/)[0];
  if (firstSentence.length <= 80) return firstSentence;
  return cleaned.slice(0, 70).trimEnd() + '…';
}

/**
 * Builds the retrieval query for fetching guide chunks relevant to a
 * section. We use the section's structural metadata (not the user's idea)
 * because the guide describes section-by-section expectations — retrieving
 * by user idea would surface chunks loosely related to the project topic
 * but unrelated to the section being written.
 */
function buildGuideQuery(
  section: Section,
  outputLanguage: string,
): string {
  const lang = (['tr', 'en', 'es'] as const).includes(
    outputLanguage as 'tr' | 'en' | 'es',
  )
    ? (outputLanguage as 'tr' | 'en' | 'es')
    : 'en';
  const parts: string[] = [
    section.title[lang] ?? section.title.en,
    section.description[lang] ?? section.description.en,
    ...(section.criteria ?? []),
  ];
  return parts.filter(Boolean).join('\n').slice(0, 1500);
}

// -----------------------------------------------------------------------------
// Idea Enhancement
// -----------------------------------------------------------------------------

const enhanceIdeaSchema = z.object({
  idea: z.string().min(5).max(1000),
  outputLanguage: z.string().default('tr'),
});

export async function enhanceIdeaAction(rawInput: z.input<typeof enhanceIdeaSchema>): Promise<{ enhancedIdea: string }> {
  // We require a session, but we don't necessarily charge tokens for this tiny action
  // since it's meant to be a frictionless UX helper. Or we could charge 1 token.
  await requireServerSession();
  const input = enhanceIdeaSchema.parse(rawInput);

  const systemPrompt = `You are an expert grant writer and project manager. The user will provide a brief, potentially incomplete project idea. Your task is to expand and enhance this idea into a professional, well-structured, and comprehensive project description (around 3-4 sentences). Do NOT add extra pleasantries, just return the enhanced idea text. Write in the requested language.`;
  
  const userPrompt = `Language: ${input.outputLanguage}\n\nOriginal Idea:\n${input.idea}`;

  const result = await runPrompt({
    model: pickModel({ tier: 'standard' }), // Gemini Pro
    systemPrompt,
    userPrompt,
    outputLanguage: input.outputLanguage,
  });

  return { enhancedIdea: result.text.trim() };
}

// -----------------------------------------------------------------------------
// Manual Edit Saving
// -----------------------------------------------------------------------------

const saveSectionContentSchema = z.object({
  projectId: z.string().min(1),
  sectionId: z.string().min(1),
  content: z.string().min(1),
});

export async function saveSectionContentAction(rawInput: z.input<typeof saveSectionContentSchema>): Promise<{ ok: true }> {
  const session = await requireServerSession();
  const input = saveSectionContentSchema.parse(rawInput);

  const project = await getProjectDoc(input.projectId);
  if (!project) throw new Error('Project not found');
  if (!(await canActOnProject(project, session))) {
    throw new Error('Forbidden');
  }

  const sectionRef = getAdminFirestore()
    .collection('projects')
    .doc(input.projectId)
    .collection('sections')
    .doc(input.sectionId);
    
  await sectionRef.update({
    content: input.content,
    updatedAt: new Date().toISOString(),
  });

  return { ok: true };
}

// -----------------------------------------------------------------------------
// Manual Evaluation (Scorecard Update)
// -----------------------------------------------------------------------------

const evaluateSectionSchema = z.object({
  projectId: z.string().min(1),
  sectionId: z.string().min(1),
});

export async function evaluateSectionAction(rawInput: z.input<typeof evaluateSectionSchema>): Promise<{ ok: true }> {
  const session = await requireServerSession();
  const input = evaluateSectionSchema.parse(rawInput);

  const project = await getProjectDoc(input.projectId);
  if (!project) throw new Error('Project not found');
  if (!(await canActOnProject(project, session))) {
    throw new Error('Forbidden');
  }

  const sectionRef = getAdminFirestore()
    .collection('projects')
    .doc(input.projectId)
    .collection('sections')
    .doc(input.sectionId);
    
  const sectionSnap = await sectionRef.get();
  if (!sectionSnap.exists) throw new Error('Section not found');
  const sectionDocData = sectionSnap.data() as {
    content?: string;
    scorecard?: any;
  };
  
  const content = sectionDocData.content;
  if (!content) {
    throw new Error('Değerlendirilecek içerik bulunamadı.');
  }

  const type = await getProjectTypeById(project.projectTypeId);
  if (!type) throw new Error('Project type missing');
  
  const sectionTemplate = type.sections.find((s) => s.id === input.sectionId);
  if (!sectionTemplate) throw new Error('Section template not found');
  
  if (!sectionTemplate.rubric) {
    throw new Error('Bu bölüm için değerlendirme kriteri (rubric) bulunmuyor.');
  }

  // Bare-minimum upfront check on the wallet that will pay for it.
  const balance = await getTokenBalance({ userId: session.uid, orgId: project.orgId ?? null });
  if (balance < 1) {
    throw new InsufficientTokensError(balance, 1);
  }

  const judgeContext = {
    projectTypeName: type.name.en,
    sectionTitle: sectionTemplate.title[project.outputLanguage as 'tr' | 'en' | 'es'] ?? sectionTemplate.title.en,
    sectionDescription: sectionTemplate.description[project.outputLanguage as 'tr' | 'en' | 'es'] ?? sectionTemplate.description.en,
    outputLanguage: project.outputLanguage,
  };

  const nextScorecard = await judgeSection({
    content: content,
    rubric: sectionTemplate.rubric,
    tier: type.tier,
    context: judgeContext,
  });

  const attempts = (sectionDocData.scorecard?.attempts ?? 0) + 1;
  const finalScorecard = { ...nextScorecard, attempts };

  await spendTokens({
    userId: session.uid,
    orgId: project.orgId ?? null,
    amount: nextScorecard.judgePaiTokensCharged,
    reason: `evaluate:${type.slug}:${input.sectionId}`,
    relatedProjectId: input.projectId,
    relatedSectionId: input.sectionId,
  });

  await sectionRef.update({
    scorecard: finalScorecard,
  });

  return { ok: true };
}
