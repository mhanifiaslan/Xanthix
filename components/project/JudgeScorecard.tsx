'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, RefreshCw } from 'lucide-react';
import { evaluateSectionAction } from '@/lib/actions/projects';

export interface ScorecardDimensionView {
  id: string;
  score: number;
  maxPoints: number;
  rationale: string;
  suggestions: string;
}

export interface ScorecardView {
  totalScore: number;
  maxScore: number;
  normalizedScore: number;
  passed: boolean;
  attempts: number;
  dimensions: ScorecardDimensionView[];
}

interface JudgeScorecardProps {
  scorecard: ScorecardView;
  projectId: string;
  sectionId: string;
  canEvaluate: boolean;
}

/**
 * Right-side panel showing the AI judge's verdict for the current section.
 * Compact dimension bars + rationale; rationale collapses by default to
 * keep the rail tidy.
 */
export default function JudgeScorecard({
  scorecard,
  projectId,
  sectionId,
  canEvaluate,
}: JudgeScorecardProps) {
  const t = useTranslations('projectView');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pct = Math.round(scorecard.normalizedScore * 100);
  const totalLabel =
    scorecard.totalScore % 1 === 0
      ? scorecard.totalScore.toString()
      : scorecard.totalScore.toFixed(1);
  const attemptsLabel =
    scorecard.attempts > 1
      ? t('evalAttempts', { n: scorecard.attempts })
      : null;

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    setError(null);
    try {
      await evaluateSectionAction({ projectId, sectionId });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('evalError'));
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <aside className="w-full lg:w-[300px] shrink-0 lg:border-l lg:border-white/5 px-4 lg:px-5 py-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]/60">
          {t('evalTitle')}
        </p>
        {canEvaluate && (
          <button
            type="button"
            onClick={handleEvaluate}
            disabled={isEvaluating}
            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded bg-white/5 hover:bg-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-50"
          >
            {isEvaluating ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <RefreshCw size={10} />
            )}
            {isEvaluating ? t('evalReevaluating') : t('evalReevaluate')}
          </button>
        )}
      </div>

      <div
        className={`rounded-md border p-4 ${
          scorecard.passed
            ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/5'
            : 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5'
        }`}
      >
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums text-[var(--color-text-primary)]">
            {totalLabel}
          </span>
          <span className="text-sm text-[var(--color-text-secondary)]">
            / {scorecard.maxScore}
          </span>
          <span className="ml-auto text-xs text-[var(--color-text-secondary)] tabular-nums">
            {pct}%
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              scorecard.passed
                ? 'text-[var(--color-success)] bg-[var(--color-success)]/10'
                : 'text-[var(--color-warning)] bg-[var(--color-warning)]/10'
            }`}
          >
            {scorecard.passed ? t('evalPassed') : t('evalBelow')}
          </span>
          {attemptsLabel && (
            <span className="text-[10px] text-[var(--color-text-secondary)]">
              {attemptsLabel}
            </span>
          )}
        </div>
      </div>

      {error && (
        <p className="text-[10px] text-[var(--color-error)] bg-[var(--color-error)]/10 px-2 py-1 rounded border border-[var(--color-error)]/20">
          {error}
        </p>
      )}

      <ul className="space-y-3">
        {scorecard.dimensions.map((d) => {
          const dimPct = d.maxPoints > 0 ? (d.score / d.maxPoints) * 100 : 0;
          return (
            <li key={d.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[var(--color-text-primary)] capitalize truncate">
                  {d.id}
                </span>
                <span className="text-[10px] tabular-nums text-[var(--color-text-secondary)]">
                  {d.score % 1 === 0 ? d.score : d.score.toFixed(1)} / {d.maxPoints}
                </span>
              </div>
              <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--color-accent)] to-[#6b4cff] transition-all"
                  style={{ width: `${dimPct}%` }}
                />
              </div>
              {d.suggestions && (
                <p className="text-[10px] text-[var(--color-text-secondary)] leading-relaxed line-clamp-2">
                  {d.suggestions}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

/**
 * Helper that callers use to coerce raw Firestore scorecard data into the
 * strict `ScorecardView` shape this component expects.
 */
export function parseScorecard(raw: unknown): ScorecardView | null {
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
