'use client';

import { useEffect, useMemo, useState, useTransition, useCallback, useRef } from 'react';
import Link from 'next/link';
import debounce from 'lodash.debounce';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  Download,
  Edit2,
  Loader2,
  RefreshCw,
  Sparkles,
  X,
  FileEdit,
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
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
  saveSectionContentAction,
  evaluateSectionAction,
} from '@/lib/actions/projects';
import { requestExportAction } from '@/lib/actions/exports';
import Markdown from '@/components/shared/Markdown';
import GanttView from '@/components/shared/GanttView';
import TipTapEditor from '@/components/shared/TipTapEditor';
import { PrintableView } from '@/components/shared/PrintableView';

interface ScorecardDimensionView {
  id: string;
  score: number;
  maxPoints: number;
  rationale: string;
  suggestions: string;
}

interface ScorecardView {
  totalScore: number;
  maxScore: number;
  normalizedScore: number;
  passed: boolean;
  attempts: number;
  dimensions: ScorecardDimensionView[];
}

interface SectionView {
  id: string;
  order: number;
  title: string;
  content: string;
  outputType: string;
  status: 'pending' | 'generating' | 'ready' | 'revising' | 'failed';
  failureReason: string | null;
  scorecard: ScorecardView | null;
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
  orgId: string | null;
  orgName: string | null;
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

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `xanthix-${initialProject.projectTypeSlug}-${initialProject.title}`,
  });

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
          scorecard: parseScorecard(data.scorecard),
        };
      });
      setSections(next);
    });
  }, [projectId]);

  // Auto-run the next section while the project is still generating.
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
      <header className="px-8 py-5 border-b border-white/5 flex items-center justify-between gap-4 bg-[var(--color-background)] sticky top-0 z-10 shadow-sm">
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
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 flex items-center flex-wrap gap-x-1.5 gap-y-1">
              <span>{project.projectTypeSlug}</span>
              <span>·</span>
              <span>{project.outputLanguage}</span>
              <span>·</span>
              <span>{project.tokensSpent.toLocaleString(locale)} token</span>
              <span>·</span>
              {project.orgId ? (
                <Link
                  href={`/${locale}/organizations/${project.orgId}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/20 transition-colors"
                >
                  🏢 {project.orgName ?? project.orgId}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                  Kişisel
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {project.status === 'ready' && <ExportButton projectId={projectId} onPdfExport={() => handlePrint()} />}
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

        <ol className="space-y-4">
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

      {/* Hidden print view for PDF export */}
      <PrintableView
        ref={printRef}
        projectTitle={project.title}
        projectIdea={project.idea}
        projectTypeSlug={project.projectTypeSlug}
        sections={sections}
      />
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
  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState(section?.content ?? '');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Keep local content in sync if it changes externally, BUT don't overwrite if currently editing
  // to avoid losing user input.
  useEffect(() => {
    if (!isEditing && section) {
      setLocalContent(section.content);
    }
  }, [section?.content, isEditing, section]);

  const debouncedSave = useMemo(
    () =>
      debounce(async (val: string, secId: string) => {
        setSaveStatus('saving');
        try {
          await saveSectionContentAction({ projectId, sectionId: secId, content: val });
          setSaveStatus('saved');
        } catch (err) {
          console.error('Failed to save section content:', err);
          setSaveStatus('error');
        }
      }, 1000),
    [projectId]
  );

  const handleContentChange = useCallback((val: string) => {
    setLocalContent(val);
    if (section?.id) {
      debouncedSave(val, section.id);
    }
  }, [debouncedSave, section?.id]);

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
  // Allow edit only when project is fully generated and section is ready
  const canEdit = section.status === 'ready' && projectStatus !== 'generating';

  return (
    <li className={`bg-[var(--color-card)] rounded-2xl border ${isEditing ? 'border-[var(--color-accent)]/50 shadow-lg shadow-[var(--color-accent)]/10' : 'border-white/5'} p-6 relative transition-all duration-300`}>
      <div className="flex items-start gap-3 mb-4">
        <span className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-colors ${isEditing ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 text-[var(--color-accent)]'}`}>
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                {section.title}
              </h2>
              {!isEditing && section.status === 'ready' && (
                <CheckCircle2 size={16} className="text-[var(--color-success)]" />
              )}
              {isRevising && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-2 py-0.5 rounded-full">
                  <Loader2 size={12} className="animate-spin" /> Yabancı AI revize ediyor…
                </span>
              )}
            </div>
            {canEdit && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  isEditing 
                  ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]' 
                  : 'bg-white/5 text-[var(--color-text-secondary)] border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                {isEditing ? (
                  <>
                    {saveStatus === 'saving' ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    {saveStatus === 'saving' ? 'Kaydediliyor...' : 'Düzenlemeyi Bitir'}
                  </>
                ) : (
                  <>
                    <FileEdit size={12} />
                    Düzenle
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={isRevising ? 'opacity-50 pointer-events-none transition-opacity' : ''}>
        {isEditing && section.outputType !== 'gantt' ? (
          <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <TipTapEditor
              initialContent={localContent}
              onChange={handleContentChange}
              editable={!isRevising}
            />
            {saveStatus === 'error' && (
              <p className="text-xs text-[var(--color-error)] mt-2">Kaydedilirken bir hata oluştu.</p>
            )}
          </div>
        ) : (
          <div className="bg-[var(--color-background)] rounded-xl border border-white/5 p-4 mt-2">
            {section.outputType === 'gantt' ? (
              <GanttView content={section.content} />
            ) : (
              <Markdown>{section.content}</Markdown>
            )}
          </div>
        )}
      </div>

      {section.scorecard && !isEditing && (
        <ScorecardPanel scorecard={section.scorecard} projectId={projectId} sectionId={section.id} canEvaluate={canEdit} />
      )}
      
      {canEdit && !isEditing && (
        <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-2">
          <ReviseSectionInline projectId={projectId} sectionId={section.id} />
          {/* We could add "Yeniden Yaz" button here if we implement a separate action for full rewrite */}
        </div>
      )}
    </li>
  );
}

function ScorecardPanel({ scorecard, projectId, sectionId, canEvaluate }: { scorecard: ScorecardView; projectId: string; sectionId: string; canEvaluate: boolean }) {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pct = Math.round(scorecard.normalizedScore * 100);
  const tone = scorecard.passed
    ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/5'
    : 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5';
  const totalLabel =
    scorecard.totalScore % 1 === 0
      ? scorecard.totalScore.toString()
      : scorecard.totalScore.toFixed(1);
  const attemptsLabel =
    scorecard.attempts > 1
      ? `${scorecard.attempts}. denemede`
      : null;

  const handleEvaluate = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEvaluating(true);
    setError(null);
    try {
      await evaluateSectionAction({ projectId, sectionId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Değerlendirme başarısız.');
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <details className={`mt-5 rounded-xl border ${tone} group`}>
      <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
            AI Değerlendirmesi
          </span>
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">
            {totalLabel} / {scorecard.maxScore}
          </span>
          <span className="text-xs text-[var(--color-text-secondary)]">{pct}%</span>
          {scorecard.passed ? (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-success)] bg-[var(--color-success)]/10 px-2 py-0.5 rounded-full">
              ✓ Geçer
            </span>
          ) : (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-warning)] bg-[var(--color-warning)]/10 px-2 py-0.5 rounded-full">
              Eşik altı
            </span>
          )}
          {attemptsLabel && (
            <span className="text-[10px] text-[var(--color-text-secondary)] tabular-nums">
              {attemptsLabel}
            </span>
          )}
          {canEvaluate && (
            <button
              onClick={handleEvaluate}
              disabled={isEvaluating}
              className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded bg-white/5 hover:bg-white/10 text-[var(--color-text-secondary)] hover:text-white transition-colors disabled:opacity-50"
            >
              {isEvaluating ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
              {isEvaluating ? 'Değerlendiriliyor...' : 'Yeniden Değerlendir'}
            </button>
          )}
        </div>
        <span className="text-[var(--color-text-secondary)] text-xs group-open:rotate-180 transition-transform">
          ▾
        </span>
      </summary>
      
      {error && (
        <div className="px-4 pb-2">
          <p className="text-[10px] text-[var(--color-error)] bg-[var(--color-error)]/10 px-2 py-1 rounded border border-[var(--color-error)]/20">{error}</p>
        </div>
      )}

      <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
        {scorecard.dimensions.map((d) => {
          const dimPct = d.maxPoints > 0 ? (d.score / d.maxPoints) * 100 : 0;
          return (
            <div key={d.id} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-[var(--color-text-primary)] capitalize">
                  {d.id}
                </span>
                <span className="text-xs font-medium text-[var(--color-text-secondary)] tabular-nums bg-white/5 px-2 py-0.5 rounded">
                  {d.score % 1 === 0 ? d.score : d.score.toFixed(1)} / {d.maxPoints}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--color-accent)] to-[#6b4cff] transition-all"
                  style={{ width: `${dimPct}%` }}
                />
              </div>
              {d.rationale && (
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  {d.rationale}
                </p>
              )}
              {d.suggestions && (
                <p className="text-xs text-[var(--color-accent)] leading-relaxed bg-[var(--color-accent)]/5 p-2 rounded-lg border border-[var(--color-accent)]/10">
                  💡 {d.suggestions}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </details>
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
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-[var(--color-accent)]/10 to-[#6b4cff]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 hover:border-[var(--color-accent)]/40 hover:from-[var(--color-accent)]/20 hover:to-[#6b4cff]/20 transition-all"
      >
        <Sparkles size={12} />
        Yapay Zeka ile Revize Et
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
    <div className="w-full rounded-xl border border-[var(--color-accent)]/30 bg-gradient-to-br from-[var(--color-accent)]/5 to-transparent p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-white flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--color-accent)]" />
          Yapay Zeka ile Revize Et
        </p>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="p-1 rounded-md text-[var(--color-text-secondary)] hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Kapat"
        >
          <X size={16} />
        </button>
      </div>
      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Örn: Bütçeyi 60.000 EUR'ya çıkar, çalıştay sayısını ikiye düşür ve daha akademik bir dille yeniden yaz."
        className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--color-text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all resize-y shadow-inner"
        disabled={isPending}
      />
      {error && (
        <p className="text-xs text-[var(--color-error)] font-medium bg-[var(--color-error)]/10 px-3 py-2 rounded-lg border border-[var(--color-error)]/20">{error}</p>
      )}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-[11px] text-[var(--color-text-secondary)] max-w-sm">
          AI bütün bölümü baştan yazar; mevcut içerik bağlam olarak kullanılır. Gelişmiş bir sonuç için detaylı komut verin.
        </p>
        <button
          type="button"
          onClick={submit}
          disabled={isPending || text.trim().length < 8}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-bold rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[var(--color-accent)]/20"
        >
          {isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          {isPending ? 'Sihir Yapılıyor...' : 'Revizeyi Başlat'}
        </button>
      </div>
    </div>
  );
}

function ExportButton({ projectId, onPdfExport }: { projectId: string; onPdfExport?: () => void }) {
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
        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[var(--color-accent)] to-[#6b4cff] hover:opacity-90 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 shadow-md shadow-[var(--color-accent)]/20"
      >
        {pendingFormat ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Download size={16} />
        )}
        {pendingFormat
          ? `${pendingFormat.toUpperCase()} Hazırlanıyor…`
          : 'Dışa Aktar'}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/10 bg-[var(--color-card)] shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2">
          {onPdfExport && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onPdfExport();
              }}
              className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--color-warning)]/10 flex items-center justify-center">
                <Download size={14} className="text-[var(--color-warning)]" />
              </div>
              <span className="flex-1 text-white">PDF (Yazdır)</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => trigger('docx')}
            className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-3 ${onPdfExport ? 'border-t border-white/5' : ''}`}
          >
            <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 flex items-center justify-center">
              <Download size={14} className="text-[var(--color-accent)]" />
            </div>
            <span className="flex-1 text-white">Word (DOCX)</span>
          </button>
          <button
            type="button"
            onClick={() => trigger('xlsx')}
            className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-3 border-t border-white/5"
          >
            <div className="w-8 h-8 rounded-lg bg-[var(--color-success)]/10 flex items-center justify-center">
              <Download size={14} className="text-[var(--color-success)]" />
            </div>
            <span className="flex-1 text-white">Excel (XLSX)</span>
          </button>
        </div>
      )}

      {error && (
        <p className="absolute right-0 top-full mt-2 text-xs text-[var(--color-error)] max-w-[280px] bg-[var(--color-error)]/10 px-3 py-2 rounded-lg border border-[var(--color-error)]/20" title={error}>
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
      <div className="bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 rounded-xl px-5 py-4 text-sm text-[var(--color-warning)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Token bakiyesi bu bölüm için yetmedi</p>
            <p className="text-xs opacity-90 mt-1">
              {balance !== null && required !== null
                ? `Mevcut Bakiye: ${balance.toLocaleString(locale)} · Gereken Bakiye: ${required.toLocaleString(locale)}`
                : reason}
            </p>
          </div>
        </div>
        <Link
          href={`/${locale}/billing`}
          className="inline-flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-[var(--color-warning)] text-black hover:opacity-90 transition-opacity shrink-0 shadow-md shadow-[var(--color-warning)]/20"
        >
          Token Yükle
        </Link>
      </div>
    );
  }
  return (
    <div className="bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-xl px-5 py-4 text-sm text-[var(--color-error)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Bu proje yarıda kaldı</p>
          <p className="text-xs opacity-90 mt-1">{reason}</p>
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
      className="inline-flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2 text-xs font-bold rounded-xl border border-[var(--color-error)]/30 text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors disabled:opacity-50"
    >
      {retrying ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <RefreshCw size={14} />
      )}
      Tekrar Dene
    </button>
  );
}

function parseScorecard(raw: unknown): ScorecardView | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (
    typeof r.totalScore !== 'number' ||
    typeof r.maxScore !== 'number' ||
    !Array.isArray(r.dimensions)
  ) {
    return null;
  }
  return {
    totalScore: r.totalScore,
    maxScore: r.maxScore,
    normalizedScore:
      typeof r.normalizedScore === 'number'
        ? r.normalizedScore
        : r.maxScore > 0
          ? r.totalScore / r.maxScore
          : 0,
    passed: !!r.passed,
    attempts: typeof r.attempts === 'number' && r.attempts > 0 ? r.attempts : 1,
    dimensions: r.dimensions
      .filter((d): d is Record<string, unknown> => !!d && typeof d === 'object')
      .map((d) => ({
        id: String(d.id ?? ''),
        score: typeof d.score === 'number' ? d.score : 0,
        maxPoints: typeof d.maxPoints === 'number' ? d.maxPoints : 5,
        rationale: typeof d.rationale === 'string' ? d.rationale : '',
        suggestions: typeof d.suggestions === 'string' ? d.suggestions : '',
      })),
  };
}
