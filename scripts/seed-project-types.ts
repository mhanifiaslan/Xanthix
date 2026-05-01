/* eslint-disable no-console */
// Usage:
//   npm run seed:project-types
//
// Loads the SEED_PROJECT_TYPES list from lib/seed/projectTypes.ts and writes
// each entry to Firestore (collection: projectTypes). Idempotent — re-running
// is safe; existing docs are merged with the latest template content.
import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import {
  initializeApp,
  cert,
  applicationDefault,
  getApps,
} from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { SEED_PROJECT_TYPES } from '../lib/seed/projectTypes';
import { projectTypeWriteSchema } from '../types/projectType';

config({ path: '.env.local' });

if (!getApps().length) {
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (path) {
    const sa = JSON.parse(readFileSync(path, 'utf8'));
    initializeApp({ credential: cert(sa), projectId: sa.project_id });
  } else {
    initializeApp({
      credential: applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
}

const dbId = process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID;
const db =
  dbId && dbId !== '(default)'
    ? getFirestore(undefined as never, dbId)
    : getFirestore();

async function main() {
  console.log(
    `Seeding ${SEED_PROJECT_TYPES.length} project types into "${dbId ?? '(default)'}"…\n`,
  );

  let written = 0;
  for (const t of SEED_PROJECT_TYPES) {
    // Validate before writing — fail loud if seed data drifts from the schema.
    const parsed = projectTypeWriteSchema.parse(t);
    const ref = db.collection('projectTypes').doc(parsed.id);
    const existing = await ref.get();
    await ref.set(
      {
        ...parsed,
        ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    written++;
    console.log(
      `  ${existing.exists ? '↻' : '+'} ${parsed.id.padEnd(24)} ${parsed.name.tr}`,
    );
  }

  console.log(`\n✅ ${written} project type(s) upserted.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
