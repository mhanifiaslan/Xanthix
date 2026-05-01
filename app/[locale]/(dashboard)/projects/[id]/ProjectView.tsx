'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { getFirebaseFirestore } from '@/lib/firebase/client';
import { generateNextSectionAction } from '@/lib/actions/projects';

interface SectionView {
  id: string;
  order: number;
  title: string;
  content: string;
  outputType: string;
  status: 'pending' | 'generating' | 'ready' | 'revising' | 'failed';
  failureReason: string | null;
}

interface ProjectView {
  title: string;
  idea: string;
  status:
    | 'draft'
    | 'generating'
    | 'paused'
    | 'ready'
    | 'failed'
    | 'archived';
  currentSectionIndex: number;
  totalSections: number;
  tokensSpent: number;
  failureReason: string | null;
  outputLanguage: string;
  projectTypeSlug: string;
}

export default function ProjectView({
  projectId,
  locale,
  initialProject,
  initialSections,
}: {
  projectId: string;
  locale: string;
  initialProject: ProjectView;
  initialSections: SectionView[];
}) {
  const [project, setProject] = useState(initialProject);
  const [sections, setSections] = useState(initialSections);
  const [error, setError] = useState<string | null>(null);

  // Live subscribe to /projects/{id}
  useEffect(() => {
    const ref = doc(getFirebaseFirestore(), 'projects', projectId);
    return onSnapshot(ref, (snap) => {
      const data = snap.data();
      if (!data) return;
      setProject((prev) => ({
        ...prev,
        title: data.title ?? prev.title,
        idea: data.idea ?? prev.idea,
        status: data.status ?? prev.status,
        currentSectionIndex: data.currentSectionIndex ?? prev.currentSectionIndex,
        totalSections: data.totalSections ?? prev.totalSections,
        tokensSpent: data.tokensSpent ?? prev.tokensSpent,
        failureReason: data.failureReason ?? null,
        outputLanguage: data.outputLanguage ?? prev.outputLanguage,
        projectTypeSlug: data.projectTypeSlug ?? prev.projectTypeSlug,
      }));
    });
  }, [projectId]);

  // Live subscribe to /projects/{id}/sections
  useEffect(() => {
    const q = query(
      collection(getFirebaseFirestore(), 'projects', projectId, 'sections'),
      orderBy('order', 'asc'),
    );
    return onSnapshot(q, (snap) => {
      const next: SectionView[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          order: data.order ?? 0,
          title: data.title ?? '',
          content: data.content ?? '',
          outputType: data.outputType ?? 'markdown',
          status: data.status ?? 'pending',
          failureReason: data.failureReason ?? null,
        };
      });
      setSections(next);
    });
  }, [projectId]);

  // Auto-run the next section while the project is still generating.
  // Each effect mount gets its own `cancelled` token; if React unmounts and
  // remounts (strict mode, HMR), the old loop short-circuits and the new
  // one picks up — the server action is naturally idempotent because it
  // re-reads currentSectionIndex on every call.
  useEffect(() => {
    if (project.status !== 'generating') return;

    let cancelled = false;
    const run = async () => {
      while (!cancelled) {
        try {
          console.info('[xanthix] requesting next section…');
          const result = await generateNextSectionAction(projectId);
          if (cancelled) return;
          console.info(
            `[xanthix] section "${result.sectionId ?? '—'}" done; allDone=${result.done}`,
          );
          if (result.done) return;
        } catch (err) {
          if (cancelled) return;
          const message =
            err instanceof Error ? err.message : 'Üretim hatası';
          console.error('[xanthix] generation failed', err);
          setError(message);
          return;
        }
      }
    };
    run();

    return () => {
      cancelled = true;
    };
  }, [projectId, project.status]);

  const totalSlots = useMemo(
    () => Array.from({ length: project.totalSections }, (_, i) => i),
    [project.totalSections],
  );

  return (
    <div className="min-h-full pb-12">
      <header className="px-8 py-5 border-b border-white/5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href={`/${locale}/projects`}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
          >
            <ArrowLeft size={18} className="text-[var(--color-text-secondary)]" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-[var(--color-text-primary)] truncate">
              {project.title}
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              {project.projectTypeSlug} · {project.outputLanguage} ·{' '}
              {project.tokensSpent.toLocaleString(locale)} token harcandı
            </p>
          </div>
        </div>
        <StatusBadge status={project.status} />
      </header>

      <div className="px-8 py-6 max-w-4xl mx-auto space-y-4">
        {error && (
          <div className="bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-xl px-4 py-3 text-sm text-[var(--color-error)] flex items-start gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Üretim sırasında hata</p>
              <p className="text-xs opacity-90 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {project.status === 'failed' && project.failureReason && (
          <div className="bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-xl px-4 py-3 text-sm text-[var(--color-error)] flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Bu proje yarıda kaldı</p>
                <p className="text-xs opacity-90 mt-0.5">{project.failureReason}</p>
              </div>
            </div>
            <RetryButton projectId={projectId} />
          </div>
        )}

        <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-5">
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
            Senin fikrin
          </p>
          <p className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">
            {project.idea}
          </p>
        </div>

        <ol className="space-y-3">
          {totalSlots.map((i) => {
            const section = sections[i];
            return (
              <SectionCard
                key={section?.id ?? `pending-${i}`}
                index={i}
                section={section}
                isCurrent={
                  project.status === 'generating' &&
                  project.currentSectionIndex === i
                }
              />
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ProjectView['status'] }) {
  const cfg: Record<ProjectView['status'], { label: string; cls: string; icon: React.ReactNode }> = {
    draft: { label: 'Taslak', cls: 'bg-white/5 border-white/10 text-[var(--color-text-secondary)]', icon: <CircleDashed size={14} /> },
    generating: { label: 'Üretiliyor', cls: 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30 text-[var(--color-accent)]', icon: <Loader2 size={14} className="animate-spin" /> },
    paused: { label: 'Duraklatıldı', cls: 'bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30 text-[var(--color-warning)]', icon: <CircleDashed size={14} /> },
    ready: { label: 'Hazır', cls: 'bg-[var(--color-success)]/10 border-[var(--color-success)]/30 text-[var(--color-success)]', icon: <CheckCircle2 size={14} /> },
    failed: { label: 'Başarısız', cls: 'bg-[var(--color-error)]/10 border-[var(--color-error)]/30 text-[var(--color-error)]', icon: <AlertTriangle size={14} /> },
    archived: { label: 'Arşivli', cls: 'bg-white/5 border-white/10 text-[var(--color-text-secondary)]', icon: <CircleDashed size={14} /> },
  };
  const c = cfg[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${c.cls}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

function SectionCard({
  index,
  section,
  isCurrent,
}: {
  index: number;
  section: SectionView | undefined;
  isCurrent: boolean;
}) {
  if (!section) {
    return (
      <li className="bg-[var(--color-card)] rounded-2xl border border-dashed border-white/10 p-5 flex items-center gap-3">
        <span className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-[var(--color-text-secondary)]">
          {index + 1}
        </span>
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
          {isCurrent ? (
            <>
              <Loader2 size={14} className="animate-spin text-[var(--color-accent)]" />
              <span>Bu bölüm yazılıyor…</span>
            </>
          ) : (
            <span>Sırada bekliyor</span>
          )}
        </div>
      </li>
    );
  }

  if (section.status === 'failed') {
    return (
      <li className="bg-[var(--color-error)]/5 rounded-2xl border border-[var(--color-error)]/20 p-5">
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-7 h-7 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 flex items-center justify-center text-xs font-bold text-[var(--color-error)]">
            {index + 1}
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{section.title}</p>
            <p className="text-xs text-[var(--color-error)] mt-1">{section.failureReason}</p>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-5">
      <div className="flex items-start gap-3 mb-3">
        <span className="shrink-0 w-7 h-7 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center text-xs font-bold text-[var(--color-accent)]">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              {section.title}
            </p>
            {section.status === 'ready' && (
              <CheckCircle2 size={14} className="text-[var(--color-success)]" />
            )}
          </div>
        </div>
      </div>
      <div className="prose prose-invert prose-sm max-w-none">
        <pre className="whitespace-pre-wrap text-sm text-[var(--color-text-primary)] font-sans leading-relaxed bg-transparent p-0 m-0">
          {section.content}
        </pre>
      </div>
    </li>
  );
}

function RetryButton({ projectId }: { projectId: string }) {
  const [retrying, setRetrying] = useState(false);
  return (
    <button
      onClick={async () => {
        setRetrying(true);
        try {
          await generateNextSectionAction(projectId);
        } finally {
          setRetrying(false);
        }
      }}
      disabled={retrying}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--color-error)]/30 text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors disabled:opacity-50"
    >
      {retrying ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <RefreshCw size={12} />
      )}
      Tekrar dene
    </button>
  );
}
