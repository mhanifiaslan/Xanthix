'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { requireServerSession } from '@/lib/server/getServerSession';
import { getActiveWorkspace } from '@/lib/server/workspace';
import { getMemberDoc } from '@/lib/server/organizations';
import { ORG_MANAGER_ROLES } from '@/types/organization';
import { getTokenPackage } from '@/lib/server/tokenPackages';
import {
  createPendingPurchase,
  setPurchaseToken,
} from '@/lib/server/purchases';
import { getAdminAuth } from '@/lib/firebase/admin';
import { initializeCheckoutForm } from '@/lib/iyzico/checkout';

const checkoutInputSchema = z.object({
  packageId: z.string().min(1),
});

export interface CheckoutResult {
  paymentPageUrl: string;
  purchaseId: string;
  conversationId: string;
}

/**
 * Starts an iyzico hosted checkout session for the buyer's active workspace
 * (org wallet if an org is active, personal wallet otherwise). Returns the
 * iyzico-hosted form URL the client should redirect the browser to.
 *
 * Org purchases require the buyer to be an owner/admin of the org so a
 * regular member can't drain shared funds without authorization.
 */
export async function createTokenCheckoutAction(
  rawInput: unknown,
): Promise<CheckoutResult> {
  const { packageId } = checkoutInputSchema.parse(rawInput);
  const session = await requireServerSession();

  const pkg = await getTokenPackage(packageId);
  if (!pkg) throw new Error('Token paketi bulunamadı.');
  if (!pkg.active) throw new Error('Bu paket artık satışta değil.');

  const ws = await getActiveWorkspace(session.uid);
  let orgIdForPurchase: string | null = null;
  if (ws.kind === 'org') {
    const member = await getMemberDoc(ws.orgId, session.uid);
    if (!member || !ORG_MANAGER_ROLES.includes(member.role)) {
      throw new Error(
        'Bu kurum için satın alma yetkin yok — sadece sahip ve adminler kredi alabilir.',
      );
    }
    orgIdForPurchase = ws.orgId;
  }

  // Resolve buyer info. iyzico requires non-empty values for every field;
  // we fall back to safe placeholders for things we don't track yet.
  const userRecord = await getAdminAuth().getUser(session.uid);
  const fullName = (userRecord.displayName ?? '').trim() || 'Xanthix Kullanıcı';
  const [firstName, ...rest] = fullName.split(/\s+/);
  const lastName = rest.join(' ') || firstName;

  const conversationId = `conv_${nanoid(18)}`;
  const purchase = await createPendingPurchase({
    userId: session.uid,
    orgId: orgIdForPurchase,
    pkg,
    iyzicoConversationId: conversationId,
  });

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') ?? '';
  const callbackUrl = `${baseUrl}/api/iyzico/callback?purchaseId=${purchase.id}`;

  const requesterIp =
    (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '85.34.78.112'; // iyzico requires a value; sandbox tolerates any public IP

  const init = await initializeCheckoutForm({
    price: pkg.price,
    paidPrice: pkg.price,
    currency: pkg.currency,
    conversationId,
    callbackUrl,
    locale: 'TR',
    buyer: {
      id: session.uid,
      name: firstName,
      surname: lastName,
      email: userRecord.email ?? `${session.uid}@xanthix.local`,
      gsmNumber: userRecord.phoneNumber ?? '+905555555555',
      identityNumber: '11111111111',
      registrationAddress: 'Xanthix.ai',
      city: 'Istanbul',
      country: 'Turkey',
      ip: requesterIp,
    },
    basket: [
      {
        id: pkg.id,
        name: pkg.name,
        category1: 'Token Paketi',
        itemType: 'VIRTUAL',
        price: pkg.price,
      },
    ],
  });

  await setPurchaseToken(purchase.id, init.token);

  return {
    paymentPageUrl: init.paymentPageUrl,
    purchaseId: purchase.id,
    conversationId,
  };
}
