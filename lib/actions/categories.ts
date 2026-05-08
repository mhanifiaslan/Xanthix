'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireServerSession } from '@/lib/server/getServerSession';
import {
  createCategory,
  deleteCategory,
  reorderCategories,
  updateCategory,
} from '@/lib/server/projectCategories';

async function requireAdmin() {
  const session = await requireServerSession();
  if (session.role !== 'admin' && session.role !== 'super_admin') {
    throw new Error('Forbidden — admin only');
  }
  return session;
}

const createSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'lower-kebab-case'),
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullish(),
  parentId: z.string().min(1).nullable(),
  order: z.number().int().nonnegative().default(0),
  active: z.boolean().default(true),
});

export type CreateCategoryInput = z.input<typeof createSchema>;

export async function createCategoryAction(
  raw: CreateCategoryInput,
): Promise<{ id: string }> {
  await requireAdmin();
  const input = createSchema.parse(raw);
  const id = await createCategory(input);
  revalidatePath('/[locale]/admin/categories', 'page');
  revalidatePath('/[locale]/admin/project-types', 'page');
  return { id };
}

const updateSchema = createSchema.partial().extend({
  id: z.string().min(1),
});

export async function updateCategoryAction(
  raw: z.input<typeof updateSchema>,
): Promise<{ ok: true }> {
  await requireAdmin();
  const { id, ...patch } = updateSchema.parse(raw);
  await updateCategory(id, patch);
  revalidatePath('/[locale]/admin/categories', 'page');
  revalidatePath('/[locale]/admin/project-types', 'page');
  return { ok: true };
}

export async function deleteCategoryAction(id: string): Promise<{ ok: true }> {
  await requireAdmin();
  await deleteCategory(id);
  revalidatePath('/[locale]/admin/categories', 'page');
  revalidatePath('/[locale]/admin/project-types', 'page');
  return { ok: true };
}

const reorderSchema = z.object({
  orders: z.array(
    z.object({
      id: z.string().min(1),
      order: z.number().int().nonnegative(),
    }),
  ),
});

export async function reorderCategoriesAction(
  raw: z.input<typeof reorderSchema>,
): Promise<{ ok: true }> {
  await requireAdmin();
  const { orders } = reorderSchema.parse(raw);
  await reorderCategories(orders);
  revalidatePath('/[locale]/admin/categories', 'page');
  return { ok: true };
}
