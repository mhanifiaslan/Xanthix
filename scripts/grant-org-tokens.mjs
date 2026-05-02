/* eslint-disable no-console */
// Usage:
//   node scripts/grant-org-tokens.mjs <orgId> <amount> [reason]
//
// Atomically credits an org's token wallet and writes a 'bonus' transaction.
// Useful for trial credits and manual top-ups before Stripe lands.
import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import {
  initializeApp,
  cert,
  applicationDefault,
  getApps,
} from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

config({ path: '.env.local' });

const [, , orgId, rawAmount, ...reasonParts] = process.argv;
if (!orgId || !rawAmount) {
  console.error('Usage: node scripts/grant-org-tokens.mjs <orgId> <amount> [reason]');
  process.exit(1);
}
const amount = Number(rawAmount);
if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
  console.error(`Invalid amount "${rawAmount}". Must be a positive integer.`);
  process.exit(1);
}
const reason = reasonParts.join(' ').trim() || 'manual_org_grant';

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
    ? getFirestore(undefined, dbId)
    : getFirestore();

async function main() {
  const orgRef = db.collection('organizations').doc(orgId);
  const txRef = db.collection('tokenTransactions').doc();

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(orgRef);
    if (!snap.exists) {
      throw new Error(`Organization ${orgId} not found.`);
    }
    const balance = snap.data()?.tokenBalance ?? 0;
    const next = balance + amount;
    tx.update(orgRef, {
      tokenBalance: next,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(txRef, {
      orgId,
      userId: null,
      type: 'bonus',
      amount,
      balanceAfter: next,
      reason,
      grantedByUid: 'cli',
      createdAt: FieldValue.serverTimestamp(),
    });
    return { balance, next, name: snap.data()?.name ?? orgId };
  });

  console.log(
    `✅ ${result.name} (${orgId}): ${result.balance} → ${result.next} (+${amount}, reason: "${reason}")`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
