import 'server-only';
import { FieldValue, type Firestore, type Timestamp } from 'firebase-admin/firestore';
import { nanoid } from 'nanoid';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  type ProjectDoc,
  type SectionDoc,
  projectDocSchema,
  sectionDocSchema,
} from '@/types/project';

function db(): Firestore {
  return getAdminFirestore();
}

function isoFromTs(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  const ts = value as Timestamp;
  return typeof ts.toDate === 'function' ? ts.toDate().toISOString() : undefined;
}

function toProjectDoc(snap: FirebaseFirestore.DocumentSnapshot): ProjectDoc | null {
  const data = snap.data();
  if (!data) return null;
  const parsed = projectDocSchema.safeParse({
    ...data,
    id: snap.id,
    createdAt: isoFromTs(data.createdAt),
    updatedAt: isoFromTs(data.updatedAt),
  });
  if (!parsed.success) {
    console.warn(
      `[projects] doc ${snap.id} failed validation`,
      parsed.error.issues.slice(0, 3),
    );
    return null;
  }
  return parsed.data;
}

function toSectionDoc(snap: FirebaseFirestore.DocumentSnapshot): SectionDoc | null {
  const data = snap.data();
  if (!data) return null;
  const parsed = sectionDocSchema.safeParse({
    ...data,
    id: snap.id,
    createdAt: isoFromTs(data.createdAt),
    updatedAt: isoFromTs(data.updatedAt),
  });
  if (!parsed.success) return null;
  return parsed.data;
}

// ----- Reads ----------------------------------------------------------------

export async function getProjectDoc(projectId: string): Promise<ProjectDoc | null> {
  const snap = await db().collection('projects').doc(projectId).get();
  return toProjectDoc(snap);
}

export async function listProjectsByOwner(uid: string): Promise<ProjectDoc[]> {
  const snap = await db()
    .collection('projects')
    .where('ownerUid', '==', uid)
    .orderBy('updatedAt', 'desc')
    .limit(50)
    .get();
  return snap.docs.map(toProjectDoc).filter((p): p is ProjectDoc => p !== null);
}

export async function listProjectsByOrg(orgId: string): Promise<ProjectDoc[]> {
  const snap = await db()
    .collection('projects')
    .where('orgId', '==', orgId)
    .orderBy('updatedAt', 'desc')
    .limit(50)
    .get();
  return snap.docs.map(toProjectDoc).filter((p): p is ProjectDoc => p !== null);
}

export async function listSectionsByProject(projectId: string): Promise<SectionDoc[]> {
  const snap = await db()
    .collection('projects')
    .doc(projectId)
    .collection('sections')
    .orderBy('order', 'asc')
    .get();
  return snap.docs.map(toSectionDoc).filter((s): s is SectionDoc => s !== null);
}

// ----- Project lifecycle ----------------------------------------------------

export interface CreateProjectInput {
  ownerUid: string;
  orgId: string | null;
  projectTypeId: string;
  projectTypeSlug: string;
  totalSections: number;
  outputLanguage: 'tr' | 'en' | 'es' | 'auto';
  title: string;
  idea: string;
  userInputs?: Record<string, Record<string, string | number | boolean | null>>;
  /** Active guideId at start time — pinned for the project's lifetime. */
  guideId?: string | null;
}

export async function createProjectDoc(input: CreateProjectInput): Promise<string> {
  const id = nanoid(14);
  const now = FieldValue.serverTimestamp();

  const ref = db().collection('projects').doc(id);
  await ref.set({
    ownerUid: input.ownerUid,
    orgId: input.orgId,
    projectTypeId: input.projectTypeId,
    projectTypeSlug: input.projectTypeSlug,
    title: input.title,
    idea: input.idea,
    outputLanguage: input.outputLanguage,
    status: 'generating' as const,
    currentSectionIndex: 0,
    totalSections: input.totalSections,
    userInputs: input.userInputs ?? {},
    tokensSpent: 0,
    guideId: input.guideId ?? null,
    failureReason: null,
    createdAt: now,
    updatedAt: now,
  });

  // Seed the first chat message so the project view always has context.
  await ref.collection('messages').doc('m_seed').set({
    role: 'user' as const,
    content: input.idea,
    sectionId: null,
    createdAt: now,
  });

  return id;
}

export interface RecordGeneratedSectionInput {
  projectId: string;
  sectionId: string;
  /** 0-indexed array position within the project's ordered section list. */
  arrayIndex: number;
  /** Display order from the template — preserved for clients but never used
      to advance the project. */
  order: number;
  title: string;
  content: string;
  outputType: string;
  generationMeta: NonNullable<SectionDoc['generationMeta']>;
}

export async function recordGeneratedSection(
  input: RecordGeneratedSectionInput,
): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const projectRef = db().collection('projects').doc(input.projectId);
  const sectionRef = projectRef.collection('sections').doc(input.sectionId);

  await db().runTransaction(async (tx) => {
    const projectSnap = await tx.get(projectRef);
    if (!projectSnap.exists) throw new Error('Project not found');

    tx.set(sectionRef, {
      order: input.order,
      status: 'ready' as const,
      title: input.title,
      content: input.content,
      outputType: input.outputType,
      generationMeta: input.generationMeta,
      failureReason: null,
      createdAt: now,
      updatedAt: now,
    });

    const total = projectSnap.data()?.totalSections ?? 0;
    const nextIndex = input.arrayIndex + 1;
    const allDone = nextIndex >= total;

    tx.update(projectRef, {
      currentSectionIndex: allDone ? total : nextIndex,
      status: allDone ? 'ready' : 'generating',
      tokensSpent: FieldValue.increment(input.generationMeta.paiTokensCharged),
      updatedAt: now,
    });
  });
}

export interface ReviseSectionInput {
  projectId: string;
  sectionId: string;
  newContent: string;
  generationMeta: NonNullable<SectionDoc['generationMeta']>;
}

export async function recordRevisedSection(input: ReviseSectionInput): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const projectRef = db().collection('projects').doc(input.projectId);
  const sectionRef = projectRef.collection('sections').doc(input.sectionId);

  await db().runTransaction(async (tx) => {
    const sectionSnap = await tx.get(sectionRef);
    if (!sectionSnap.exists) throw new Error('Section not found');

    tx.update(sectionRef, {
      content: input.newContent,
      status: 'ready' as const,
      generationMeta: input.generationMeta,
      revisedCount: FieldValue.increment(1),
      lastRevisedAt: now,
      updatedAt: now,
    });

    tx.update(projectRef, {
      tokensSpent: FieldValue.increment(input.generationMeta.paiTokensCharged),
      updatedAt: now,
    });
  });
}

export async function setSectionStatus(
  projectId: string,
  sectionId: string,
  status: 'pending' | 'generating' | 'ready' | 'revising' | 'failed',
): Promise<void> {
  await db()
    .collection('projects')
    .doc(projectId)
    .collection('sections')
    .doc(sectionId)
    .update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function markSectionFailed(opts: {
  projectId: string;
  sectionId: string;
  arrayIndex: number;
  order: number;
  title: string;
  reason: string;
}): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const projectRef = db().collection('projects').doc(opts.projectId);
  await projectRef.collection('sections').doc(opts.sectionId).set(
    {
      order: opts.order,
      title: opts.title,
      status: 'failed' as const,
      content: '',
      outputType: 'markdown',
      generationMeta: null,
      failureReason: opts.reason,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );
  await projectRef.update({
    status: 'failed' as const,
    failureReason: opts.reason,
    updatedAt: now,
  });
}

// ----- Token wallet ---------------------------------------------------------

export class InsufficientTokensError extends Error {
  constructor(public balance: number, public required: number) {
    super(`Insufficient tokens: balance=${balance}, required=${required}`);
  }
}

/**
 * Atomically debits the right wallet (org if `orgId` is set, otherwise the
 * user) and writes a ledger entry. Throws `InsufficientTokensError` when
 * the wallet can't cover the spend.
 */
export async function spendTokens(opts: {
  userId: string;
  orgId?: string | null;
  amount: number;
  reason: string;
  relatedProjectId?: string;
  relatedSectionId?: string;
}): Promise<{ balanceAfter: number; walletKind: 'user' | 'org' }> {
  if (opts.amount < 0) throw new Error('amount must be non-negative');

  const firestore = db();
  const targetRef = opts.orgId
    ? firestore.collection('organizations').doc(opts.orgId)
    : firestore.collection('users').doc(opts.userId);
  const walletKind: 'user' | 'org' = opts.orgId ? 'org' : 'user';
  const txRef = firestore.collection('tokenTransactions').doc();

  const balanceAfter = await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(targetRef);
    if (!snap.exists) {
      throw new Error(`${walletKind} wallet not found`);
    }
    const balance = (snap.data()?.tokenBalance as number | undefined) ?? 0;
    if (balance < opts.amount) {
      throw new InsufficientTokensError(balance, opts.amount);
    }
    const next = balance - opts.amount;
    tx.update(targetRef, {
      tokenBalance: next,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(txRef, {
      // The acting user is recorded in both modes so org admins can audit
      // who spent what against the shared pool.
      userId: opts.userId,
      orgId: opts.orgId ?? null,
      walletKind,
      type: 'spend' as const,
      amount: opts.amount,
      balanceAfter: next,
      reason: opts.reason,
      relatedProjectId: opts.relatedProjectId ?? null,
      relatedSectionId: opts.relatedSectionId ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });
    return next;
  });

  return { balanceAfter, walletKind };
}

export async function getTokenBalance(opts: {
  userId: string;
  orgId?: string | null;
}): Promise<number> {
  const ref = opts.orgId
    ? db().collection('organizations').doc(opts.orgId)
    : db().collection('users').doc(opts.userId);
  const snap = await ref.get();
  return (snap.data()?.tokenBalance as number | undefined) ?? 0;
}

// ----- Messages -------------------------------------------------------------

export async function appendAssistantMessage(
  projectId: string,
  sectionId: string,
  content: string,
): Promise<void> {
  await db()
    .collection('projects')
    .doc(projectId)
    .collection('messages')
    .add({
      role: 'assistant',
      content,
      sectionId,
      createdAt: FieldValue.serverTimestamp(),
    });
}
