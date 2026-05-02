import 'server-only';
import ExcelJS from 'exceljs';
import { extractMarkdownTables } from './extractTables';
import type { ProjectDoc, SectionDoc } from '@/types/project';

export interface BuildXlsxInput {
  project: ProjectDoc;
  sections: SectionDoc[];
  projectTypeName: string;
}

/**
 * Builds an Excel workbook from a project. Layout:
 *
 *   - "Özet" / "Summary"   — project metadata + section index
 *   - One sheet per section that contains at least one Markdown table
 *   - Inside a section sheet, every detected table becomes a region with
 *     the table caption on top, headers styled, body rows below, and a
 *     trailing TOPLAM row when a column is fully numeric (best-effort).
 *
 * Sections without tables are not given their own sheet; their text shows
 * up on the summary sheet as a list. The DOCX is the format for prose,
 * XLSX is for the numeric / structured parts.
 */
export async function buildProjectXlsx(input: BuildXlsxInput): Promise<Buffer> {
  const { project, sections, projectTypeName } = input;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Xanthix.ai';
  wb.lastModifiedBy = 'Xanthix.ai';
  wb.created = new Date();
  wb.modified = new Date();
  wb.title = project.title;
  wb.subject = `${projectTypeName} draft`;
  wb.company = 'Xanthix.ai';

  const isTr = project.outputLanguage === 'tr';
  const localeFor = (tr: string, en: string) => (isTr ? tr : en);

  // ---- Summary sheet -------------------------------------------------------
  const summary = wb.addWorksheet(localeFor('Özet', 'Summary'), {
    properties: { tabColor: { argb: 'FF7C3AED' } },
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  summary.columns = [
    { header: localeFor('Alan', 'Field'), key: 'field', width: 24 },
    { header: localeFor('Değer', 'Value'), key: 'value', width: 70 },
  ];
  summary.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summary.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF7C3AED' },
  };

  const ordered = [...sections].sort((a, b) => a.order - b.order);

  summary.addRows([
    { field: localeFor('Proje', 'Project'), value: project.title },
    { field: localeFor('Tür', 'Type'), value: projectTypeName },
    { field: localeFor('Çıktı dili', 'Output language'), value: project.outputLanguage },
    {
      field: localeFor('Toplam token', 'Tokens spent'),
      value: project.tokensSpent,
    },
    {
      field: localeFor('Bölümler', 'Sections'),
      value: `${ordered.filter((s) => s.status === 'ready').length} / ${ordered.length}`,
    },
    {
      field: localeFor('Oluşturulma', 'Created'),
      value:
        typeof project.createdAt === 'string'
          ? new Date(project.createdAt)
          : (project.createdAt ?? new Date()),
    },
  ]);

  // Spacer + section index.
  summary.addRow([]);
  const indexHeader = summary.addRow([
    localeFor('No', '#'),
    localeFor('Bölüm', 'Section'),
  ]);
  indexHeader.font = { bold: true };
  indexHeader.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEEF2FF' },
  };
  ordered.forEach((s, i) => {
    summary.addRow([i + 1, s.title]);
  });

  // ---- Section sheets ------------------------------------------------------
  for (const [idx, section] of ordered.entries()) {
    if (section.status !== 'ready') continue;
    const tables = extractMarkdownTables(section.content);
    if (tables.length === 0) continue;

    const sheetName = sanitizeSheetName(`${idx + 1} ${section.title}`);
    const sheet = wb.addWorksheet(sheetName, {
      views: [{ state: 'frozen', ySplit: 2 }],
      properties: { tabColor: { argb: 'FF4F46E5' } },
      pageSetup: {
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.5, right: 0.5, top: 0.7, bottom: 0.7, header: 0.3, footer: 0.3 },
      },
      headerFooter: {
        oddHeader: `&L&"Calibri"&10&K808080${project.title}&R&"Calibri"&10&K808080${section.title}`,
        oddFooter: '&C&"Calibri"&9&K808080Xanthix.ai · &P / &N',
      },
    });

    let row = 1;
    for (const table of tables) {
      // Caption row.
      const captionRow = sheet.getRow(row);
      captionRow.getCell(1).value = table.caption ?? section.title;
      captionRow.getCell(1).font = { bold: true, size: 12 };
      sheet.mergeCells(row, 1, row, Math.max(table.headers.length, 1));
      row++;

      // Header row.
      const headerRow = sheet.getRow(row);
      table.headers.forEach((h, c) => {
        headerRow.getCell(c + 1).value = h;
      });
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' },
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
      row++;

      const bodyStartRow = row;
      // Detect numeric columns so we can add a TOPLAM row at the end.
      const numericColumns = new Set<number>();
      table.headers.forEach((_, colIdx) => {
        const colValues = table.rows.map((r) => r[colIdx]);
        if (colValues.length > 0 && colValues.every((v) => isNumberLike(v))) {
          numericColumns.add(colIdx);
        }
      });

      for (const dataRow of table.rows) {
        const r = sheet.getRow(row);
        dataRow.forEach((cell, colIdx) => {
          const target = r.getCell(colIdx + 1);
          if (numericColumns.has(colIdx)) {
            const n = toNumber(cell);
            target.value = n ?? cell;
            if (n !== null) target.numFmt = '#,##0.##';
          } else {
            target.value = cell;
          }
          target.alignment = { vertical: 'top', wrapText: true };
        });
        row++;
      }
      const bodyEndRow = row - 1;

      // TOPLAM row when at least one numeric column exists.
      if (numericColumns.size > 0 && bodyEndRow >= bodyStartRow) {
        const totalRow = sheet.getRow(row);
        totalRow.getCell(1).value = isTr ? 'TOPLAM' : 'TOTAL';
        totalRow.font = { bold: true };
        totalRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF1F5F9' },
        };
        numericColumns.forEach((colIdx) => {
          if (colIdx === 0) return; // First column already used for label
          const colLetter = sheet.getColumn(colIdx + 1).letter;
          totalRow.getCell(colIdx + 1).value = {
            formula: `SUM(${colLetter}${bodyStartRow}:${colLetter}${bodyEndRow})`,
          };
          totalRow.getCell(colIdx + 1).numFmt = '#,##0.##';
        });
        row++;
      }

      // Spacer between tables.
      row += 2;
    }

    // Auto-fit-ish column widths (Excel's auto-fit isn't a thing in OOXML;
    // we approximate by max content length).
    sheet.columns.forEach((col) => {
      let max = 12;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const v = cell.value;
        const len = typeof v === 'string' ? v.length : String(v ?? '').length;
        if (len > max) max = Math.min(60, len + 2);
      });
      col.width = max;
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function isNumberLike(value: string): boolean {
  if (!value) return false;
  const cleaned = value.replace(/[\s.,€$₺]/g, '').replace(/TL$/i, '').replace(/EUR$/i, '');
  return /^-?\d+(?:[.,]\d+)?$/.test(cleaned);
}

function toNumber(value: string): number | null {
  if (!isNumberLike(value)) return null;
  // Heuristic: if both . and , exist, treat , as thousands separator.
  // Otherwise treat , as the decimal point (TR convention).
  const hasDot = value.includes('.');
  const hasComma = value.includes(',');
  let normalized = value.replace(/[\s€$₺]/g, '').replace(/TL$/i, '').replace(/EUR$/i, '');
  if (hasDot && hasComma) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    normalized = normalized.replace(',', '.');
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function sanitizeSheetName(name: string): string {
  return name
    .replace(/[\\/?*\[\]:]/g, '-')
    .slice(0, 31) // Excel cap
    .trim() || 'Section';
}
