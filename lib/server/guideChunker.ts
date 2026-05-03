import 'server-only';

interface Page {
  num: number;
  text: string;
}

export interface RawChunk {
  ordinal: number;
  pageStart: number;
  pageEnd: number;
  headingPath: string[];
  text: string;
  approxTokens: number;
}

interface ChunkOptions {
  /** Hard upper bound on a single chunk's character length. */
  maxChars?: number;
  /** Soft target — try to break around this length when a paragraph fits. */
  targetChars?: number;
}

const DEFAULT_MAX_CHARS = 3000; // ~750 tokens for typical Latin/TR text
const DEFAULT_TARGET_CHARS = 2000;

/**
 * Recognises headings used by the major grant programs we target:
 *   "1 Excellence", "1.1 Methodology", "3.2.1 Risk", "Bölüm 4 — Bütçe",
 *   "ANNEX A: Eligibility".
 * Conservative on purpose — false positives chop content into too many
 * tiny chunks; false negatives just mean a chunk lacks a heading path.
 */
const NUMBERED_HEADING = /^(\d+(?:\.\d+){0,3})\s+([A-ZÇĞİÖŞÜ][^\n]{2,120})$/;
const SECTION_KEYWORD =
  /^(B[öo]l[üu]m|Section|Chapter|Annex|Ek|Appendix|Madde|Article)\s+([A-Z0-9]+(?:\.[0-9]+)*)\s*[—:.\-–]?\s*([^\n]{0,120})$/i;

interface DetectedHeading {
  level: number; // 1 = top-level, 2 = subsection, ...
  label: string; // canonical form for headingPath
}

function detectHeading(line: string): DetectedHeading | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 140) return null;

  const num = NUMBERED_HEADING.exec(trimmed);
  if (num) {
    const dots = (num[1].match(/\./g) ?? []).length;
    return {
      level: dots + 1, // "3" → level 1, "3.2" → level 2, "3.2.1" → level 3
      label: `${num[1]} ${num[2].trim()}`,
    };
  }

  const kw = SECTION_KEYWORD.exec(trimmed);
  if (kw) {
    return {
      level: 1,
      label: `${kw[1]} ${kw[2]}${kw[3] ? ` — ${kw[3].trim()}` : ''}`,
    };
  }

  return null;
}

/** Rough heuristic: ~4 chars per token for mixed TR/EN text. */
function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

/**
 * Splits a guide's per-page text into retrieval chunks.
 *
 * Strategy:
 *   1. Walk pages in order, building a current heading stack.
 *   2. Within each page, split on blank-line paragraph breaks.
 *   3. Pack paragraphs into a chunk until we'd exceed `targetChars`; if a
 *      single paragraph exceeds `maxChars`, hard-split on sentence boundary.
 *   4. Each chunk records the first→last page it spans and the heading path
 *      that was active at chunk start.
 *
 * Returned chunks are stable in order (ordinal = position in array).
 */
export function chunkGuidePages(
  pages: Page[],
  opts: ChunkOptions = {},
): RawChunk[] {
  const maxChars = opts.maxChars ?? DEFAULT_MAX_CHARS;
  const targetChars = opts.targetChars ?? DEFAULT_TARGET_CHARS;

  const chunks: RawChunk[] = [];
  const headingStack: string[] = [];

  // Buffer state for the in-progress chunk.
  let buf = '';
  let bufPageStart: number | null = null;
  let bufPageEnd: number | null = null;
  let bufHeadingPath: string[] = [];

  function flush() {
    if (!buf.trim() || bufPageStart === null || bufPageEnd === null) {
      buf = '';
      bufPageStart = null;
      bufPageEnd = null;
      return;
    }
    const text = buf.trim();
    chunks.push({
      ordinal: chunks.length,
      pageStart: bufPageStart,
      pageEnd: bufPageEnd,
      headingPath: [...bufHeadingPath],
      text,
      approxTokens: estimateTokens(text),
    });
    buf = '';
    bufPageStart = null;
    bufPageEnd = null;
  }

  function append(text: string, pageNum: number) {
    if (!text) return;
    if (bufPageStart === null) {
      bufPageStart = pageNum;
      bufHeadingPath = [...headingStack];
    }
    bufPageEnd = pageNum;
    buf = buf ? `${buf}\n\n${text}` : text;
  }

  for (const page of pages) {
    if (!page.text) continue;

    const lines = page.text.split(/\r?\n/);
    // Re-assemble paragraphs from line breaks (PDF text often has hard
    // wraps at column edges that aren't real paragraph breaks).
    const paragraphs: string[] = [];
    let para: string[] = [];
    for (const raw of lines) {
      const line = raw.trimEnd();
      if (!line.trim()) {
        if (para.length) {
          paragraphs.push(para.join(' ').trim());
          para = [];
        }
      } else {
        para.push(line);
      }
    }
    if (para.length) paragraphs.push(para.join(' ').trim());

    for (const paragraph of paragraphs) {
      if (!paragraph) continue;

      const heading = detectHeading(paragraph);
      if (heading) {
        // Flush whatever we've accumulated under the previous heading,
        // then update the stack and continue.
        flush();
        headingStack.length = Math.min(
          headingStack.length,
          heading.level - 1,
        );
        headingStack.push(heading.label);
        // The heading itself is part of the next chunk so retrieval can
        // surface it as context.
        append(heading.label, page.num);
        continue;
      }

      // Hard-split a single oversized paragraph on sentence boundaries.
      if (paragraph.length > maxChars) {
        const sentences = paragraph.split(/(?<=[.!?…])\s+/);
        for (const s of sentences) {
          if (buf.length + s.length + 2 > maxChars) flush();
          append(s, page.num);
        }
        continue;
      }

      if (buf.length + paragraph.length + 2 > targetChars) flush();
      append(paragraph, page.num);
    }
  }

  flush();
  return chunks;
}
