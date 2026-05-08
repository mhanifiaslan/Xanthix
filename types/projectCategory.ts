import { z } from 'zod';

export const projectCategorySchema = z.object({
  id: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'lower-kebab-case'),
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullish(),
  /** null = top-level. Otherwise points at the parent category id. */
  parentId: z.string().min(1).nullable(),
  /** Lower numbers sort first within their level. */
  order: z.number().int().nonnegative().default(0),
  active: z.boolean().default(true),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
});
export type ProjectCategory = z.infer<typeof projectCategorySchema>;

export const projectCategoryWriteSchema = projectCategorySchema.omit({
  createdAt: true,
  updatedAt: true,
});
export type ProjectCategoryWrite = z.infer<typeof projectCategoryWriteSchema>;
export type ProjectCategoryWriteInput = z.input<typeof projectCategoryWriteSchema>;
