'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireServerSession } from '@/lib/server/getServerSession';
import {
  ORG_MANAGER_ROLES,
  ORG_ROLES,
  type OrgRole,
} from '@/types/organization';
import {
  addOrgMemberByEmail,
  createOrgDoc,
  getMemberDoc,
  getOrgDoc,
  removeMember,
  SeatLimitReachedError,
  setMemberRole,
  setOrgMetadata,
} from '@/lib/server/organizations';
import { getAdminAuth } from '@/lib/firebase/admin';

async function assertManager(orgId: string, uid: string): Promise<OrgRole> {
  const member = await getMemberDoc(orgId, uid);
  if (!member) throw new Error('Forbidden: not an org member');
  if (!ORG_MANAGER_ROLES.includes(member.role)) {
    throw new Error('Forbidden: only owner or admin can perform this action');
  }
  return member.role;
}

async function assertOwner(orgId: string, uid: string): Promise<void> {
  const member = await getMemberDoc(orgId, uid);
  if (!member || member.role !== 'owner') {
    throw new Error('Forbidden: only the owner can perform this action');
  }
}

// ----- Create ---------------------------------------------------------------

const createSchema = z.object({
  name: z.string().min(2, 'En az 2 karakter olmalı.').max(120),
  country: z.string().min(2).max(8).optional().or(z.literal('')),
  vatNumber: z.string().max(40).optional().or(z.literal('')),
  billingEmail: z.string().email('Geçerli bir e-posta gir.').optional().or(z.literal('')),
});

export type CreateOrgInput = z.input<typeof createSchema>;

export async function createOrgAction(
  raw: CreateOrgInput,
): Promise<{ id: string }> {
  const session = await requireServerSession();
  const input = createSchema.parse(raw);

  // Pull the current display name from Auth so the seeded owner-member doc
  // has a useful label.
  const user = await getAdminAuth().getUser(session.uid);

  const id = await createOrgDoc({
    ownerUid: session.uid,
    ownerEmail: session.email ?? user.email ?? null,
    ownerName: user.displayName ?? null,
    name: input.name,
    country: input.country?.trim() || null,
    vatNumber: input.vatNumber?.trim() || null,
    billingEmail: input.billingEmail?.trim() || null,
  });

  revalidatePath('/[locale]/organizations', 'layout');
  return { id };
}

// ----- Update metadata ------------------------------------------------------

const updateSchema = z.object({
  orgId: z.string().min(1),
  name: z.string().min(2).max(120).optional(),
  country: z.string().min(2).max(8).nullable().optional(),
  vatNumber: z.string().max(40).nullable().optional(),
  billingEmail: z.string().email().nullable().optional(),
});

export async function updateOrgAction(
  raw: z.input<typeof updateSchema>,
): Promise<{ ok: true }> {
  const session = await requireServerSession();
  const input = updateSchema.parse(raw);
  await assertManager(input.orgId, session.uid);

  await setOrgMetadata(input.orgId, {
    name: input.name,
    country: input.country ?? null,
    vatNumber: input.vatNumber ?? null,
    billingEmail: input.billingEmail ?? null,
  });

  revalidatePath(`/[locale]/organizations/${input.orgId}`, 'page');
  revalidatePath('/[locale]/organizations', 'page');
  return { ok: true };
}

// ----- Invite ---------------------------------------------------------------

const inviteSchema = z.object({
  orgId: z.string().min(1),
  email: z.string().email('Geçerli bir e-posta gir.'),
  role: z.enum(ORG_ROLES).default('editor'),
});

export type InviteMemberInput = z.input<typeof inviteSchema>;

export async function inviteOrgMemberAction(
  raw: InviteMemberInput,
): Promise<{ uid: string }> {
  const session = await requireServerSession();
  const input = inviteSchema.parse(raw);
  await assertManager(input.orgId, session.uid);

  // 'owner' is reserved — only one owner at a time, transferred via a
  // dedicated action.
  if (input.role === 'owner') {
    throw new Error(
      'Sahiplik doğrudan davetle verilemez. Önce kullanıcıyı admin olarak ekle, sonra sahipliği devret.',
    );
  }

  try {
    const result = await addOrgMemberByEmail({
      orgId: input.orgId,
      email: input.email,
      role: input.role,
      addedByUid: session.uid,
    });
    revalidatePath(`/[locale]/organizations/${input.orgId}`, 'page');
    return result;
  } catch (err) {
    if (err instanceof SeatLimitReachedError) {
      throw new Error(
        `Koltuk limiti dolu (${err.limit}). Önce limiti yükselt veya bir üyeyi çıkar.`,
      );
    }
    throw err;
  }
}

// ----- Change role ----------------------------------------------------------

const changeRoleSchema = z.object({
  orgId: z.string().min(1),
  uid: z.string().min(1),
  role: z.enum(ORG_ROLES),
});

export async function changeMemberRoleAction(
  raw: z.input<typeof changeRoleSchema>,
): Promise<{ ok: true }> {
  const session = await requireServerSession();
  const input = changeRoleSchema.parse(raw);
  await assertManager(input.orgId, session.uid);

  // Only the current owner can grant 'owner' (handled by transferOwnership).
  if (input.role === 'owner') {
    throw new Error(
      'Sahiplik devri ayrı bir işlemdir; bu uçtan değiştirilemez.',
    );
  }

  // Prevent demoting the sole owner via this path.
  const existing = await getMemberDoc(input.orgId, input.uid);
  if (existing?.role === 'owner') {
    throw new Error(
      'Sahibin rolünü düşürebilmek için önce sahipliği başkasına devret.',
    );
  }

  await setMemberRole(input.orgId, input.uid, input.role);
  revalidatePath(`/[locale]/organizations/${input.orgId}`, 'page');
  return { ok: true };
}

// ----- Remove / leave -------------------------------------------------------

const removeSchema = z.object({
  orgId: z.string().min(1),
  uid: z.string().min(1),
});

export async function removeMemberAction(
  raw: z.input<typeof removeSchema>,
): Promise<{ ok: true }> {
  const session = await requireServerSession();
  const input = removeSchema.parse(raw);

  const target = await getMemberDoc(input.orgId, input.uid);
  if (!target) throw new Error('Üye bulunamadı.');

  // Self-leave path: any member can leave themselves, except the owner who
  // must transfer ownership first.
  if (input.uid === session.uid) {
    if (target.role === 'owner') {
      throw new Error(
        'Sahip olarak ayrılamazsın. Önce sahipliği başka bir admin\'e devret.',
      );
    }
  } else {
    await assertManager(input.orgId, session.uid);
    if (target.role === 'owner') {
      throw new Error('Sahibi çıkaramazsın; önce sahipliği devret.');
    }
  }

  await removeMember(input.orgId, input.uid);
  revalidatePath(`/[locale]/organizations/${input.orgId}`, 'page');
  revalidatePath('/[locale]/organizations', 'page');
  return { ok: true };
}

// ----- Transfer ownership ---------------------------------------------------

const transferSchema = z.object({
  orgId: z.string().min(1),
  toUid: z.string().min(1),
});

export async function transferOwnershipAction(
  raw: z.input<typeof transferSchema>,
): Promise<{ ok: true }> {
  const session = await requireServerSession();
  const input = transferSchema.parse(raw);
  await assertOwner(input.orgId, session.uid);

  if (input.toUid === session.uid) {
    throw new Error('Zaten sahiplik sende.');
  }

  const target = await getMemberDoc(input.orgId, input.toUid);
  if (!target) {
    throw new Error('Sahipliği devredeceğin kişi önce kuruma üye olmalı.');
  }

  // Order matters: demote current owner to 'admin' first, then promote target
  // to 'owner'. Both sides keep elevated rights throughout the transition.
  await setMemberRole(input.orgId, session.uid, 'admin');
  await setMemberRole(input.orgId, input.toUid, 'owner');

  // Update the org's ownerUid pointer too.
  const orgRef = (await import('@/lib/firebase/admin')).getAdminFirestore()
    .collection('organizations')
    .doc(input.orgId);
  await orgRef.update({ ownerUid: input.toUid });

  revalidatePath(`/[locale]/organizations/${input.orgId}`, 'page');
  return { ok: true };
}

// ----- Read helpers wrapped for server components ---------------------------

export async function getOrgForCurrentUser(orgId: string) {
  const session = await requireServerSession();
  const member = await getMemberDoc(orgId, session.uid);
  if (!member) return null;
  const org = await getOrgDoc(orgId);
  return org ? { org, member } : null;
}
