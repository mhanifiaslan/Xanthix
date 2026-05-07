'use client';

import { motion, useReducedMotion } from 'framer-motion';

export default function AnimatedBackground() {
  const reduced = useReducedMotion();

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base radial wash */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.18),transparent_60%)]" />

      {/* Drifting blobs */}
      <motion.div
        aria-hidden
        className="absolute -top-40 -left-40 w-[640px] h-[640px] rounded-full bg-[conic-gradient(from_0deg,#6366f1,#8b5cf6,#0ea5e9,#6366f1)] opacity-25 blur-3xl"
        animate={
          reduced
            ? undefined
            : {
                x: [0, 80, -40, 0],
                y: [0, 40, -60, 0],
                scale: [1, 1.05, 0.95, 1],
              }
        }
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="absolute -bottom-40 -right-40 w-[720px] h-[720px] rounded-full bg-[conic-gradient(from_180deg,#0ea5e9,#6366f1,#8b5cf6,#0ea5e9)] opacity-20 blur-3xl"
        animate={
          reduced
            ? undefined
            : {
                x: [0, -60, 40, 0],
                y: [0, -40, 60, 0],
                scale: [1, 0.95, 1.05, 1],
              }
        }
        transition={{ duration: 34, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Subtle grid + noise overlay */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage:
            'radial-gradient(ellipse at center, black 40%, transparent 75%)',
        }}
      />

      {/* Top + bottom fade */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[var(--color-background)] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[var(--color-background)] to-transparent" />
    </div>
  );
}
