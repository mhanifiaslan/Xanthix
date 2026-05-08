'use server';

// Server actions backing Tab 4 of the Project Type Builder.
//
// The admin uploads a DOCX/PDF skeleton, the file lands in Firebase
// Storage, and the projectType doc carries a `gs://` reference plus the
// admin's filling instructions. At download time the project owner picks
// a template from the export menu — we read the skeleton, replace
// placeholders, and stream the result back through the standard export
// flow.

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { requireServerSession } from '@/lib/server/getServerSession';
import {
  PROJECT_TYPES_CACHE_TAG,
  getProjectTypeById,
  upsertProjectType,
} from '@/lib/server/projectTypes';
import {
  deleteReportTemplateFile,
  uploadReportTemplate,
  type ReportFileFormat,
} from '@/lib/server/reportTemplateStorage';
import { fillProjectReport } from '@/lib/server/reports/fillReport';
import { getProjectDoc, listSectionsByProject } from '@/lib/server/projects';
import { reportTemplateSchema } from '@/types/projectType';

function assertAdmin(role: string): void {
  if (role !== 'admin' && role !== 'super_admin') {
    throw new Error('Forbidden: admin role required');
  }
}

const MAX_TEMPLATE_BYTES = 15 * 1024 * 1024; // 15 MB

// ── Upload: returns enough metadata for the client to push into the form ──

export interface UploadedTemplateMeta {
  templateId: string;
  storagePath: string;
  fileFormat: ReportFileFormat;
  originalFilename: string;
  sizeBytes: number;
}

export async function uploadReportTemplateAction(
  formData: FormData,
): Promise<UploadedTemplateMeta> {
  const session = await requireServerSession();
  assertAdmin(session.role);

  const projectTypeId = String(formData.get('projectTypeId') ?? '');
  if (!projectTypeId) throw new Error('projectTypeId required');
  const file = formData.get('file');
  if (!(file instanceof File)) throw new Error('file required');
  if (file.size === 0) throw new Error('Dosya boş.');
  if (file.size > MAX_TEMPLATE_BYTES) {
    throw new Error(
      `Şablon en fazla ${Math.round(MAX_TEMPLATE_BYTES / (1024 * 1024))} MB olabilir.`,
    );
  }

  const templateId = `tpl_${nanoid(10)}`;
  const uploaded = await uploadReportTemplate({
    projectTypeId,
    templateId,
    file,
  });

  return {
    templateId,
    storagePath: uploaded.storagePath,
    fileFormat: uploaded.fileFormat,
    originalFilename: file.name,
    sizeBytes: uploaded.sizeBytes,
  };
}

// ── Delete the storage object backing a template (admin removed the row) ──

const deleteSchema = z.object({
  storagePath: z.string().min(1),
});

export async function deleteReportTemplateFileAction(
  raw: z.input<typeof deleteSchema>,
): Promise<{ ok: true }> {
  const session = await requireServerSession();
  assertAdmin(session.role);
  const { storagePath } = deleteSchema.parse(raw);
  await deleteReportTemplateFile(storagePath);
  return { ok: true };
}

// ── Fill a report for a real project + return base64 + file name ──────────

const fillInputSchema = z.object({
  projectId: z.string().min(1),
  templateId: z.string().min(1),
});

export interface FilledReportResult {
  /** Base64-encoded file payload (browser turns this into a Blob and downloads). */
  fileBase64: string;
  fileName: string;
  fileFormat: ReportFileFormat;
}

export async function fillReportAction(
  raw: z.input<typeof fillInputSchema>,
): Promise<FilledReportResult> {
  const session = await requireServerSession();
  // Owner-only or admin: this is a project-scoped action. We let the regular
  // project loader enforce ownership via getProjectDoc.
  void session;

  const { projectId, templateId } = fillInputSchema.parse(raw);
  const project = await getProjectDoc(projectId);
  if (!project) throw new Error('Project not found');
  if (project.ownerUid !== session.uid && session.role !== 'admin' && session.role !== 'super_admin') {
    throw new Error('Forbidden');
  }

  const projectType = await getProjectTypeById(project.projectTypeId);
  if (!projectType) throw new Error('Project type not found');

  const template = (projectType.reportTemplates ?? []).find(
    (t) => t.id === templateId,
  );
  if (!template) throw new Error('Template not found on project type');

  const sections = await listSectionsByProject(projectId);

  const filled = await fillProjectReport({
    project,
    sections,
    projectType,
    template,
  });

  return {
    fileBase64: filled.buffer.toString('base64'),
    fileName: filled.fileName,
    fileFormat: template.fileFormat,
  };
}

// ── Save edits to the projectType's reportTemplates array ─────────────────
//
// Called from the builder when the admin adds/edits a row. We avoid
// touching the rest of the project type doc here so concurrent saves to
// other tabs don't clobber each other.

const saveTemplatesSchema = z.object({
  projectTypeId: z.string().min(1),
  templates: z.array(reportTemplateSchema),
});

export async function saveReportTemplatesAction(
  raw: z.input<typeof saveTemplatesSchema>,
): Promise<{ ok: true }> {
  const session = await requireServerSession();
  assertAdmin(session.role);
  const { projectTypeId, templates } = saveTemplatesSchema.parse(raw);

  const existing = await getProjectTypeById(projectTypeId);
  if (!existing) throw new Error('Project type not found');

  await upsertProjectType({
    ...existing,
    reportTemplates: templates,
  });

  revalidatePath('/[locale]/admin/project-types', 'layout');
  revalidateTag(PROJECT_TYPES_CACHE_TAG, 'max');

  return { ok: true };
}
