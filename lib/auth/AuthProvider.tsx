'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updateProfile,
  signOut as fbSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { useLocale } from 'next-intl';
import { getFirebaseAuth, initAppCheck } from '@/lib/firebase/client';
import { provisionUserAction } from '@/lib/actions/provisionUser';
import {
  createSessionAction,
  destroySessionAction,
} from '@/lib/actions/session';

export type UserRole = 'user' | 'admin' | 'super_admin';

export interface AuthUser {
  uid: string;
  email: string | null;
  name: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  role: UserRole;
  orgIds: readonly string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    name: string,
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshClaims: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function readClaims(fbUser: FirebaseUser): Promise<{
  role: UserRole;
  orgIds: readonly string[];
}> {
  const tokenResult = await fbUser.getIdTokenResult();
  const claims = tokenResult.claims as Record<string, unknown>;
  const role = (claims.role as UserRole | undefined) ?? 'user';
  const orgIds = Array.isArray(claims.orgIds)
    ? (claims.orgIds as string[])
    : [];
  return { role, orgIds };
}

async function toAuthUser(fbUser: FirebaseUser): Promise<AuthUser> {
  const { role, orgIds } = await readClaims(fbUser);
  return {
    uid: fbUser.uid,
    email: fbUser.email,
    name: fbUser.displayName,
    photoURL: fbUser.photoURL,
    emailVerified: fbUser.emailVerified,
    role,
    orgIds,
  };
}

/**
 * Awaits both: server-side user provisioning + session-cookie creation.
 * Throws when either fails so callers can show an error and avoid a redirect
 * loop where the client believes it's signed in but the server can't tell.
 */
async function completeSignIn(fbUser: FirebaseUser, locale: string) {
  const idToken = await fbUser.getIdToken(true);
  await provisionUserAction({ idToken, locale });
  await createSessionAction(idToken);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initAppCheck();
    const auth = getFirebaseAuth();

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      try {
        setUser(await toAuthUser(fbUser));
      } finally {
        setIsLoading(false);
      }
    });

    const unsubToken = onIdTokenChanged(auth, async (fbUser) => {
      if (!fbUser) return;
      setUser(await toAuthUser(fbUser));
    });

    return () => {
      unsubAuth();
      unsubToken();
    };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(
      getFirebaseAuth(),
      email,
      password,
    );
    await completeSignIn(cred.user, localeRef.current);
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, name: string) => {
      const cred = await createUserWithEmailAndPassword(
        getFirebaseAuth(),
        email,
        password,
      );
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
      await completeSignIn(cred.user, localeRef.current);
    },
    [],
  );

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(getFirebaseAuth(), provider);
    await completeSignIn(cred.user, localeRef.current);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(getFirebaseAuth(), email);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await destroySessionAction();
    } finally {
      await fbSignOut(getFirebaseAuth());
    }
  }, []);

  const refreshClaims = useCallback(async () => {
    const fbUser = getFirebaseAuth().currentUser;
    if (!fbUser) return;
    // Force a token rotation so the latest custom claims (orgIds, role, …)
    // appear in the ID token, then exchange that token for a brand-new
    // session cookie so server reads see the same claims.
    const idToken = await fbUser.getIdToken(true);
    try {
      await createSessionAction(idToken);
    } catch (e) {
      console.warn('[auth] failed to refresh session cookie', e);
    }
    setUser(await toAuthUser(fbUser));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      resetPassword,
      signOut,
      refreshClaims,
    }),
    [
      user,
      isLoading,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      resetPassword,
      signOut,
      refreshClaims,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
