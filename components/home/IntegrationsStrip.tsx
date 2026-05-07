'use client';

import { useTranslations } from 'next-intl';

const INTEGRATIONS = [
  { name: 'Drive', label: 'Google Drive', svg: 'drive' },
  { name: 'Slack', label: 'Slack', svg: 'slack' },
  { name: 'Gmail', label: 'Gmail', svg: 'gmail' },
  { name: 'Calendar', label: 'Google Calendar', svg: 'calendar' },
  { name: 'GitHub', label: 'GitHub', svg: 'github' },
  { name: 'Notion', label: 'Notion', svg: 'notion' },
  { name: 'Outlook', label: 'Outlook', svg: 'outlook' },
] as const;

export default function IntegrationsStrip() {
  const t = useTranslations('home');
  return (
    <div className="mt-4 flex items-center gap-3 text-xs text-[var(--color-text-secondary)]/70">
      <span>{t('connectApps')}</span>
      <div className="flex items-center gap-1.5">
        {INTEGRATIONS.map((it) => (
          <button
            key={it.name}
            type="button"
            disabled
            aria-disabled="true"
            title={`${it.label} · ${t('comingSoon')}`}
            className="w-7 h-7 rounded-sm bg-white/5 border border-white/5 grayscale opacity-60 hover:opacity-90 transition-opacity flex items-center justify-center cursor-not-allowed"
          >
            <span className="text-[10px] font-bold text-[var(--color-text-secondary)]">
              {it.svg.slice(0, 1).toUpperCase()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
