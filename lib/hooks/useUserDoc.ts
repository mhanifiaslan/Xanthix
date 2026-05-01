'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/AuthProvider';
import { getFirebaseFirestore } from '@/lib/firebase/client';

export interface UserDoc {
  uid: string;
  email: string | null;
  name: string | null;
  photoURL: string | null;
  locale: 'tr' | 'en' | 'es';
  planType: 'free' | 'individual' | 'org_member';
  tokenBalance: number;
  orgIds: readonly string[];
}

/**
 * Subscribes to /users/{uid} for the signed-in user. Updates live as
 * server-side actions (token spend, plan changes, …) write to the doc.
 * Returns null while loading or when the user is signed out.
 */
export function useUserDoc(): UserDoc | null {
  const { user } = useAuth();
  const [doc_, setDoc] = useState<UserDoc | null>(null);

  useEffect(() => {
    if (!user) {
      setDoc(null);
      return;
    }
    const ref = doc(getFirebaseFirestore(), 'users', user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data() as Partial<UserDoc> | undefined;
        if (!data) {
          setDoc(null);
          return;
        }
        setDoc({
          uid: user.uid,
          email: data.email ?? null,
          name: data.name ?? null,
          photoURL: data.photoURL ?? null,
          locale: (data.locale as UserDoc['locale']) ?? 'en',
          planType: (data.planType as UserDoc['planType']) ?? 'free',
          tokenBalance: data.tokenBalance ?? 0,
          orgIds: Array.isArray(data.orgIds) ? data.orgIds : [],
        });
      },
      (err) => {
        console.warn('[useUserDoc] snapshot error', err);
      },
    );
    return () => unsub();
  }, [user]);

  return doc_;
}
