import 'server-only';

type PdfParseFn = (b: Buffer) => Promise<{ text: string }>;

/**
 * Extracts plain text from a PDF buffer.
 *
 * Uses pdf-parse via dynamic import so its top-level test-pdf bootstrap
 * doesn't get pulled into the build graph at compile time.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const mod = (await import('pdf-parse')) as unknown as
    | { default: PdfParseFn }
    | PdfParseFn;
  const fn: PdfParseFn = typeof mod === 'function' ? mod : mod.default;
  const result = await fn(buffer);
  return result.text;
}
