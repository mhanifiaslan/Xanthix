'use client';

import { useEffect, useMemo, useRef, useState, useTransition, useCallback } from 'react';
import Link from 'next/link';
import debounce from 'lodash.debounce';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  Download,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { getFirebaseFirestore } from '@/lib/firebase/client';
import {
  generateNextSectionAction,
  saveSectionContentAction,
} from '@/lib/actions/projects';
import { requestExportAction } from '@/lib/actions/exports';
import TipTapEditor from '@/components/shared/TipTapEditor';
import { PrintableView } from '@/components/shared/PrintableView';
import StepRail, { type StepInfo } from '@/components/project/StepRail';
import ActivityPill, { type ActivityState } from '@/components/project/ActivityPill';
import LivePreview from '@/components/project/LivePreview';
import InlineActions from '@/components/project/InlineActions';
import JudgeScorecard, {
  parseScorecard,
  type ScorecardView,
} from '@/components/project/JudgeScorecard';
import QualityCheckButton from '@/components/project/QualityCheckButton';

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

interface ReportTemplateView {
  id: string;
  name: string;
  fileFormat: 'docx' | 'pdf';
}

interface ProjectViewData {
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
  reportTemplates: ReportTemplateView[];
  hasEvaluationCriteria: boolean;
}

export default function ProjectView({
  projectId,
  locale,
  initialProject,
  initialSections,
}: {
  projectId: string;
  locale: string;
  initialProject: ProjectViewData;
  initialSections: SectionView[];
}) {
  const t = useTranslations('projectView');
  const tProjects = useTranslations('projects');
  const tWorkspace = useTranslations('workspace');

  const [project, setProject] = useState(initialProject);
  const [sections, setSections] = useState(initialSections);
  const [error, setError] = useState<string | null>(null);
  const [focusIdx, setFocusIdx] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `xanthix-${initialProject.projectTypeSlug}-${initialProject.title}`,
  });

  // Subscribe to /projects/{id}
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

  // Subscribe to /projects/{id}/sections
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

  // Drive the writer→judge→revise loop while project.status is 'generating'.
  useEffect(() => {
    if (project.status !== 'generating') return;
    let cancelled = false;
    (async () => {
      while (!cancelled) {
        try {
          const result = await generateNextSectionAction(projectId);
          if (cancelled) return;
          if (result.done) return;
        } catch (err) {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : t('generationError'));
          return;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, project.status, t]);

  // Build the full step list (existing sections + ghost slots for pending).
  const steps: StepInfo[] = useMemo(() => {
    const total = project.totalSections;
    const result: StepInfo[] = [];
    for (let i = 0; i < total; i++) {
      const s = sections[i];
      if (s) {
        result.push({
          id: s.id,
          index: i,
          title: s.title,
          status: s.status,
        });
      } else {
        result.push({
          id: `ghost-${i}`,
          index: i,
          title: t('sectionQueued'),
          status: 'pending',
        });
      }
    }
    return result;
  }, [sections, project.totalSections, t]);

  const currentIdx = focusIdx ?? Math.min(project.currentSectionIndex, project.totalSections - 1);
  const currentSection = sections[currentIdx] ?? null;

  // Reset editing when switching focused section.
  useEffect(() => {
    setIsEditing(false);
    setEditingContent(currentSection?.content ?? '');
  }, [currentSection?.id, currentSection?.content]);

  const debouncedSave = useMemo(
    () =>
      debounce(async (val: string, secId: string) => {
        setSaveStatus('saving');
        try {
          await saveSectionContentAction({ projectId, sectionId: secId, content: val });
          setSaveStatus('saved');
        } catch (err) {
          console.error('[ProjectView] save failed', err);
          setSaveStatus('error');
        }
      }, 1000),
    [projectId],
  );

  const handleEditorChange = useCallback(
    (val: string) => {
      setEditingContent(val);
      if (currentSection?.id) debouncedSave(val, currentSection.id);
    },
    [debouncedSave, currentSection?.id],
  );

  const activityState: ActivityState = (() => {
    if (project.status === 'failed') return 'error';
    if (project.status === 'ready') return 'done';
    if (currentSection?.status === 'revising') return 'revising';
    if (project.status === 'generating') {
      if (currentIdx === project.currentSectionIndex) {
        return currentSection ? 'judging' : 'writing';
      }
      return 'idle';
    }
    return 'idle';
  })();

  const activityMessage = (() => {
    const sectionTitle = currentSection?.title ?? steps[currentIdx]?.title ?? '';
    switch (activityState) {
      case 'writing':
        return t('activityWriting', { section: sectionTitle });
      case 'judging':
        return t('activityJudging', { section: sectionTitle });
      case 'revising':
        return t('activityRevising', { section: sectionTitle });
      case 'done':
        return t('activityDone');
      case 'error':
        return t('activityError');
      default:
        return t('activityIdle');
    }
  })();

  const canEdit =
    currentSection?.status === 'ready' && project.status !== 'generating';
  const isStreaming =
    project.status === 'generating' && currentIdx === project.currentSectionIndex;

  return (
    <div className="min-h-full flex flex-col">
      {/* Top bar */}
      <header className="px-6 lg:px-10 py-4 border-b border-white/5 flex items-center justify-between gap-4 bg-[var(--color-background)] sticky top-0 z-10">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href={`/${locale}/projects`}
            className="w-9 h-9 rounded-md bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
            aria-label={t('reviseDialogClose')}
          >
            <ArrowLeft size={16} className="text-[var(--color-text-secondary)]" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-[var(--color-text-primary)] truncate">
              {project.title}
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>{project.projectTypeSlug}</span>
              <span>·</span>
              <span>{project.outputLanguage}</span>
              <span>·</span>
              <span>
                {project.tokensSpent.toLocaleString(locale)} {t('tokensSuffix')}
              </span>
              <span>·</span>
              {project.orgId ? (
                <Link
                  href={`/${locale}/organizations/${project.orgId}`}
                  className="px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/20 transition-colors"
                >
                  {project.orgName ?? project.orgId}
                </Link>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                  {tWorkspace('personal')}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {project.status === 'ready' && project.hasEvaluationCriteria && (
            <QualityCheckButton projectId={projectId} />
          )}
          {project.status === 'ready' && (
            <ExportButton
              projectId={projectId}
              onPdfExport={() => handlePrint()}
              reportTemplates={project.reportTemplates}
            />
          )}
          <StatusBadge status={project.status} />
        </div>
      </header>

      {/* Stitch workspace */}
      <div className="flex-1 flex">
        <StepRail
          steps={steps}
          currentIndex={currentIdx}
          onSelect={(_, i) => setFocusIdx(i)}
          heading={t('stepsHeading')}
        />

        <div className="flex-1 flex flex-col lg:flex-row min-w-0">
          {/* Center column */}
          <div className="flex-1 px-6 lg:px-10 py-6 space-y-5 min-w-0">
            {error && (
              <div className="bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-md px-4 py-3 text-sm text-[var(--color-error)] flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{t('generationErrorBanner')}</p>
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

            {/* Idea card — collapsed-style */}
            <div className="rounded-md border border-white/5 bg-[var(--color-card)]/50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]/60 mb-1.5">
                {t('ideaHeading')}
              </p>
              <p className="text-sm text-[var(--color-text-primary)] leading-relaxed line-clamp-3">
                {project.idea}
              </p>
            </div>

            <ActivityPill state={activityState} message={activityMessage} />

            {/* Section title + content / editor */}
            {currentSection && (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                    {currentSection.title}
                  </h2>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]/60 shrink-0">
                    {String(currentIdx + 1).padStart(2, '0')} / {String(project.totalSections).padStart(2, '0')}
                  </span>
                </div>

                {isEditing && currentSection.outputType !== 'gantt' ? (
                  <TipTapEditor
                    initialContent={editingContent}
                    onChange={handleEditorChange}
                  />
                ) : (
                  <LivePreview
                    content={currentSection.content}
                    outputType={currentSection.outputType}
                    isStreaming={isStreaming && currentSection.status === 'generating'}
                    locale={locale}
                  />
                )}

                {currentSection.status === 'failed' && currentSection.failureReason && (
                  <p className="text-xs text-[var(--color-error)] bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-md px-3 py-2">
                    {currentSection.failureReason}
                  </p>
                )}

                <InlineActions
                  projectId={projectId}
                  sectionId={currentSection.id}
                  outputType={currentSection.outputType}
                  canEdit={canEdit}
                  isEditing={isEditing}
                  saveStatus={saveStatus}
                  onToggleEdit={() => setIsEditing((v) => !v)}
                />
              </div>
            )}

            {!currentSection && (
              <div className="rounded-md border border-dashed border-white/10 bg-[var(--color-card)]/30 px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]">
                {t('previewEmpty')}
              </div>
            )}
          </div>

          {/* Right scorecard panel */}
          {currentSection?.scorecard && !isEditing && (
            <JudgeScorecard
              scorecard={currentSection.scorecard}
              projectId={projectId}
              sectionId={currentSection.id}
              canEvaluate={canEdit}
            />
          )}
        </div>
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

// ───────────────────── helpers (small enough to keep inline) ─────────────────

function StatusBadge({ status }: { status: ProjectViewData['status'] }) {
  const tProjects = useTranslations('projects');
  const cfg: Record<ProjectViewData['status'], { label: string; cls: string; icon: React.ReactNode }> = {
    draft: { label: tProjects('statusDraft'), cls: 'bg-white/5 border-white/10 text-[var(--color-text-secondary)]', icon: <CircleDashed size={12} /> },
    generating: { label: tProjects('statusGenerating'), cls: 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30 text-[var(--color-accent)]', icon: <Loader2 size={12} className="animate-spin" /> },
    paused: { label: tProjects('statusPaused'), cls: 'bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30 text-[var(--color-warning)]', icon: <CircleDashed size={12} /> },
    ready: { label: tProjects('statusReady'), cls: 'bg-[var(--color-success)]/10 border-[var(--color-success)]/30 text-[var(--color-success)]', icon: <CheckCircle2 size={12} /> },
    failed: { label: tProjects('statusFailed'), cls: 'bg-[var(--color-error)]/10 border-[var(--color-error)]/30 text-[var(--color-error)]', icon: <AlertTriangle size={12} /> },
    archived: { label: tProjects('statusArchived'), cls: 'bg-white/5 border-white/10 text-[var(--color-text-secondary)]', icon: <CircleDashed size={12} /> },
  };
  const c = cfg[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium ${c.cls}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

function ExportButton({
  projectId,
  onPdfExport,
  reportTemplates = [],
}: {
  projectId: string;
  onPdfExport?: () => void;
  reportTemplates?: ReportTemplateView[];
}) {
  const t = useTranslations('projectView');
  const [open, setOpen] = useState(false);
  const [pendingFormat, setPendingFormat] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trigger = (format: 'docx' | 'xlsx') => {
    setError(null);
    setPendingFormat(format);
    setOpen(false);
    (async () => {
      try {
        const { downloadUrl, fileName } = await requestExportAction({ projectId, format });
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (err) {
        setError(err instanceof Error ? err.message : t('exportError'));
      } finally {
        setPendingFormat(null);
      }
    })();
  };

  const triggerReport = (templateId: string, label: string) => {
    setError(null);
    setPendingFormat(label);
    setOpen(false);
    (async () => {
      try {
        const { fillReportAction } = await import(
          '@/lib/actions/reportTemplates'
        );
        const { fileBase64, fileName, fileFormat } = await fillReportAction({
          projectId,
          templateId,
        });
        const mime =
          fileFormat === 'docx'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/pdf';
        const bin = atob(fileBase64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('exportError'));
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
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[var(--color-accent)] to-[#6b4cff] hover:opacity-90 text-white text-xs font-bold rounded-md transition-all disabled:opacity-50"
      >
        {pendingFormat ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
        {pendingFormat
          ? pendingFormat.startsWith('report:')
            ? t('exportPreparing', { format: pendingFormat.slice(7) })
            : t('exportPreparing', { format: pendingFormat.toUpperCase() })
          : t('exportButton')}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-md border border-white/10 bg-[var(--color-card)] shadow-xl z-20 overflow-hidden">
          {onPdfExport && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onPdfExport();
              }}
              className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-3"
            >
              <Download size={13} className="text-[var(--color-warning)]" />
              <span className="flex-1 text-white">{t('exportPdfPrint')}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => trigger('docx')}
            className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-3 ${onPdfExport ? 'border-t border-white/5' : ''}`}
          >
            <Download size={13} className="text-[var(--color-accent)]" />
            <span className="flex-1 text-white">{t('exportWord')}</span>
          </button>
          <button
            type="button"
            onClick={() => trigger('xlsx')}
            className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-3 border-t border-white/5"
          >
            <Download size={13} className="text-[var(--color-success)]" />
            <span className="flex-1 text-white">{t('exportExcel')}</span>
          </button>
          {reportTemplates.length > 0 && (
            <div className="border-t border-white/5 bg-white/[0.02]">
              <p className="px-4 py-2 text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)]/70">
                {t('exportReports')}
              </p>
              {reportTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() =>
                    triggerReport(tpl.id, `report:${tpl.name}`)
                  }
                  className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-3 border-t border-white/5"
                >
                  <Download
                    size={13}
                    className={
                      tpl.fileFormat === 'docx'
                        ? 'text-[var(--color-accent)]'
                        : 'text-[var(--color-warning)]'
                    }
                  />
                  <span className="flex-1 text-white truncate">{tpl.name}</span>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]/70">
                    {tpl.fileFormat}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {error && (
        <p className="absolute right-0 top-full mt-2 text-xs text-[var(--color-error)] max-w-[280px] bg-[var(--color-error)]/10 px-3 py-2 rounded-md border border-[var(--color-error)]/20">
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
  const t = useTranslations('projectView');
  const tWallet = useTranslations('wallet');
  const insufficient = reason.startsWith('Insufficient tokens');

  if (insufficient) {
    const match = reason.match(/balance=(\d+),\s*required=(\d+)/);
    const balance = match ? Number(match[1]) : null;
    const required = match ? Number(match[2]) : null;
    return (
      <div className="bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 rounded-md px-4 py-3 text-sm text-[var(--color-warning)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">{t('failureInsufficientTitle')}</p>
            <p className="text-xs opacity-90 mt-1">
              {balance !== null && required !== null
                ? t('failureInsufficientBody', {
                    balance: balance.toLocaleString(locale),
                    required: required.toLocaleString(locale),
                  })
                : reason}
            </p>
          </div>
        </div>
        <Link
          href={`/${locale}/billing`}
          className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md bg-[var(--color-warning)] text-black hover:opacity-90 transition-opacity shrink-0"
        >
          {tWallet('topUp')}
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-md px-4 py-3 text-sm text-[var(--color-error)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">{t('failureGenericTitle')}</p>
          <p className="text-xs opacity-90 mt-1">{reason}</p>
        </div>
      </div>
      <RetryButton projectId={projectId} />
    </div>
  );
}

function RetryButton({ projectId }: { projectId: string }) {
  const t = useTranslations('projectView');
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
      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md border border-[var(--color-error)]/30 text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors disabled:opacity-50"
    >
      {retrying ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
      {t('retry')}
    </button>
  );
}
