import 'server-only';
import {
  AlignmentType,
  HeadingLevel,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type ParagraphChild,
} from 'docx';

// -----------------------------------------------------------------------------
// Markdown → docx converter
//
// Handles the subset of GFM that our Vertex prompts produce:
//   - ATX headings (#, ##, ###, ####)
//   - Paragraphs with inline **bold**, *italic*, _italic_, `code`, [text](url)
//   - Bulleted lists (-, *) and numbered lists (1., 2., …)
//   - GFM tables with the dash separator row
//   - Fenced code blocks (```lang … ```)
//   - Blockquotes (> )
//   - Horizontal rules (---)
//
// Anything else falls through as a plain paragraph so the user still sees
// the text — better degraded than dropped.
// -----------------------------------------------------------------------------

export interface MdBlock {
  paragraphs: (Paragraph | Table)[];
}

export function markdownToDocxBlocks(markdown: string): (Paragraph | Table)[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const out: (Paragraph | Table)[] = [];

  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();

    // Skip blank lines between blocks.
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Fenced code block.
    if (line.startsWith('```')) {
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // consume closing fence
      out.push(
        new Paragraph({
          children: [
            new TextRun({
              text: codeLines.join('\n'),
              font: 'Consolas',
              size: 20,
            }),
          ],
          shading: { type: 'clear', fill: 'F4F4F5' },
          spacing: { before: 80, after: 120 },
        }),
      );
      continue;
    }

    // Horizontal rule.
    if (/^[-*_]{3,}\s*$/.test(line)) {
      out.push(
        new Paragraph({
          border: { bottom: { color: 'D4D4D8', style: 'single', size: 6, space: 1 } },
          spacing: { before: 120, after: 120 },
        }),
      );
      i++;
      continue;
    }

    // Heading.
    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(line);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      out.push(
        new Paragraph({
          heading: ([
            HeadingLevel.HEADING_1,
            HeadingLevel.HEADING_2,
            HeadingLevel.HEADING_3,
            HeadingLevel.HEADING_4,
          ] as const)[level - 1],
          children: parseInline(stripInlineMarkers(text)),
          spacing: { before: 240, after: 120 },
        }),
      );
      i++;
      continue;
    }

    // Blockquote.
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push(
        new Paragraph({
          children: parseInline(quoteLines.join(' ').trim()),
          indent: { left: 360 },
          border: { left: { color: '7C3AED', style: 'single', size: 12, space: 8 } },
          spacing: { before: 120, after: 120 },
        }),
      );
      continue;
    }

    // GFM table.
    if (line.trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      const table = parseTable(tableLines);
      if (table) {
        out.push(table);
        continue;
      }
      // Malformed table — fall back to paragraphs of each row line.
      tableLines.forEach((row) => {
        out.push(
          new Paragraph({
            children: parseInline(row),
            spacing: { before: 40, after: 40 },
          }),
        );
      });
      continue;
    }

    // Bulleted or numbered list — collect contiguous list items.
    const bulletMatch = /^([-*])\s+(.+)$/.exec(line);
    const numberMatch = /^(\d+)\.\s+(.+)$/.exec(line);
    if (bulletMatch || numberMatch) {
      const isNumbered = !!numberMatch;
      const items: string[] = [];
      while (i < lines.length) {
        const li = lines[i].trimEnd();
        const b = /^([-*])\s+(.+)$/.exec(li);
        const n = /^(\d+)\.\s+(.+)$/.exec(li);
        if (isNumbered ? !n : !b) break;
        items.push((isNumbered ? n![2] : b![2]).trim());
        i++;
      }
      items.forEach((item) => {
        out.push(
          new Paragraph({
            children: parseInline(item),
            bullet: isNumbered ? undefined : { level: 0 },
            numbering: isNumbered ? { reference: 'numbered', level: 0 } : undefined,
            spacing: { before: 40, after: 40 },
            indent: { left: 360 },
          }),
        );
      });
      continue;
    }

    // Regular paragraph — collect contiguous non-blank lines.
    const paraLines: string[] = [line];
    i++;
    while (i < lines.length) {
      const next = lines[i].trimEnd();
      if (next === '') break;
      if (/^(#{1,4}\s|>\s|```|[-*_]{3,}\s*$|\|)/.test(next)) break;
      if (/^([-*])\s+|^(\d+)\.\s+/.test(next)) break;
      paraLines.push(next);
      i++;
    }
    out.push(
      new Paragraph({
        children: parseInline(paraLines.join(' ')),
        spacing: { before: 80, after: 80 },
        alignment: AlignmentType.JUSTIFIED,
      }),
    );
  }

  return out;
}

// ---- Inline parsing --------------------------------------------------------

const INLINE_PATTERN = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

function parseInline(text: string): ParagraphChild[] {
  const runs: ParagraphChild[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE_PATTERN)) {
    const idx = match.index ?? 0;
    if (idx > last) {
      runs.push(new TextRun({ text: text.slice(last, idx) }));
    }
    const token = match[0];
    if (token.startsWith('**') || token.startsWith('__')) {
      runs.push(new TextRun({ text: token.slice(2, -2), bold: true }));
    } else if (token.startsWith('*') || token.startsWith('_')) {
      runs.push(new TextRun({ text: token.slice(1, -1), italics: true }));
    } else if (token.startsWith('`')) {
      runs.push(
        new TextRun({
          text: token.slice(1, -1),
          font: 'Consolas',
          shading: { type: 'clear', fill: 'F4F4F5' },
        }),
      );
    } else if (token.startsWith('[')) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch) {
        // We avoid creating a real ExternalHyperlink to keep dependencies lean —
        // emit the link text bolded and the URL as a parenthetical.
        runs.push(
          new TextRun({ text: linkMatch[1], bold: true }),
          new TextRun({ text: ` (${linkMatch[2]})`, italics: true, color: '6B7280' }),
        );
      }
    }
    last = idx + token.length;
  }
  if (last < text.length) {
    runs.push(new TextRun({ text: text.slice(last) }));
  }
  if (runs.length === 0) {
    runs.push(new TextRun({ text }));
  }
  return runs;
}

function stripInlineMarkers(text: string): string {
  return text.replace(/\*\*|__|\*|_|`/g, '');
}

// ---- Table parsing ---------------------------------------------------------

function parseTable(rows: string[]): Table | null {
  if (rows.length < 2) return null;
  const header = splitRow(rows[0]);
  const sep = splitRow(rows[1]);
  // Separator row must be all dashes (with optional alignment colons).
  const isSeparator = sep.every((c) => /^:?-+:?$/.test(c.trim()));
  if (!isSeparator) return null;

  const bodyRows = rows.slice(2).map(splitRow);

  const tableRows: TableRow[] = [];
  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: header.map(
        (cell) =>
          new TableCell({
            shading: { type: 'clear', fill: 'F4F4F5' },
            children: [
              new Paragraph({
                children: parseInline(cell.trim()),
                spacing: { before: 40, after: 40 },
              }),
            ],
            width: { size: Math.floor(9000 / header.length), type: WidthType.DXA },
          }),
      ),
    }),
  );
  bodyRows.forEach((row) => {
    tableRows.push(
      new TableRow({
        children: header.map(
          (_, idx) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: parseInline((row[idx] ?? '').trim()),
                  spacing: { before: 30, after: 30 },
                }),
              ],
              width: { size: Math.floor(9000 / header.length), type: WidthType.DXA },
            }),
        ),
      }),
    );
  });

  return new Table({
    rows: tableRows,
    width: { size: 9000, type: WidthType.DXA },
  });
}

function splitRow(row: string): string[] {
  // Trim outer pipes and split.
  return row
    .replace(/^\|\s?/, '')
    .replace(/\s?\|\s*$/, '')
    .split('|')
    .map((c) => c.trim());
}
