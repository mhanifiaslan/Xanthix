import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { listProjectTypes, getProjectTypeBySlug } from '@/lib/server/projectTypes';
import { listOrgsForUser } from '@/lib/server/organizations';
import { getServerSession } from '@/lib/server/getServerSession';
import { getActiveWorkspace } from '@/lib/server/workspace';
import { routing, type Locale } from '@/i18n/routing';
import { projectTypeIcon } from '@/components/shared/ProjectTypeIcon';
import SimpleStartForm from './SimpleStartForm';

export const dynamic = 'force-dynamic';

interface SearchParams {
  type?: string;
  prompt?: string;
}

export default async function ProjectStartPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await getServerSession();
  if (!session) redirect(`/${locale}/login`);

  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: 'start' });
  const loc = locale as Locale;

  const workspace = await getActiveWorkspace(session.uid);
  const orgIds = workspace.kind === 'org' ? [workspace.orgId] : session.orgIds.slice();

  // ── Type selection screen ─────────────────────────────────────────────
  if (!sp.type) {
    const types = await listProjectTypes({ orgIds });

    return (
      <main className="min-h-full px-6 lg:px-10 py-12">
        <header className="max-w-4xl mx-auto mb-8 flex items-center gap-4">
          <Link
            href={`/${locale}/home`}
            className="w-10 h-10 rounded-md bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
            aria-label={t('backTitle')}
          >
            <ArrowLeft size={18} className="text-[var(--color-text-secondary)]" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              {t('selectTypeTitle')}
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              {t('selectTypeBody')}
            </p>
          </div>
        </header>

        {types.length === 0 ? (
          <div className="max-w-xl mx-auto bg-[var(--color-card)] rounded-md border border-dashed border-white/10 p-10 text-center text-sm text-[var(--color-text-secondary)]">
            {t('noTypesAvailable')}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {types.map((type) => {
              const Icon = projectTypeIcon(type.iconName);
              const queryString = sp.prompt
                ? `?type=${type.slug}&prompt=${encodeURIComponent(sp.prompt)}`
                : `?type=${type.slug}`;
              return (
                <Link
                  key={type.id}
                  href={`/${locale}/projects/start${queryString}`}
                  className="group bg-[var(--color-card)]/70 hover:bg-[var(--color-card)] border border-white/5 hover:border-white/15 rounded-md p-5 transition-all duration-200 flex flex-col gap-3"
                >
                  <div className="w-10 h-10 rounded-md bg-gradient-to-br from-indigo-500/25 to-violet-500/15 border border-white/10 flex items-center justify-center transition-transform group-hover:scale-105">
                    <Icon size={18} className="text-indigo-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
                      {type.name[loc] ?? type.name.en}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-3">
                      {type.description[loc] ?? type.description.en}
                    </p>
                  </div>
                  <div className="mt-auto pt-2 border-t border-white/5 flex items-center justify-between text-[10px] uppercase tracking-wider">
                    <span className="text-[var(--color-text-secondary)]/70">
                      {type.tier}
                    </span>
                    <span className="text-[var(--color-accent)]">
                      {type.sections.length} sections
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    );
  }

  // ── Chat panel for the selected type ─────────────────────────────────
  const projectType = await getProjectTypeBySlug(sp.type, { orgIds });
  if (!projectType) notFound();

  const orgs = await listOrgsForUser(session.uid);
  const orgOptions = orgs.map((o) => ({
    id: o.id,
    name: o.name,
    tokenBalance: o.tokenBalance,
  }));

  return (
    <SimpleStartForm
      locale={locale}
      projectType={{
        id: projectType.id,
        slug: projectType.slug,
        name: projectType.name[loc] ?? projectType.name.en,
        description: projectType.description[loc] ?? projectType.description.en,
        iconName: projectType.iconName,
        tier: projectType.tier,
        visibility: projectType.visibility,
        sections: projectType.sections.map((s) => ({
          id: s.id,
          title: s.title[loc] ?? s.title.en,
          requiresUserInput: s.requiresUserInput ?? false,
          fields: (s.userInputSchema?.fields ?? []).map((f) => ({
            id: f.id,
            label: f.label[loc] ?? f.label.en,
            placeholder: f.placeholder?.[loc] ?? f.placeholder?.en ?? '',
            type: f.type,
            required: f.required ?? false,
            options: (f.options ?? []).map((o) => ({
              value: o.value,
              label: o.label[loc] ?? o.label.en,
            })),
          })),
        })),
      }}
      orgs={orgOptions}
      preselectedOrgId={
        workspace.kind === 'org' ? workspace.orgId : null
      }
      initialPrompt={sp.prompt ?? ''}
    />
  );
}
