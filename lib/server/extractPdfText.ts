import 'server-only';

interface PdfPageText {
  /** 1-indexed page number, matching how reviewers cite "s.42". */
  num: number;
  text: string;
}

interface PdfTextResult {
  text: string;
  pages: PdfPageText[];
  total: number;
}

interface PdfParseModule {
  PDFParse: new (opts: { data: Buffer | Uint8Array }) => {
    getText: () => Promise<{
      text: string;
      pages: PdfPageText[];
      total: number;
    }>;
    destroy: () => Promise<void>;
  };
}

/**
 * Extracts plain text from a PDF buffer.
 *
 * pdf-parse v2 ships a class-based API (PDFParse) and pdfjs-dist as the
 * underlying engine. Dynamic import keeps its top-level worker bootstrap
 * out of the build pass.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const result = await extractPdfTextWithPages(buffer);
  return result.text;
}

/**
 * Same as extractPdfText but also returns per-page text and the total page
 * count. Used by the guide ingestion pipeline so chunks can carry a real
 * page number for citation ("Kılavuz s.42").
 */
export async function extractPdfTextWithPages(
  buffer: Buffer,
): Promise<PdfTextResult> {
  const mod = (await import('pdf-parse')) as unknown as PdfParseModule;
  const PDFParse = mod.PDFParse;
  if (!PDFParse) {
    throw new Error('pdf-parse loaded with an unexpected shape');
  }

  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return {
      text: result.text ?? '',
      pages: result.pages ?? [],
      total: result.total ?? result.pages?.length ?? 0,
    };
  } finally {
    try {
      await parser.destroy();
    } catch {
      // best-effort cleanup
    }
  }
}
