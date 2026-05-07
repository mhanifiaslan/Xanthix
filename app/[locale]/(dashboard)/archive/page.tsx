'use client';

import { useTranslations } from 'next-intl';
import ComingSoon from '@/components/shared/ComingSoon';

export default function ArchivePage() {
  const t = useTranslations('archive');
  return (
    <div className="min-h-full">
      <header className="px-8 py-6 border-b border-white/5">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
          {t('title')}
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
          {t('subtitle')}
        </p>
      </header>
      <div className="h-[calc(100vh-120px)]">
        <ComingSoon
          title={t('comingSoonTitle')}
          description={t('comingSoonDesc')}
        />
      </div>
    </div>
  );
}
