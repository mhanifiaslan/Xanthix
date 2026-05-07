'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import CursorParticleBackground from './CursorParticleBackground';
import ProviderButtons from '@/components/auth/ProviderButtons';

export default function LandingHero() {
  const t = useTranslations('landing');
  const locale = useLocale();
  const router = useRouter();
  const reduced = useReducedMotion();
  const [error, setError] = useState<string | null>(null);

  const goHome = () => {
    router.replace(`/${locale}/home`);
    router.refresh();
  };

  const fadeUp = (delay: number) =>
    reduced
      ? {
          initial: { opacity: 1, y: 0 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0 },
        }
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.65, delay, ease: [0.22, 0.61, 0.36, 1] as const },
        };

  return (
    <main className="relative min-h-screen w-full flex flex-col bg-[var(--color-background)] text-[var(--color-text-primary)]">
      <CursorParticleBackground />
      {/* Subtle vignette to keep particles from overpowering text */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(10,11,13,0.85)_100%)]"
      />

      <header className="relative z-10 flex items-center justify-between px-6 lg:px-10 py-5">
        <BrandPill />
        <Link
          href={`/${locale}/login`}
          className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors px-4 py-2 rounded-full border border-white/10 hover:border-white/20 backdrop-blur bg-[var(--color-card)]/40"
        >
          {t('ctaSignIn')}
        </Link>
      </header>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-24">
        <motion.div {...fadeUp(0.05)} className="mb-7">
          <BrandWordPill />
        </motion.div>

        <motion.h1
          {...fadeUp(0.18)}
          className="max-w-4xl text-center font-bold tracking-tight leading-[1.04] text-4xl sm:text-5xl md:text-6xl lg:text-7xl"
        >
          <span className="bg-gradient-to-br from-white via-white to-white/70 bg-clip-text text-transparent">
            {t('headline')}
          </span>
        </motion.h1>

        <motion.p
          {...fadeUp(0.32)}
          className="mt-6 max-w-2xl text-center text-base md:text-lg text-[var(--color-text-secondary)] leading-relaxed"
        >
          {t('subhead')}
        </motion.p>

        <motion.div {...fadeUp(0.46)} className="mt-10 w-full max-w-2xl">
          <ProviderButtons
            layout="row"
            onSignedIn={goHome}
            onError={(message) => setError(message)}
          />
        </motion.div>

        {error && (
          <p className="mt-4 text-sm text-[var(--color-error)] max-w-md text-center">
            {error}
          </p>
        )}

        <motion.div
          {...fadeUp(0.6)}
          className="mt-7 flex items-center gap-4 text-sm text-[var(--color-text-secondary)]"
        >
          <Link
            href={`/${locale}/login`}
            className="hover:text-[var(--color-accent)] transition-colors"
          >
            {t('emailSignIn')}
          </Link>
          <span className="text-[var(--color-text-secondary)]/30">·</span>
          <Link
            href={`/${locale}/register`}
            className="hover:text-[var(--color-accent)] transition-colors"
          >
            {t('newAccount')}
          </Link>
        </motion.div>

        <motion.p
          {...fadeUp(0.78)}
          className="mt-12 text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-secondary)]/50"
        >
          {t('footerNote')}
        </motion.p>
      </div>
    </main>
  );
}

function BrandPill() {
  return (
    <div className="inline-flex items-center gap-2.5">
      <BrandIcon />
      <span className="text-sm font-bold tracking-tight">Xanthix.ai</span>
    </div>
  );
}

function BrandWordPill() {
  const t = useTranslations('landing');
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-card)]/70 border border-white/10 backdrop-blur">
      <BrandIcon size={14} />
      <span className="text-xs font-bold tracking-tight">Xanthix.ai</span>
      <span className="hidden sm:inline-block text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)] ml-1.5 pl-2.5 border-l border-white/10">
        {t('eyebrow')}
      </span>
    </div>
  );
}

function BrandIcon({ size = 18 }: { size?: number }) {
  const box = size + 8;
  return (
    <div
      className="rounded-lg bg-gradient-to-br from-indigo-500/30 to-cyan-400/20 border border-white/10 flex items-center justify-center"
      style={{ width: box, height: box }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="brand-x-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#a5b4fc" />
            <stop offset="0.55" stopColor="#6366f1" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <path
          d="M5 5L19 19M19 5L5 19"
          stroke="url(#brand-x-grad)"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
