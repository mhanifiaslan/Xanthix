import 'server-only';
import { getAdminFirestore, getAdminAuth } from '@/lib/firebase/admin';
import type { Timestamp } from 'firebase-admin/firestore';

export interface AdminUserView {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  disabled: boolean;
  tokenBalance: number;
  projectCount: number;
  createdAt: string | null;
  lastSignInAt: string | null;
}

export interface AdminPaymentView {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  credits: number;
  packageName: string;
  status: string;
  createdAt: string | null;
}

export interface AdminMetricsView {
  totalUsers: number;
  totalProjects: number;
  totalTokensSpent: number;
  totalPurchases: number;
}

function isoFromTs(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  const ts = value as Timestamp;
  return typeof ts.toDate === 'function' ? ts.toDate().toISOString() : null;
}

/**
 * Lists all users from Firebase Auth (first 1000) with their Firestore profile data.
 */
export async function listAdminUsers(limit = 100): Promise<AdminUserView[]> {
  const auth = getAdminAuth();
  const db = getAdminFirestore();

  const listResult = await auth.listUsers(limit);
  const uids = listResult.users.map((u) => u.uid);

  // Batch-fetch user profiles from Firestore (wallet balances, etc.)
  const profileRefs = uids.map((uid) => db.collection('users').doc(uid));
  const profileSnaps = await db.getAll(...profileRefs);
  const profileMap = new Map(
    profileSnaps.map((snap) => [snap.id, snap.data() ?? {}]),
  );

  return listResult.users.map((user) => {
    const profile = profileMap.get(user.uid) ?? {};
    return {
      uid: user.uid,
      email: user.email ?? '',
      displayName: user.displayName ?? user.email ?? user.uid,
      photoURL: user.photoURL ?? null,
      disabled: user.disabled,
      tokenBalance: (profile as Record<string, number>).tokenBalance ?? 0,
      projectCount: (profile as Record<string, number>).projectCount ?? 0,
      createdAt: user.metadata.creationTime ?? null,
      lastSignInAt: user.metadata.lastSignInTime ?? null,
    };
  });
}

/**
 * Lists recent purchases from Firestore.
 */
export async function listAdminPayments(limit = 50): Promise<AdminPaymentView[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection('purchases')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      userId: data.userId ?? '',
      userEmail: data.userEmail ?? '',
      amount: data.amountInCents ? Math.round(data.amountInCents / 100) : (data.amount ?? 0),
      credits: data.creditsGranted ?? data.credits ?? 0,
      packageName: data.packageName ?? data.package ?? '',
      status: data.status ?? 'unknown',
      createdAt: isoFromTs(data.createdAt),
    };
  });
}

/**
 * Returns aggregate metrics for the admin dashboard.
 */
export async function getAdminMetrics(): Promise<AdminMetricsView> {
  const db = getAdminFirestore();
  const auth = getAdminAuth();

  const [usersResult, projectsSnap, purchasesSnap] = await Promise.all([
    auth.listUsers(1000),
    db.collection('projects').count().get(),
    db.collection('purchases').where('status', '==', 'completed').count().get(),
  ]);

  // Sum tokenBalance from a sample of users (full aggregate would require Cloud Functions)
  const totalUsers = usersResult.users.length;
  const totalProjects = projectsSnap.data().count;
  const totalPurchases = purchasesSnap.data().count;

  return {
    totalUsers,
    totalProjects,
    totalTokensSpent: 0, // Requires a server-side aggregate — shown as 0 until Cloud Function is added
    totalPurchases,
  };
}
