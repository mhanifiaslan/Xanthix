import { notFound } from 'next/navigation';
import { FolderGit2, LayoutGrid, Sparkles } from 'lucide-react';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { listProjectTypes } from '@/lib/server/projectTypes';
import { listCategories } from '@/lib/server/projectCategories';
import {
  listProjectsByOrg,
  listProjectsByOwner,
} from '@/lib/server/projects';
import { getServerSession } from '@/lib/server/getServerSession';
import { getActiveWorkspace } from '@/lib/server/workspace';
import { routing, type Locale } from '@/i18n/routing';
import { projectTypeIcon } from '@/components/shared/ProjectTypeIcon';
import HomeChatBar from '@/components/home/HomeChatBar';
import GetStartedCard from '@/components/home/GetStartedCard';
import IntegrationsStrip from '@/components/home/IntegrationsStrip';

export const dynamic = 'force-dynamic';

export default async function DashboardHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await getServerSession();
  if (!session) notFound();

  const t = await getTranslations({ locale, namespace: 'home' });

  const workspace = await getActiveWorkspace(session.uid);
  const orgIds = workspace.kind === 'org' ? [workspace.orgId] : [];
  const [types, allCategories] = await Promise.all([
    listProjectTypes({ orgIds }),
    listCategories({ includeInactive: false }),
  ]);
  const loc = locale as Locale;

  // Top-level categories that actually have at least one matching template
  // — sort by template count, take the top 5. Drives the chip strip below.
  const categoryUsage = new Map<string, number>();
  for (const tp of types) {
    if (tp.categoryId) {
      categoryUsage.set(tp.categoryId, (categoryUsage.get(tp.categoryId) ?? 0) + 1);
    }
  }
  const popularCategories = allCategories
    .filter((c) => c.parentId === null && categoryUsage.has(c.id))
    .map((c) => ({ ...c, count: categoryUsage.get(c.id) ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const projects =
    workspace.kind === 'org'
      ? await listProjectsByOrg(workspace.orgId)
      : (await listProjectsByOwner(session.uid)).filter((p) => !p.orgId);
  projects.sort(
    (a, b) =>
      new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime(),
  );
  const lastProject = projects[0];

  const featured = types.slice(0, 2);
  const continueCard = lastProject
    ? {
        href: `/${locale}/projects/${lastProject.id}`,
        title: lastProject.title,
        subtitle: t('cardContinueSubtitle', {
          percent:
            lastProject.totalSections === 0
              ? 0
              : Math.round(
                  (lastProject.currentSectionIndex / lastProject.totalSections) *
                    100,
                ),
        }),
      }
    : null;

  return (
    <main className="relative min-h-full flex flex-col bg-gradient-to-b from-[var(--color-background)] to-[#0c0d10]">
      {/* Top: headline + cards (centered, with breathing room) */}
      <div className="flex-1 flex flex-col items-center px-6 lg:px-10 pt-16 pb-10">
        <div className="w-full max-w-3xl">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-primary)] text-center mb-10">
            {t('helpHeadline')}
          </h1>

          {popularCategories.length > 0 && (
            <div className="mb-8">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]/60 mb-3">
                {t('browseByCategory')}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {popularCategories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/${locale}/projects/start?cat=${c.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-white/20 hover:bg-white/[0.03] transition-colors"
                  >
                    <span>{c.name}</span>
                    <span className="text-[10px] font-mono text-[var(--color-text-secondary)]/60">
                      {c.count}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]/60 mb-3">
            {t('getStarted')}
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {featured.map((type) => {
              const Icon = projectTypeIcon(type.iconName);
              return (
                <GetStartedCard
                  key={type.id}
                  href={`/${locale}/projects/start?type=${type.slug}`}
                  icon={Icon}
                  iconWrapClassName="bg-gradient-to-br from-indigo-500/25 to-violet-500/15 border border-white/10"
                  iconClassName="text-indigo-300"
                  title={type.name}
                  subtitle={type.description}
                />
              );
            })}

            {continueCard ? (
              <GetStartedCard
                href={continueCard.href}
                icon={FolderGit2}
                iconWrapClassName="bg-gradient-to-br from-emerald-500/25 to-teal-400/15 border border-white/10"
                iconClassName="text-emerald-300"
                title={continueCard.title}
                subtitle={continueCard.subtitle}
              />
            ) : (
              <GetStartedCard
                href={`/${locale}/project-types`}
                icon={Sparkles}
                iconWrapClassName="bg-gradient-to-br from-fuchsia-500/25 to-pink-400/15 border border-white/10"
                iconClassName="text-fuchsia-300"
                title={t('newProject')}
                subtitle={featured[0]?.description ?? ''}
              />
            )}

            <GetStartedCard
              href={`/${locale}/project-types`}
              icon={LayoutGrid}
              iconWrapClassName="bg-gradient-to-br from-amber-500/25 to-orange-400/15 border border-white/10"
              iconClassName="text-amber-300"
              title={t('cardBrowseAllTitle')}
              subtitle={t('cardBrowseAllSubtitle')}
            />
          </div>
        </div>
      </div>

      {/* Bottom: chat input docks here, full width up to a max */}
      <div className="border-t border-white/5 bg-[var(--color-background)]/95 backdrop-blur px-6 lg:px-10 pt-5 pb-6">
        <div className="w-full max-w-3xl mx-auto">
          <HomeChatBar />
          <IntegrationsStrip />
        </div>
      </div>
    </main>
  );
}
