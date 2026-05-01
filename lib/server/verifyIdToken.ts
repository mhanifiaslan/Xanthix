import 'server-only';
import { type DecodedIdToken } from 'firebase-admin/auth';
import { getAdminAuth } from '@/lib/firebase/admin';

/**
 * Verifies a Firebase ID token from the client and returns the decoded
 * claims. Throws if the token is missing, expired, or otherwise invalid.
 * Use this from Server Actions and route handlers that act on behalf of
 * the authenticated user.
 */
export async function verifyIdToken(idToken: string | null | undefined): Promise<DecodedIdToken> {
  if (!idToken) {
    throw new Error('Missing ID token');
  }
  return await getAdminAuth().verifyIdToken(idToken, true);
}
