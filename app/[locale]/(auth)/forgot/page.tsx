'use client';

import { type FormEvent, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Bot, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { FirebaseError } from 'firebase/app';
import { useAuth } from '@/lib/auth/AuthProvider';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth.forgot');
  const tApp = useTranslations('app');
  const tValidation = useTranslations('auth.validation');
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(tValidation('emailInvalid'));
      return;
    }
    setIsPending(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      // Don't leak whether the email exists — firebase already obfuscates this.
      if (err instanceof FirebaseError && err.code === 'auth/invalid-email') {
        setError(tValidation('emailInvalid'));
      } else {
        setSent(true);
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30 mb-4">
          <Bot size={28} className="text-[var(--color-accent)]" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          {tApp('name')}
        </h1>
      </div>

      <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-8">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
          {t('title')}
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          {t('subtitle')}
        </p>

        {sent ? (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
            <p className="text-sm">{t('sent')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5"
              >
                {t('emailLabel')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all"
              />
            </div>

            {error && (
              <div className="bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-xl px-4 py-3 text-sm text-[var(--color-error)]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || !email}
              className="w-full py-2.5 px-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isPending ? <Loader2 size={16} className="animate-spin" /> : null}
              {t('submit')}
            </button>
          </form>
        )}

        <Link
          href="/login"
          className="mt-6 flex items-center justify-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
        >
          <ArrowLeft size={14} />
          {t('backToLogin')}
        </Link>
      </div>
    </div>
  );
}
