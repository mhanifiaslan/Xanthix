'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth/AuthProvider';

interface ProviderButtonsProps {
  /** Where to send the user after a successful sign-in. */
  onSignedIn: () => void;
  /** Surfaces a translated error message when a provider call fails. */
  onError: (message: string) => void;
  /** Disables every provider button while another flow is pending. */
  externallyPending?: boolean;
  /**
   * "stack" — full-width vertical buttons (auth pages).
   * "row"   — pill buttons in a row (landing hero). Stacks on small screens.
   */
  layout?: 'stack' | 'row';
}

/**
 * Three provider buttons: Google (wired) + GitHub and Microsoft (rendered with
 * a "Coming soon" tag until the OAuth credentials are added in Firebase).
 */
export default function ProviderButtons({
  onSignedIn,
  onError,
  externallyPending = false,
  layout = 'stack',
}: ProviderButtonsProps) {
  const { signInWithGoogle } = useAuth();
  const tProviders = useTranslations('auth.providers');
  const tCommon = useTranslations('common');
  const tLogin = useTranslations('auth.login');
  const [pending, setPending] = useState<'google' | null>(null);

  const handleGoogle = async () => {
    setPending('google');
    try {
      await signInWithGoogle();
      onSignedIn();
    } catch (err) {
      onError(err instanceof Error ? err.message : tLogin('errors.generic'));
    } finally {
      setPending(null);
    }
  };

  const anyPending = externallyPending || pending !== null;
  const isRow = layout === 'row';

  if (isRow) {
    return (
      <div className="flex flex-col sm:flex-row items-stretch justify-center gap-2.5 w-full">
        <RowButton
          onClick={handleGoogle}
          disabled={anyPending}
          loading={pending === 'google'}
          variant="primary"
          icon={<GoogleLogo />}
          label={tProviders('googleShort')}
        />
        <RowButton
          disabled
          comingSoon={tCommon('comingSoon')}
          variant="ghost"
          icon={<GitHubLogo />}
          label={tProviders('githubShort')}
        />
        <RowButton
          disabled
          comingSoon={tCommon('comingSoon')}
          variant="ghost"
          icon={<MicrosoftLogo />}
          label={tProviders('microsoftShort')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={anyPending}
        className="w-full py-2.5 px-4 bg-white text-gray-900 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-semibold rounded-xl transition-colors flex items-center justify-center gap-3"
      >
        {pending === 'google' ? <Loader2 size={16} className="animate-spin" /> : <GoogleLogo />}
        {tProviders('google')}
      </button>

      <DisabledStackProvider
        label={tProviders('github')}
        comingSoonLabel={tCommon('comingSoon')}
        icon={<GitHubLogo />}
      />
      <DisabledStackProvider
        label={tProviders('microsoft')}
        comingSoonLabel={tCommon('comingSoon')}
        icon={<MicrosoftLogo />}
      />
    </div>
  );
}

function RowButton({
  onClick,
  disabled,
  loading,
  comingSoon,
  variant,
  icon,
  label,
}: {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  comingSoon?: string;
  variant: 'primary' | 'ghost';
  icon: React.ReactNode;
  label: string;
}) {
  const base =
    'relative inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 min-w-[140px]';
  const cls =
    variant === 'primary'
      ? 'bg-white text-gray-900 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/30'
      : 'bg-[var(--color-card)]/70 backdrop-blur border border-white/10 text-[var(--color-text-primary)] hover:bg-[var(--color-card)] disabled:opacity-60 disabled:cursor-not-allowed';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      title={comingSoon}
      className={`${base} ${cls}`}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : icon}
      <span>{label}</span>
      {comingSoon && (
        <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/5 border border-white/10 ml-1">
          {comingSoon}
        </span>
      )}
    </button>
  );
}

function DisabledStackProvider({
  label,
  comingSoonLabel,
  icon,
}: {
  label: string;
  comingSoonLabel: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      title={comingSoonLabel}
      className="w-full py-2.5 px-4 bg-[var(--color-background)] border border-white/10 text-[var(--color-text-secondary)] rounded-xl flex items-center justify-center gap-3 cursor-not-allowed opacity-70 relative"
    >
      <span className="flex items-center gap-3">
        {icon}
        <span className="font-semibold">{label}</span>
      </span>
      <span className="absolute right-3 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
        {comingSoonLabel}
      </span>
    </button>
  );
}

function GoogleLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.5-5.9 7.8-11.3 7.8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.1l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.1z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.4 0-9.6-3.3-11.3-7.8l-6.5 5C9.7 39.6 16.3 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2.1-2 4-3.7 5.4l6.2 5.2C41.9 35.6 44 30.2 44 24c0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function MicrosoftLogo() {
  return (
    <svg width="14" height="14" viewBox="0 0 23 23" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}

function GitHubLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.084-.729.084-.729 1.205.085 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.93 0-1.31.467-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}
