import 'server-only';
import { type Firestore, type Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  tokenPackageDocSchema,
  type TokenPackageDoc,
  type Currency,
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

function toTokenPackage(
  snap: FirebaseFirestore.DocumentSnapshot,
): TokenPackageDoc | null {
  const data = snap.data();
  if (!data) return null;
  const parsed = tokenPackageDocSchema.safeParse({
    ...data,
    id: snap.id,
    createdAt: isoFromTs(data.createdAt),
    updatedAt: isoFromTs(data.updatedAt),
  });
  if (!parsed.success) return null;
  return parsed.data;
}

/**
 * Returns active token packages for the storefront, sorted by displayOrder.
 * Filters by currency when provided so we don't surface USD packages to a
 * Turkish billing context (or vice versa) unless the caller wants both.
 */
export async function listActiveTokenPackages(
  currency?: Currency,
): Promise<TokenPackageDoc[]> {
  let query = db()
    .collection('tokenPackages')
    .where('active', '==', true) as FirebaseFirestore.Query;
  if (currency) query = query.where('currency', '==', currency);
  const snap = await query.get();
  const items = snap.docs
    .map(toTokenPackage)
    .filter((p): p is TokenPackageDoc => p !== null);
  items.sort((a, b) => a.displayOrder - b.displayOrder);
  return items;
}

export async function getTokenPackage(
  id: string,
): Promise<TokenPackageDoc | null> {
  const snap = await db().collection('tokenPackages').doc(id).get();
  return toTokenPackage(snap);
}
