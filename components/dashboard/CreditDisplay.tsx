'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useUserDoc } from '@/lib/hooks/useUserDoc';

const PLAN_LABELS: Record<string, { tr: string; en: string; es: string }> = {
  free: { tr: 'Ücretsiz Plan', en: 'Free Plan', es: 'Plan gratuito' },
  individual: { tr: 'Bireysel Plan', en: 'Individual Plan', es: 'Plan individual' },
  org_member: { tr: 'Kurumsal Üye', en: 'Org member', es: 'Miembro de organización' },
};

export default function CreditDisplay() {
  const userDoc = useUserDoc();
  const locale = useLocale() as 'tr' | 'en' | 'es';

  const planLabel =
    PLAN_LABELS[userDoc?.planType ?? 'free'][locale] ?? 'Free Plan';
  const balance = userDoc?.tokenBalance ?? null;

  return (
    <div className="mb-6 px-4">
      <div className="bg-[var(--color-card)] rounded-xl p-4 border border-white/5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="text-xs text-[var(--color-text-secondary)] block mb-1">
              {planLabel}
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
