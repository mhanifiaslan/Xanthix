'use server';

import { z } from 'zod';
import { requireServerSession } from '@/lib/server/getServerSession';
import { getProjectDoc } from '@/lib/server/projects';
import {
  createProjectExport,
  refreshExportDownloadUrl,
} from '@/lib/server/exports';
import { EXPORT_FORMATS } from '@/types/project';

const requestSchema = z.object({
  projectId: z.string().min(1),
  format: z.enum(EXPORT_FORMATS),
});

export type RequestExportInput = z.input<typeof requestSchema>;

export async function requestExportAction(
  rawInput: RequestExportInput,
): Promise<{ exportId: string; downloadUrl: string; fileName: string }> {
  const session = await requireServerSession();
  const input = requestSchema.parse(rawInput);

  const project = await getProjectDoc(input.projectId);
  if (!project) throw new Error('Project not found');
  if (project.ownerUid !== session.uid && session.role !== 'super_admin') {
    throw new Error('Forbidden');
  }

  return await createProjectExport({
    projectId: input.projectId,
    format: input.format,
  });
}

const refreshSchema = z.object({
  projectId: z.string().min(1),
  exportId: z.string().min(1),
});

export async function refreshExportUrlAction(
  rawInput: z.input<typeof refreshSchema>,
): Promise<{ downloadUrl: string; fileName: string }> {
  const session = await requireServerSession();
  const input = refreshSchema.parse(rawInput);

  const project = await getProjectDoc(input.projectId);
  if (!project) throw new Error('Project not found');
  if (project.ownerUid !== session.uid && session.role !== 'super_admin') {
    throw new Error('Forbidden');
  }

  return await refreshExportDownloadUrl(input.projectId, input.exportId);
}
