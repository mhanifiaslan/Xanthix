import 'server-only';

// DOCX placeholder fill.
//
// Approach (no extra dependencies — JSZip ships transitively via `docx`):
//   1. Read the uploaded skeleton from Storage.
//   2. Unzip; locate `word/document.xml` (and headers/footers for safety).
//   3. Run a simple `{{token}}` replacement against the XML body. Tokens
//      that span multiple text runs (Word will sometimes split a {{ from
//      the closing }} into separate <w:r> elements) are stitched together
//      first by stripping intervening run boundaries inside any opening
//      `{{ … }}` we find.
//   4. Re-zip and return a Buffer.
//
// PDF templates are out of scope this turn — admin can upload them, but
// fillProjectReport throws a clear error when format=pdf so the UI can
// show "PDF doldurma yakında geliyor".

import JSZip from 'jszip';
import { PDFDocument, PDFTextField } from 'pdf-lib';
import {
  readReportTemplateFile,
} from '@/lib/server/reportTemplateStorage';
import type { ProjectDoc, SectionDoc } from '@/types/project';
import type { ProjectType, ReportTemplate } from '@/types/projectType';

const DOCX_BODY_PATHS = [
  'word/document.xml',
  'word/header1.xml',
  'word/header2.xml',
  'word/header3.xml',
  'word/footer1.xml',
  'word/footer2.xml',
  'word/footer3.xml',
];

interface FillArgs {
  project: ProjectDoc;
  sections: SectionDoc[];
  projectType: ProjectType;
  template: ReportTemplate;
}

interface FilledFile {
  buffer: Buffer;
  fileName: string;
}

export async function fillProjectReport(args: FillArgs): Promise<FilledFile> {
  const skeleton = await readReportTemplateFile(args.template.storagePath);
  const replacements = buildReplacements(args);

  if (args.template.fileFormat === 'pdf') {
    const buffer = await fillPdfTemplate(skeleton, replacements);
    return {
      buffer,
      fileName: namedFile(args, 'pdf'),
    };
  }

  // DOCX path.
  const zip = await JSZip.loadAsync(skeleton);
  for (const path of DOCX_BODY_PATHS) {
    const file = zip.file(path);
    if (!file) continue;
    const xml = await file.async('string');
    const repaired = repairSplitPlaceholders(xml);
    const filled = applyReplacements(repaired, replacements);
    zip.file(path, filled);
  }

  const out = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  return {
    buffer: out,
    fileName: namedFile(args, 'docx'),
  };
}

function namedFile(args: FillArgs, ext: 'docx' | 'pdf'): string {
  const safeTitle = args.project.title
    .replace(/[^a-zA-Z0-9À-ɏЀ-ӿ\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50)
    .toLowerCase()
    .replace(/^-+|-+$/g, '') || 'project';
  const safeTemplateName = args.template.name
    .replace(/[^a-zA-Z0-9À-ɏЀ-ӿ\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 30)
    .toLowerCase() || 'report';
  return `xanthix-${safeTitle}-${safeTemplateName}.${ext}`;
}

// ── PDF AcroForm fill ──────────────────────────────────────────────────────
//
// We try two paths so any reasonable admin upload "just works":
//   1. AcroForm field names matching our placeholder dictionary
//      ("projectTitle", "section.summary.content", …) → set the field value.
//   2. Field name happens to be wrapped in {{ … }} → strip the braces and
//      look up the bare key in the dictionary.
// Fields with no match are left untouched.

async function fillPdfTemplate(
  skeleton: Buffer,
  replacements: Record<string, string>,
): Promise<Buffer> {
  // pdf-lib accepts Uint8Array. Skip the form parse entirely if no form.
  const pdfDoc = await PDFDocument.load(new Uint8Array(skeleton));

  const form = pdfDoc.getForm();
  const fields = form.getFields();

  for (const field of fields) {
    if (!(field instanceof PDFTextField)) continue;
    const name = field.getName();
    const candidates = [name, name.replace(/^\{\{\s*|\s*\}\}$/g, '')];
    for (const key of candidates) {
      if (key in replacements) {
        try {
          field.setText(replacements[key]);
        } catch (err) {
          console.warn(`[fillReport] could not set PDF field ${name}`, err);
        }
        break;
      }
    }
  }

  // Flatten so the filled values render even in viewers that don't honour
  // form widgets, but only flatten if there were fields to flatten.
  if (fields.length > 0) {
    try {
      form.flatten();
    } catch {
      // pdf-lib throws on weird forms; safe to skip and keep the form live.
    }
  }

  const bytes = await pdfDoc.save({ updateFieldAppearances: false });
  return Buffer.from(bytes);
}

// ── Placeholder dictionary ─────────────────────────────────────────────────
//
// Supported syntax:
//   {{projectTitle}}
//   {{projectIdea}}
//   {{projectTypeName}}
//   {{currentDate}}
//   {{section.<id>.content}}    ← the raw markdown content of a section
//   {{section.<id>.title}}
//
// Section ids come from the project type schema (e.g. "summary", "budget").

function buildReplacements(args: FillArgs): Record<string, string> {
  const map: Record<string, string> = {
    projectTitle: args.project.title,
    projectIdea: args.project.idea,
    projectTypeName: args.projectType.name,
    currentDate: new Date().toISOString().slice(0, 10),
  };

  for (const sec of args.sections) {
    map[`section.${sec.id}.title`] = sec.title;
    map[`section.${sec.id}.content`] = sec.status === 'ready' ? sec.content : '';
  }

  return map;
}

// ── XML repair: stitch placeholders Word split across runs ─────────────────
//
// Word (and especially Word's "track changes") routinely splits a literal
// `{{userIdea}}` into `{{</w:t></w:r><w:r>…<w:t>userIdea}}`. That trips
// up naive token replacement. We scan the body for any `{{` and, if its
// matching `}}` is on the same line but with intervening run XML in
// between, we strip everything that isn't actual text content from the
// gap.
//
// This is conservative on purpose: we only edit XML that lives between
// well-formed `{{` and `}}` markers.

function repairSplitPlaceholders(xml: string): string {
  // Quick path: no double braces at all.
  if (!xml.includes('{{')) return xml;

  let out = xml;
  let cursor = 0;
  while (true) {
    const open = out.indexOf('{{', cursor);
    if (open === -1) break;
    const close = out.indexOf('}}', open + 2);
    if (close === -1) break;
    const segment = out.slice(open, close + 2);
    if (segment.includes('<')) {
      // Strip every XML tag inside the placeholder segment, leaving plain text.
      const cleaned = segment.replace(/<[^>]+>/g, '');
      out = out.slice(0, open) + cleaned + out.slice(close + 2);
      cursor = open + cleaned.length;
    } else {
      cursor = close + 2;
    }
  }
  return out;
}

// ── Apply the dictionary ───────────────────────────────────────────────────

function applyReplacements(
  xml: string,
  replacements: Record<string, string>,
): string {
  return xml.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, raw) => {
    const key = String(raw).trim();
    if (key in replacements) {
      return escapeXml(replacements[key]);
    }
    // Unknown placeholder: leave as-is so the admin can spot and fix it.
    return match;
  });
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
