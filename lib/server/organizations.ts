import 'server-only';
import {
  FieldValue,
  type Firestore,
  type Timestamp,
} from 'firebase-admin/firestore';
import { nanoid } from 'nanoid';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import {
  organizationDocSchema,
  orgMemberDocSchema,
  type OrgMemberDoc,
  type OrgRole,
  type OrganizationDoc,
} from '@/types/organization';

function db(): Firestore {
  return getAdminFirestore();
}

function isoFromTs(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  const ts = value as Timestamp;
  return typeof ts.toDate === 'function' ? ts.toDate().toISOString() : undefined;
}

function toOrgDoc(snap: FirebaseFirestore.DocumentSnapshot): OrganizationDoc | null {
  const data = snap.data();
  if (!data) return null;
  const parsed = organizationDocSchema.safeParse({
    ...data,
    id: snap.id,
    createdAt: isoFromTs(data.createdAt),
    updatedAt: isoFromTs(data.updatedAt),
  });
  if (!parsed.success) {
    console.warn(`[organizations] doc ${snap.id} failed validation`);
    return null;
  }
  return parsed.data;
}

function toMemberDoc(snap: FirebaseFirestore.DocumentSnapshot): OrgMemberDoc | null {
  const data = snap.data();
  if (!data) return null;
  const parsed = orgMemberDocSchema.safeParse({
    ...data,
    uid: snap.id,
    addedAt: isoFromTs(data.addedAt),
  });
  if (!parsed.success) return null;
  return parsed.data;
}

// ----- Reads ----------------------------------------------------------------

export async function getOrgDoc(orgId: string): Promise<OrganizationDoc | null> {
  const snap = await db().collection('organizations').doc(orgId).get();
  return toOrgDoc(snap);
}

export async function getMemberDoc(
  orgId: string,
  uid: string,
): Promise<OrgMemberDoc | null> {
  const snap = await db()
    .collection('organizations')
    .doc(orgId)
    .collection('members')
    .doc(uid)
    .get();
  return toMemberDoc(snap);
}

export async function listMembers(orgId: string): Promise<OrgMemberDoc[]> {
  const snap = await db()
    .collection('organizations')
    .doc(orgId)
    .collection('members')
    .get();
  return snap.docs.map(toMemberDoc).filter((m): m is OrgMemberDoc => m !== null);
}

export async function listOrgsForUser(uid: string): Promise<OrganizationDoc[]> {
  const result = await listOrgsWithMembershipForUser(uid);
  return result.map((r) => r.org);
}

/**
 * Like listOrgsForUser, but also returns the member doc for each org so
 * downstream callers (the workspace switcher, the layout) can render the
 * user's role + addedAt without an extra N+1 round-trip.
 */
export async function listOrgsWithMembershipForUser(
  uid: string,
): Promise<Array<{ org: OrganizationDoc; member: OrgMemberDoc }>> {
  // collectionGroup query returns the membership docs directly; no need
  // for a separate per-org getMemberDoc afterwards.
  const memberships = await db()
    .collectionGroup('members')
    .where('uid', '==', uid)
    .get();

  type Pair = { orgId: string; member: OrgMemberDoc };
  const pairs: Pair[] = [];
  for (const doc of memberships.docs) {
    const orgId = doc.ref.parent.parent?.id;
    if (!orgId) continue;
    const m = toMemberDoc(doc);
    if (!m) continue;
    pairs.push({ orgId, member: m });
  }
  if (pairs.length === 0) return [];

  // Org docs in parallel — one network round-trip per org, but that's the
  // minimum since the org metadata lives separately from member rows.
  const orgs = await Promise.all(pairs.map((p) => getOrgDoc(p.orgId)));
  const result: Array<{ org: OrganizationDoc; member: OrgMemberDoc }> = [];
  for (let i = 0; i < pairs.length; i++) {
    const org = orgs[i];
    if (org) result.push({ org, member: pairs[i].member });
  }
  return result;
}

// ----- Org lifecycle --------------------------------------------------------

export interface CreateOrgInput {
  ownerUid: string;
  ownerEmail: string | null;
  ownerName: string | null;
  name: string;
  country?: string | null;
  vatNumber?: string | null;
  billingEmail?: string | null;
}

export async function createOrgDoc(input: CreateOrgInput): Promise<string> {
  const id = `org_${nanoid(10)}`;
  const now = FieldValue.serverTimestamp();
  const orgRef = db().collection('organizations').doc(id);
  const memberRef = orgRef.collection('members').doc(input.ownerUid);

  await db().runTransaction(async (tx) => {
    tx.set(orgRef, {
      name: input.name,
      country: input.country ?? null,
      vatNumber: input.vatNumber ?? null,
      billingEmail: input.billingEmail ?? input.ownerEmail ?? null,
      subscriptionTier: 'trial',
      seatLimit: 5,
      tokenBalance: 0,
      ownerUid: input.ownerUid,
      allowedProjectTypeIds: [],
      createdAt: now,
      updatedAt: now,
    });
    tx.set(memberRef, {
      uid: input.ownerUid,
      email: input.ownerEmail,
      name: input.ownerName,
      role: 'owner' as const,
      addedAt: now,
      addedByUid: input.ownerUid,
    });
  });

  await syncOrgClaims(input.ownerUid);
  return id;
}

export async function setOrgMetadata(
  orgId: string,
  patch: Partial<Pick<OrganizationDoc, 'name' | 'country' | 'vatNumber' | 'billingEmail'>>,
): Promise<void> {
  await db()
    .collection('organizations')
    .doc(orgId)
    .update({
      ...patch,
      updatedAt: FieldValue.serverTimestamp(),
    });
}

// ----- Membership -----------------------------------------------------------

export class SeatLimitReachedError extends Error {
  constructor(public limit: number) {
    super(`Seat limit reached (${limit})`);
  }
}

export async function addOrgMemberByEmail(opts: {
  orgId: string;
  email: string;
  role: OrgRole;
  addedByUid: string;
}): Promise<{ uid: string }> {
  const userRecord = await getAdminAuth()
    .getUserByEmail(opts.email)
    .catch(() => null);
  if (!userRecord) {
    throw new Error(
      `Bu e-posta ile kayıtlı bir kullanıcı bulunamadı (${opts.email}). ` +
        'Davet edilen kişinin önce sisteme kaydolması gerekiyor.',
    );
  }
  return addOrgMember({
    orgId: opts.orgId,
    uid: userRecord.uid,
    email: userRecord.email ?? opts.email,
    name: userRecord.displayName ?? null,
    role: opts.role,
    addedByUid: opts.addedByUid,
  });
}

export async function addOrgMember(opts: {
  orgId: string;
  uid: string;
  email: string | null;
  name: string | null;
  role: OrgRole;
  addedByUid: string;
}): Promise<{ uid: string }> {
  const orgRef = db().collection('organizations').doc(opts.orgId);
  const memberRef = orgRef.collection('members').doc(opts.uid);

  await db().runTransaction(async (tx) => {
    const orgSnap = await tx.get(orgRef);
    if (!orgSnap.exists) throw new Error('Organization not found');
    const data = orgSnap.data() as { seatLimit?: number } | undefined;
    const seatLimit = data?.seatLimit ?? 5;

    const existing = await tx.get(memberRef);
    if (existing.exists) {
      // Treat add-of-existing as a role update.
      tx.update(memberRef, {
        role: opts.role,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    const memberSnap = await tx.get(orgRef.collection('members'));
    if (memberSnap.size >= seatLimit) {
      throw new SeatLimitReachedError(seatLimit);
    }

    tx.set(memberRef, {
      uid: opts.uid,
      email: opts.email,
      name: opts.name,
      role: opts.role,
      addedAt: FieldValue.serverTimestamp(),
      addedByUid: opts.addedByUid,
    });
  });

  await syncOrgClaims(opts.uid);
  return { uid: opts.uid };
}

export async function setMemberRole(
  orgId: string,
  uid: string,
  role: OrgRole,
): Promise<void> {
  await db()
    .collection('organizations')
    .doc(orgId)
    .collection('members')
    .doc(uid)
    .update({
      role,
      updatedAt: FieldValue.serverTimestamp(),
    });
  await syncOrgClaims(uid);
}

export async function removeMember(orgId: string, uid: string): Promise<void> {
  await db()
    .collection('organizations')
    .doc(orgId)
    .collection('members')
    .doc(uid)
    .delete();
  await syncOrgClaims(uid);
}

// ----- Custom claims sync ---------------------------------------------------

/**
 * Re-derives the user's org membership from Firestore and writes it back to
 * Firebase Auth's custom claims. Called after every membership mutation so
 * the next ID-token refresh picks up the new orgIds without the user having
 * to re-login (refreshClaims() on the client is enough).
 *
 * Claim shape:
 *   {
 *     ...existing claims,
 *     orgIds: string[],
 *     orgRoles: { [orgId]: 'owner' | 'admin' | 'editor' | 'viewer' }
 *   }
 */
export async function syncOrgClaims(uid: string): Promise<void> {
  const memberships = await db()
    .collectionGroup('members')
    .where('uid', '==', uid)
    .get();

  const orgRoles: Record<string, OrgRole> = {};
  const orgIds: string[] = [];
  for (const doc of memberships.docs) {
    const orgId = doc.ref.parent.parent?.id;
    if (!orgId) continue;
    const data = doc.data() as { role?: OrgRole };
    if (!data.role) continue;
    orgRoles[orgId] = data.role;
    orgIds.push(orgId);
  }

  const auth = getAdminAuth();
  const user = await auth.getUser(uid);
  const existing = (user.customClaims ?? {}) as Record<string, unknown>;

  await auth.setCustomUserClaims(uid, {
    ...existing,
    orgIds,
    orgRoles,
  });
}

// ----- Token wallet ---------------------------------------------------------

export async function grantOrgTokens(opts: {
  orgId: string;
  amount: number;
  reason: string;
  grantedByUid: string;
}): Promise<{ balanceAfter: number }> {
  if (opts.amount <= 0) throw new Error('amount must be positive');

  const orgRef = db().collection('organizations').doc(opts.orgId);
  const txRef = db().collection('tokenTransactions').doc();

  const balanceAfter = await db().runTransaction(async (tx) => {
    const snap = await tx.get(orgRef);
    if (!snap.exists) throw new Error('Organization not found');
    const balance = (snap.data()?.tokenBalance as number | undefined) ?? 0;
    const next = balance + opts.amount;
    tx.update(orgRef, {
      tokenBalance: next,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(txRef, {
      orgId: opts.orgId,
      userId: null,
      type: 'bonus' as const,
      amount: opts.amount,
      balanceAfter: next,
      reason: opts.reason,
      grantedByUid: opts.grantedByUid,
      createdAt: FieldValue.serverTimestamp(),
    });
    return next;
  });

  return { balanceAfter };
}
