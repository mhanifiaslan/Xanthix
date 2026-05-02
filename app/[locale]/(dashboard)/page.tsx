import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Plus } from 'lucide-react';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { listProjectTypes } from '@/lib/server/projectTypes';
import {
  listProjectsByOrg,
  listProjectsByOwner,
} from '@/lib/server/projects';
import { getServerSession } from '@/lib/server/getServerSession';
import { getActiveWorkspace } from '@/lib/server/workspace';
import { routing, type Locale } from '@/i18n/routing';
import { projectTypeIcon } from '@/components/shared/ProjectTypeIcon';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await getServerSession();
  if (!session) notFound();

  const workspace = await getActiveWorkspace(session.uid);
  const orgIds = workspace.kind === 'org' ? [workspace.orgId] : [];
  const allTypes = await listProjectTypes({ orgIds });
  const featuredTypes = allTypes.slice(0, 3);
  const loc = locale as Locale;

  const projectsForWorkspace =
    workspace.kind === 'org'
      ? await listProjectsByOrg(workspace.orgId)
      : (await listProjectsByOwner(session.uid)).filter((p) => !p.orgId);
  const recentProjects = projectsForWorkspace.slice(0, 4);

  return (
    <div className="min-h-full pb-12">
      <DashboardHeader />

      <main className="px-8 max-w-7xl mx-auto mt-8">
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              Yeni proje başlat
            </h2>
            {allTypes.length > featuredTypes.length && (
              <Link
                href={`/${locale}/project-types`}
                className="flex items-center gap-1 text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
              >
                Tümünü gör <ArrowRight size={16} />
              </Link>
            )}
          </div>

          {featuredTypes.length === 0 ? (
            <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-10 text-center">
              <p className="text-[var(--color-text-secondary)] text-sm">
                Henüz tanımlı bir proje türü yok.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredTypes.map((t) => {
                const Icon = projectTypeIcon(t.iconName);
                return (
                  <Link
                    key={t.id}
                    href={`/${locale}/project-types/${t.slug}`}
                    className="group relative bg-[var(--color-card)] hover:bg-[#1f2125] p-6 rounded-2xl border border-white/5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-[var(--color-accent)]/10"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 rounded-xl bg-[var(--color-background)] border border-white/10 flex items-center justify-center text-[var(--color-accent)] group-hover:scale-110 transition-transform">
                        <Icon size={24} />
                      </div>
                      <div className="bg-[var(--color-sidebar)] px-2.5 py-1 rounded-full border border-white/5 text-xs font-medium text-[var(--color-text-secondary)] uppercase">
                        {t.tier}
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2 group-hover:text-[var(--color-accent)] transition-colors">
                      {t.name[loc] ?? t.name.en}
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-4">
                      {t.description[loc] ?? t.description.en}
                    </p>

                    <div className="flex items-center text-[var(--color-accent)] text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus size={16} className="mr-1" /> Başlat
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              Son çalıştığın projeler
            </h2>
            <Link
              href={`/${locale}/projects`}
              className="flex items-center gap-1 text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
            >
              Tümünü gör <ArrowRight size={16} />
            </Link>
          </div>

          {recentProjects.length === 0 ? (
            <div className="bg-[var(--color-card)] rounded-2xl border border-dashed border-white/10 p-8 text-center">
              <p className="text-sm text-[var(--color-text-secondary)]">
                {workspace.kind === 'org'
                  ? `${workspace.orgName} adına henüz bir proje açılmamış.`
                  : 'Henüz bir projen yok. Yukarıdan bir tür seçip başlayabilirsin.'}
              </p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar">
              {recentProjects.map((p) => {
                const progress =
                  p.totalSections === 0
                    ? 0
                    : Math.round((p.currentSectionIndex / p.totalSections) * 100);
                return (
                  <Link
                    key={p.id}
                    href={`/${locale}/projects/${p.id}`}
                    className="snap-start min-w-[280px] bg-[var(--color-card)] rounded-2xl border border-white/5 hover:border-[var(--color-accent)]/30 p-5 transition-colors"
                  >
                    <p className="text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                      {p.projectTypeSlug}
                    </p>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] mt-1 line-clamp-2 min-h-[40px]">
                      {p.title}
                    </p>
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-[var(--color-text-secondary)] mb-1">
                        <span>İlerleme</span>
                        <span>%{progress}</span>
                      </div>
                      <div className="w-full bg-[var(--color-background)] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--color-accent)]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-3 pt-3 border-t border-white/5">
                      {p.tokensSpent.toLocaleString(locale)} token harcandı
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
