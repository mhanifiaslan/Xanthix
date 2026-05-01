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
  spendTokens,
} from '@/lib/server/projects';
import { pickModel, runPrompt, paiTokensFor } from '@/lib/ai/router';
import { buildSystemPrompt, hydratePrompt } from '@/lib/ai/hydratePrompt';
import type { Locale } from '@/i18n/routing';

// -----------------------------------------------------------------------------

const startProjectSchema = z.object({
  projectTypeSlug: z.string().min(1),
  idea: z.string().min(20, 'Lütfen fikrinizi en az 20 karakterle anlatın.'),
  /** sectionId → fieldId → value */
  userInputs: z
    .record(z.string(), z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])))
    .optional(),
});

export type StartProjectInput = z.input<typeof startProjectSchema>;

export async function startProjectAction(
  rawInput: StartProjectInput,
  locale: Locale,
): Promise<{ projectId: string }> {
  const session = await requireServerSession();
  const input = startProjectSchema.parse(rawInput);

  const type = await getProjectTypeBySlug(input.projectTypeSlug, {
    orgIds: session.orgIds,
  });
  if (!type) throw new Error('Project type not found or not accessible');

  // Bare-minimum upfront check — full debit happens per section.
  const balance = await getTokenBalance(session.uid);
  if (balance < 1) {
    throw new InsufficientTokensError(balance, 1);
  }

  const outputLanguage =
    type.outputLanguage === 'auto' ? locale : type.outputLanguage;

  const title = deriveTitle(input.idea);

  const projectId = await createProjectDoc({
    ownerUid: session.uid,
    orgId: null,
    projectTypeId: type.id,
    projectTypeSlug: type.slug,
    totalSections: type.sections.length,
    outputLanguage,
    title,
    idea: input.idea,
    userInputs: input.userInputs ?? {},
  });

  revalidatePath(`/${locale}/projects`);
  return { projectId };
}

// -----------------------------------------------------------------------------

export async function generateNextSectionAction(
  projectId: string,
): Promise<{ done: boolean; sectionId: string | null }> {
  const session = await requireServerSession();

  const project = await getProjectDoc(projectId);
  if (!project) throw new Error('Project not found');
  if (project.ownerUid !== session.uid && session.role !== 'super_admin') {
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

  const model = pickModel({ tier: type.tier, override: section.modelOverride });

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

function deriveTitle(idea: string): string {
  const cleaned = idea.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 60) return cleaned;
  // Cut at the nearest sentence boundary if any, else hard truncate.
  const firstSentence = cleaned.split(/[.!?]\s/)[0];
  if (firstSentence.length <= 80) return firstSentence;
  return cleaned.slice(0, 70).trimEnd() + '…';
}
