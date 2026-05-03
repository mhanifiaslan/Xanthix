import 'server-only';
import { getIyzipay } from './client';

// Iyzipay's PAYMENT_GROUP.PRODUCT constant resolves to the literal string
// 'PRODUCT' (see node_modules/iyzipay/lib/Iyzipay.js). Inlining it lets us
// avoid a static `import Iyzipay from 'iyzipay'` here, which keeps the
// package out of the bundle graph until getIyzipay() runs.
const PAYMENT_GROUP_PRODUCT = 'PRODUCT' as const;

/**
 * iyzipay's API is callback-style; these promisified wrappers keep the call
 * sites readable. They also tighten the success/failure contract:
 *  - Network errors reject.
 *  - iyzico business errors (status === "failure") also reject so callers
 *    can surface `errorMessage` to the user without checking strings.
 */

export interface InitializeArgs {
  /** Amount in major units of `currency` (e.g. 99.00 for ₺99). */
  price: number;
  /** Same as price for non-installment, single-item purchases. */
  paidPrice: number;
  currency: 'TRY' | 'USD' | 'EUR';
  /** Our local row id we'll later look up by. iyzico echoes it back. */
  conversationId: string;
  /** URL iyzico redirects the user to after they finish on the form. */
  callbackUrl: string;
  /** Stable id we share with iyzico (their UUID, our user id, …). */
  buyer: BuyerInfo;
  basket: BasketItem[];
  /** Display language inside iyzico's checkout form. */
  locale?: 'TR' | 'EN';
}

export interface BuyerInfo {
  id: string;
  name: string;
  surname: string;
  email: string;
  /** Phone is required by iyzico — fall back to a project-wide placeholder. */
  gsmNumber: string;
  identityNumber: string;
  registrationAddress: string;
  city: string;
  country: string;
  ip: string;
}

export interface BasketItem {
  id: string;
  name: string;
  category1: string;
  itemType: 'VIRTUAL' | 'PHYSICAL';
  price: number;
}

export interface InitializeResult {
  status: 'success';
  token: string;
  /** URL the browser should be redirected to. */
  paymentPageUrl: string;
  /** HTML snippet alternative if we ever embed the form. */
  checkoutFormContent: string;
  conversationId: string;
}

export async function initializeCheckoutForm(
  args: InitializeArgs,
): Promise<InitializeResult> {
  const sdk = await getIyzipay();

  // @types/iyzipay incorrectly reuses the 3DS payment request shape here
  // and demands `paymentCard` + `installments` even though the hosted
  // checkout form generates the card collection itself. Cast to bypass.
  const payload = {
    locale: args.locale ?? 'TR',
    conversationId: args.conversationId,
    price: args.price.toFixed(2),
    paidPrice: args.paidPrice.toFixed(2),
    currency: args.currency,
    basketId: args.conversationId,
    paymentGroup: PAYMENT_GROUP_PRODUCT,
    callbackUrl: args.callbackUrl,
    buyer: args.buyer,
    shippingAddress: {
      contactName: `${args.buyer.name} ${args.buyer.surname}`.trim(),
      city: args.buyer.city,
      country: args.buyer.country,
      address: args.buyer.registrationAddress,
    },
    billingAddress: {
      contactName: `${args.buyer.name} ${args.buyer.surname}`.trim(),
      city: args.buyer.city,
      country: args.buyer.country,
      address: args.buyer.registrationAddress,
    },
    basketItems: args.basket.map((it) => ({
      id: it.id,
      name: it.name,
      category1: it.category1,
      itemType: it.itemType,
      price: it.price.toFixed(2),
    })),
  };

  return new Promise((resolve, reject) => {
    sdk.checkoutFormInitialize.create(
      payload as never,
      (err: Error | null, result: unknown) => {
        if (err) return reject(err);
        const r = result as IyzicoFormInitRaw;
        if (r.status !== 'success') {
          return reject(
            new Error(
              `iyzico initialize failed: ${r.errorCode ?? '?'} ${r.errorMessage ?? r.status}`,
            ),
          );
        }
        resolve({
          status: 'success',
          token: r.token,
          paymentPageUrl: r.paymentPageUrl,
          checkoutFormContent: r.checkoutFormContent,
          conversationId: r.conversationId,
        });
      },
    );
  });
}

export interface RetrieveResult {
  status: 'success' | 'failure';
  paymentStatus?: string;
  paymentId?: string;
  conversationId?: string;
  price?: number;
  paidPrice?: number;
  currency?: string;
  errorCode?: string;
  errorMessage?: string;
  rawStatus: string;
}

export async function retrieveCheckoutForm(
  token: string,
): Promise<RetrieveResult> {
  const sdk = await getIyzipay();
  return new Promise((resolve, reject) => {
    sdk.checkoutForm.retrieve(
      { token, locale: 'TR' },
      (err: Error | null, result: unknown) => {
        if (err) return reject(err);
        const r = result as IyzicoFormRetrieveRaw;
        const succeeded =
          r.status === 'success' && r.paymentStatus === 'SUCCESS';
        resolve({
          status: succeeded ? 'success' : 'failure',
          paymentStatus: r.paymentStatus,
          paymentId: r.paymentId,
          conversationId: r.conversationId,
          price: r.price,
          paidPrice: r.paidPrice,
          currency: r.currency,
          errorCode: r.errorCode,
          errorMessage: r.errorMessage,
          rawStatus: r.status,
        });
      },
    );
  });
}

interface IyzicoFormInitRaw {
  status: string;
  token: string;
  paymentPageUrl: string;
  checkoutFormContent: string;
  conversationId: string;
  errorCode?: string;
  errorMessage?: string;
}

interface IyzicoFormRetrieveRaw {
  status: string;
  paymentStatus?: string;
  paymentId?: string;
  conversationId?: string;
  price?: number;
  paidPrice?: number;
  currency?: string;
  errorCode?: string;
  errorMessage?: string;
}
