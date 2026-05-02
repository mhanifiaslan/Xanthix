'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { doc, onSnapshot } from 'firebase/firestore';
import { useUserDoc } from '@/lib/hooks/useUserDoc';
import { getFirebaseFirestore } from '@/lib/firebase/client';

interface WalletDisplay {
  kind: 'personal' | 'org';
  orgId?: string;
  initialBalance: number;
  label: string;
}

export default function CreditDisplay({ wallet }: { wallet: WalletDisplay }) {
  const locale = useLocale() as 'tr' | 'en' | 'es';
  const userDoc = useUserDoc();
  const orgBalance = useOrgBalance(
    wallet.kind === 'org' ? wallet.orgId ?? null : null,
    wallet.initialBalance,
  );

  const balance =
    wallet.kind === 'org'
      ? orgBalance
      : userDoc?.tokenBalance ?? wallet.initialBalance;

  return (
    <div className="mb-6 px-4 mt-2">
      <div className="bg-[var(--color-card)] rounded-xl p-4 border border-white/5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="text-xs text-[var(--color-text-secondary)] block mb-1">
              {wallet.label}
            </span>
            <span className="text-2xl font-bold text-[var(--color-text-primary)] tabular-nums">
              {balance === null ? '—' : balance.toLocaleString(locale)}
            </span>
            <span className="text-sm text-[var(--color-text-secondary)] ml-1">
              token
            </span>
          </div>
        </div>
        <Link
          href={`/${locale}/billing`}
          className="block text-center w-full py-2 px-4 rounded-lg border border-[var(--color-accent)] text-[var(--color-accent)] text-sm font-medium hover:bg-[var(--color-accent)] hover:text-white transition-colors"
        >
          Token yükle
        </Link>
      </div>
    </div>
  );
}

function useOrgBalance(orgId: string | null, initial: number): number {
  const [balance, setBalance] = useState(initial);
  useEffect(() => {
    if (!orgId) return;
    const ref = doc(getFirebaseFirestore(), 'organizations', orgId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data();
        if (typeof data?.tokenBalance === 'number') {
          setBalance(data.tokenBalance);
        }
      },
      (err) => console.warn('[CreditDisplay] org snapshot error', err),
    );
    return () => unsub();
  }, [orgId]);
  return balance;
}
