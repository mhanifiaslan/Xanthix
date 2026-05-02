'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  Download,
  Loader2,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { getFirebaseFirestore } from '@/lib/firebase/client';
import {
  generateNextSectionAction,
  reviseSectionAction,
} from '@/lib/actions/projects';
import { requestExportAction } from '@/lib/actions/exports';
import Markdown from '@/components/shared/Markdown';

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
        <div className="flex items-center gap-3 shrink-0">
          {project.status === 'ready' && <ExportButton projectId={projectId} />}
          <StatusBadge status={project.status} />
        </div>
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
          <FailureBanner
            reason={project.failureReason}
            projectId={projectId}
            locale={locale}
          />
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
                projectId={projectId}
                projectStatus={project.status}
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
  projectId,
  projectStatus,
  isCurrent,
}: {
  index: number;
  section: SectionView | undefined;
  projectId: string;
  projectStatus: ProjectView['status'];
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

  const isRevising = section.status === 'revising';
  const canRevise = section.status === 'ready' && projectStatus !== 'generating';

  return (
    <li className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-5 relative">
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
            {isRevising && (
              <span className="inline-flex items-center gap-1 text-xs text-[var(--color-accent)]">
                <Loader2 size={12} className="animate-spin" /> revize ediliyor…
              </span>
            )}
          </div>
        </div>
      </div>
      <div className={isRevising ? 'opacity-60 transition-opacity' : ''}>
        <Markdown>{section.content}</Markdown>
      </div>
      {canRevise && (
        <ReviseSectionInline projectId={projectId} sectionId={section.id} />
      )}
    </li>
  );
}

function ReviseSectionInline({
  projectId,
  sectionId,
}: {
  projectId: string;
  sectionId: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-white/20 transition-colors"
      >
        <Sparkles size={12} />
        Bu bölümü revize et
      </button>
    );
  }

  const submit = () => {
    setError(null);
    if (text.trim().length < 8) {
      setError('Lütfen revizyon talebini en az 8 karakterle yaz.');
      return;
    }
    startTransition(async () => {
      try {
        await reviseSectionAction({
          projectId,
          sectionId,
          instruction: text.trim(),
        });
        setText('');
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Revize başarısız.');
      }
    });
  };

  return (
    <div className="mt-4 rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wider">
          Bu bölümü revize et
        </p>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          aria-label="Kapat"
        >
          <X size={14} />
        </button>
      </div>
      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Örn: Bütçeyi 60.000 EUR'ya çıkar, çalıştay sayısını ikiye düşür."
        className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all resize-y"
        disabled={isPending}
      />
      {error && (
        <p className="text-xs text-[var(--color-error)]">{error}</p>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] text-[var(--color-text-secondary)]/70">
          AI bütün bölümü baştan yazar; mevcut içerik bağlam olarak kullanılır.
        </p>
        <button
          type="button"
          onClick={submit}
          disabled={isPending || text.trim().length < 8}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Sparkles size={12} />
          )}
          Revize et
        </button>
      </div>
    </div>
  );
}

function ExportButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [pendingFormat, setPendingFormat] = useState<
    'docx' | 'xlsx' | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const trigger = (format: 'docx' | 'xlsx') => {
    setError(null);
    setPendingFormat(format);
    setOpen(false);
    (async () => {
      try {
        const { downloadUrl, fileName } = await requestExportAction({
          projectId,
          format,
        });
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Dışa aktarma başarısız.');
      } finally {
        setPendingFormat(null);
      }
    })();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pendingFormat !== null}
        className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
      >
        {pendingFormat ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Download size={14} />
        )}
        {pendingFormat
          ? `${pendingFormat.toUpperCase()} hazırlanıyor…`
          : 'Dışa aktar'}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/10 bg-[var(--color-card)] shadow-lg z-20 overflow-hidden">
          <button
            type="button"
            onClick={() => trigger('docx')}
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <Download size={14} className="text-[var(--color-accent)]" />
            <span className="flex-1">Word (DOCX)</span>
          </button>
          <button
            type="button"
            onClick={() => trigger('xlsx')}
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors flex items-center gap-2 border-t border-white/5"
          >
            <Download size={14} className="text-[var(--color-success)]" />
            <span className="flex-1">Excel (XLSX)</span>
          </button>
        </div>
      )}

      {error && (
        <p className="absolute right-0 top-full mt-2 text-xs text-[var(--color-error)] max-w-[280px]" title={error}>
          {error}
        </p>
      )}
    </div>
  );
}

function FailureBanner({
  reason,
  projectId,
  locale,
}: {
  reason: string;
  projectId: string;
  locale: string;
}) {
  const insufficient = reason.startsWith('Insufficient tokens');
  if (insufficient) {
    const match = reason.match(/balance=(\d+),\s*required=(\d+)/);
    const balance = match ? Number(match[1]) : null;
    const required = match ? Number(match[2]) : null;
    return (
      <div className="bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 rounded-xl px-4 py-3 text-sm text-[var(--color-warning)] flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Token bakiyesi bu bölüm için yetmedi</p>
            <p className="text-xs opacity-90 mt-0.5">
              {balance !== null && required !== null
                ? `Bakiye: ${balance.toLocaleString(locale)} · Gerekli: ${required.toLocaleString(locale)}`
                : reason}
            </p>
          </div>
        </div>
        <Link
          href={`/${locale}/billing`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--color-accent)]/40 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors shrink-0"
        >
          Token yükle
        </Link>
      </div>
    );
  }
  return (
    <div className="bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-xl px-4 py-3 text-sm text-[var(--color-error)] flex items-start justify-between gap-3">
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Bu proje yarıda kaldı</p>
          <p className="text-xs opacity-90 mt-0.5">{reason}</p>
        </div>
      </div>
      <RetryButton projectId={projectId} />
    </div>
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
