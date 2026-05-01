'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Bot, Eye, EyeOff, Loader2 } from 'lucide-react';
import { FirebaseError } from 'firebase/app';
import { useAuth } from '@/lib/auth/AuthProvider';

export default function LoginPage() {
  const t = useTranslations('auth.login');
  const tApp = useTranslations('app');
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isGooglePending, setIsGooglePending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      await signInWithEmail(email, password);
      router.push('/');
    } catch (err) {
      setError(mapAuthError(err, t));
    } finally {
      setIsPending(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setIsGooglePending(true);
    try {
      await signInWithGoogle();
      router.push('/');
    } catch (err) {
      setError(mapAuthError(err, t));
    } finally {
      setIsGooglePending(false);
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
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          {tApp('tagline')}
        </p>
      </div>

      <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-8">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
          {t('title')}
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          {t('subtitle')}
        </p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={isPending || isGooglePending}
          className="w-full mb-4 py-2.5 px-4 bg-white text-gray-900 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-semibold rounded-xl transition-colors flex items-center justify-center gap-3"
        >
          {isGooglePending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <GoogleLogo />
          )}
          {t('googleButton')}
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs uppercase tracking-wider text-[var(--color-text-secondary)]/60">
            {/* OR */}
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
            autoComplete="current-password"
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
            disabled={isPending || isGooglePending || !email || !password}
            className="w-full py-2.5 px-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : null}
            {t('submit')}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link
            href="/forgot"
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
          >
            {t('forgotLink')}
          </Link>
          <span className="text-[var(--color-text-secondary)]">
            {t('noAccount')}{' '}
            <Link
              href="/register"
              className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-medium transition-colors"
            >
              {t('registerLink')}
            </Link>
          </span>
        </div>
      </div>
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

function GoogleLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.5-5.9 7.8-11.3 7.8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.1l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.1z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.4 0-9.6-3.3-11.3-7.8l-6.5 5C9.7 39.6 16.3 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.7 2.1-2 4-3.7 5.4l6.2 5.2C41.9 35.6 44 30.2 44 24c0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

function mapAuthError(err: unknown, t: ReturnType<typeof useTranslations>) {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return t('errors.invalidCredentials');
      default:
        return t('errors.generic');
    }
  }
  return t('errors.generic');
}
