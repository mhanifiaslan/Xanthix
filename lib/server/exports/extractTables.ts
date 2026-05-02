import 'server-only';

export interface ExtractedTable {
  /** Heading text immediately preceding the table, if any. */
  caption: string | null;
  headers: string[];
  rows: string[][];
}

/**
 * Pulls every GFM-style Markdown table out of a section's content. Tables
 * MUST have a separator row of dashes (we now require this in the prompt
 * template) — anything else is treated as prose and ignored.
 *
 * The returned `caption` is the most recent ATX heading or **bold** lead-in
 * we saw before the table, so the spreadsheet can label its sheets/regions
 * meaningfully.
 */
export function extractMarkdownTables(content: string): ExtractedTable[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const tables: ExtractedTable[] = [];

  let lastHeading: string | null = null;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trimEnd();

    // Track recent heading context for table captions.
    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(line);
    if (headingMatch) {
      lastHeading = headingMatch[2].trim().replace(/[*_`]/g, '');
      i++;
      continue;
    }

    if (line.trim().startsWith('|') && i + 1 < lines.length) {
      const headerRow = splitRow(line);
      const sepRow = splitRow(lines[i + 1].trim());
      const isSep = sepRow.every((c) => /^:?-+:?$/.test(c));
      if (!isSep) {
        i++;
        continue;
      }

      i += 2;
      const bodyRows: string[][] = [];
      while (i < lines.length) {
        const next = lines[i].trim();
        if (!next.startsWith('|')) break;
        bodyRows.push(splitRow(next));
        i++;
      }

      tables.push({
        caption: lastHeading,
        headers: headerRow.map(stripInline),
        rows: bodyRows.map((row) => row.map(stripInline)),
      });
      continue;
    }

    i++;
  }

  return tables;
}

function splitRow(row: string): string[] {
  return row
    .replace(/^\|\s?/, '')
    .replace(/\s?\|\s*$/, '')
    .split('|')
    .map((c) => c.trim());
}

function stripInline(cell: string): string {
  return cell.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
}
