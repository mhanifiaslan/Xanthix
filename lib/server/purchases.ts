import 'server-only';
import {
  FieldValue,
  type Firestore,
  type Timestamp,
} from 'firebase-admin/firestore';
import { nanoid } from 'nanoid';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  purchaseDocSchema,
  type PurchaseDoc,
  type TokenPackageDoc,
} from '@/types/payment';

function db(): Firestore {
  return getAdminFirestore();
}

function isoFromTs(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  const ts = value as Timestamp;
  return typeof ts.toDate === 'function' ? ts.toDate().toISOString() : undefined;
}

function toPurchase(
  snap: FirebaseFirestore.DocumentSnapshot,
): PurchaseDoc | null {
  const data = snap.data();
  if (!data) return null;
  const parsed = purchaseDocSchema.safeParse({
    ...data,
    id: snap.id,
    createdAt: isoFromTs(data.createdAt),
    completedAt: isoFromTs(data.completedAt),
  });
  if (!parsed.success) return null;
  return parsed.data;
}

// ----- Create / Read -------------------------------------------------------

export async function createPendingPurchase(opts: {
  userId: string;
  orgId: string | null;
  pkg: TokenPackageDoc;
  iyzicoConversationId: string;
}): Promise<PurchaseDoc> {
  const id = `pur_${nanoid(14)}`;
  const ref = db().collection('purchases').doc(id);
  await ref.set({
    kind: 'tokens' as const,
    status: 'pending' as const,
    userId: opts.userId,
    orgId: opts.orgId,
    packageId: opts.pkg.id,
    packageSlug: opts.pkg.slug,
    packageName: opts.pkg.name,
    tokenAmount: opts.pkg.tokenAmount,
    bonusTokens: opts.pkg.bonusTokens,
    price: opts.pkg.price,
    currency: opts.pkg.currency,
    iyzicoConversationId: opts.iyzicoConversationId,
    iyzicoToken: null,
    iyzicoPaymentId: null,
    failureReason: null,
    tokenTransactionId: null,
    createdAt: FieldValue.serverTimestamp(),
    completedAt: null,
  });
  const fresh = await ref.get();
  const parsed = toPurchase(fresh);
  if (!parsed) throw new Error('Failed to read freshly-created purchase');
  return parsed;
}

export async function setPurchaseToken(
  purchaseId: string,
  iyzicoToken: string,
): Promise<void> {
  await db().collection('purchases').doc(purchaseId).update({ iyzicoToken });
}

export async function getPurchase(id: string): Promise<PurchaseDoc | null> {
  const snap = await db().collection('purchases').doc(id).get();
  return toPurchase(snap);
}

export async function getPurchaseByConversationId(
  conversationId: string,
): Promise<PurchaseDoc | null> {
  const snap = await db()
    .collection('purchases')
    .where('iyzicoConversationId', '==', conversationId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return toPurchase(snap.docs[0]);
}

// ----- Listing for the user-facing history table --------------------------

export async function listPurchasesForUser(
  userId: string,
  limit = 50,
): Promise<PurchaseDoc[]> {
  const snap = await db()
    .collection('purchases')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs
    .map(toPurchase)
    .filter((p): p is PurchaseDoc => p !== null);
}

export async function listPurchasesForOrg(
  orgId: string,
  limit = 50,
): Promise<PurchaseDoc[]> {
  const snap = await db()
    .collection('purchases')
    .where('orgId', '==', orgId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs
    .map(toPurchase)
    .filter((p): p is PurchaseDoc => p !== null);
}

// ----- Status transitions --------------------------------------------------

export async function markPurchaseFailed(
  purchaseId: string,
  reason: string,
): Promise<void> {
  await db().collection('purchases').doc(purchaseId).update({
    status: 'failed' as const,
    failureReason: reason,
    completedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Atomically:
 *  1) re-checks the purchase is still 'pending' (idempotency guard — both the
 *     redirect callback and the webhook may fire),
 *  2) credits tokens to the right wallet (org or user),
 *  3) writes a 'purchase' row to the tokenTransactions ledger,
 *  4) marks the purchase 'succeeded' and records the ledger row id +
 *     iyzico paymentId.
 *
 * Returns `{ alreadyApplied: true }` if a concurrent run already credited.
 */
export async function applySuccessfulPurchase(opts: {
  purchaseId: string;
  iyzicoPaymentId: string;
}): Promise<
  | { alreadyApplied: true; purchase: PurchaseDoc }
  | { alreadyApplied: false; purchase: PurchaseDoc; balanceAfter: number }
> {
  const firestore = db();
  const purchaseRef = firestore.collection('purchases').doc(opts.purchaseId);

  return firestore.runTransaction(async (tx) => {
    const purSnap = await tx.get(purchaseRef);
    if (!purSnap.exists) {
      throw new Error(`Purchase ${opts.purchaseId} not found`);
    }
    const purchase = toPurchase(purSnap);
    if (!purchase) throw new Error('Purchase doc failed to parse');

    if (purchase.status === 'succeeded') {
      return { alreadyApplied: true as const, purchase };
    }
    if (purchase.status !== 'pending') {
      throw new Error(
        `Purchase ${opts.purchaseId} is in non-applicable status: ${purchase.status}`,
      );
    }

    const totalTokens = purchase.tokenAmount + purchase.bonusTokens;
    const walletRef = purchase.orgId
      ? firestore.collection('organizations').doc(purchase.orgId)
      : firestore.collection('users').doc(purchase.userId);
    const walletKind: 'user' | 'org' = purchase.orgId ? 'org' : 'user';

    const walletSnap = await tx.get(walletRef);
    if (!walletSnap.exists) {
      throw new Error(`${walletKind} wallet not found`);
    }
    const balance =
      (walletSnap.data()?.tokenBalance as number | undefined) ?? 0;
    const next = balance + totalTokens;

    const txnRef = firestore.collection('tokenTransactions').doc();

    tx.update(walletRef, {
      tokenBalance: next,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(txnRef, {
      userId: purchase.userId,
      orgId: purchase.orgId,
      walletKind,
      type: 'purchase' as const,
      amount: totalTokens,
      balanceAfter: next,
      reason: `iyzico:${purchase.packageSlug}`,
      relatedPurchaseId: purchase.id,
      iyzicoPaymentId: opts.iyzicoPaymentId,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.update(purchaseRef, {
      status: 'succeeded' as const,
      iyzicoPaymentId: opts.iyzicoPaymentId,
      tokenTransactionId: txnRef.id,
      completedAt: FieldValue.serverTimestamp(),
    });

    return {
      alreadyApplied: false as const,
      purchase: { ...purchase, status: 'succeeded' as const },
      balanceAfter: next,
    };
  });
}
