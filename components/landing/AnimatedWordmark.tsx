'use client';

import { motion, useReducedMotion } from 'framer-motion';

interface AnimatedWordmarkProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES: Record<NonNullable<AnimatedWordmarkProps['size']>, { font: number; height: number }> = {
  sm: { font: 28, height: 40 },
  md: { font: 44, height: 60 },
  lg: { font: 72, height: 96 },
};

/**
 * Renders the "Xanthix.ai" wordmark as inline SVG. On first render the strokes
 * draw in, then the gradient fill fades up. With prefers-reduced-motion the
 * wordmark appears in its final state immediately.
 */
export default function AnimatedWordmark({ size = 'md', className }: AnimatedWordmarkProps) {
  const reduced = useReducedMotion();
  const { font, height } = SIZES[size];

  // We let the SVG size itself off the text content, so the parent's width
  // can stay flexible. ViewBox is set after a frame for accessibility.
  return (
    <div
      role="img"
      aria-label="Xanthix.ai"
      className={className}
      style={{ height, lineHeight: 0 }}
    >
      <svg
        height={height}
        viewBox={`0 0 ${font * 7} ${height}`}
        preserveAspectRatio="xMinYMid meet"
        className="block"
      >
        <defs>
          <linearGradient id="wm-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a5b4fc" />
            <stop offset="55%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <motion.text
          x="0"
          y={height * 0.72}
          fontSize={font}
          fontWeight={800}
          letterSpacing={-1}
          fill="url(#wm-grad)"
          stroke="url(#wm-grad)"
          strokeWidth={1}
          initial={reduced ? { fillOpacity: 1, strokeOpacity: 0 } : { fillOpacity: 0, strokeOpacity: 1, pathLength: 0 }}
          animate={reduced ? { fillOpacity: 1, strokeOpacity: 0 } : { fillOpacity: 1, strokeOpacity: 0, pathLength: 1 }}
          transition={{
            pathLength: { duration: 1.6, ease: 'easeInOut' },
            fillOpacity: { duration: 0.8, delay: 1.2 },
            strokeOpacity: { duration: 0.4, delay: 1.5 },
          }}
          style={{ fontFamily: 'var(--font-sans, system-ui), sans-serif' }}
        >
          Xanthix
          <tspan fill="#22d3ee" stroke="none">.ai</tspan>
        </motion.text>
      </svg>
    </div>
  );
}
