'use client';

import { type FormEvent, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Copy,
  Crown,
  FolderGit2,
  Loader2,
  LogOut,
  Mail,
  Plus,
  Save,
  Shield,
  Trash2,
  UserCircle,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  changeMemberRoleAction,
  inviteOrgMemberAction,
  removeMemberAction,
  revokeInvitationAction,
  transferOwnershipAction,
  updateOrgAction,
} from '@/lib/actions/organizations';
import {
  ORG_MANAGER_ROLES,
  ORG_ROLES,
  type OrgRole,
} from '@/types/organization';
import { useAuth } from '@/lib/auth/AuthProvider';

interface OrgView {
  id: string;
  name: string;
  country: string | null;
  vatNumber: string | null;
  billingEmail: string | null;
  subscriptionTier: string;
  seatLimit: number;
  tokenBalance: number;
  ownerUid: string;
}

interface MemberView {
  uid: string;
  email: string | null;
  name: string | null;
  role: OrgRole;
}

interface ProjectView {
  id: string;
  title: string;
  status:
    | 'draft'
    | 'generating'
    | 'paused'
    | 'ready'
    | 'failed'
    | 'archived';
  currentSectionIndex: number;
  totalSections: number;
  tokensSpent: number;
  projectTypeSlug: string;
}

interface InvitationView {
  id: string;
  email: string;
  role: OrgRole;
  token: string;
  acceptUrl: string;
  expiresAt: string | null;
}

function useRoleLabels(): Record<OrgRole, string> {
  const t = useTranslations('workspace.roles');
  return {
    owner: t('owner'),
    admin: t('admin'),
    editor: t('editor'),
    viewer: t('viewer'),
  };
}

export default function OrgDetail({
  locale,
  org,
  members,
  projects,
  invitations,
  myUid,
  myRole,
}: {
  locale: string;
  org: OrgView;
  members: MemberView[];
  projects: ProjectView[];
  invitations: InvitationView[];
  myUid: string;
  myRole: OrgRole;
}) {
  const router = useRouter();
  const t = useTranslations('orgDetail');
  const isManager = (ORG_MANAGER_ROLES as readonly OrgRole[]).includes(myRole);
  const isOwner = myRole === 'owner';

  const [tab, setTab] = useState<'members' | 'projects' | 'settings'>('members');

  return (
    <div className="min-h-full pb-12">
      <header className="px-8 py-5 border-b border-white/5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href={`/${locale}/organizations`}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
          >
            <ArrowLeft size={18} className="text-[var(--color-text-secondary)]" />
          </Link>
          <div className="w-11 h-11 rounded-xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center shrink-0">
            <Building2 size={20} className="text-[var(--color-accent)]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-[var(--color-text-primary)] truncate">
              {org.name}
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 flex items-center gap-2">
              <span>
                {org.country ?? '—'} · {org.subscriptionTier.toUpperCase()}
              </span>
              <span className="flex items-center gap-1">
                <Wallet size={11} className="text-[var(--color-accent)]" />
                {org.tokenBalance.toLocaleString(locale)} {t('tokensSuffix')}
              </span>
              <span className="flex items-center gap-1">
                <Users size={11} />
                {members.length} / {org.seatLimit}
              </span>
            </p>
          </div>
        </div>
      </header>

      <div className="px-8 max-w-4xl mx-auto mt-8">
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[var(--color-card)] border border-white/5 mb-6">
          <TabButton
            active={tab === 'members'}
            onClick={() => setTab('members')}
          >
            <Users size={14} /> {t('tabMembers')}
          </TabButton>
          <TabButton
            active={tab === 'projects'}
            onClick={() => setTab('projects')}
          >
            <FolderGit2 size={14} /> {t('tabProjects', { count: projects.length })}
          </TabButton>
          <TabButton
            active={tab === 'settings'}
            onClick={() => setTab('settings')}
          >
            <Building2 size={14} /> {t('tabSettings')}
          </TabButton>
        </div>

        {tab === 'members' && (
          <MembersTab
            org={org}
            members={members}
            invitations={invitations}
            myUid={myUid}
            isManager={isManager}
            isOwner={isOwner}
            onRefresh={() => router.refresh()}
            locale={locale}
          />
        )}
        {tab === 'projects' && (
          <ProjectsTab projects={projects} locale={locale} />
        )}
        {tab === 'settings' && <SettingsTab org={org} canEdit={isManager} />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ' +
        (active
          ? 'bg-[var(--color-background)] text-[var(--color-text-primary)] shadow-sm'
          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]')
      }
    >
      {children}
    </button>
  );
}

function ProjectsTab({
  projects,
  locale,
}: {
  projects: ProjectView[];
  locale: string;
}) {
  const t = useTranslations('orgDetail');
  const tProjects = useTranslations('projects');

  if (projects.length === 0) {
    return (
      <div className="bg-[var(--color-card)] rounded-2xl border border-dashed border-white/10 p-8 text-center">
        <p className="text-sm text-[var(--color-text-primary)] font-medium mb-1">
          {t('noProjectsTitle')}
        </p>
        <p className="text-xs text-[var(--color-text-secondary)]">
          {t('noProjectsBody')}
        </p>
      </div>
    );
  }

  const STATUS: Record<ProjectView['status'], string> = {
    draft: tProjects('statusDraft'),
    generating: tProjects('statusGenerating'),
    paused: tProjects('statusPaused'),
    ready: tProjects('statusReady'),
    failed: tProjects('statusFailed'),
    archived: tProjects('statusArchived'),
  };

  return (
    <ul className="space-y-2">
      {projects.map((p) => {
        const progress =
          p.totalSections === 0
            ? 0
            : Math.round((p.currentSectionIndex / p.totalSections) * 100);
        return (
          <li key={p.id}>
            <Link
              href={`/${locale}/projects/${p.id}`}
              className="block bg-[var(--color-card)] rounded-2xl border border-white/5 hover:border-[var(--color-accent)]/30 p-4 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider">
                    {STATUS[p.status]}
                  </p>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate mt-0.5">
                    {p.title}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    {p.projectTypeSlug} ·{' '}
                    {p.tokensSpent.toLocaleString(locale)} {t('tokensSpent')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-[var(--color-text-secondary)] mb-1">
                    {p.currentSectionIndex} / {p.totalSections}
                  </p>
                  <div className="w-28 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-accent)]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function MembersTab({
  org,
  members,
  invitations,
  myUid,
  isManager,
  isOwner,
  onRefresh,
  locale,
}: {
  org: OrgView;
  members: MemberView[];
  invitations: InvitationView[];
  myUid: string;
  isManager: boolean;
  isOwner: boolean;
  onRefresh: () => void;
  locale: string;
}) {
  const t = useTranslations('orgDetail');
  const roleLabels = useRoleLabels();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('editor');
  const [error, setError] = useState<string | null>(null);
  const [latestInvite, setLatestInvite] = useState<{
    email: string;
    acceptUrl: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const submitInvite = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLatestInvite(null);
    startTransition(async () => {
      try {
        const result = await inviteOrgMemberAction({
          orgId: org.id,
          email: inviteEmail.trim(),
          role: inviteRole,
        });
        if (result.kind === 'invited' && result.acceptUrl) {
          setLatestInvite({
            email: inviteEmail.trim(),
            acceptUrl: result.acceptUrl,
          });
        }
        setInviteEmail('');
        setShowInvite(false);
        onRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : t('inviteFailed'));
      }
    });
  };

  return (
    <div className="space-y-4">
      {isManager && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--color-text-secondary)]">
            {t('seatsUsed', { used: members.length, total: org.seatLimit })}
          </p>
          <button
            type="button"
            onClick={() => setShowInvite((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Plus size={14} /> {t('inviteMember')}
          </button>
        </div>
      )}

      {showInvite && isManager && (
        <form
          onSubmit={submitInvite}
          className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-accent)]/20 p-5 space-y-3"
        >
          <p className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <Mail size={14} className="text-[var(--color-accent)]" /> {t('inviteFormTitle')}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {t('inviteFormBody')}
          </p>
          <div className="grid grid-cols-[1fr_180px] gap-3">
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder={t('inviteEmailPlaceholder')}
              className="bg-[var(--color-background)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as OrgRole)}
              className="bg-[var(--color-background)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
            >
              {ORG_ROLES.filter((r) => r !== 'owner').map((r) => (
                <option key={r} value={r}>
                  {roleLabels[r]}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p className="text-xs text-[var(--color-error)]">{error}</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowInvite(false);
                setError(null);
              }}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-white/20 transition-colors"
            >
              {t('inviteCancel')}
            </button>
            <button
              type="submit"
              disabled={isPending || !inviteEmail.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              {t('inviteAdd')}
            </button>
          </div>
        </form>
      )}

      {latestInvite && (
        <LatestInviteBanner
          email={latestInvite.email}
          url={latestInvite.acceptUrl}
          onDismiss={() => setLatestInvite(null)}
        />
      )}

      <ul className="space-y-2">
        {members.map((m) => (
          <MemberRow
            key={m.uid}
            member={m}
            org={org}
            myUid={myUid}
            isManager={isManager}
            isOwner={isOwner}
            onRefresh={onRefresh}
            locale={locale}
          />
        ))}
      </ul>

      {invitations.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider px-1">
            {t('pendingInvitations', { count: invitations.length })}
          </p>
          <ul className="space-y-2">
            {invitations.map((inv) => (
              <PendingInvitationRow
                key={inv.id}
                invitation={inv}
                org={org}
                isManager={isManager}
                onRefresh={onRefresh}
                locale={locale}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function LatestInviteBanner({
  email,
  url,
  onDismiss,
}: {
  email: string;
  url: string;
  onDismiss: () => void;
}) {
  const t = useTranslations('orgDetail');
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };
  return (
    <div className="bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-2">
          <Mail size={16} className="text-[var(--color-accent)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              {t('inviteSentTitle')}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              {t('inviteSentBody', { email })}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] shrink-0"
          aria-label={t('closeButton')}
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex gap-2 items-center mt-3">
        <input
          type="text"
          readOnly
          value={url}
          className="flex-1 bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-[var(--color-text-secondary)]"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white transition-colors"
        >
          {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
          {copied ? t('copied') : t('copy')}
        </button>
      </div>
    </div>
  );
}

function PendingInvitationRow({
  invitation,
  org,
  isManager,
  onRefresh,
  locale,
}: {
  invitation: InvitationView;
  org: OrgView;
  isManager: boolean;
  onRefresh: () => void;
  locale: string;
}) {
  const t = useTranslations('orgDetail');
  const roleLabels = useRoleLabels();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invitation.acceptUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const onRevoke = () => {
    if (!confirm(t('confirmRevoke', { email: invitation.email }))) return;
    setError(null);
    startTransition(async () => {
      try {
        await revokeInvitationAction({
          orgId: org.id,
          invitationId: invitation.id,
        });
        onRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : t('revokeFailed'));
      }
    });
  };

  const expiresLabel = invitation.expiresAt
    ? new Date(invitation.expiresAt).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      })
    : '—';

  return (
    <li className="bg-[var(--color-card)] rounded-2xl border border-dashed border-white/10 p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          <Mail size={14} className="text-[var(--color-text-secondary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
            {invitation.email}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            {t('invitationStatus', {
              role: roleLabels[invitation.role],
              date: expiresLabel,
            })}
          </p>
          {error && (
            <p className="text-xs text-[var(--color-error)] mt-1">{error}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={copy}
            disabled={isPending}
            title={t('copyInviteLinkTitle')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-white/20 transition-colors"
          >
            {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
            {copied ? t('linkCopied') : t('copyLink')}
          </button>
          {isManager && (
            <button
              type="button"
              onClick={onRevoke}
              disabled={isPending}
              title={t('revokeInviteTitle')}
              className="p-1.5 rounded-lg border border-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:border-[var(--color-error)]/30 transition-colors disabled:opacity-50"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function MemberRow({
  member,
  org,
  myUid,
  isManager,
  isOwner,
  onRefresh,
  locale,
}: {
  member: MemberView;
  org: OrgView;
  myUid: string;
  isManager: boolean;
  isOwner: boolean;
  onRefresh: () => void;
  locale: string;
}) {
  const router = useRouter();
  const { refreshClaims } = useAuth();
  const t = useTranslations('orgDetail');
  const roleLabels = useRoleLabels();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isMe = member.uid === myUid;
  const isThisOwner = member.role === 'owner';

  const onRoleChange = (next: OrgRole) => {
    setError(null);
    startTransition(async () => {
      try {
        await changeMemberRoleAction({
          orgId: org.id,
          uid: member.uid,
          role: next,
        });
        if (isMe) await refreshClaims();
        onRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : t('roleChangeFailed'));
      }
    });
  };

  const onRemove = () => {
    if (!confirm(isMe ? t('confirmLeave') : t('confirmRemoveMember'))) return;
    setError(null);
    startTransition(async () => {
      try {
        await removeMemberAction({ orgId: org.id, uid: member.uid });
        if (isMe) {
          await refreshClaims();
          router.replace(`/${locale}/organizations`);
        }
        onRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : t('removeMemberFailed'));
      }
    });
  };

  const onTransfer = () => {
    const target = member.email ?? member.name ?? member.uid;
    if (!confirm(t('confirmTransfer', { target }))) return;
    setError(null);
    startTransition(async () => {
      try {
        await transferOwnershipAction({ orgId: org.id, toUid: member.uid });
        await refreshClaims();
        onRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : t('transferFailed'));
      }
    });
  };

  return (
    <li className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 flex items-center justify-center text-xs font-bold text-[var(--color-accent)] shrink-0">
        {(member.name ?? member.email ?? '?').slice(0, 1).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
          {member.name ?? member.email ?? member.uid}
          {isMe && (
            <span className="ml-2 text-[10px] text-[var(--color-accent)]">
              {t('youSuffix')}
            </span>
          )}
        </p>
        <p className="text-xs text-[var(--color-text-secondary)] truncate">
          {member.email ?? '—'}
        </p>
        {error && <p className="text-xs text-[var(--color-error)] mt-1">{error}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isThisOwner ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--color-warning)]/15 text-[var(--color-warning)] border border-[var(--color-warning)]/30">
            <Crown size={11} /> {t('ownerBadge')}
          </span>
        ) : isManager && !isThisOwner ? (
          <select
            value={member.role}
            onChange={(e) => onRoleChange(e.target.value as OrgRole)}
            disabled={isPending}
            className="bg-[var(--color-background)] border border-white/10 rounded-lg px-2 py-1 text-xs text-[var(--color-text-primary)] focus:outline-none"
          >
            {ORG_ROLES.filter((r) => r !== 'owner').map((r) => (
              <option key={r} value={r}>
                {roleLabels[r]}
              </option>
            ))}
          </select>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/5 text-[var(--color-text-secondary)] border border-white/10">
            {member.role === 'admin' && <Shield size={11} />}
            {member.role === 'editor' && <UserCircle size={11} />}
            {roleLabels[member.role]}
          </span>
        )}

        {isOwner && !isThisOwner && (
          <button
            type="button"
            onClick={onTransfer}
            disabled={isPending}
            title={t('transferOwnershipTitle')}
            className="p-1.5 rounded-lg border border-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-warning)] hover:border-[var(--color-warning)]/30 transition-colors disabled:opacity-50"
          >
            <Crown size={13} />
          </button>
        )}

        {((isManager && !isThisOwner && !isMe) || (isMe && !isThisOwner)) && (
          <button
            type="button"
            onClick={onRemove}
            disabled={isPending}
            title={isMe ? t('leaveTitle') : t('removeMemberTitle')}
            className="p-1.5 rounded-lg border border-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:border-[var(--color-error)]/30 transition-colors disabled:opacity-50"
          >
            {isMe ? <LogOut size={13} /> : <Trash2 size={13} />}
          </button>
        )}
      </div>
    </li>
  );
}

function SettingsTab({ org, canEdit }: { org: OrgView; canEdit: boolean }) {
  const router = useRouter();
  const t = useTranslations('orgDetail');
  const [name, setName] = useState(org.name);
  const [country, setCountry] = useState(org.country ?? '');
  const [vatNumber, setVatNumber] = useState(org.vatNumber ?? '');
  const [billingEmail, setBillingEmail] = useState(org.billingEmail ?? '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        await updateOrgAction({
          orgId: org.id,
          name: name.trim(),
          country: country.trim() || null,
          vatNumber: vatNumber.trim() || null,
          billingEmail: billingEmail.trim() || null,
        });
        setSuccess(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : t('saveFailed'));
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-5 space-y-4">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
          {t('settingsInfoTitle')}
        </p>

        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
            {t('settingsName')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
            className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all disabled:opacity-60"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
              {t('settingsCountry')}
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
              disabled={!canEdit}
              maxLength={3}
              className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
              {t('settingsVat')}
            </label>
            <input
              type="text"
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              disabled={!canEdit}
              className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all disabled:opacity-60"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
            {t('settingsBillingEmail')}
          </label>
          <input
            type="email"
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value)}
            disabled={!canEdit}
            className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all disabled:opacity-60"
          />
        </div>
      </div>

      {error && (
        <div className="bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-xl px-4 py-3 text-sm text-[var(--color-error)]">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 rounded-xl px-4 py-3 text-sm text-[var(--color-success)]">
          {t('saveSuccess')}
        </div>
      )}

      {canEdit && (
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {t('saveButton')}
          </button>
        </div>
      )}
    </form>
  );
}
