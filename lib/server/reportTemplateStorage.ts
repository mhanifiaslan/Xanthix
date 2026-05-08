import 'server-only';

import { nanoid } from 'nanoid';
import { getAdminStorage } from '@/lib/firebase/admin';

// ── Report-template skeleton storage ────────────────────────────────────────
//
// Admins upload DOCX/PDF skeletons that the AI fills with the project's
// generated content. Files live under
//   reportTemplates/{projectTypeId}/{templateId}.{ext}
// in the default Firebase Storage bucket. We persist a `gs://` storage
// path inside the projectType doc and re-issue short signed URLs whenever
// the admin or the fill pipeline needs to read the file.

const PREFIX = 'reportTemplates';
const SIGNED_URL_TTL_MS = 60 * 60 * 1000; // 1 hour — admin previews only

const MIME = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
} as const;

export type ReportFileFormat = keyof typeof MIME;

export interface UploadedReportTemplate {
  /** Stable `gs://bucket/path` reference — what we persist on the project type. */
  storagePath: string;
  /** Short-lived signed URL — useful for the admin preview link. */
  signedUrl: string;
  fileFormat: ReportFileFormat;
  sizeBytes: number;
}

function inferFormat(file: File): ReportFileFormat {
  const lower = file.name.toLowerCase();
  if (file.type === MIME.docx || lower.endsWith('.docx')) return 'docx';
  if (file.type === MIME.pdf || lower.endsWith('.pdf')) return 'pdf';
  throw new Error('Unsupported template format — only DOCX and PDF are allowed.');
}

export async function uploadReportTemplate(args: {
  projectTypeId: string;
  templateId?: string;
  file: File;
}): Promise<UploadedReportTemplate> {
  const fileFormat = inferFormat(args.file);
  const templateId = args.templateId || `tpl_${nanoid(10)}`;
  const ext = fileFormat;
  const path = `${PREFIX}/${args.projectTypeId}/${templateId}.${ext}`;

  const bucket = getAdminStorage().bucket();
  const blob = bucket.file(path);
  const buffer = Buffer.from(await args.file.arrayBuffer());

  await blob.save(buffer, {
    contentType: MIME[fileFormat],
    resumable: false,
    metadata: {
      metadata: {
        projectTypeId: args.projectTypeId,
        templateId,
      },
    },
  });

  const [signedUrl] = await blob.getSignedUrl({
    action: 'read',
    expires: Date.now() + SIGNED_URL_TTL_MS,
  });

  return {
    storagePath: `gs://${bucket.name}/${path}`,
    signedUrl,
    fileFormat,
    sizeBytes: buffer.byteLength,
  };
}

export async function deleteReportTemplateFile(storagePath: string): Promise<void> {
  // storagePath format: gs://<bucket>/<path>
  const match = /^gs:\/\/([^/]+)\/(.+)$/.exec(storagePath);
  if (!match) {
    console.warn(
      `[reportTemplateStorage] Unexpected storagePath, skipping delete: ${storagePath}`,
    );
    return;
  }
  const [, bucketName, path] = match;
  const bucket = getAdminStorage().bucket(bucketName);
  try {
    await bucket.file(path).delete({ ignoreNotFound: true });
  } catch (err) {
    console.warn('[reportTemplateStorage] delete failed', err);
  }
}

/** Read the raw bytes of a stored template — used by the fill pipeline. */
export async function readReportTemplateFile(
  storagePath: string,
): Promise<Buffer> {
  const match = /^gs:\/\/([^/]+)\/(.+)$/.exec(storagePath);
  if (!match) throw new Error(`Invalid storagePath: ${storagePath}`);
  const [, bucketName, path] = match;
  const bucket = getAdminStorage().bucket(bucketName);
  const [buffer] = await bucket.file(path).download();
  return buffer;
}

/** Issue a short-lived URL for admin preview links. */
export async function getReportTemplateSignedUrl(
  storagePath: string,
): Promise<string> {
  const match = /^gs:\/\/([^/]+)\/(.+)$/.exec(storagePath);
  if (!match) throw new Error(`Invalid storagePath: ${storagePath}`);
  const [, bucketName, path] = match;
  const bucket = getAdminStorage().bucket(bucketName);
  const [signedUrl] = await bucket.file(path).getSignedUrl({
    action: 'read',
    expires: Date.now() + SIGNED_URL_TTL_MS,
  });
  return signedUrl;
}
