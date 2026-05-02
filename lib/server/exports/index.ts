import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { nanoid } from 'nanoid';
import { getAdminFirestore, getAdminStorage } from '@/lib/firebase/admin';
import { getProjectTypeById } from '@/lib/server/projectTypes';
import { getProjectDoc, listSectionsByProject } from '@/lib/server/projects';
import { buildProjectDocx } from './docx';
import type { ExportDoc, ExportFormat } from '@/types/project';

const SIGNED_URL_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CreateExportArgs {
  projectId: string;
  format: ExportFormat;
}

interface CreateExportResult {
  exportId: string;
  downloadUrl: string;
  fileName: string;
}

export async function createProjectExport(
  args: CreateExportArgs,
): Promise<CreateExportResult> {
  if (args.format !== 'docx') {
    throw new Error(`Format "${args.format}" is not yet supported.`);
  }

  const project = await getProjectDoc(args.projectId);
  if (!project) throw new Error('Project not found');
  if (project.status !== 'ready' && project.status !== 'failed') {
    throw new Error(
      'Bu proje hâlâ üretiliyor. Tüm bölümler bittikten sonra dışa aktarabilirsin.',
    );
  }

  const type = await getProjectTypeById(project.projectTypeId);
  const projectTypeName =
    type?.name[(project.outputLanguage === 'auto' ? 'en' : project.outputLanguage) as 'tr' | 'en' | 'es'] ??
    type?.name.en ??
    project.projectTypeSlug;

  const sections = (await listSectionsByProject(args.projectId)).filter(
    (s) => s.status === 'ready',
  );

  const exportId = `exp_${nanoid(10)}`;
  const exportRef = getAdminFirestore()
    .collection('projects')
    .doc(args.projectId)
    .collection('exports')
    .doc(exportId);
  await exportRef.set({
    format: args.format,
    status: 'pending',
    storagePath: null,
    downloadUrl: null,
    failureReason: null,
    fileName: null,
    sizeBytes: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  try {
    const buffer = await buildProjectDocx({ project, sections, projectTypeName });

    const safeTitle = project.title
      .replace(/[^a-zA-Z0-9À-ɏЀ-ӿ\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 50)
      .toLowerCase()
      .replace(/^-+|-+$/g, '') || 'project';
    const fileName = `xanthix-${project.projectTypeSlug}-${safeTitle}.docx`;
    const storagePath = `projects/${args.projectId}/exports/${exportId}/${fileName}`;

    const bucket = getAdminStorage().bucket();
    const file = bucket.file(storagePath);
    await file.save(buffer, {
      contentType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      metadata: { cacheControl: 'private, max-age=300' },
    });

    const expiresAt = Date.now() + SIGNED_URL_TTL_MS;
    const [downloadUrl] = await file.getSignedUrl({
      action: 'read',
      expires: expiresAt,
      responseDisposition: `attachment; filename="${fileName}"`,
    });

    await exportRef.update({
      status: 'ready',
      storagePath,
      downloadUrl,
      downloadUrlExpiresAt: new Date(expiresAt).toISOString(),
      fileName,
      sizeBytes: buffer.byteLength,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { exportId, downloadUrl, fileName };
  } catch (err) {
    await exportRef.update({
      status: 'failed',
      failureReason: err instanceof Error ? err.message : 'Unknown error',
      updatedAt: FieldValue.serverTimestamp(),
    });
    throw err;
  }
}

export async function refreshExportDownloadUrl(
  projectId: string,
  exportId: string,
): Promise<{ downloadUrl: string; fileName: string }> {
  const exportRef = getAdminFirestore()
    .collection('projects')
    .doc(projectId)
    .collection('exports')
    .doc(exportId);
  const snap = await exportRef.get();
  const data = snap.data() as Partial<ExportDoc> | undefined;
  if (!snap.exists || !data) throw new Error('Export not found');
  if (!data.storagePath) throw new Error('Export is not ready yet');

  const bucket = getAdminStorage().bucket();
  const file = bucket.file(data.storagePath);
  const expiresAt = Date.now() + SIGNED_URL_TTL_MS;
  const [downloadUrl] = await file.getSignedUrl({
    action: 'read',
    expires: expiresAt,
    responseDisposition: data.fileName
      ? `attachment; filename="${data.fileName}"`
      : undefined,
  });

  await exportRef.update({
    downloadUrl,
    downloadUrlExpiresAt: new Date(expiresAt).toISOString(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    downloadUrl,
    fileName: data.fileName ?? `xanthix-${exportId}.docx`,
  };
}
