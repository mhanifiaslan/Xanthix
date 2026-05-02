import 'server-only';
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  TableOfContents,
  TextRun,
} from 'docx';
import { markdownToDocxBlocks } from './markdownToDocx';
import type { ProjectDoc, SectionDoc } from '@/types/project';

export interface BuildDocxInput {
  project: ProjectDoc;
  sections: SectionDoc[];
  projectTypeName: string;
}

const LANG_TAGS: Record<string, string> = {
  tr: 'tr-TR',
  en: 'en-US',
  es: 'es-ES',
  auto: 'en-US',
};

const I18N: Record<string, { idea: string; toc: string; footerNote: string }> = {
  tr: {
    idea: 'Proje Fikri',
    toc: 'İçindekiler',
    footerNote: 'Xanthix.ai ile üretildi',
  },
  en: {
    idea: 'Project Idea',
    toc: 'Table of Contents',
    footerNote: 'Generated with Xanthix.ai',
  },
  es: {
    idea: 'Idea del proyecto',
    toc: 'Índice',
    footerNote: 'Generado con Xanthix.ai',
  },
};

/**
 * Builds a Word document from the project + its ready sections.
 * Returns a Buffer ready to upload to Cloud Storage.
 *
 * Highlights:
 *   - Document language tag matches project.outputLanguage so spell-check
 *     stops underlining everything red in the user's locale.
 *   - Cover page → TOC → page-break, then one HEADING_1 per section so
 *     Word's auto-TOC populates correctly when the user opens the file
 *     and accepts the field-update prompt.
 *   - Running header with the project title + footer with page numbers
 *     ("Sayfa N / M").
 */
export async function buildProjectDocx(input: BuildDocxInput): Promise<Buffer> {
  const { project, sections, projectTypeName } = input;

  const langKey =
    project.outputLanguage === 'auto' ? 'en' : project.outputLanguage;
  const lang = LANG_TAGS[langKey] ?? 'en-US';
  const t = I18N[langKey] ?? I18N.en;

  const dateStr = new Date().toLocaleDateString(
    project.outputLanguage === 'auto' ? 'en-US' : project.outputLanguage,
    { year: 'numeric', month: 'long', day: 'numeric' },
  );

  // ---- Cover ---------------------------------------------------------------
  const cover: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1800, after: 240 },
      children: [
        new TextRun({
          text: 'XANTHIX.AI',
          bold: true,
          size: 18,
          color: '7C3AED',
          characterSpacing: 60,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      spacing: { before: 240, after: 240 },
      border: {
        bottom: { color: '7C3AED', style: BorderStyle.SINGLE, size: 12, space: 6 },
      },
      children: [new TextRun({ text: project.title, bold: true, size: 44 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({
          text: projectTypeName,
          italics: true,
          color: '6B7280',
          size: 26,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 1200 },
      children: [
        new TextRun({
          text: dateStr,
          color: '9CA3AF',
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
      children: [new TextRun({ text: t.idea })],
    }),
    new Paragraph({
      spacing: { after: 240 },
      alignment: AlignmentType.JUSTIFIED,
      children: [new TextRun({ text: project.idea })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  // ---- Table of contents ---------------------------------------------------
  const toc: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 240 },
      children: [new TextRun({ text: t.toc })],
    }),
  ];
  // The TableOfContents element is a paragraph-like field; cast to satisfy
  // the children array's type while keeping the rest of the array typed.
  const tocField = new TableOfContents(t.toc, {
    hyperlink: true,
    headingStyleRange: '1-3',
  }) as unknown as Paragraph;

  // ---- Body ---------------------------------------------------------------
  const body: (Paragraph | ReturnType<typeof markdownToDocxBlocks>[number])[] = [];
  const ordered = [...sections].sort((a, b) => a.order - b.order);
  for (const [idx, section] of ordered.entries()) {
    if (section.status !== 'ready') continue;
    body.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({ text: `${idx + 1}. ${section.title}`, bold: true }),
        ],
        pageBreakBefore: true,
        spacing: { before: 240, after: 200 },
      }),
    );
    body.push(...markdownToDocxBlocks(section.content));
  }

  // ---- Header / Footer -----------------------------------------------------
  const header = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            text: project.title,
            color: '9CA3AF',
            size: 18,
          }),
        ],
      }),
    ],
  });

  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `${t.footerNote}    ·    `,
            color: '9CA3AF',
            size: 16,
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            color: '6B7280',
            size: 16,
          }),
          new TextRun({
            text: ' / ',
            color: '6B7280',
            size: 16,
          }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            color: '6B7280',
            size: 16,
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    creator: 'Xanthix.ai',
    title: project.title,
    description: `${projectTypeName} application draft`,
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 22,
            language: { value: lang },
          },
          paragraph: { spacing: { line: 300 } },
        },
        heading1: {
          run: { size: 32, bold: true, color: '111827', language: { value: lang } },
          paragraph: { spacing: { before: 360, after: 200 } },
        },
        heading2: {
          run: { size: 26, bold: true, color: '1F2937', language: { value: lang } },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
        heading3: {
          run: { size: 22, bold: true, color: '374151', language: { value: lang } },
          paragraph: { spacing: { before: 180, after: 80 } },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: 'numbered',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: 'left',
              style: { paragraph: { indent: { left: 360, hanging: 240 } } },
            },
          ],
        },
      ],
    },
    features: {
      // Tells Word the document needs field updates (TOC) when opened.
      updateFields: true,
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        headers: { default: header },
        footers: { default: footer },
        children: [
          ...cover,
          ...toc,
          tocField,
          new Paragraph({ children: [new PageBreak()] }),
          ...body,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
