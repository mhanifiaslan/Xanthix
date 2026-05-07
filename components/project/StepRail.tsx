'use client';

import { Check, Loader2 } from 'lucide-react';

export interface StepInfo {
  id: string;
  index: number;
  title: string;
  status: 'pending' | 'generating' | 'ready' | 'revising' | 'failed';
}

interface StepRailProps {
  steps: StepInfo[];
  currentIndex: number;
  onSelect?: (stepId: string, index: number) => void;
  heading: string;
}

/**
 * Compact vertical step rail. Done = check, current = filled dot with label
 * accent, future = ring with dim label, failed = red dot. Click jumps focus
 * to the section in the workspace center pane.
 */
export default function StepRail({
  steps,
  currentIndex,
  onSelect,
  heading,
}: StepRailProps) {
  return (
    <aside className="w-[220px] shrink-0 border-r border-white/5 bg-[var(--color-card)]/40 px-4 py-6 hidden lg:flex flex-col gap-1">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]/60 px-2 mb-2">
        {heading}
      </p>
      <ol className="space-y-0.5">
        {steps.map((s) => {
          const isCurrent = s.index === currentIndex;
          const isReady = s.status === 'ready';
          const isFailed = s.status === 'failed';
          const isGenerating = s.status === 'generating' || s.status === 'revising';
          return (
            <li key={s.id ?? s.index}>
              <button
                type="button"
                onClick={() => onSelect?.(s.id, s.index)}
                className={
                  'w-full flex items-start gap-2.5 px-2 py-2 rounded-lg text-left transition-colors ' +
                  (isCurrent
                    ? 'bg-[var(--color-accent)]/10 text-[var(--color-text-primary)]'
                    : 'hover:bg-white/5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]')
                }
              >
                <span className="mt-1 shrink-0">
                  {isReady ? (
                    <span className="w-4 h-4 rounded-full bg-[var(--color-success)]/20 border border-[var(--color-success)]/40 flex items-center justify-center">
                      <Check size={10} className="text-[var(--color-success)]" strokeWidth={3} />
                    </span>
                  ) : isFailed ? (
                    <span className="w-4 h-4 rounded-full bg-[var(--color-error)]/20 border border-[var(--color-error)]/40" />
                  ) : isGenerating ? (
                    <span className="w-4 h-4 rounded-full bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/40 flex items-center justify-center">
                      <Loader2 size={9} className="text-[var(--color-accent)] animate-spin" />
                    </span>
                  ) : isCurrent ? (
                    <span className="w-4 h-4 rounded-full bg-[var(--color-accent)] border-2 border-[var(--color-accent)]/40" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-white/15" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]/60">
                    {String(s.index + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={
                      'block text-sm leading-tight truncate ' +
                      (isCurrent ? 'font-semibold' : '')
                    }
                  >
                    {s.title}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
