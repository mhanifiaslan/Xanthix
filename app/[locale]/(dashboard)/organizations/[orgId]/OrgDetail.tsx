'use client';

import { type FormEvent, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
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
} from 'lucide-react';
import {
  changeMemberRoleAction,
  inviteOrgMemberAction,
  removeMemberAction,
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

const ROLE_LABEL: Record<OrgRole, string> = {
  owner: 'Sahip',
  admin: 'Admin',
  editor: 'Editör',
  viewer: 'İzleyici',
};

export default function OrgDetail({
  locale,
  org,
  members,
  projects,
  myUid,
  myRole,
}: {
  locale: string;
  org: OrgView;
  members: MemberView[];
  projects: ProjectView[];
  myUid: string;
  myRole: OrgRole;
}) {
  const router = useRouter();
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
                {org.tokenBalance.toLocaleString(locale)} token
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
            <Users size={14} /> Üyeler
          </TabButton>
          <TabButton
            active={tab === 'projects'}
            onClick={() => setTab('projects')}
          >
            <FolderGit2 size={14} /> Projeler ({projects.length})
          </TabButton>
          <TabButton
            active={tab === 'settings'}
            onClick={() => setTab('settings')}
          >
            <Building2 size={14} /> Ayarlar
          </TabButton>
        </div>

        {tab === 'members' && (
          <MembersTab
            org={org}
            members={members}
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
  if (projects.length === 0) {
    return (
      <div className="bg-[var(--color-card)] rounded-2xl border border-dashed border-white/10 p-8 text-center">
        <p className="text-sm text-[var(--color-text-primary)] font-medium mb-1">
          Bu kurumda henüz proje yok
        </p>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Yeni proje açarken bağlam olarak bu kurumu seçen üyelerin projeleri
          burada görünür.
        </p>
      </div>
    );
  }

  const STATUS: Record<ProjectView['status'], string> = {
    draft: 'Taslak',
    generating: 'Üretiliyor',
    paused: 'Duraklatıldı',
    ready: 'Hazır',
    failed: 'Başarısız',
    archived: 'Arşivli',
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
                    {p.tokensSpent.toLocaleString(locale)} token harcandı
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

// ----- Members tab ----------------------------------------------------------

function MembersTab({
  org,
  members,
  myUid,
  isManager,
  isOwner,
  onRefresh,
  locale,
}: {
  org: OrgView;
  members: MemberView[];
  myUid: string;
  isManager: boolean;
  isOwner: boolean;
  onRefresh: () => void;
  locale: string;
}) {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('editor');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submitInvite = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await inviteOrgMemberAction({
          orgId: org.id,
          email: inviteEmail.trim(),
          role: inviteRole,
        });
        setInviteEmail('');
        setShowInvite(false);
        onRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Davet başarısız.');
      }
    });
  };

  return (
    <div className="space-y-4">
      {isManager && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--color-text-secondary)]">
            {members.length} / {org.seatLimit} koltuk kullanılıyor
          </p>
          <button
            type="button"
            onClick={() => setShowInvite((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Plus size={14} /> Üye davet et
          </button>
        </div>
      )}

      {showInvite && isManager && (
        <form
          onSubmit={submitInvite}
          className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-accent)]/20 p-5 space-y-3"
        >
          <p className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <Mail size={14} className="text-[var(--color-accent)]" /> Davet
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            E-postası kullanılacak kişi sistemde kayıtlı olmalı. Yeni kullanıcılar
            için davet linki ileride eklenecek.
          </p>
          <div className="grid grid-cols-[1fr_180px] gap-3">
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="ornek@firma.com"
              className="bg-[var(--color-background)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as OrgRole)}
              className="bg-[var(--color-background)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
            >
              {ORG_ROLES.filter((r) => r !== 'owner').map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
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
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={isPending || !inviteEmail.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Ekle
            </button>
          </div>
        </form>
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
    </div>
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
        setError(err instanceof Error ? err.message : 'Rol değiştirilemedi.');
      }
    });
  };

  const onRemove = () => {
    if (!confirm(isMe ? 'Bu kurumdan ayrılmak istediğine emin misin?' : 'Üyeyi çıkarmak istediğine emin misin?'))
      return;
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
        setError(err instanceof Error ? err.message : 'Çıkarma başarısız.');
      }
    });
  };

  const onTransfer = () => {
    if (!confirm(`Sahipliği ${member.email ?? member.name ?? member.uid} kişisine devredilecek. Onayla?`))
      return;
    setError(null);
    startTransition(async () => {
      try {
        await transferOwnershipAction({ orgId: org.id, toUid: member.uid });
        await refreshClaims();
        onRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Devir başarısız.');
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
              (sen)
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
            <Crown size={11} /> Sahip
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
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/5 text-[var(--color-text-secondary)] border border-white/10">
            {member.role === 'admin' && <Shield size={11} />}
            {member.role === 'editor' && <UserCircle size={11} />}
            {ROLE_LABEL[member.role]}
          </span>
        )}

        {isOwner && !isThisOwner && (
          <button
            type="button"
            onClick={onTransfer}
            disabled={isPending}
            title="Sahipliği devret"
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
            title={isMe ? 'Ayrıl' : 'Üyeyi çıkar'}
            className="p-1.5 rounded-lg border border-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:border-[var(--color-error)]/30 transition-colors disabled:opacity-50"
          >
            {isMe ? <LogOut size={13} /> : <Trash2 size={13} />}
          </button>
        )}
      </div>
    </li>
  );
}

// ----- Settings tab ---------------------------------------------------------

function SettingsTab({ org, canEdit }: { org: OrgView; canEdit: boolean }) {
  const router = useRouter();
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
        setError(err instanceof Error ? err.message : 'Kaydedilemedi.');
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-5 space-y-4">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
          Kurum bilgileri
        </p>

        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
            Kurum adı
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
              Ülke
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
              Vergi / VAT
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
            Fatura e-postası
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
          Değişiklikler kaydedildi.
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
            Kaydet
          </button>
        </div>
      )}
    </form>
  );
}
