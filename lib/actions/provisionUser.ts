'use server';

import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/server/verifyIdToken';
import { routing, type Locale } from '@/i18n/routing';

interface ProvisionInput {
  idToken: string;
  locale: Locale | string;
}

/**
 * Creates the /users/{uid} document on first login. Idempotent — safe to call
 * on every sign-in. Token grant for new users (50 free PaiTokens) only fires
 * once thanks to a server-side existence check.
 */
export async function provisionUserAction({ idToken, locale }: ProvisionInput) {
  const decoded = await verifyIdToken(idToken);
  const db = getAdminFirestore();
  const ref = db.collection('users').doc(decoded.uid);
  const snap = await ref.get();

  const safeLocale = (routing.locales as readonly string[]).includes(locale)
    ? (locale as Locale)
    : routing.defaultLocale;

  if (!snap.exists) {
    const WELCOME_BONUS = 500;
    const batch = db.batch();
    
    batch.set(ref, {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: decoded.name ?? decoded.email?.split('@')[0] ?? null,
      photoURL: decoded.picture ?? null,
      emailVerified: !!decoded.email_verified,
      locale: safeLocale,
      planType: 'free',
      tokenBalance: WELCOME_BONUS,
      orgIds: [],
      createdAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp(),
    });

    const txRef = db.collection('tokenTransactions').doc();
    batch.set(txRef, {
      userId: decoded.uid,
      type: 'bonus',
      amount: WELCOME_BONUS,
      balanceAfter: WELCOME_BONUS,
      reason: 'welcome',
      createdAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return { created: true };
  }

  await ref.update({
    lastLoginAt: FieldValue.serverTimestamp(),
    // Best-effort field refresh — only updates fields that may have changed
    // upstream (e.g. user changed Google profile picture).
    ...(decoded.picture ? { photoURL: decoded.picture } : {}),
    ...(decoded.email_verified !== undefined
      ? { emailVerified: !!decoded.email_verified }
      : {}),
  });

  return { created: false };
}
