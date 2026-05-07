'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  useRouter as useIntlRouter,
  usePathname as useIntlPathname,
} from '@/i18n/navigation';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  Building2,
  Check,
  ChevronUp,
  CreditCard,
  Globe,
  LogOut,
  Plus,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { routing } from '@/i18n/routing';
import { setActiveWorkspaceAction } from '@/lib/actions/workspace';

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  tr: 'Türkçe',
  es: 'Español',
};

export interface OrgWorkspaceOption {
  kind: 'org';
  orgId: string;
  name: string;
  role?: string;
  memberCount?: number;
}

type ActiveWorkspace =
  | { kind: 'personal' }
  | { kind: 'org'; orgId: string; orgName: string };

interface UserMenuCellProps {
  variant?: 'user' | 'admin';
  /** Active workspace; only relevant for the 'user' variant. */
  workspace?: ActiveWorkspace;
  /** Org workspaces the user belongs to; only relevant for the 'user' variant. */
  workspaceOrgs?: OrgWorkspaceOption[];
}

/**
 * The single sidebar menu cell. Lives at the bottom of the sidebar and is the
 * sole entry point for: workspace switching (personal / orgs), org management,
 * account settings, billing, language, and sign-out. There is no separate
 * workspace switcher anywhere else in the app.
 */
export default function UserMenuCell({
  variant = 'user',
  workspace,
  workspaceOrgs = [],
}: UserMenuCellProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const intlRouter = useIntlRouter();
  const intlPathname = useIntlPathname();
  const locale = useLocale();
  const t = useTranslations('userMenu');
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav.items');
  const tWorkspace = useTranslations('workspace');

  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setLangOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    router.push(`/${locale}/login`);
  };

  const handleLanguageChange = (newLocale: string) => {
    setLangOpen(false);
    setOpen(false);
    intlRouter.replace(intlPathname, { locale: newLocale });
  };

  const switchWorkspace = (target: { kind: 'personal' } | { kind: 'org'; orgId: string }) => {
    const key = target.kind === 'personal' ? 'personal' : `org:${target.orgId}`;
    setPendingKey(key);
    startTransition(async () => {
      try {
        await setActiveWorkspaceAction(target);
        setOpen(false);
        // Workspaces are different worlds; current page may not exist in the
        // new context. Send the user to the workspace home for safety.
        router.push(`/${locale}/home`);
        router.refresh();
      } finally {
        setPendingKey(null);
      }
    });
  };

  const initial = (user?.name ?? user?.email ?? '?').slice(0, 1).toUpperCase();
  const displayName = user?.name ?? user?.email?.split('@')[0] ?? t('fallbackName');
  const showWorkspaceSection = variant === 'user' && workspace !== undefined;
  const activeIsPersonal = workspace?.kind === 'personal';
  const contextLabel = (() => {
    if (variant === 'admin') return user?.email ?? '';
    if (!workspace) return user?.email ?? '';
    return workspace.kind === 'personal'
      ? tWorkspace('personal')
      : workspace.orgName;
  })();

  return (
    <div ref={containerRef} className="relative px-2 pb-2 pt-2 border-t border-white/5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-[var(--color-card)] transition-colors text-left"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {user?.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoURL}
            alt={user.name ?? user.email ?? ''}
            className="w-9 h-9 rounded-md object-cover border border-white/10 shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-md bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30 flex items-center justify-center text-sm font-bold text-[var(--color-accent)] shrink-0">
            {initial}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
            {displayName}
          </p>
          <p className="text-[11px] text-[var(--color-text-secondary)] truncate">
            {contextLabel}
          </p>
        </div>
        <ChevronUp
          size={14}
          className={
            'text-[var(--color-text-secondary)] transition-transform shrink-0 ' +
            (open ? '' : 'rotate-180')
          }
        />
      </button>

      {open && (
        <div className="absolute left-2 right-2 bottom-full mb-2 z-30 rounded-md border border-white/10 bg-[var(--color-card)] shadow-xl overflow-hidden">
          {/* Identity row — name, email */}
          <div className="px-3 py-3 border-b border-white/5">
            <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
              {displayName}
            </p>
            {user?.email && (
              <p className="text-[11px] text-[var(--color-text-secondary)] truncate">
                {user.email}
              </p>
            )}
          </div>

          {showWorkspaceSection && (
            <>
              <SectionLabel>{tWorkspace('accountLabel')}</SectionLabel>
              <WorkspaceRow
                active={activeIsPersonal === true}
                pending={pendingKey === 'personal'}
                onClick={() => switchWorkspace({ kind: 'personal' })}
                icon={
                  user?.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.photoURL}
                      alt=""
                      className="w-7 h-7 rounded-md object-cover border border-white/10"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-md bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30 flex items-center justify-center text-[11px] font-bold text-[var(--color-accent)]">
                      {initial}
                    </div>
                  )
                }
                title={displayName}
                subtitle={tWorkspace('personalAccount')}
                switchingLabel={tWorkspace('switching')}
              />

              {workspaceOrgs.length > 0 && (
                <>
                  <SectionLabel>{tWorkspace('organizationsLabel')}</SectionLabel>
                  {workspaceOrgs.map((o) => {
                    const isActive =
                      workspace?.kind === 'org' && workspace.orgId === o.orgId;
                    const subtitle = o.role
                      ? `${roleLabel(o.role, tWorkspace)}${o.memberCount ? ` · ${o.memberCount} ${tWorkspace('membersSuffix')}` : ''}`
                      : tWorkspace('organization');
                    return (
                      <WorkspaceRow
                        key={o.orgId}
                        active={isActive}
                        pending={pendingKey === `org:${o.orgId}`}
                        onClick={() => switchWorkspace({ kind: 'org', orgId: o.orgId })}
                        icon={
                          <div className="w-7 h-7 rounded-md bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-300">
                            {o.name.slice(0, 2).toUpperCase()}
                          </div>
                        }
                        title={o.name}
                        subtitle={subtitle}
                        switchingLabel={tWorkspace('switching')}
                      />
                    );
                  })}
                </>
              )}

              <Divider />
              <PopoverLink
                href={`/${locale}/organizations/new`}
                onSelect={() => setOpen(false)}
                icon={<Plus size={15} />}
                label={tWorkspace('newOrganization')}
              />
              <PopoverLink
                href={`/${locale}/organizations`}
                onSelect={() => setOpen(false)}
                icon={<Building2 size={15} />}
                label={tWorkspace('manageOrganizations')}
              />
              <Divider />
            </>
          )}

          <PopoverLink
            href={`/${locale}/settings`}
            onSelect={() => setOpen(false)}
            icon={<Settings size={15} />}
            label={tNav('settings')}
          />
          {variant === 'user' && (
            <PopoverLink
              href={`/${locale}/billing`}
              onSelect={() => setOpen(false)}
              icon={<CreditCard size={15} />}
              label={tNav('creditsBilling')}
            />
          )}

          <button
            type="button"
            onClick={() => setLangOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Globe size={15} />
              {t('language')}
            </span>
            <span className="text-[11px] uppercase tracking-wider opacity-70">
              {locale}
            </span>
          </button>
          {langOpen && (
            <div className="bg-black/30 border-t border-white/5">
              {routing.locales.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => handleLanguageChange(l)}
                  className="w-full flex items-center justify-between gap-2 pl-9 pr-3 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-colors"
                >
                  <span>{LANGUAGE_LABELS[l] ?? l}</span>
                  {locale === l && (
                    <Check size={13} className="text-[var(--color-accent)]" />
                  )}
                </button>
              ))}
            </div>
          )}

          <Divider />
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors"
          >
            <LogOut size={15} />
            {tCommon('signOut')}
          </button>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]/70">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="h-px bg-white/5 my-1" />;
}

function WorkspaceRow({
  active,
  pending,
  onClick,
  icon,
  title,
  subtitle,
  switchingLabel,
}: {
  active: boolean;
  pending: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  switchingLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={active || pending}
      className={
        'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ' +
        (active ? 'bg-[var(--color-accent)]/10' : 'hover:bg-white/5')
      }
    >
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
          {title}
        </p>
        <p className="text-xs text-[var(--color-text-secondary)] truncate">
          {subtitle}
        </p>
      </div>
      {active && <Check size={14} className="text-[var(--color-accent)] shrink-0" />}
      {pending && (
        <span className="text-[10px] text-[var(--color-text-secondary)] shrink-0">
          {switchingLabel}
        </span>
      )}
    </button>
  );
}

function PopoverLink({
  href,
  onSelect,
  icon,
  label,
}: {
  href: string;
  onSelect: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      onClick={onSelect}
      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}

function roleLabel(role: string, t: (key: string) => string): string {
  const known = ['owner', 'admin', 'editor', 'viewer'] as const;
  if ((known as readonly string[]).includes(role)) return t(`roles.${role}`);
  return role;
}
