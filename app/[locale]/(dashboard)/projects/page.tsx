import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  CheckCircle2,
  CircleDashed,
  FolderGit2,
  Loader2,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { getServerSession } from '@/lib/server/getServerSession';
import {
  listProjectsByOrg,
  listProjectsByOwner,
} from '@/lib/server/projects';
import { getActiveWorkspace } from '@/lib/server/workspace';
import { routing } from '@/i18n/routing';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Taslak',
  generating: 'Üretiliyor',
  paused: 'Duraklatıldı',
  ready: 'Hazır',
  failed: 'Başarısız',
  archived: 'Arşivli',
};

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

  const projects =
    workspace.kind === 'org'
      ? await listProjectsByOrg(workspace.orgId)
      : (await listProjectsByOwner(session.uid)).filter(
          (p) => !p.orgId, // personal scope hides org-context projects
        );

  const headingTitle =
    workspace.kind === 'org' ? `${workspace.orgName} projeleri` : 'Projelerim';
  const subtitle =
    workspace.kind === 'org'
      ? `${workspace.orgName} adına açılmış projeler`
      : 'Kişisel projelerin';

  return (
    <div className="min-h-full pb-12">
      <header className="flex items-center justify-between py-6 px-8 bg-[var(--color-background)] sticky top-0 z-10 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 flex items-center justify-center">
            <FolderGit2 size={18} className="text-[var(--color-accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
              {headingTitle}
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {projects.length} proje · {subtitle}
            </p>
          </div>
        </div>
        <Link
          href={`/${locale}/project-types`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus size={15} />
          Yeni proje
        </Link>
      </header>

      <main className="px-8 max-w-5xl mx-auto mt-8">
        {projects.length === 0 ? (
          <div className="bg-[var(--color-card)] rounded-2xl border border-dashed border-white/10 p-10 text-center">
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Henüz bir projen yok. Bir proje türü seç ve fikrini anlat — gerisini
              AI tamamlasın.
            </p>
            <Link
              href={`/${locale}/project-types`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Plus size={15} /> Proje türlerine göz at
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {projects.map((p) => {
              const Icon =
                p.status === 'generating'
                  ? Loader2
                  : p.status === 'ready'
                    ? CheckCircle2
                    : p.status === 'failed'
                      ? AlertTriangle
                      : CircleDashed;
              const tone =
                p.status === 'ready'
                  ? 'text-[var(--color-success)]'
                  : p.status === 'failed'
                    ? 'text-[var(--color-error)]'
                    : 'text-[var(--color-accent)]';
              const progress =
                p.totalSections === 0
                  ? 0
                  : Math.round((p.currentSectionIndex / p.totalSections) * 100);
              return (
                <li key={p.id}>
                  <Link
                    href={`/${locale}/projects/${p.id}`}
                    className="block bg-[var(--color-card)] rounded-2xl border border-white/5 hover:border-[var(--color-accent)]/30 p-5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon
                            size={14}
                            className={`${tone} ${p.status === 'generating' ? 'animate-spin' : ''}`}
                          />
                          <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                            {STATUS_LABEL[p.status] ?? p.status}
                          </p>
                        </div>
                        <p className="text-base font-semibold text-[var(--color-text-primary)] truncate">
                          {p.title}
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                          {p.projectTypeSlug} · {p.tokensSpent.toLocaleString(locale)} token
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-[var(--color-text-secondary)] mb-1">
                          {p.currentSectionIndex} / {p.totalSections}
                        </p>
                        <div className="w-32 h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full bg-[var(--color-accent)] transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
