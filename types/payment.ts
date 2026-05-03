import { z } from 'zod';

// ---- Currency -------------------------------------------------------------

export const SUPPORTED_CURRENCIES = ['TRY', 'USD', 'EUR'] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

// ---- Token Package (admin-managed catalog) --------------------------------

export const tokenPackageDocSchema = z.object({
  id: z.string(),
  /** Stable slug for analytics + admin URLs (e.g. "starter-100"). */
  slug: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  /** Tokens credited to the buyer's wallet on successful purchase. */
  tokenAmount: z.number().int().positive(),
  /** Bonus tokens layered on top (visual selling point only). */
  bonusTokens: z.number().int().nonnegative().default(0),
  /** Listed price as a number, in the unit of `currency` (e.g. 99.00 TRY). */
  price: z.number().positive(),
  currency: z.enum(SUPPORTED_CURRENCIES),
  /** When false, hidden from the storefront but kept for historical purchases. */
  active: z.boolean().default(true),
  /** Lower numbers render first in the grid. */
  displayOrder: z.number().int().default(100),
  /** Renders the "En Popüler" pill. At most one package should be popular. */
  isPopular: z.boolean().default(false),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
});
export type TokenPackageDoc = z.infer<typeof tokenPackageDocSchema>;
export type TokenPackageDocInput = z.input<typeof tokenPackageDocSchema>;

// ---- Purchase (lifecycle of a single iyzico checkout) ---------------------

export const PURCHASE_STATUSES = [
  'pending',
  'succeeded',
  'failed',
  'expired',
] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

export const PURCHASE_KINDS = ['tokens'] as const; // future: 'subscription'
export type PurchaseKind = (typeof PURCHASE_KINDS)[number];

export const purchaseDocSchema = z.object({
  id: z.string(),
  kind: z.enum(PURCHASE_KINDS).default('tokens'),
  status: z.enum(PURCHASE_STATUSES).default('pending'),
  /** The buyer; tokens land in this user's wallet unless `orgId` is set. */
  userId: z.string(),
  /** When set, tokens land in the org's pooled wallet instead. */
  orgId: z.string().nullable().default(null),
  /** Snapshot of the package at purchase time so price changes don't rewrite history. */
  packageId: z.string(),
  packageSlug: z.string(),
  packageName: z.string(),
  tokenAmount: z.number().int().positive(),
  bonusTokens: z.number().int().nonnegative().default(0),
  price: z.number().positive(),
  currency: z.enum(SUPPORTED_CURRENCIES),
  /** Conversation id we sent to iyzico — also our local idempotency key. */
  iyzicoConversationId: z.string(),
  /** Token returned by iyzico to retrieve the form result. */
  iyzicoToken: z.string().nullable().default(null),
  /** Final iyzico paymentId (set on succeed). Used to correlate webhooks. */
  iyzicoPaymentId: z.string().nullable().default(null),
  /** Failure detail surfaced to the user. */
  failureReason: z.string().nullable().default(null),
  /** Token-ledger row written when we credited the wallet. */
  tokenTransactionId: z.string().nullable().default(null),
  createdAt: z.union([z.string(), z.date()]).optional(),
  completedAt: z.union([z.string(), z.date()]).nullable().optional(),
});
export type PurchaseDoc = z.infer<typeof purchaseDocSchema>;
export type PurchaseDocInput = z.input<typeof purchaseDocSchema>;
