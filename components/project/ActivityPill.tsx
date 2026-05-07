'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

export type ActivityState =
  | 'idle'
  | 'writing'
  | 'judging'
  | 'revising'
  | 'done'
  | 'error';

interface ActivityPillProps {
  state: ActivityState;
  /** Friendly status sentence — e.g. "Drafting the Impact section…". */
  message: string;
}

/**
 * Stitch-inspired status pill. Sits above the live preview while the AI is
 * working on the current section. Subtle gradient stroke that animates while
 * a state is in flight; freezes on done / error.
 */
export default function ActivityPill({ state, message }: ActivityPillProps) {
  const reduced = useReducedMotion();
  const isAnimating = state === 'writing' || state === 'judging' || state === 'revising';
  const tone =
    state === 'error'
      ? 'border-[var(--color-error)]/40'
      : state === 'done'
        ? 'border-[var(--color-success)]/40'
        : 'border-[var(--color-accent)]/40';

  return (
    <div className="relative w-full">
      <div
        className={`relative flex items-center gap-3 px-4 py-3 rounded-md bg-[var(--color-card)]/80 backdrop-blur border ${tone} overflow-hidden`}
      >
        {/* Animated gradient stroke overlay (shimmer) */}
        {isAnimating && !reduced && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-md"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.18) 50%, transparent 100%)',
            }}
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Status icon */}
        <span className="relative shrink-0 w-9 h-9 rounded-md bg-gradient-to-br from-indigo-500/25 to-cyan-400/15 border border-white/10 flex items-center justify-center">
          {state === 'done' ? (
            <CheckCircle2 size={16} className="text-[var(--color-success)]" />
          ) : state === 'error' ? (
            <AlertTriangle size={16} className="text-[var(--color-error)]" />
          ) : isAnimating ? (
            <Loader2 size={16} className="text-[var(--color-accent)] animate-spin" />
          ) : (
            <Sparkles size={16} className="text-[var(--color-accent)]" />
          )}
        </span>

        <span className="relative flex-1 text-sm text-[var(--color-text-primary)] truncate">
          {message}
        </span>
      </div>
    </div>
  );
}
