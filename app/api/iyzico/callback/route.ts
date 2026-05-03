import { type NextRequest, NextResponse } from 'next/server';
import {
  applySuccessfulPurchase,
  getPurchase,
  markPurchaseFailed,
} from '@/lib/server/purchases';
import { retrieveCheckoutForm } from '@/lib/iyzico/checkout';
import { isIyzicoConfigured } from '@/lib/iyzico/client';

export const dynamic = 'force-dynamic';

/**
 * iyzico's hosted form POSTs the user back to this URL after they finish
 * payment (success or failure). Body is application/x-www-form-urlencoded
 * with a `token` field; we exchange that token for the final result and
 * apply credits idempotently. The user is then bounced to /billing with
 * a status query string the page consumes for a toast.
 *
 * Note: a webhook fires async on the server side — both paths funnel
 * through `applySuccessfulPurchase` which guards against double-credit.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isIyzicoConfigured()) {
    return NextResponse.json(
      { ok: false, reason: 'payments-disabled' },
      { status: 503 },
    );
  }

  const purchaseId = request.nextUrl.searchParams.get('purchaseId');
  if (!purchaseId) return redirectTo(request, 'error');

  let token: string | null = null;
  try {
    const form = await request.formData();
    token = (form.get('token') as string | null) ?? null;
  } catch {
    return redirectTo(request, 'error', purchaseId);
  }
  if (!token) return redirectTo(request, 'error', purchaseId);

  const purchase = await getPurchase(purchaseId);
  if (!purchase) return redirectTo(request, 'error');

  // If the webhook already credited, just bounce with success.
  if (purchase.status === 'succeeded') {
    return redirectTo(request, 'success', purchaseId);
  }
  if (purchase.status === 'failed' || purchase.status === 'expired') {
    return redirectTo(request, 'failed', purchaseId);
  }

  let result;
  try {
    result = await retrieveCheckoutForm(token);
  } catch (err) {
    console.error('[iyzico] retrieveCheckoutForm failed', err);
    return redirectTo(request, 'error', purchaseId);
  }

  if (result.status !== 'success' || !result.paymentId) {
    await markPurchaseFailed(
      purchaseId,
      result.errorMessage ?? result.paymentStatus ?? 'unknown',
    );
    return redirectTo(request, 'failed', purchaseId);
  }

  try {
    await applySuccessfulPurchase({
      purchaseId,
      iyzicoPaymentId: result.paymentId,
    });
  } catch (err) {
    console.error('[iyzico] applySuccessfulPurchase failed', err);
    return redirectTo(request, 'error', purchaseId);
  }

  return redirectTo(request, 'success', purchaseId);
}

// Some browsers may follow the redirect as GET on retry — be permissive.
export async function GET(request: NextRequest): Promise<NextResponse> {
  return redirectTo(request, 'pending', request.nextUrl.searchParams.get('purchaseId'));
}

function redirectTo(
  request: NextRequest,
  status: 'success' | 'failed' | 'pending' | 'error',
  purchaseId?: string | null,
): NextResponse {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') ??
    request.nextUrl.origin;
  const url = new URL(`${base}/tr/billing`);
  url.searchParams.set('payment', status);
  if (purchaseId) url.searchParams.set('purchaseId', purchaseId);
  return NextResponse.redirect(url, 303);
}
