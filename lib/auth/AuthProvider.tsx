'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initAppCheck();

    const auth = getFirebaseAuth();
    const provisioned = new Set<string>();

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      try {
        // Provision the Firestore user doc + open a server session cookie
        // once per browser session.
        if (!provisioned.has(fbUser.uid)) {
          provisioned.add(fbUser.uid);
          try {
            const idToken = await fbUser.getIdToken();
            await Promise.all([
              provisionUserAction({ idToken, locale }),
              createSessionAction(idToken),
            ]);
          } catch (e) {
            console.warn('[auth] post-signin tasks failed', e);
          }
        }
        setUser(await toAuthUser(fbUser));
      } finally {
        setIsLoading(false);
      }
    });

    // Refresh claims if a token rotates (e.g. after server-side claim update).
    const unsubToken = onIdTokenChanged(auth, async (fbUser) => {
      if (!fbUser) return;
      setUser(await toAuthUser(fbUser));
    });

    return () => {
      unsubAuth();
      unsubToken();
    };
  }, [locale]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, name: string) => {
      const auth = getFirebaseAuth();
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
    },
    [],
  );

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(getFirebaseAuth(), provider);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(getFirebaseAuth(), email);
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(getFirebaseAuth());
    await destroySessionAction();
  }, []);

  const refreshClaims = useCallback(async () => {
    const fbUser = getFirebaseAuth().currentUser;
    if (!fbUser) return;
    await fbUser.getIdToken(true);
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
