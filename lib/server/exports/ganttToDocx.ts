import 'server-only';
import {
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { parseGantt } from '@/lib/gantt/parse';

const HEADERS = ['ID', 'Görev', 'Başlangıç', 'Bitiş', 'Süre', 'Bağımlı'];

/**
 * Renders the Gantt JSON as a real Word table. Falls back to a single
 * preformatted paragraph if the content can't be parsed.
 */
export function ganttToDocxBlocks(content: string): (Paragraph | Table)[] {
  const parsed = parseGantt(content);
  if (!parsed) {
    return [
      new Paragraph({
        children: [
          new TextRun({
            text: content,
            font: 'Consolas',
            size: 18,
          }),
        ],
        shading: { type: 'clear', fill: 'F4F4F5' },
        spacing: { before: 80, after: 120 },
      }),
    ];
  }

  const fmt = new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const headerRow = new TableRow({
    tableHeader: true,
    children: HEADERS.map(
      (h) =>
        new TableCell({
          shading: { type: 'clear', fill: 'F4F4F5' },
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, bold: true })],
              spacing: { before: 40, after: 40 },
            }),
          ],
        }),
    ),
  });

  const bodyRows = parsed.tasks.map(
    (t) =>
      new TableRow({
        children: [
          textCell(t.id),
          textCell(t.name),
          textCell(t.start ? fmt.format(t.start) : '—'),
          textCell(t.end ? fmt.format(t.end) : '—'),
          textCell(t.durationLabel || '—'),
          textCell(t.dependencies.length ? t.dependencies.join(', ') : '—'),
        ],
      }),
  );

  return [
    new Table({
      rows: [headerRow, ...bodyRows],
      width: { size: 9000, type: WidthType.DXA },
    }),
  ];
}

function textCell(text: string): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text })],
        spacing: { before: 30, after: 30 },
      }),
    ],
  });
}
