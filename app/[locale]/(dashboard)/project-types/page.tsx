import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { listProjectTypes } from '@/lib/server/projectTypes';
import { getServerSession } from '@/lib/server/getServerSession';
import { routing, type Locale } from '@/i18n/routing';
import { projectTypeIcon } from '@/components/shared/ProjectTypeIcon';

export const dynamic = 'force-dynamic';

export default async function ProjectTypesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await getServerSession();
  if (!session) notFound();

  const types = await listProjectTypes({ orgIds: session.orgIds });
  const loc = locale as Locale;

  return (
    <div className="min-h-full pb-12">
      <header className="px-8 py-6 border-b border-white/5">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
          Proje türleri
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
          {types.length} tür mevcut
        </p>
      </header>

      <div className="px-8 py-8 max-w-6xl mx-auto">
        {types.length === 0 ? (
          <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-10 text-center">
            <p className="text-[var(--color-text-secondary)] text-sm">
              Henüz tanımlı bir proje türü yok.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {types.map((t) => {
              const Icon = projectTypeIcon(t.iconName);
              return (
                <Link
                  key={t.id}
                  href={`/${locale}/project-types/${t.slug}`}
                  className="group bg-[var(--color-card)] rounded-2xl border border-white/5 p-5 hover:border-[var(--color-accent)]/30 transition-colors flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center">
                      <Icon size={20} className="text-[var(--color-accent)]" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      {t.tier}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1.5">
                    {t.name[loc] ?? t.name.en}
                  </h2>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed flex-1">
                    {t.description[loc] ?? t.description.en}
                  </p>
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                    <span className="text-[var(--color-text-secondary)]">
                      {t.sections.length} bölüm
                    </span>
                    <span className="flex items-center gap-1 text-[var(--color-accent)] group-hover:gap-2 transition-all">
                      Detay <ArrowRight size={12} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
