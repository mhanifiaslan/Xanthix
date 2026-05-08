'use client';

import { useEffect, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ClipboardCheck, Loader2, Wand2, X } from 'lucide-react';
import {
  autoReviseFromQAAction,
  evaluateProjectQualityAction,
  type QaReportResult,
} from '@/lib/actions/projectQA';

// Sits next to the ExportButton in ProjectView's header. Only renders if
// the project type defines evaluation criteria (the parent gates this).

export default function QualityCheckButton({
  projectId,
}: {
  projectId: string;
}) {
  const t = useTranslations('projectView');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<QaReportResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviseStatus, setReviseStatus] = useState<{
    revised: number;
    failed: number;
  } | null>(null);
  const [revisePending, startRevise] = useTransition();

  const run = () => {
    setError(null);
    setReport(null);
    setReviseStatus(null);
    setPending(true);
    setOpen(true);
    (async () => {
      try {
        const result = await evaluateProjectQualityAction({ projectId });
        setReport(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('qaError'));
      } finally {
        setPending(false);
      }
    })();
  };

  const autoRevise = () => {
    if (!report || report.weakSections.length === 0) return;
    setError(null);
    setReviseStatus(null);
    startRevise(async () => {
      try {
        const result = await autoReviseFromQAAction({
          projectId,
          weakSections: report.weakSections.map((w) => ({
            sectionId: w.sectionId,
            reason: w.reason || 'Section flagged by quality review.',
          })),
        });
        setReviseStatus({
          revised: result.revised,
          failed: result.failed.length,
        });
        // Server snapshots will refresh the section content; nudge the
        // surrounding server components to re-fetch any cached project data.
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : t('qaError'));
      }
    });
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md border border-white/10 text-white hover:bg-white/5 transition-colors disabled:opacity-50"
      >
        {pending ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <ClipboardCheck size={12} />
        )}
        {pending ? t('qaRunning') : t('qaButton')}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-2xl max-h-[90vh] bg-[var(--color-card)] border border-white/10 rounded-md shadow-2xl flex flex-col">
            <div className="flex items-start gap-3 p-5 border-b border-white/5">
              <div className="w-9 h-9 rounded-md bg-[var(--color-accent)]/15 text-[var(--color-accent)] flex items-center justify-center shrink-0">
                <ClipboardCheck size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)]/70">
                  {t('qaButton')}
                </p>
                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                  {t('qaTitle')}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5 flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <p className="text-sm text-[var(--color-text-secondary)]">
                {t('qaIntro')}
              </p>

              {pending && (
                <div className="flex items-center gap-3 text-[var(--color-text-secondary)] py-12 justify-center">
                  <Loader2 size={20} className="animate-spin" />
                  <span className="text-sm">{t('qaRunning')}</span>
                </div>
              )}

              {error && (
                <div className="text-xs text-[var(--color-error)] bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              {report && (
                <>
                  <div className="border border-white/10 rounded-md p-4 bg-[var(--color-background)]/50">
                    <p className="text-[10px] uppercase tracking-widest text-[var(--color-accent)] font-semibold">
                      {t('qaScoreLabel')}
                    </p>
                    <p className="text-3xl font-bold text-[var(--color-text-primary)] mt-1">
                      {Math.round(report.normalizedScore * 100)}
                      <span className="text-sm text-[var(--color-text-secondary)] font-normal">
                        /100
                      </span>
                    </p>
                    {report.summary && (
                      <p className="text-sm text-[var(--color-text-secondary)] mt-2 leading-relaxed">
                        {report.summary}
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2">
                    {report.scores.map((s) => (
                      <li
                        key={s.criterionId}
                        className="border border-white/5 rounded-md p-3 bg-[var(--color-card)]/40"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                            {s.name}
                          </p>
                          <span className="text-xs font-mono text-[var(--color-accent)]">
                            {s.score.toFixed(1)} / {s.maxPoints}
                          </span>
                        </div>
                        {s.rationale && (
                          <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">
                            {s.rationale}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>

                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)]/70 mb-2">
                      {t('qaWeakSections')}
                    </p>
                    {report.weakSections.length === 0 ? (
                      <div className="flex items-center gap-2 text-[var(--color-success)] text-sm">
                        <CheckCircle2 size={14} />
                        {t('qaNoIssues')}
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {report.weakSections.map((w) => (
                          <li
                            key={w.sectionId}
                            className="border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 rounded-md p-3"
                          >
                            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                              {w.title}
                            </p>
                            <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">
                              {w.reason}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {reviseStatus && (
                    <div
                      className={
                        reviseStatus.failed === 0
                          ? 'flex items-center gap-2 text-[var(--color-success)] text-sm border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 rounded-md px-3 py-2'
                          : 'flex items-center gap-2 text-[var(--color-warning)] text-sm border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 rounded-md px-3 py-2'
                      }
                    >
                      <CheckCircle2 size={14} />
                      <span>
                        {t('qaReviseDone', {
                          revised: reviseStatus.revised,
                          failed: reviseStatus.failed,
                        })}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-white/5">
              {report && report.weakSections.length > 0 && (
                <button
                  type="button"
                  onClick={autoRevise}
                  disabled={revisePending}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-[var(--color-accent)] text-[var(--color-background)] hover:bg-[var(--color-accent)]/90 transition-colors disabled:opacity-50"
                >
                  {revisePending ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Wand2 size={13} />
                  )}
                  {revisePending
                    ? t('qaReviseRunning', {
                        count: report.weakSections.length,
                      })
                    : t('qaReviseAll', {
                        count: report.weakSections.length,
                      })}
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={revisePending}
                className="px-4 py-2 text-sm rounded-md border border-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-white/20 transition-colors disabled:opacity-50"
              >
                {t('qaClose')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
