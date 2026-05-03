/* eslint-disable no-console */
//
// Smoke test for the Phase 8A.1 RAG pipeline. End-to-end: uploads one PDF
// guide for a given project type, embeds + indexes it, then runs a sample
// query and prints the top-K relevant chunks + cosine distances.
//
// Usage:
//   tsx scripts/smoke-rag.ts <projectTypeId> <guideTitle> <pdfPath> [query]
//
// Examples:
//   tsx scripts/smoke-rag.ts tubitak-1507 "TÜBİTAK 1507 2025 Kılavuzu" \
//        ./samples/tubitak-1507.pdf "yenilik ve özgün değer kriterleri"
//
//   tsx scripts/smoke-rag.ts horizon-cluster4 "Horizon Cluster 4 Call 2026" \
//        ./samples/horizon.pdf
//
// Requires the same env this project uses (.env.local with
// FIREBASE_SERVICE_ACCOUNT_PATH or ADC, plus NEXT_PUBLIC_FIREBASE_PROJECT_ID,
// NEXT_PUBLIC_FIRESTORE_DATABASE_ID, NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET).
//
// What "passing" looks like:
//   - Upload completes without error
//   - chunkCount > 0 and matches the guide's apparent section count
//   - Top hit's cosine distance < 0.6 for an obviously-related query
//   - Distances strictly increase in the result list

import { config } from 'dotenv';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

config({ path: '.env.local' });

async function main() {
  const [, , projectTypeId, title, pdfPathRaw, queryArg] = process.argv;
  if (!projectTypeId || !title || !pdfPathRaw) {
    console.error(
      'Usage: tsx scripts/smoke-rag.ts <projectTypeId> <title> <pdfPath> [query]',
    );
    process.exit(1);
  }
  const pdfPath = resolve(pdfPathRaw);
  const stat = statSync(pdfPath);
  if (!stat.isFile()) throw new Error(`Not a file: ${pdfPath}`);

  // Lazy imports so dotenv has populated env before any module reads it.
  const { uploadGuide, findRelevantChunks } = await import(
    '../lib/server/projectTypeGuides'
  );

  console.log(`→ uploading ${pdfPath} (${(stat.size / 1024).toFixed(0)} KB)`);
  const t0 = Date.now();
  const guide = await uploadGuide({
    projectTypeId,
    uploadedByUid: 'smoke-test',
    title,
    originalFilename: pdfPath.split(/[\\/]/).pop() ?? 'guide.pdf',
    pdfBuffer: readFileSync(pdfPath),
    setAsActive: true,
  });
  const uploadMs = Date.now() - t0;

  console.log(`✓ guide ${guide.id} ready in ${uploadMs}ms`);
  console.log(
    `  pages=${guide.pageCount} chunks=${guide.chunkCount} model=${guide.embeddingModel}`,
  );
  console.log(`  storage=${guide.storagePath}`);

  const query =
    queryArg ?? 'değerlendirme kriterleri ve puanlama yöntemi';
  console.log(`\n→ query: "${query}"`);
  const tq = Date.now();
  const hits = await findRelevantChunks({
    guideId: guide.id,
    query,
    limit: 5,
  });
  console.log(`✓ findNearest returned ${hits.length} hits in ${Date.now() - tq}ms\n`);

  hits.forEach((h, i) => {
    const heading = h.headingPath.length ? h.headingPath.join(' › ') : '(no heading)';
    console.log(
      `[${i + 1}] dist=${h.distance.toFixed(4)} s.${h.pageStart}-${h.pageEnd} | ${heading}`,
    );
    console.log(`    ${h.text.slice(0, 220).replace(/\s+/g, ' ')}…\n`);
  });

  // Sanity: distances should be monotonically increasing.
  const monotonic = hits.every(
    (h, i) => i === 0 || h.distance >= hits[i - 1].distance,
  );
  if (!monotonic) {
    console.warn('⚠ distances not monotonically increasing — investigate.');
  }
  if (hits[0] && hits[0].distance > 0.6) {
    console.warn(
      `⚠ best hit distance ${hits[0].distance.toFixed(3)} > 0.6 — query may be too loose, or guide doesn't cover this topic.`,
    );
  } else if (hits[0]) {
    console.log(`✓ best hit distance ${hits[0].distance.toFixed(3)} looks healthy.`);
  }
}

main().catch((err) => {
  console.error('✗ smoke test failed:', err);
  process.exit(1);
});
