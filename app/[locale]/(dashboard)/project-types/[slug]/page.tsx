import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calendar, Globe, Plus, Wallet } from 'lucide-react';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { getProjectTypeBySlug } from '@/lib/server/projectTypes';
import { getServerSession } from '@/lib/server/getServerSession';
import { routing, type Locale } from '@/i18n/routing';
import { projectTypeIcon } from '@/components/shared/ProjectTypeIcon';

export const dynamic = 'force-dynamic';

const TIER_LABELS: Record<string, { tr: string; en: string; es: string }> = {
  economy: { tr: 'Ekonomik', en: 'Economy', es: 'Economy' },
  standard: { tr: 'Standart', en: 'Standard', es: 'Standard' },
  premium: { tr: 'Premium', en: 'Premium', es: 'Premium' },
  enterprise: { tr: 'Kurumsal', en: 'Enterprise', es: 'Enterprise' },
};

export default async function ProjectTypeDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await getServerSession();
  if (!session) notFound();

  const type = await getProjectTypeBySlug(slug, { orgIds: session.orgIds });
  if (!type) notFound();

  const loc = locale as Locale;
  const Icon = projectTypeIcon(type.iconName);
  const tierLabel = TIER_LABELS[type.tier]?.[loc] ?? type.tier;

  return (
    <div className="min-h-full pb-12">
      <div className="border-b border-white/5 bg-gradient-to-b from-[var(--color-accent)]/5 to-transparent">
        <div className="px-8 py-8 max-w-5xl mx-auto">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 flex items-center justify-center shrink-0">
              <Icon size={26} className="text-[var(--color-accent)]" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">
                {type.name[loc] ?? type.name.en}
              </h1>
              <p className="text-[var(--color-text-secondary)] text-sm">
                {type.description[loc] ?? type.description.en}
              </p>

              <div className="flex flex-wrap gap-3 mt-4">
                {type.budgetHint && (
                  <Pill icon={<Wallet size={12} className="text-[var(--color-accent)]" />}>
                    {type.budgetHint[loc] ?? type.budgetHint.en}
                  </Pill>
                )}
                {type.callDatesHint && (
                  <Pill icon={<Calendar size={12} className="text-[var(--color-warning)]" />}>
                    {type.callDatesHint[loc] ?? type.callDatesHint.en}
                  </Pill>
                )}
                <Pill icon={<Globe size={12} className="text-[var(--color-success)]" />}>
                  {type.outputLanguage === 'auto' ? loc : type.outputLanguage}
                </Pill>
                <Pill>{tierLabel}</Pill>
              </div>
            </div>
            <Link
              href={`/${locale}/projects/new?type=${type.slug}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors shrink-0"
            >
              <Plus size={16} />
              Start project
            </Link>
          </div>
        </div>
      </div>

      <div className="px-8 py-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {type.whoCanApplyHint && (
              <Card title="Who can apply">
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  {type.whoCanApplyHint[loc] ?? type.whoCanApplyHint.en}
                </p>
              </Card>
            )}

            <Card title={`Sections (${type.sections.length})`}>
              <ol className="space-y-3">
                {type.sections.map((s) => (
                  <li key={s.id} className="flex items-start gap-3">
                    <span className="shrink-0 w-7 h-7 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center text-[var(--color-accent)] text-xs font-bold">
                      {s.order}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">
                        {s.title[loc] ?? s.title.en}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed mt-0.5">
                        {s.description[loc] ?? s.description.en}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-b from-[var(--color-accent)]/10 to-[var(--color-card)] rounded-2xl border border-[var(--color-accent)]/20 p-5">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
                What you'll get
              </h2>
              <ul className="space-y-2.5">
                {[
                  `Full draft across ${type.sections.length} structured sections`,
                  'Reviewer-style critique pass',
                  'Budget table & timeline',
                  'AI-assisted revisions',
                  'PDF / DOCX / XLSX export',
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-[var(--color-text-secondary)] mb-1">
                  Tier
                </p>
                <p className="text-xl font-bold text-[var(--color-accent)]">
                  {tierLabel}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pill({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] bg-[var(--color-card)] border border-white/5 px-3 py-1.5 rounded-full">
      {icon}
      {children}
    </span>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-6">
      <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}
