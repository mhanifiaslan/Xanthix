import 'server-only';

interface PdfParseModule {
  PDFParse: new (opts: { data: Buffer | Uint8Array }) => {
    getText: () => Promise<{ text: string }>;
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
  const mod = (await import('pdf-parse')) as unknown as PdfParseModule;
  const PDFParse = mod.PDFParse;
  if (!PDFParse) {
    throw new Error('pdf-parse loaded with an unexpected shape');
  }

  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text ?? '';
  } finally {
    try {
      await parser.destroy();
    } catch {
      // best-effort cleanup
    }
  }
}
