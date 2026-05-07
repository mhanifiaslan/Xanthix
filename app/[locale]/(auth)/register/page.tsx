'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { FirebaseError } from 'firebase/app';
import { useAuth } from '@/lib/auth/AuthProvider';
import AnimatedWordmark from '@/components/landing/AnimatedWordmark';

export default function RegisterPage() {
  const t = useTranslations('auth.register');
  const tApp = useTranslations('app');
  const tValidation = useTranslations('auth.validation');
  const tLogin = useTranslations('auth.login');
  const locale = useLocale();
  const { signUpWithEmail } = useAuth();
  const router = useRouter();

  const homeRedirect = `/${locale}/home`;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const validate = () => {
    if (name.trim().length < 2) return tValidation('nameMin');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return tValidation('emailInvalid');
    if (password.length < 8) return tValidation('passwordMin');
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setIsPending(true);
    try {
      await signUpWithEmail(email, password, name);
      router.replace(homeRedirect);
      router.refresh();
    } catch (err) {
      setError(mapAuthError(err, t));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="w-full">
      <div className="text-center mb-8 flex flex-col items-center">
        <AnimatedWordmark size="md" />
        <p className="text-sm text-[var(--color-text-secondary)] mt-3">
          {tApp('tagline')}
        </p>
      </div>

      <div className="bg-[var(--color-card)]/90 backdrop-blur-sm rounded-2xl border border-white/5 p-8 shadow-2xl">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-1.5 tracking-tight">
          {t('title')}
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          {t('subtitle')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Field
            id="name"
            type="text"
            label={t('nameLabel')}
            placeholder={t('namePlaceholder')}
            value={name}
            onChange={setName}
            autoComplete="name"
            required
          />
          <Field
            id="email"
            type="email"
            label={t('emailLabel')}
            placeholder={t('emailPlaceholder')}
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
          />
          <Field
            id="password"
            type={showPassword ? 'text' : 'password'}
            label={t('passwordLabel')}
            placeholder={t('passwordPlaceholder')}
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            required
            adornment={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />

          {error && (
            <div className="bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-xl px-4 py-3 text-sm text-[var(--color-error)]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || !name || !email || !password}
            className="w-full py-2.5 px-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : null}
            {t('submit')}
          </button>
        </form>

        <div className="mt-6 text-sm text-center text-[var(--color-text-secondary)]">
          {t('haveAccount')}{' '}
          <Link
            href="/login"
            className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-medium transition-colors"
          >
            {t('loginLink')}
          </Link>
        </div>
      </div>

      <Link
        href={`/${locale}`}
        className="mt-6 flex items-center justify-center gap-1.5 text-xs text-[var(--color-text-secondary)]/70 hover:text-[var(--color-text-secondary)] transition-colors"
      >
        <ArrowLeft size={12} />
        {tLogin('backToProviders')}
      </Link>
    </div>
  );
}

function Field({
  id,
  type,
  label,
  placeholder,
  value,
  onChange,
  autoComplete,
  required,
  adornment,
}: {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
  adornment?: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-2.5 pr-11 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all"
        />
        {adornment}
      </div>
    </div>
  );
}

function mapAuthError(err: unknown, t: ReturnType<typeof useTranslations>) {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/email-already-in-use':
        return t('errors.emailInUse');
      case 'auth/weak-password':
        return t('errors.weakPassword');
      default:
        return t('errors.generic');
    }
  }
  return t('errors.generic');
}
