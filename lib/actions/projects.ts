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
import {
  buildRevisionPrompt,
  buildSystemPrompt,
  hydratePrompt,
} from '@/lib/ai/hydratePrompt';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { getMemberDoc } from '@/lib/server/organizations';
import type { ProjectDoc } from '@/types/project';
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

  const userPrompt = hydratePrompt(section, {
    userIdea: project.idea,
    outputLanguage: project.outputLanguage,
    previousSections: previousById,
    userInputs: (project.userInputs?.[section.id] ?? {}) as Record<string, string | number | boolean | null>,
  });

  const systemPrompt = buildSystemPrompt(type);

  try {
    const result = await runPrompt({
      model,
      systemPrompt,
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
      reason: `generate:${type.slug}:${section.id}`,
      relatedProjectId: projectId,
      relatedSectionId: section.id,
    });

    await recordGeneratedSection({
      projectId,
      sectionId: section.id,
      arrayIndex: currentIndex,
      order: section.order,
      title: section.title[project.outputLanguage as 'tr' | 'en' | 'es'] ?? section.title.en,
      content: result.text,
      outputType: section.outputType,
      generationMeta: {
        model: result.modelId,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        durationMs: result.durationMs,
        paiTokensCharged: cost,
      },
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

  const originalPrompt = hydratePrompt(sectionTemplate, {
    userIdea: project.idea,
    outputLanguage: project.outputLanguage,
    previousSections: previousById,
    userInputs: ((project as ProjectDoc).userInputs?.[input.sectionId] ?? {}) as Record<
      string,
      string | number | boolean | null
    >,
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
      systemPrompt: buildSystemPrompt(type),
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
