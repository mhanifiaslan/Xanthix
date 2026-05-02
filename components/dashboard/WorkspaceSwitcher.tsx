'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Check,
  ChevronDown,
  LogOut,
  Plus,
  Settings,
  User,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { setActiveWorkspaceAction } from '@/lib/actions/workspace';

export interface WorkspaceOption {
  kind: 'org';
  orgId: string;
  name: string;
  role?: string;
  memberCount?: number;
}

export interface WorkspaceSwitcherProps {
  active:
    | { kind: 'personal' }
    | { kind: 'org'; orgId: string; orgName: string };
  orgs: WorkspaceOption[];
  locale: string;
}

/**
 * Canva-style workspace dropdown. Header tile shows the active workspace; the
 * panel that opens lists Accounts (the user) + Teams (each org), plus quick
 * links to settings and sign out.
 */
export default function WorkspaceSwitcher({
  active,
  orgs,
  locale,
}: WorkspaceSwitcherProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click / escape so the dropdown behaves like a popover.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const switchTo = (target: { kind: 'personal' } | { kind: 'org'; orgId: string }) => {
    const key = target.kind === 'personal' ? 'personal' : `org:${target.orgId}`;
    setPendingKey(key);
    startTransition(async () => {
      try {
        await setActiveWorkspaceAction(target);
        setOpen(false);
        router.refresh();
      } finally {
        setPendingKey(null);
      }
    });
  };

  const handleSignOut = async () => {
    await signOut();
    router.push(`/${locale}/login`);
  };

  const initial = (user?.name ?? user?.email ?? '?').slice(0, 1).toUpperCase();
  const activeIsPersonal = active.kind === 'personal';

  return (
    <div ref={containerRef} className="relative px-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-[var(--color-card)] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          {activeIsPersonal ? (
            user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt={user.name ?? user.email ?? ''}
                className="w-9 h-9 rounded-lg object-cover border border-white/10 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30 flex items-center justify-center text-sm font-bold text-[var(--color-accent)] shrink-0">
                {initial}
              </div>
            )
          ) : (
            <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-300 shrink-0">
              {(active.orgName ?? '?').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate text-left">
              {activeIsPersonal
                ? (user?.name ?? user?.email?.split('@')[0] ?? 'Hesabım')
                : active.orgName}
            </span>
            <span className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider">
              {activeIsPersonal ? 'Kişisel' : 'Kurum'}
            </span>
          </div>
        </div>
        <ChevronDown
          size={14}
          className={
            'text-[var(--color-text-secondary)] transition-transform shrink-0 ' +
            (open ? 'rotate-180' : '')
          }
        />
      </button>

      {open && (
        <div className="absolute left-2 right-2 top-full mt-2 z-30 rounded-xl border border-white/10 bg-[var(--color-card)] shadow-xl overflow-hidden">
          <SectionLabel>Hesap</SectionLabel>
          <Row
            active={activeIsPersonal}
            pending={pendingKey === 'personal'}
            onClick={() => switchTo({ kind: 'personal' })}
            icon={
              user?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt=""
                  className="w-8 h-8 rounded-md object-cover border border-white/10"
                />
              ) : (
                <div className="w-8 h-8 rounded-md bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30 flex items-center justify-center text-xs font-bold text-[var(--color-accent)]">
                  {initial}
                </div>
              )
            }
            title={user?.name ?? user?.email?.split('@')[0] ?? 'Kişisel'}
            subtitle={user?.email ?? 'Kişisel hesap'}
          />

          {orgs.length > 0 && <Divider />}
          {orgs.length > 0 && <SectionLabel>Kurumlar</SectionLabel>}
          {orgs.map((o) => (
            <Row
              key={o.orgId}
              active={!activeIsPersonal && active.orgId === o.orgId}
              pending={pendingKey === `org:${o.orgId}`}
              onClick={() => switchTo({ kind: 'org', orgId: o.orgId })}
              icon={
                <div className="w-8 h-8 rounded-md bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-300">
                  {o.name.slice(0, 2).toUpperCase()}
                </div>
              }
              title={o.name}
              subtitle={
                o.role
                  ? `${roleLabel(o.role)}${o.memberCount ? ` · ${o.memberCount} üye` : ''}`
                  : 'Kurum'
              }
            />
          ))}

          <Divider />
          <LinkRow
            href={`/${locale}/organizations/new`}
            onClick={() => setOpen(false)}
            icon={<Plus size={15} />}
            label="Yeni kurum"
          />
          <LinkRow
            href={`/${locale}/organizations`}
            onClick={() => setOpen(false)}
            icon={<Building2 size={15} />}
            label="Kurumlarımı yönet"
          />
          <LinkRow
            href={`/${locale}/settings`}
            onClick={() => setOpen(false)}
            icon={<Settings size={15} />}
            label="Hesap ayarları"
          />
          <Divider />
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors"
          >
            <LogOut size={15} />
            Çıkış yap
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Subcomponents --------------------------------------------------------

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

function Row({
  active,
  pending,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  pending: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={active || pending}
      className={
        'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ' +
        (active
          ? 'bg-[var(--color-accent)]/10'
          : 'hover:bg-white/5')
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
          geçiliyor…
        </span>
      )}
    </button>
  );
}

function LinkRow({
  href,
  onClick,
  icon,
  label,
}: {
  href: string;
  onClick?: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    owner: 'Sahip',
    admin: 'Admin',
    editor: 'Editör',
    viewer: 'İzleyici',
  };
  return map[role] ?? role;
}
