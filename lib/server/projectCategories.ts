import 'server-only';

import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { nanoid } from 'nanoid';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  projectCategorySchema,
  type ProjectCategory,
  type ProjectCategoryWriteInput,
} from '@/types/projectCategory';

const COLLECTION = 'projectCategories';

function db(): Firestore {
  return getAdminFirestore();
}

function serialize(
  snap: FirebaseFirestore.DocumentSnapshot,
): ProjectCategory | null {
  const data = snap.data();
  if (!data) return null;
  const normalized = {
    ...data,
    id: snap.id,
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? data.updatedAt,
  };
  const parsed = projectCategorySchema.safeParse(normalized);
  if (!parsed.success) {
    console.warn(
      `[projectCategories] doc ${snap.id} failed schema validation:`,
      parsed.error.issues.slice(0, 3),
    );
    return null;
  }
  return parsed.data;
}

export async function listCategories(opts: {
  includeInactive?: boolean;
} = {}): Promise<ProjectCategory[]> {
  const snap = await db()
    .collection(COLLECTION)
    .orderBy('order', 'asc')
    .get();
  const all = snap.docs
    .map(serialize)
    .filter((c): c is ProjectCategory => c !== null);
  return opts.includeInactive ? all : all.filter((c) => c.active);
}

export async function getCategoryById(
  id: string,
): Promise<ProjectCategory | null> {
  const snap = await db().collection(COLLECTION).doc(id).get();
  return serialize(snap);
}

export async function getSubCategoriesOf(
  parentId: string,
): Promise<ProjectCategory[]> {
  const snap = await db()
    .collection(COLLECTION)
    .where('parentId', '==', parentId)
    .orderBy('order', 'asc')
    .get();
  return snap.docs
    .map(serialize)
    .filter((c): c is ProjectCategory => c !== null);
}

export async function createCategory(
  input: Omit<ProjectCategoryWriteInput, 'id'>,
): Promise<string> {
  const id = `cat_${nanoid(10)}`;
  const ref = db().collection(COLLECTION).doc(id);
  await ref.set({
    slug: input.slug,
    name: input.name,
    description: input.description ?? null,
    parentId: input.parentId,
    order: input.order ?? 0,
    active: input.active ?? true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return id;
}

export async function updateCategory(
  id: string,
  patch: Partial<Omit<ProjectCategoryWriteInput, 'id'>>,
): Promise<void> {
  const ref = db().collection(COLLECTION).doc(id);
  const payload: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (patch.slug !== undefined) payload.slug = patch.slug;
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.description !== undefined) {
    payload.description = patch.description ?? null;
  }
  if (patch.parentId !== undefined) payload.parentId = patch.parentId;
  if (patch.order !== undefined) payload.order = patch.order;
  if (patch.active !== undefined) payload.active = patch.active;
  await ref.set(payload, { merge: true });
}

/**
 * Soft delete: clears the category from any projectType referencing it
 * (cascade-null) before removing the category doc itself. Sub-categories
 * under the deleted node are also removed in the same batch.
 */
export async function deleteCategory(id: string): Promise<void> {
  const batch = db().batch();
  const ref = db().collection(COLLECTION).doc(id);

  // Cascade-null on projectType.categoryId / subCategoryId
  const [byCat, bySub, subCats] = await Promise.all([
    db().collection('projectTypes').where('categoryId', '==', id).get(),
    db().collection('projectTypes').where('subCategoryId', '==', id).get(),
    db().collection(COLLECTION).where('parentId', '==', id).get(),
  ]);
  byCat.docs.forEach((d) =>
    batch.update(d.ref, { categoryId: null, subCategoryId: null }),
  );
  bySub.docs.forEach((d) => batch.update(d.ref, { subCategoryId: null }));
  subCats.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(ref);
  await batch.commit();
}

export async function reorderCategories(
  orders: Array<{ id: string; order: number }>,
): Promise<void> {
  const batch = db().batch();
  for (const { id, order } of orders) {
    batch.update(db().collection(COLLECTION).doc(id), {
      order,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
}
