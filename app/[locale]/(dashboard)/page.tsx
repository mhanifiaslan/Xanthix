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
  
  // Sort projects by last modified date, newest first
  projectsForWorkspace.sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime());
  const recentProjects = projectsForWorkspace.slice(0, 4);

  // Calculate some simple metrics
  const totalProjects = projectsForWorkspace.length;
  const completedProjects = projectsForWorkspace.filter(p => p.currentSectionIndex >= p.totalSections && p.totalSections > 0).length;
  const totalTokensSpent = projectsForWorkspace.reduce((sum, p) => sum + p.tokensSpent, 0);

  const greetingName = session.name || session.email?.split('@')[0] || 'Kullanıcı';

  return (
    <div className="min-h-full pb-12 bg-gradient-to-b from-[var(--color-background)] to-[#111111]">
      <DashboardHeader />

      <main className="px-8 max-w-7xl mx-auto mt-8 space-y-10">
        
        {/* Welcome & Metrics Banner */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--color-card)] to-[#1a1c20] border border-white/5 p-8 md:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-[var(--color-accent)]/20 blur-3xl rounded-full pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Hoş geldin, <span className="text-[var(--color-accent)]">{greetingName}</span> 👋
              </h1>
              <p className="text-[var(--color-text-secondary)]">
                {workspace.kind === 'org' 
                  ? `${workspace.orgName} çalışma alanındasın. Takımınla yeni projeler üretmeye hazır mısın?`
                  : 'Kişisel çalışma alanındasın. Bugün hangi harika fikri projeye dönüştüreceksin?'
                }
              </p>
            </div>
            
            <div className="flex items-center gap-4 bg-black/20 p-4 rounded-2xl border border-white/5 backdrop-blur-sm shrink-0">
              <div className="text-center px-4">
                <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Projeler</p>
                <p className="text-2xl font-bold text-white">{totalProjects}</p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center px-4">
                <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Tamamlanan</p>
                <p className="text-2xl font-bold text-[var(--color-success)]">{completedProjects}</p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center px-4">
                <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Harcanan Token</p>
                <p className="text-xl font-bold text-[var(--color-warning)]">
                  {totalTokensSpent > 1000 ? `${(totalTokensSpent/1000).toFixed(1)}k` : totalTokensSpent}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Project Types (Start New) */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white">
              Yeni Proje Başlat
            </h2>
            {allTypes.length > featuredTypes.length && (
              <Link
                href={`/${locale}/project-types`}
                className="flex items-center gap-2 text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors bg-[var(--color-accent)]/10 px-4 py-2 rounded-full"
              >
                Tümünü gör <ArrowRight size={16} />
              </Link>
            )}
          </div>

          {featuredTypes.length === 0 ? (
            <div className="bg-[var(--color-card)] rounded-3xl border border-dashed border-white/10 p-12 text-center">
              <div className="w-16 h-16 mx-auto bg-white/5 rounded-full flex items-center justify-center mb-4">
                <Plus size={24} className="text-[var(--color-text-secondary)]" />
              </div>
              <p className="text-[var(--color-text-secondary)] text-base">
                Henüz tanımlı bir proje türü yok. Admin panelinden eklenebilir.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredTypes.map((t) => {
                const Icon = projectTypeIcon(t.iconName);
                return (
                  <Link
                    key={t.id}
                    href={`/${locale}/projects/new?type=${t.slug}`}
                    className="group relative bg-[var(--color-card)] hover:bg-[#1f2125] p-7 rounded-3xl border border-white/5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-[var(--color-accent)]/10 overflow-hidden flex flex-col h-full"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[var(--color-accent)]/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <div className="w-14 h-14 rounded-2xl bg-[var(--color-background)] border border-white/5 flex items-center justify-center text-[var(--color-accent)] group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-inner">
                        <Icon size={28} />
                      </div>
                      <div className="bg-[var(--color-sidebar)] px-3 py-1.5 rounded-full border border-white/5 text-[10px] font-bold text-[var(--color-text-secondary)] tracking-wider uppercase">
                        {t.tier}
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[var(--color-accent)] transition-colors relative z-10">
                      {t.name[loc] ?? t.name.en}
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed line-clamp-2 mb-6 flex-grow relative z-10">
                      {t.description[loc] ?? t.description.en}
                    </p>

                    <div className="flex items-center text-[var(--color-accent)] text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 relative z-10">
                      <Plus size={18} className="mr-2" /> Projeyi Başlat
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Projects (Progress Tracker) */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white">
              Son Çalıştığın Projeler
            </h2>
            <Link
              href={`/${locale}/projects`}
              className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-white transition-colors"
            >
              Tümünü gör <ArrowRight size={16} />
            </Link>
          </div>

          {recentProjects.length === 0 ? (
            <div className="bg-[var(--color-card)] rounded-3xl border border-dashed border-white/10 p-12 text-center">
              <p className="text-[var(--color-text-secondary)]">
                {workspace.kind === 'org'
                  ? `${workspace.orgName} adına henüz bir proje açılmamış.`
                  : 'Henüz bir projen yok. Yukarıdan bir tür seçip başlayabilirsin.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recentProjects.map((p) => {
                const isCompleted = p.currentSectionIndex >= p.totalSections && p.totalSections > 0;
                const progress = p.totalSections === 0 ? 0 : Math.round((p.currentSectionIndex / p.totalSections) * 100);
                
                return (
                  <Link
                    key={p.id}
                    href={`/${locale}/projects/${p.id}`}
                    className="flex flex-col bg-[var(--color-card)] rounded-3xl border border-white/5 hover:border-[var(--color-accent)]/40 p-6 transition-all duration-300 hover:shadow-lg hover:shadow-[var(--color-accent)]/5 group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-2 py-1 rounded-md">
                        {p.projectTypeSlug}
                      </p>
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString(locale, { month: 'short', day: 'numeric' }) : ''}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-1 group-hover:text-[var(--color-accent)] transition-colors">
                      {p.title}
                    </h3>
                    
                    <div className="mt-auto pt-4">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                          {isCompleted ? 'Tamamlandı' : `Adım ${p.currentSectionIndex} / ${p.totalSections}`}
                        </span>
                        <span className="text-sm font-bold text-white">
                          %{progress}
                        </span>
                      </div>
                      
                      <div className="w-full bg-[var(--color-background)] rounded-full h-2.5 overflow-hidden shadow-inner">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${isCompleted ? 'bg-[var(--color-success)]' : 'bg-gradient-to-r from-[var(--color-accent)] to-[#6b4cff]'}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      
                      <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          <span className="font-medium text-white">{p.tokensSpent.toLocaleString(locale)}</span> token
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)] flex items-center opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                          Çalışmaya Devam Et <ArrowRight size={14} className="ml-1" />
                        </p>
                      </div>
                    </div>
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
