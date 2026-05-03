import { z } from 'zod';

export const ORG_ROLES = ['owner', 'admin', 'editor', 'viewer'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

/** Roles authorised to manage members + settings. */
export const ORG_MANAGER_ROLES: readonly OrgRole[] = ['owner', 'admin'];

export const ORG_SUBSCRIPTION_TIERS = ['trial', 'starter', 'pro', 'custom'] as const;
export type OrgSubscriptionTier = (typeof ORG_SUBSCRIPTION_TIERS)[number];

export const organizationDocSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  /** ISO country code, free-form for now (TR / DE / ES / …). */
  country: z.string().min(2).max(8).nullable().optional(),
  /** Vergi kimlik / VAT number, free-form. */
  vatNumber: z.string().max(40).nullable().optional(),
  billingEmail: z.string().email().nullable().optional(),
  subscriptionTier: z.enum(ORG_SUBSCRIPTION_TIERS).default('trial'),
  seatLimit: z.number().int().positive().default(5),
  tokenBalance: z.number().int().nonnegative().default(0),
  ownerUid: z.string(),
  /** Set by allowed-list lookups when matching org_only project types. */
  allowedProjectTypeIds: z.array(z.string()).default([]),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
});
export type OrganizationDoc = z.infer<typeof organizationDocSchema>;
export type OrganizationDocInput = z.input<typeof organizationDocSchema>;

export const orgMemberDocSchema = z.object({
  uid: z.string(),
  email: z.string().email().nullable().optional(),
  name: z.string().nullable().optional(),
  role: z.enum(ORG_ROLES),
  addedAt: z.union([z.string(), z.date()]).optional(),
  addedByUid: z.string().nullable().optional(),
});
export type OrgMemberDoc = z.infer<typeof orgMemberDocSchema>;

// ---- Invitations ----------------------------------------------------------

export const INVITATION_STATUSES = [
  'pending',
  'accepted',
  'revoked',
  'expired',
] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const invitationDocSchema = z.object({
  id: z.string(),
  /** Always lowercased so we can do case-insensitive uniqueness checks. */
  email: z.string().email(),
  role: z.enum(ORG_ROLES),
  /** Random opaque secret used as the URL-bearer token. */
  token: z.string().min(20),
  status: z.enum(INVITATION_STATUSES).default('pending'),
  createdByUid: z.string(),
  createdAt: z.union([z.string(), z.date()]).optional(),
  /** Hard expiry, even if pending. */
  expiresAt: z.union([z.string(), z.date()]).optional(),
  acceptedByUid: z.string().nullable().optional(),
  acceptedAt: z.union([z.string(), z.date()]).nullable().optional(),
  revokedByUid: z.string().nullable().optional(),
  revokedAt: z.union([z.string(), z.date()]).nullable().optional(),
});
export type InvitationDoc = z.infer<typeof invitationDocSchema>;
