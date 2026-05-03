import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  applySuccessfulPurchase,
  getPurchaseByConversationId,
  markPurchaseFailed,
} from '@/lib/server/purchases';
import { retrieveCheckoutForm } from '@/lib/iyzico/checkout';

export const dynamic = 'force-dynamic';

/**
 * iyzico's async webhook for payment notifications. Schema (as documented):
 *   {
 *     "paymentConversationId": "conv_...",
 *     "merchantId": 12345,
 *     "token": "<retrieve-token>",
 *     "status": "SUCCESS" | "FAILURE",
 *     "iyziEventType": "CHECKOUT_FORM_AUTH",
 *     "iyziEventTime": 1700000000000,
 *     ...
 *   }
 *
 * We re-fetch the canonical result via `retrieveCheckoutForm(token)` rather
 * than trusting the webhook payload's status field, then funnel through the
 * same idempotent applier as the user-redirect callback.
 */
const webhookBodySchema = z.object({
  paymentConversationId: z.string().min(1).optional(),
  conversationId: z.string().min(1).optional(),
  token: z.string().min(1).optional(),
  status: z.string().optional(),
  iyziEventType: z.string().optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad-json' }, { status: 400 });
  }
  const parsed = webhookBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: 'bad-shape' }, { status: 400 });
  }

  const conversationId =
    parsed.data.paymentConversationId ?? parsed.data.conversationId;
  if (!conversationId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const purchase = await getPurchaseByConversationId(conversationId);
  if (!purchase) {
    // Not ours — return 200 so iyzico doesn't keep retrying.
    return NextResponse.json({ ok: true, ignored: 'unknown-conversation' });
  }
  if (purchase.status === 'succeeded' || purchase.status === 'failed') {
    return NextResponse.json({ ok: true, status: purchase.status });
  }

  // Verify the actual payment status server-to-server.
  const token = parsed.data.token ?? purchase.iyzicoToken;
  if (!token) {
    return NextResponse.json({ ok: false, reason: 'no-token' }, { status: 400 });
  }

  let result;
  try {
    result = await retrieveCheckoutForm(token);
  } catch (err) {
    console.error('[iyzico:webhook] retrieve failed', err);
    return NextResponse.json({ ok: false, reason: 'retrieve-failed' }, { status: 500 });
  }

  if (result.status !== 'success' || !result.paymentId) {
    await markPurchaseFailed(
      purchase.id,
      result.errorMessage ?? result.paymentStatus ?? 'unknown',
    );
    return NextResponse.json({ ok: true, status: 'failed' });
  }

  try {
    await applySuccessfulPurchase({
      purchaseId: purchase.id,
      iyzicoPaymentId: result.paymentId,
    });
  } catch (err) {
    console.error('[iyzico:webhook] apply failed', err);
    return NextResponse.json(
      { ok: false, reason: 'apply-failed' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, status: 'succeeded' });
}
