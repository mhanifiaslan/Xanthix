import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';

export default async function NewProjectTypePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <div className="min-h-full pb-12">
      <header className="px-8 py-6 border-b border-white/5 flex items-center gap-4">
        <Link
          href={`/${locale}/admin/project-types`}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={18} className="text-[var(--color-text-secondary)]" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
            New project type
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Section editor — coming in Sprint 2.5
          </p>
        </div>
      </header>

      <div className="px-8 py-12 max-w-3xl mx-auto">
        <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 mb-5">
            <Sparkles size={26} className="text-[var(--color-accent)]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Visual section editor coming soon
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-md mx-auto mb-6">
            For now, project types are defined in code and seeded into Firestore.
            Edit{' '}
            <code className="px-1.5 py-0.5 rounded bg-white/5 text-[var(--color-accent)]">
              lib/seed/projectTypes.ts
            </code>{' '}
            then run{' '}
            <code className="px-1.5 py-0.5 rounded bg-white/5 text-[var(--color-accent)]">
              npm run seed:project-types
            </code>{' '}
            to publish changes.
          </p>
          <Link
            href={`/${locale}/admin/project-types`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Back to list
          </Link>
        </div>
      </div>
    </div>
  );
}
