import 'server-only';
import { randomBytes } from 'node:crypto';
import {
  FieldValue,
  type Firestore,
  type Timestamp,
} from 'firebase-admin/firestore';
import { nanoid } from 'nanoid';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import {
  invitationDocSchema,
  type InvitationDoc,
  type OrgRole,
} from '@/types/organization';
import { addOrgMember, getOrgDoc } from './organizations';

const INVITATION_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

function db(): Firestore {
  return getAdminFirestore();
}

function isoFromTs(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  const ts = value as Timestamp;
  return typeof ts.toDate === 'function' ? ts.toDate().toISOString() : undefined;
}

function toInvitationDoc(
  snap: FirebaseFirestore.DocumentSnapshot,
): InvitationDoc | null {
  const data = snap.data();
  if (!data) return null;
  const parsed = invitationDocSchema.safeParse({
    ...data,
    id: snap.id,
    createdAt: isoFromTs(data.createdAt),
    expiresAt: isoFromTs(data.expiresAt),
    acceptedAt: isoFromTs(data.acceptedAt),
    revokedAt: isoFromTs(data.revokedAt),
  });
  if (!parsed.success) return null;
  return parsed.data;
}

function generateToken(): string {
  return randomBytes(24).toString('base64url');
}

// ----- CRUD ----------------------------------------------------------------

export interface CreateInvitationInput {
  orgId: string;
  email: string;
  role: OrgRole;
  createdByUid: string;
}

export async function createInvitation(
  input: CreateInvitationInput,
): Promise<InvitationDoc> {
  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error('email required');

  const orgRef = db().collection('organizations').doc(input.orgId);
  const id = `inv_${nanoid(12)}`;
  const token = generateToken();
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

  // If a pending invitation for this email already exists, refresh its
  // token + expiry instead of stacking duplicates.
  const existingSnap = await orgRef
    .collection('invitations')
    .where('email', '==', email)
    .where('status', '==', 'pending')
    .limit(1)
    .get();
  if (!existingSnap.empty) {
    const existing = existingSnap.docs[0];
    await existing.ref.update({
      token,
      role: input.role,
      expiresAt,
      createdByUid: input.createdByUid,
      createdAt: FieldValue.serverTimestamp(),
    });
    const refreshed = await existing.ref.get();
    const parsed = toInvitationDoc(refreshed);
    if (!parsed) throw new Error('Failed to refresh invitation');
    return parsed;
  }

  const ref = orgRef.collection('invitations').doc(id);
  await ref.set({
    email,
    role: input.role,
    token,
    status: 'pending' as const,
    createdByUid: input.createdByUid,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
    acceptedByUid: null,
    acceptedAt: null,
    revokedByUid: null,
    revokedAt: null,
  });

  const fresh = await ref.get();
  const parsed = toInvitationDoc(fresh);
  if (!parsed) throw new Error('Failed to read freshly-created invitation');
  return parsed;
}

export async function listPendingInvitations(
  orgId: string,
): Promise<InvitationDoc[]> {
  const snap = await db()
    .collection('organizations')
    .doc(orgId)
    .collection('invitations')
    .where('status', '==', 'pending')
    .get();
  return snap.docs
    .map(toInvitationDoc)
    .filter((i): i is InvitationDoc => i !== null);
}

export interface FoundInvitation {
  orgId: string;
  invitation: InvitationDoc;
}

/**
 * Resolves a token to the (orgId, invitation) pair. Uses a collectionGroup
 * query against the indexed `invitations` subcollection so callers don't
 * need to know the orgId up front.
 */
export async function getInvitationByToken(
  token: string,
): Promise<FoundInvitation | null> {
  if (!token) return null;
  const snap = await db()
    .collectionGroup('invitations')
    .where('token', '==', token)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const orgId = doc.ref.parent.parent?.id;
  if (!orgId) return null;
  const invitation = toInvitationDoc(doc);
  if (!invitation) return null;
  return { orgId, invitation };
}

// ----- Accept --------------------------------------------------------------

export class InvitationExpiredError extends Error {
  constructor() {
    super('Davet süresi dolmuş');
  }
}
export class InvitationConsumedError extends Error {
  constructor(public status: string) {
    super(`Davet artık aktif değil (${status})`);
  }
}
export class InvitationEmailMismatchError extends Error {
  constructor() {
    super('Davet farklı bir e-postaya gönderildi');
  }
}

export interface AcceptInvitationResult {
  orgId: string;
  role: OrgRole;
  orgName: string;
}

export async function acceptInvitation(
  token: string,
  acceptingUid: string,
): Promise<AcceptInvitationResult> {
  const found = await getInvitationByToken(token);
  if (!found) throw new Error('Davet bulunamadı');

  const { orgId, invitation } = found;

  if (invitation.status !== 'pending') {
    throw new InvitationConsumedError(invitation.status);
  }
  const expiresAt =
    typeof invitation.expiresAt === 'string'
      ? new Date(invitation.expiresAt)
      : invitation.expiresAt;
  if (expiresAt && expiresAt instanceof Date && expiresAt < new Date()) {
    throw new InvitationExpiredError();
  }

  // The accepting user must own the email the invitation was sent to.
  // Compare case-insensitively because the invitation row stores
  // lowercased.
  const userRecord = await getAdminAuth().getUser(acceptingUid);
  const userEmail = userRecord.email?.toLowerCase();
  if (!userEmail || userEmail !== invitation.email) {
    throw new InvitationEmailMismatchError();
  }

  await addOrgMember({
    orgId,
    uid: acceptingUid,
    email: userRecord.email ?? null,
    name: userRecord.displayName ?? null,
    role: invitation.role,
    addedByUid: invitation.createdByUid,
  });

  const inviteRef = db()
    .collection('organizations')
    .doc(orgId)
    .collection('invitations')
    .doc(invitation.id);
  await inviteRef.update({
    status: 'accepted' as const,
    acceptedByUid: acceptingUid,
    acceptedAt: FieldValue.serverTimestamp(),
  });

  const org = await getOrgDoc(orgId);
  return {
    orgId,
    role: invitation.role,
    orgName: org?.name ?? orgId,
  };
}

export async function revokeInvitation(
  orgId: string,
  invitationId: string,
  revokedByUid: string,
): Promise<void> {
  await db()
    .collection('organizations')
    .doc(orgId)
    .collection('invitations')
    .doc(invitationId)
    .update({
      status: 'revoked' as const,
      revokedByUid,
      revokedAt: FieldValue.serverTimestamp(),
    });
}

// ----- Email dispatch ------------------------------------------------------

/**
 * Best-effort email send via Firebase's Trigger Email extension. Writes a
 * doc to the `mail` collection; if the extension is installed it will pick
 * the doc up and send. If the extension isn't installed yet, this is a
 * no-op for the user — but the invitation itself was already created, so
 * the admin can still copy the link from the UI.
 */
export async function queueInvitationEmail(opts: {
  toEmail: string;
  orgName: string;
  inviterName: string;
  acceptUrl: string;
  expiresAt: Date | string;
}): Promise<void> {
  try {
    await db()
      .collection('mail')
      .add({
        to: opts.toEmail,
        message: {
          subject: `${opts.orgName} kurumuna davet edildiniz`,
          html: renderInviteEmail(opts),
          text:
            `${opts.inviterName} sizi ${opts.orgName} kurumuna davet etti.\n\n` +
            `Davete katılmak için aşağıdaki bağlantıyı tıklayın:\n${opts.acceptUrl}\n\n` +
            `Bağlantının geçerlilik süresi: ${formatExpiry(opts.expiresAt)}`,
        },
        createdAt: FieldValue.serverTimestamp(),
      });
  } catch (err) {
    // Don't fail the inviting flow when email queueing has a transient
    // issue; the admin still has the link.
    console.warn('[invitations] email queue failed', err);
  }
}

function formatExpiry(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderInviteEmail(opts: {
  toEmail: string;
  orgName: string;
  inviterName: string;
  acceptUrl: string;
  expiresAt: Date | string;
}): string {
  return `<!doctype html>
<html lang="tr"><body style="font-family:Calibri,Arial,sans-serif;background:#f4f4f5;padding:24px">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;border:1px solid #e4e4e7;overflow:hidden">
    <tr><td style="padding:24px 28px;border-bottom:1px solid #f4f4f5">
      <div style="font-weight:700;color:#7c3aed;letter-spacing:.05em">XANTHIX.AI</div>
    </td></tr>
    <tr><td style="padding:28px">
      <h1 style="margin:0 0 12px 0;font-size:20px;color:#111">${escapeHtml(opts.orgName)} kurumuna davet edildiniz</h1>
      <p style="color:#374151;line-height:1.55;margin:0 0 20px 0">
        ${escapeHtml(opts.inviterName)}, sizi <strong>${escapeHtml(opts.orgName)}</strong>'a katılmaya davet etti.
        Davete katılmak için aşağıdaki butonu kullanın.
      </p>
      <p>
        <a href="${opts.acceptUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 22px;border-radius:10px;font-weight:600;text-decoration:none">
          Daveti kabul et
        </a>
      </p>
      <p style="color:#6b7280;font-size:12px;line-height:1.5;margin-top:20px">
        Buton çalışmazsa şu bağlantıyı tarayıcınıza yapıştırın:<br>
        <span style="word-break:break-all">${opts.acceptUrl}</span>
      </p>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;border-top:1px solid #f4f4f5;padding-top:16px">
        Bağlantı ${formatExpiry(opts.expiresAt)} tarihine kadar geçerlidir.<br>
        Bu daveti sen istemediysen e-postayı görmezden gelebilirsin.
      </p>
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
