'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireServerSession } from '@/lib/server/getServerSession';
import {
  deleteGuide,
  listGuidesForType,
  setActiveGuide,
  uploadGuide,
} from '@/lib/server/projectTypeGuides';
import type { ProjectTypeGuide } from '@/types/projectTypeGuide';

function assertAdmin(role: string): void {
  if (role !== 'admin' && role !== 'super_admin') {
    throw new Error('Forbidden: admin role required');
  }
}

const MAX_PDF_BYTES = 15 * 1024 * 1024; // 15 MB — same cap as the from-guide drafter
const MAX_TITLE_LEN = 200;

/**
 * Uploads a new guide PDF for a project type and runs the chunk + embed
 * pipeline synchronously. Resolves with the persisted guide doc.
 *
 * Times out at the Server Action ceiling (currently ~5 min on Cloud Run).
 * For 100-page guides expect 30-90s end-to-end (PDF extract + 4-8 embed
 * batches). If this becomes a bottleneck we'll move ingestion to a Cloud
 * Function and have the action just hand off the PDF.
 */
export async function uploadGuideAction(
  formData: FormData,
): Promise<ProjectTypeGuide> {
  const session = await requireServerSession();
  assertAdmin(session.role);

  const projectTypeId = String(formData.get('projectTypeId') ?? '').trim();
  if (!projectTypeId) throw new Error('projectTypeId zorunlu.');

  const titleRaw = String(formData.get('title') ?? '').trim();
  if (!titleRaw) throw new Error('Klavuz başlığı zorunlu.');
  if (titleRaw.length > MAX_TITLE_LEN) {
    throw new Error(`Başlık en fazla ${MAX_TITLE_LEN} karakter olabilir.`);
  }

  const setActive = formData.get('setActive') === 'true';

  const file = formData.get('pdf');
  if (!(file instanceof File)) throw new Error('PDF dosyası bulunamadı.');
  if (file.size === 0) throw new Error('PDF dosyası boş.');
  if (file.size > MAX_PDF_BYTES) {
    throw new Error(
      `PDF en fazla ${Math.round(MAX_PDF_BYTES / (1024 * 1024))} MB olabilir.`,
    );
  }
  const isPdf =
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) throw new Error('Yüklenen dosya PDF değil.');

  const buffer = Buffer.from(await file.arrayBuffer());

  const guide = await uploadGuide({
    projectTypeId,
    uploadedByUid: session.uid,
    title: titleRaw,
    originalFilename: file.name,
    pdfBuffer: buffer,
    setAsActive: setActive,
  });

  revalidatePath(`/[locale]/admin/project-types/${projectTypeId}/guides`, 'page');
  return guide;
}

const setActiveSchema = z.object({
  projectTypeId: z.string().min(1),
  guideId: z.string().min(1),
});

export async function setActiveGuideAction(
  raw: z.input<typeof setActiveSchema>,
): Promise<{ ok: true }> {
  const session = await requireServerSession();
  assertAdmin(session.role);
  const input = setActiveSchema.parse(raw);
  await setActiveGuide(input.projectTypeId, input.guideId);
  revalidatePath(
    `/[locale]/admin/project-types/${input.projectTypeId}/guides`,
    'page',
  );
  return { ok: true };
}

const deleteGuideSchema = z.object({
  projectTypeId: z.string().min(1),
  guideId: z.string().min(1),
});

export async function deleteGuideAction(
  raw: z.input<typeof deleteGuideSchema>,
): Promise<{ ok: true }> {
  const session = await requireServerSession();
  assertAdmin(session.role);
  const input = deleteGuideSchema.parse(raw);
  await deleteGuide(input.guideId);
  revalidatePath(
    `/[locale]/admin/project-types/${input.projectTypeId}/guides`,
    'page',
  );
  return { ok: true };
}

const listGuidesSchema = z.object({ projectTypeId: z.string().min(1) });

/**
 * Server-action variant of listGuidesForType, useful for client polling
 * while a 'processing' guide finishes embedding.
 */
export async function listGuidesAction(
  raw: z.input<typeof listGuidesSchema>,
): Promise<ProjectTypeGuide[]> {
  const session = await requireServerSession();
  assertAdmin(session.role);
  const { projectTypeId } = listGuidesSchema.parse(raw);
  return listGuidesForType(projectTypeId);
}
