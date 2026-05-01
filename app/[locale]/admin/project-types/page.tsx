import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Plus } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { listProjectTypes } from '@/lib/server/projectTypes';
import { getServerSession } from '@/lib/server/getServerSession';
import { routing, type Locale } from '@/i18n/routing';
import { projectTypeIcon } from '@/components/shared/ProjectTypeIcon';

export const dynamic = 'force-dynamic';

export default async function AdminProjectTypesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await getServerSession();
  // Already gated by app/[locale]/admin/layout.tsx, but belt and braces.
  if (!session) notFound();

  const types = await listProjectTypes({
    includeInactive: true,
    orgIds: session.orgIds,
  });

  return (
    <div className="min-h-full pb-12">
      <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
            Project Types
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            {types.length} template{types.length === 1 ? '' : 's'} defined.
          </p>
        </div>
        <Link
          href={`/${locale}/admin/project-types/new`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus size={15} />
          New type
        </Link>
      </header>

      <div className="px-8 py-8 max-w-6xl mx-auto space-y-6">
        {types.length === 0 ? (
          <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-10 text-center">
            <p className="text-[var(--color-text-secondary)] text-sm">
              No project types yet. Run{' '}
              <code className="px-1.5 py-0.5 rounded bg-white/5 text-[var(--color-accent)]">
                npm run seed:project-types
              </code>{' '}
              to load the starter set.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {types.map((t) => {
              const Icon = projectTypeIcon(t.iconName);
              const loc = locale as Locale;
              return (
                <li
                  key={t.id}
                  className={`bg-[var(--color-card)] rounded-2xl border p-6 transition-all ${
                    t.active ? 'border-white/5' : 'border-white/5 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${
                        t.active
                          ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/20'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <Icon
                        size={20}
                        className={
                          t.active
                            ? 'text-[var(--color-accent)]'
                            : 'text-[var(--color-text-secondary)]'
                        }
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                          {t.name[loc] ?? t.name.en}
                        </h2>
                        <Tag>{t.category}</Tag>
                        <Tag>{t.tier}</Tag>
                        <Tag>output: {t.outputLanguage}</Tag>
                        <Tag>{t.visibility}</Tag>
                        <Tag tone={t.active ? 'success' : 'muted'}>
                          {t.active ? 'active' : 'inactive'}
                        </Tag>
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                        {t.description[loc] ?? t.description.en}
                      </p>
                      <div className="text-xs text-[var(--color-text-secondary)]">
                        slug:{' '}
                        <code className="px-1.5 py-0.5 rounded bg-white/5">
                          {t.slug}
                        </code>{' '}
                        · {t.sections.length} section
                        {t.sections.length === 1 ? '' : 's'} · v{t.version}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-5 border-t border-white/5">
                    <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
                      Section structure
                    </p>
                    <ol className="flex flex-wrap gap-2">
                      {t.sections.map((s) => (
                        <li
                          key={s.id}
                          className="text-xs bg-[var(--color-background)] border border-white/5 px-2.5 py-1 rounded-lg text-[var(--color-text-secondary)] flex items-center gap-1.5"
                        >
                          <span className="w-4 h-4 rounded bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[9px] font-bold flex items-center justify-center">
                            {s.order}
                          </span>
                          {s.title[loc] ?? s.title.en}
                        </li>
                      ))}
                    </ol>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Tag({
  children,
  tone = 'muted',
}: {
  children: React.ReactNode;
  tone?: 'muted' | 'success';
}) {
  const cls =
    tone === 'success'
      ? 'text-[var(--color-success)] bg-[var(--color-success)]/10 border-[var(--color-success)]/20'
      : 'text-[var(--color-text-secondary)] bg-white/5 border-white/10';
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cls}`}
    >
      {children}
    </span>
  );
}
