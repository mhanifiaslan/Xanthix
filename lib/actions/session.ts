'use server';

import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase/admin';
import { SESSION_COOKIE, SESSION_TTL_SECONDS } from '@/lib/auth/constants';

/**
 * Exchanges a fresh Firebase ID token for an httpOnly session cookie.
 * Must be invoked from the client right after sign-in / sign-up.
 *
 * The cookie is opaque to the client; only the server can verify it.
 * proxy.ts treats its presence as a hint, but every protected layout
 * must still re-verify the cookie via `getServerSession()`.
 */
export async function createSessionAction(idToken: string) {
  // Belt-and-braces: validate the ID token first. Cheap and rejects forgery.
  await getAdminAuth().verifyIdToken(idToken, true);

  const sessionCookie = await getAdminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_TTL_SECONDS * 1000,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySessionAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
