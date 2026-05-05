import { z } from 'zod';

// Project (the user's instance, not the template) — still mock until Sprint 3
// wires the /projects collection. ProjectType lives in ./projectType.ts.

export const projectStatusSchema = z.enum(['taslak', 'devam eden', 'tamamlandi']);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const projectFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['pdf', 'docx', 'xlsx', 'pptx']),
  size: z.string(),
  updatedAt: z.string(),
});
export type ProjectFile = z.infer<typeof projectFileSchema>;

export const projectSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
});
export type ProjectSection = z.infer<typeof projectSectionSchema>;

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  typeId: z.string(),
  type: z.string(),
  status: projectStatusSchema,
  progress: z.number().min(0).max(100),
  lastModified: z.string(),
  budget: z.string().optional(),
  summary: z.string().optional(),
  deadline: z.string().optional(),
  teamMembers: z.array(z.string()).optional(),
  files: z.array(projectFileSchema).optional(),
  sections: z.array(projectSectionSchema).optional(),
});
export type Project = z.infer<typeof projectSchema>;

export type { ProjectType, Section } from './projectType';
