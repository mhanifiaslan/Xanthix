'use client';

import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth/AuthProvider';

export default function DashboardHeader() {
  const { user } = useAuth();
  const t = useTranslations('dashboard.header');

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greetingMorning');
    if (hour < 18) return t('greetingAfternoon');
    return t('greetingEvening');
  })();

  const firstName = user?.name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? '';

  return (
    <header className="flex items-center justify-between py-6 px-8 bg-[var(--color-background)] sticky top-0 z-10 border-b border-white/5">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1 flex items-center gap-2">
          {greeting} {firstName} <span className="text-xl">👋</span>
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <button
          className="relative p-2 rounded-full hover:bg-[var(--color-card)] transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          aria-label={t('notifications')}
        >
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--color-accent)] rounded-full border-2 border-[var(--color-background)]"></span>
        </button>
      </div>
    </header>
  );
}
