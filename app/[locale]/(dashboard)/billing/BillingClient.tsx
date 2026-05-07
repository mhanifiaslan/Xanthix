'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  Building2,
  CheckCircle2,
  Loader2,
  Sparkles,
  Wallet,
  XCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { createTokenCheckoutAction } from '@/lib/actions/payments';
import { cn } from '@/lib/utils';

interface PackageView {
  id: string;
  slug: string;
  name: string;
  tokenAmount: number;
  bonusTokens: number;
  price: number;
  currency: 'TRY' | 'USD' | 'EUR';
  isPopular: boolean;
}

interface PurchaseView {
  id: string;
  packageName: string;
  tokenAmount: number;
  bonusTokens: number;
  price: number;
  currency: 'TRY' | 'USD' | 'EUR';
  status: 'pending' | 'succeeded' | 'failed' | 'expired';
  createdAt: string | null;
}

interface Props {
  locale: string;
  walletKind: 'user' | 'org';
  orgName: string | null;
  orgTier: string | null;
  canPurchase: boolean;
  paymentsEnabled: boolean;
  balance: number;
  packages: PackageView[];
  purchases: PurchaseView[];
}

const CURRENCY_SYMBOL: Record<PackageView['currency'], string> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
};

function formatPrice(p: PackageView, locale: string): string {
  const sym = CURRENCY_SYMBOL[p.currency];
  return `${sym}${p.price.toLocaleString(locale, { minimumFractionDigits: p.price % 1 === 0 ? 0 : 2 })}`;
}

const STATUS_ICONS: Record<PurchaseView['status'], typeof CheckCircle2> = {
  succeeded: CheckCircle2,
  failed: XCircle,
  pending: Clock,
  expired: AlertTriangle,
};

const STATUS_CLASSES: Record<PurchaseView['status'], string> = {
  succeeded:
    'text-[var(--color-success)] bg-[var(--color-success)]/10 border-[var(--color-success)]/20',
  failed:
    'text-[var(--color-error)] bg-[var(--color-error)]/10 border-[var(--color-error)]/20',
  pending:
    'text-[var(--color-warning)] bg-[var(--color-warning)]/10 border-[var(--color-warning)]/20',
  expired: 'text-[var(--color-text-secondary)] bg-white/5 border-white/10',
};

export default function BillingClient({
  walletKind,
  orgName,
  orgTier,
  canPurchase,
  paymentsEnabled,
  balance,
  packages,
  purchases,
}: Props) {
  const router = useRouter();
  const search = useSearchParams();
  const locale = useLocale();
  const t = useTranslations('billing');
  const [pendingPkgId, setPendingPkgId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<
    | { kind: 'success' | 'error' | 'info'; text: string }
    | null
  >(null);

  useEffect(() => {
    const status = search.get('payment');
    if (!status) return;
    if (status === 'success') {
      setToast({ kind: 'success', text: t('toastSuccess') });
    } else if (status === 'failed') {
      setToast({ kind: 'error', text: t('toastFailed') });
    } else if (status === 'pending') {
      setToast({ kind: 'info', text: t('toastPending') });
    } else if (status === 'error') {
      setToast({ kind: 'error', text: t('toastError') });
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('payment');
    url.searchParams.delete('purchaseId');
    window.history.replaceState({}, '', url.toString());
  }, [search, t]);

  const onBuy = (pkg: PackageView) => {
    if (!canPurchase) return;
    setError(null);
    setPendingPkgId(pkg.id);
    startTransition(async () => {
      try {
        const result = await createTokenCheckoutAction({ packageId: pkg.id });
        window.location.assign(result.paymentPageUrl);
      } catch (e) {
        setError(e instanceof Error ? e.message : t('errorStartingPayment'));
        setPendingPkgId(null);
      }
    });
  };

  const planLabel =
    walletKind === 'org'
      ? t('planLabelOrg', { tier: orgTier ?? t('fallbackTier') })
      : t('planLabelPersonal');

  const subtitle =
    walletKind === 'org'
      ? t('subtitleOrg', { name: orgName ?? t('fallbackOrgName') })
      : t('subtitlePersonal');

  const statusLabels: Record<PurchaseView['status'], string> = {
    succeeded: t('statusSucceeded'),
    failed: t('statusFailed'),
    pending: t('statusPending'),
    expired: t('statusExpired'),
  };

  return (
    <div className="min-h-full pb-12">
      <header className="px-8 py-6 border-b border-white/5">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
          {t('title')}
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
          {subtitle}
        </p>
      </header>

      <div className="px-8 py-8 max-w-5xl mx-auto space-y-8">
        {toast && (
          <div
            className={cn(
              'rounded-xl border px-4 py-3 text-sm flex items-start gap-3',
              toast.kind === 'success' &&
                'bg-[var(--color-success)]/10 border-[var(--color-success)]/20 text-[var(--color-success)]',
              toast.kind === 'error' &&
                'bg-[var(--color-error)]/10 border-[var(--color-error)]/20 text-[var(--color-error)]',
              toast.kind === 'info' &&
                'bg-[var(--color-warning)]/10 border-[var(--color-warning)]/20 text-[var(--color-warning)]',
            )}
          >
            {toast.kind === 'success' ? (
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            ) : toast.kind === 'error' ? (
              <XCircle size={16} className="mt-0.5 shrink-0" />
            ) : (
              <Clock size={16} className="mt-0.5 shrink-0" />
            )}
            <p className="flex-1">{toast.text}</p>
            <button
              onClick={() => setToast(null)}
              className="text-current opacity-60 hover:opacity-100"
            >
              ×
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-gradient-to-br from-[var(--color-accent)]/15 to-[var(--color-card)] rounded-2xl border border-[var(--color-accent)]/20 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)] mb-1">
                  {planLabel}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold tabular-nums text-[var(--color-text-primary)]">
                    {balance.toLocaleString(locale)}
                  </span>
                  <span className="text-lg text-[var(--color-text-secondary)]">
                    {t('tokensSuffix')}
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30 flex items-center justify-center">
                {walletKind === 'org' ? (
                  <Building2 size={22} className="text-[var(--color-accent)]" />
                ) : (
                  <Wallet size={22} className="text-[var(--color-accent)]" />
                )}
              </div>
            </div>
          </div>

          {!paymentsEnabled ? (
            <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-5 flex items-start gap-3">
              <Clock
                size={18}
                className="text-[var(--color-warning)] mt-0.5 shrink-0"
              />
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                {t('paymentsDisabledNotice')}
              </p>
            </div>
          ) : !canPurchase && walletKind === 'org' ? (
            <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-5 flex items-start gap-3">
              <AlertTriangle
                size={18}
                className="text-[var(--color-warning)] mt-0.5 shrink-0"
              />
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                {t('noPermissionNotice')}
              </p>
            </div>
          ) : null}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            {t('packagesTitle')}
          </h2>
          {packages.length === 0 ? (
            <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-8 text-center text-sm text-[var(--color-text-secondary)]">
              {t('noPackages')}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {packages.map((pkg) => {
                const isLoading = isPending && pendingPkgId === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    className={cn(
                      'relative bg-[var(--color-card)] rounded-2xl border p-5 flex flex-col',
                      pkg.isPopular
                        ? 'border-[var(--color-accent)]/40'
                        : 'border-white/5',
                    )}
                  >
                    {pkg.isPopular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-bold bg-[var(--color-accent)] text-white rounded-full">
                        {t('popular')}
                      </span>
                    )}
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
                      {pkg.name}
                    </p>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-3xl font-bold tabular-nums text-[var(--color-text-primary)]">
                          {pkg.tokenAmount.toLocaleString(locale)}
                        </span>
                        <span className="text-sm text-[var(--color-text-secondary)]">
                          {t('tokensSuffix')}
                        </span>
                      </div>
                      {pkg.bonusTokens > 0 && (
                        <div className="flex items-center gap-1 text-xs text-[var(--color-success)] mb-3">
                          <Sparkles size={11} />
                          {t('bonusTokens', {
                            count: pkg.bonusTokens.toLocaleString(locale),
                          })}
                        </div>
                      )}
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <p className="text-lg font-bold text-[var(--color-text-primary)] mb-3">
                        {formatPrice(pkg, locale)}
                      </p>
                      <button
                        type="button"
                        disabled={!canPurchase || isLoading}
                        onClick={() => onBuy(pkg)}
                        className={cn(
                          'w-full py-2 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
                          pkg.isPopular
                            ? 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white'
                            : 'border border-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-white/20',
                        )}
                      >
                        {isLoading && (
                          <Loader2 size={14} className="animate-spin" />
                        )}
                        {!paymentsEnabled
                          ? t('statusPending')
                          : canPurchase
                            ? t('purchase')
                            : t('noPermissionShort')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {error && (
            <p className="mt-4 text-sm text-[var(--color-error)]">{error}</p>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            {t('purchaseHistoryTitle')}
          </h2>
          <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-[var(--color-sidebar)]/50">
                  <th className="px-6 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    {t('tableDate')}
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    {t('tablePackage')}
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    {t('tableTokens')}
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    {t('tableAmount')}
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    {t('tableStatus')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {purchases.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-10 text-center text-sm text-[var(--color-text-secondary)]"
                    >
                      {t('noPurchases')}
                    </td>
                  </tr>
                ) : (
                  purchases.map((p) => {
                    const Icon = STATUS_ICONS[p.status];
                    const total = p.tokenAmount + (p.bonusTokens ?? 0);
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)]">
                          {p.createdAt
                            ? new Date(p.createdAt).toLocaleDateString(locale, {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-[var(--color-text-primary)]">
                          {p.packageName}
                        </td>
                        <td className="px-6 py-4 text-sm tabular-nums text-[var(--color-text-primary)]">
                          {total.toLocaleString(locale)}
                        </td>
                        <td className="px-6 py-4 text-sm tabular-nums text-[var(--color-text-primary)]">
                          {CURRENCY_SYMBOL[p.currency]}
                          {p.price.toLocaleString(locale)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              'flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-md text-xs font-medium border',
                              STATUS_CLASSES[p.status],
                            )}
                          >
                            <Icon size={11} /> {statusLabels[p.status]}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {purchases.length > 0 && (
            <button
              type="button"
              onClick={() => router.refresh()}
              className="mt-3 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              {t('refresh')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
