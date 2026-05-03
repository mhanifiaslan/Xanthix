/* eslint-disable no-console */
// Usage:
//   npm run seed:token-packages
//
// Idempotent: runs `set` with merge-style fields, so re-running updates the
// price/copy without losing any historical references in `purchases`. Add or
// remove packages by editing STARTER_PACKAGES below.
import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import {
  initializeApp,
  cert,
  applicationDefault,
  getApps,
} from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { tokenPackageDocSchema } from '../types/payment';

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

const STARTER_PACKAGES = [
  {
    id: 'pkg_starter_100_try',
    slug: 'starter-100',
    name: 'Başlangıç',
    description: 'Yeni başlayanlar için küçük paket.',
    tokenAmount: 100,
    bonusTokens: 0,
    price: 99,
    currency: 'TRY' as const,
    active: true,
    displayOrder: 10,
    isPopular: false,
  },
  {
    id: 'pkg_plus_500_try',
    slug: 'plus-500',
    name: 'Plus',
    description: 'Düzenli kullanıcılar için.',
    tokenAmount: 500,
    bonusTokens: 50,
    price: 399,
    currency: 'TRY' as const,
    active: true,
    displayOrder: 20,
    isPopular: true,
  },
  {
    id: 'pkg_pro_1500_try',
    slug: 'pro-1500',
    name: 'Pro',
    description: 'Yoğun proje yazımı için.',
    tokenAmount: 1500,
    bonusTokens: 250,
    price: 999,
    currency: 'TRY' as const,
    active: true,
    displayOrder: 30,
    isPopular: false,
  },
];

async function main() {
  console.log(
    `Seeding ${STARTER_PACKAGES.length} token packages into "${dbId ?? '(default)'}"…\n`,
  );

  let written = 0;
  for (const p of STARTER_PACKAGES) {
    // Validate against the same Zod schema the runtime uses.
    const parsed = tokenPackageDocSchema.parse(p);
    const ref = db.collection('tokenPackages').doc(parsed.id);
    const snap = await ref.get();
    await ref.set(
      {
        slug: parsed.slug,
        name: parsed.name,
        description: parsed.description ?? null,
        tokenAmount: parsed.tokenAmount,
        bonusTokens: parsed.bonusTokens,
        price: parsed.price,
        currency: parsed.currency,
        active: parsed.active,
        displayOrder: parsed.displayOrder,
        isPopular: parsed.isPopular,
        updatedAt: FieldValue.serverTimestamp(),
        ...(snap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      },
      { merge: true },
    );
    console.log(
      `  ${snap.exists ? '↻' : '+'} ${parsed.id}  ${parsed.tokenAmount}+${parsed.bonusTokens} tokens — ${parsed.price} ${parsed.currency}`,
    );
    written += 1;
  }
  console.log(`\nDone. ${written}/${STARTER_PACKAGES.length} written.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
