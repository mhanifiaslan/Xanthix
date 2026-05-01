import 'server-only';
import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase/admin';
import { SESSION_COOKIE } from '@/lib/auth/constants';

export interface ServerSession {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  role: 'user' | 'admin' | 'super_admin';
  orgIds: readonly string[];
  name: string | null;
  picture: string | null;
}

/**
 * Reads the session cookie and verifies it via Firebase Admin SDK.
 * Returns `null` when the user is not signed in OR the cookie is invalid.
 * Use from server components / layouts / route handlers.
 */
export async function getServerSession(): Promise<ServerSession | null> {
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;

  try {
    const decoded = await getAdminAuth().verifySessionCookie(cookie, true);
    const role =
      (decoded.role as ServerSession['role'] | undefined) ?? 'user';
    const orgIds = Array.isArray(decoded.orgIds)
      ? (decoded.orgIds as string[])
      : [];
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: !!decoded.email_verified,
      role,
      orgIds,
      name: (decoded.name as string | undefined) ?? null,
      picture: (decoded.picture as string | undefined) ?? null,
    };
  } catch {
    return null;
  }
}

export async function requireServerSession(): Promise<ServerSession> {
  const session = await getServerSession();
  if (!session) throw new Error('Unauthorized');
  return session;
}
