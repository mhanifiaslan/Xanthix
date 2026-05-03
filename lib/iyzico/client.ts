import 'server-only';
import type Iyzipay from 'iyzipay';

let _client: Iyzipay | null = null;

/** Truthy when both iyzico secrets are present in the environment. */
export function isIyzicoConfigured(): boolean {
  return !!process.env.IYZICO_API_KEY && !!process.env.IYZICO_SECRET_KEY;
}

/**
 * Returns a process-wide iyzipay client. The package itself is loaded with
 * a dynamic import so the constructor (which does fs.readdirSync on the
 * package's own lib/resources/) only runs when credentials are present.
 *
 * Required env vars:
 *   IYZICO_API_KEY           — sandbox starts with "sandbox-..."
 *   IYZICO_SECRET_KEY        — sandbox starts with "sandbox-..."
 *   IYZICO_BASE_URL          — https://sandbox-api.iyzipay.com (test) or
 *                              https://api.iyzipay.com (live)
 */
export async function getIyzipay(): Promise<Iyzipay> {
  if (_client) return _client;

  const apiKey = process.env.IYZICO_API_KEY;
  const secretKey = process.env.IYZICO_SECRET_KEY;
  const baseUrl =
    process.env.IYZICO_BASE_URL ?? 'https://sandbox-api.iyzipay.com';

  if (!apiKey || !secretKey) {
    throw new PaymentsDisabledError(
      'iyzico credentials missing — set IYZICO_API_KEY and IYZICO_SECRET_KEY.',
    );
  }

  const { default: IyzipayCtor } = await import('iyzipay');
  _client = new IyzipayCtor({ apiKey, secretKey, uri: baseUrl });
  return _client;
}

export function isLiveMode(): boolean {
  const baseUrl = process.env.IYZICO_BASE_URL ?? '';
  return baseUrl.includes('api.iyzipay.com') && !baseUrl.includes('sandbox');
}

/**
 * Thrown when an iyzico-dependent code path runs but credentials aren't
 * configured. Callers (server actions, route handlers) should catch this
 * and surface a "payments disabled" message rather than a 500.
 */
export class PaymentsDisabledError extends Error {
  readonly code = 'PAYMENTS_DISABLED';
  constructor(message = 'Payments are not configured on this environment.') {
    super(message);
    this.name = 'PaymentsDisabledError';
  }
}
