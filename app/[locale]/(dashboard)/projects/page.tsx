import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { FolderGit2, Plus } from 'lucide-react';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getServerSession } from '@/lib/server/getServerSession';
import {
  listProjectsByOrg,
  listProjectsByOwner,
} from '@/lib/server/projects';
import { getActiveWorkspace } from '@/lib/server/workspace';
import { routing } from '@/i18n/routing';
import ProjectsTable, { type ProjectRow } from '@/components/projects/ProjectsTable';

export const dynamic = 'force-dynamic';

export default async function ProjectsListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await getServerSession();
  if (!session) redirect(`/${locale}/login`);

  const workspace = await getActiveWorkspace(session.uid);
  const t = await getTranslations({ locale, namespace: 'projects' });

  const rawProjects =
    workspace.kind === 'org'
      ? await listProjectsByOrg(workspace.orgId)
      : (await listProjectsByOwner(session.uid)).filter((p) => !p.orgId);

  const headingTitle =
    workspace.kind === 'org'
      ? t('titleOrg', { name: workspace.orgName })
      : t('titlePersonal');
  const subtitle =
    workspace.kind === 'org'
      ? t('subtitleOrg', { name: workspace.orgName })
      : t('subtitlePersonal');

  const projects: ProjectRow[] = rawProjects.map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status as ProjectRow['status'],
    currentSectionIndex: p.currentSectionIndex,
    totalSections: p.totalSections,
    tokensSpent: p.tokensSpent,
    projectTypeSlug: p.projectTypeSlug,
    updatedAt:
      typeof p.updatedAt === 'string'
        ? p.updatedAt
        : p.updatedAt?.toISOString() ?? null,
  }));

  return (
    <div className="min-h-full pb-12">
      <header className="flex items-center justify-between py-5 px-6 lg:px-10 bg-[var(--color-background)] sticky top-0 z-10 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 flex items-center justify-center">
            <FolderGit2 size={18} className="text-[var(--color-accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
              {headingTitle}
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              {t('countSuffix', { count: projects.length })} · {subtitle}
            </p>
          </div>
        </div>
        <Link
          href={`/${locale}/projects/start`}
          className="inline-flex items-center gap-2 px-3 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-md transition-colors"
        >
          <Plus size={15} />
          {t('newButton')}
        </Link>
      </header>

      <main className="px-6 lg:px-10 max-w-6xl mx-auto mt-6">
        {projects.length === 0 ? (
          <div className="bg-[var(--color-card)]/40 border border-dashed border-white/10 rounded-md p-10 text-center">
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              {t('emptyBody')}
            </p>
            <Link
              href={`/${locale}/projects/start`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-md transition-colors"
            >
              <Plus size={15} /> {t('browseTypes')}
            </Link>
          </div>
        ) : (
          <ProjectsTable locale={locale} projects={projects} />
        )}
      </main>
    </div>
  );
}
