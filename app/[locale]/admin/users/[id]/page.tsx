'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowLeft, Ban, UserCheck, Plus, Minus,
  Mail, Calendar, FolderGit2, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminUserView {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  disabled: boolean;
  tokenBalance: number;
  projectCount: number;
  createdAt: string | null;
  lastSignInAt: string | null;
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('admin.userDetail');
  const uid = params.id as string;

  const [user, setUser] = useState<AdminUserView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((users: AdminUserView[]) => {
        setUser(users.find((u) => u.uid === uid) ?? null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--color-text-secondary)]">{t('loading')}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--color-text-secondary)]">{t('notFound')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-full pb-12">
      <header className="px-8 py-4 border-b border-white/5 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-[var(--color-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ArrowLeft size={17} />
        </button>
        <div className="flex items-center gap-4 flex-1">
          {user.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full border border-white/10 object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30 flex items-center justify-center text-sm font-bold text-[var(--color-accent)]">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-base font-bold text-[var(--color-text-primary)]">{user.displayName}</h1>
            <p className="text-xs text-[var(--color-text-secondary)]">{user.email}</p>
          </div>
          <span className={cn(
            'ml-2 text-xs font-medium px-2.5 py-1 rounded-full border',
            user.disabled
              ? 'text-[var(--color-error)] bg-[var(--color-error)]/10 border-[var(--color-error)]/20'
              : 'text-[var(--color-success)] bg-[var(--color-success)]/10 border-[var(--color-success)]/20'
          )}>
            {user.disabled ? t('statusDisabled') : t('statusActive')}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => alert(t('soonAddCredit'))}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 text-[var(--color-success)] hover:bg-[var(--color-success)]/20 transition-colors"
          >
            <Plus size={13} /> {t('addCreditsButton')}
          </button>
          <button
            onClick={() => alert(t('soonRemoveCredit'))}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 text-[var(--color-error)] hover:bg-[var(--color-error)]/20 transition-colors"
          >
            <Minus size={13} /> {t('removeCreditsButton')}
          </button>
          {user.disabled ? (
            <button
              onClick={() => alert(t('soonActivate'))}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-success)]/5 border border-[var(--color-success)]/20 text-[var(--color-success)] hover:bg-[var(--color-success)]/10 transition-colors"
            >
              <UserCheck size={13} /> {t('activateButton')}
            </button>
          ) : (
            <button
              onClick={() => alert(t('soonDisable'))}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-error)]/5 border border-[var(--color-error)]/20 text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors"
            >
              <Ban size={13} /> {t('disableButton')}
            </button>
          )}
        </div>
      </header>

      <div className="px-8 py-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="space-y-5">
            <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{t('accountInfoTitle')}</h2>
              {[
                { icon: Mail, label: t('fieldEmail'), value: user.email },
                { icon: Calendar, label: t('fieldRegisteredAt'), value: user.createdAt ? new Date(user.createdAt).toLocaleDateString(locale) : '—' },
                { icon: Clock, label: t('fieldLastLogin'), value: user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString(locale) : '—' },
                { icon: FolderGit2, label: t('fieldProjects'), value: t('projectCountSuffix', { count: user.projectCount }) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-background)] border border-white/5 flex items-center justify-center shrink-0">
                    <Icon size={14} className="text-[var(--color-accent)]" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-br from-[var(--color-accent)]/10 to-[var(--color-card)] rounded-2xl border border-[var(--color-accent)]/20 p-5">
              <p className="text-xs text-[var(--color-text-secondary)] mb-1">{t('tokenBalanceTitle')}</p>
              <p className="text-4xl font-bold tabular-nums text-[var(--color-text-primary)]">
                {user.tokenBalance.toLocaleString(locale)}
              </p>
            </div>
          </div>

          <div className="xl:col-span-2">
            <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-5">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">{t('uidTitle')}</h2>
              <p className="text-xs font-mono text-[var(--color-text-secondary)] break-all bg-[var(--color-background)] px-4 py-3 rounded-xl border border-white/5">
                {user.uid}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-4">
                {t('uidNote', {
                  purchases: 'purchases',
                  supportTickets: 'supportTickets',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
