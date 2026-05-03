import 'server-only';
import Iyzipay from 'iyzipay';

let _client: Iyzipay | null = null;

/**
 * Returns a process-wide iyzipay client. We default to sandbox so the very
 * first deploy doesn't hit production accidentally; switching to live is a
 * single env var change once the merchant account is approved.
 *
 * Required env vars:
 *   IYZICO_API_KEY           — sandbox starts with "sandbox-..."
 *   IYZICO_SECRET_KEY        — sandbox starts with "sandbox-..."
 *   IYZICO_BASE_URL          — https://sandbox-api.iyzipay.com (test) or
 *                              https://api.iyzipay.com (live)
 */
export function getIyzipay(): Iyzipay {
  if (_client) return _client;

  const apiKey = process.env.IYZICO_API_KEY;
  const secretKey = process.env.IYZICO_SECRET_KEY;
  const baseUrl =
    process.env.IYZICO_BASE_URL ?? 'https://sandbox-api.iyzipay.com';

  if (!apiKey || !secretKey) {
    throw new Error(
      'iyzico credentials missing — set IYZICO_API_KEY and IYZICO_SECRET_KEY.',
    );
  }

  _client = new Iyzipay({ apiKey, secretKey, uri: baseUrl });
  return _client;
}

export function isLiveMode(): boolean {
  const baseUrl = process.env.IYZICO_BASE_URL ?? '';
  return baseUrl.includes('api.iyzipay.com') && !baseUrl.includes('sandbox');
}
