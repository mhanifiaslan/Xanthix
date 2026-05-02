import 'server-only';
import { unstable_cache } from 'next/cache';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  type ProjectType,
  type ProjectTypeWrite,
  projectTypeSchema,
} from '@/types/projectType';

export const PROJECT_TYPES_CACHE_TAG = 'project-types';

const COLLECTION = 'projectTypes';

interface ListFilter {
  /** Caller's org membership — needed for org_only types. */
  orgIds?: readonly string[];
  /** When true, also returns inactive types (admin views). */
  includeInactive?: boolean;
  /** Optional category filter. */
  category?: ProjectType['category'];
}

function db(): Firestore {
  return getAdminFirestore();
}

function serialize(snap: FirebaseFirestore.DocumentSnapshot): ProjectType | null {
  const data = snap.data();
  if (!data) return null;
  // Convert Firestore timestamps to ISO strings for client consumption.
  const normalized = {
    ...data,
    id: snap.id,
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? data.updatedAt,
  };
  const parsed = projectTypeSchema.safeParse(normalized);
  if (!parsed.success) {
    console.warn(
      `[projectTypes] doc ${snap.id} failed schema validation:`,
      parsed.error.issues.slice(0, 3),
    );
    return null;
  }
  return parsed.data;
}

// The full active set is shared across all callers; we cache it under one
// tag and apply the visibility / category filters in memory after retrieval.
const fetchAllActiveTypes = unstable_cache(
  async (): Promise<ProjectType[]> => {
    const snap = await db()
      .collection(COLLECTION)
      .where('active', '==', true)
      .get();
    return snap.docs
      .map(serialize)
      .filter((t): t is ProjectType => t !== null);
  },
  ['project-types-active'],
  { tags: [PROJECT_TYPES_CACHE_TAG], revalidate: 300 },
);

const fetchAllTypes = unstable_cache(
  async (): Promise<ProjectType[]> => {
    const snap = await db().collection(COLLECTION).get();
    return snap.docs
      .map(serialize)
      .filter((t): t is ProjectType => t !== null);
  },
  ['project-types-all'],
  { tags: [PROJECT_TYPES_CACHE_TAG], revalidate: 300 },
);

export async function listProjectTypes(filter: ListFilter = {}): Promise<ProjectType[]> {
  const base = filter.includeInactive
    ? await fetchAllTypes()
    : await fetchAllActiveTypes();

  const orgIds = filter.orgIds ?? [];
  const filtered = base.filter((t) => {
    if (filter.category && t.category !== filter.category) return false;
    if (t.visibility === 'public') return true;
    if (!t.allowedOrgIds || t.allowedOrgIds.length === 0) return false;
    return t.allowedOrgIds.some((id) => orgIds.includes(id));
  });

  return filtered.slice().sort((a, b) => {
    const c = a.category.localeCompare(b.category);
    return c !== 0 ? c : a.name.tr.localeCompare(b.name.tr);
  });
}

export async function getProjectTypeBySlug(
  slug: string,
  filter: { orgIds?: readonly string[] } = {},
): Promise<ProjectType | null> {
  const q = await db().collection(COLLECTION).where('slug', '==', slug).limit(1).get();
  if (q.empty) return null;
  const t = serialize(q.docs[0]);
  if (!t) return null;
  if (t.visibility === 'org_only') {
    const orgIds = filter.orgIds ?? [];
    const allowed =
      (t.allowedOrgIds ?? []).some((id) => orgIds.includes(id)) ?? false;
    if (!allowed) return null;
  }
  return t;
}

export async function getProjectTypeById(id: string): Promise<ProjectType | null> {
  const snap = await db().collection(COLLECTION).doc(id).get();
  return serialize(snap);
}

export async function upsertProjectType(input: ProjectTypeWrite): Promise<ProjectType> {
  const parsed = projectTypeSchema
    .omit({ createdAt: true, updatedAt: true })
    .parse(input);

  const ref = db().collection(COLLECTION).doc(parsed.id);
  const exists = (await ref.get()).exists;

  await ref.set(
    {
      ...parsed,
      ...(exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const fresh = await ref.get();
  const t = serialize(fresh);
  if (!t) throw new Error('Failed to serialize newly written project type');
  return t;
}

export async function setProjectTypeActive(id: string, active: boolean): Promise<void> {
  await db()
    .collection(COLLECTION)
    .doc(id)
    .update({ active, updatedAt: FieldValue.serverTimestamp() });
}

export async function deleteProjectType(id: string): Promise<void> {
  await db().collection(COLLECTION).doc(id).delete();
}
