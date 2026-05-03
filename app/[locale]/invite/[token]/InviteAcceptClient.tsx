'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Loader2,
  LogIn,
  Sparkles,
} from 'lucide-react';
import { acceptInvitationAction } from '@/lib/actions/organizations';
import { useAuth } from '@/lib/auth/AuthProvider';

interface Preview {
  orgId: string;
  orgName: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string | null;
}

interface Props {
  locale: string;
  token: string;
  preview: Preview | null;
  currentUserEmail: string | null;
  currentUserUid: string | null;
}

export default function InviteAcceptClient({
  locale,
  token,
  preview,
  currentUserEmail,
  currentUserUid,
}: Props) {
  const router = useRouter();
  const { refreshClaims } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Token isn't valid at all.
  if (!preview) {
    return (
      <Centered>
        <Header bad>Davet bulunamadı</Header>
        <p className="text-sm text-[var(--color-text-secondary)] text-center">
          Bu davet bağlantısı geçersiz, iptal edilmiş veya süresi dolmuş olabilir.
          Lütfen seni davet eden kişiden yeni bir bağlantı iste.
        </p>
        <Link
          href={`/${locale}`}
          className="mt-4 inline-flex justify-center px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Ana sayfaya dön
        </Link>
      </Centered>
    );
  }

  const expired =
    preview.status === 'expired' ||
    (preview.expiresAt && new Date(preview.expiresAt) < new Date());
  const consumed = preview.status === 'accepted' || preview.status === 'revoked';

  if (expired) {
    return (
      <Centered>
        <Header bad>Davet süresi dolmuş</Header>
        <Subtitle org={preview.orgName} email={preview.email} role={preview.role} />
        <p className="text-sm text-[var(--color-text-secondary)] text-center mt-2">
          Bu davet artık geçerli değil. Davet eden kişiden yeni bir davet iste.
        </p>
      </Centered>
    );
  }
  if (consumed) {
    return (
      <Centered>
        <Header bad>Bu davet artık kullanılamaz</Header>
        <Subtitle org={preview.orgName} email={preview.email} role={preview.role} />
        <p className="text-sm text-[var(--color-text-secondary)] text-center mt-2">
          Davet daha önce {preview.status === 'accepted' ? 'kabul edildi' : 'iptal edildi'}.
        </p>
      </Centered>
    );
  }

  // Visitor isn't signed in — send them to login with a return URL that
  // brings them back here.
  if (!currentUserUid) {
    return (
      <Centered>
        <Header>Sana bir kurum daveti var</Header>
        <Subtitle org={preview.orgName} email={preview.email} role={preview.role} />
        <p className="text-sm text-[var(--color-text-secondary)] text-center my-4">
          Daveti kabul etmek için önce <strong>{preview.email}</strong> adresiyle giriş yap.
          Hesabın yoksa kayıt sayfasından bir hesap oluşturabilirsin.
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/invite/${token}`)}`}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <LogIn size={14} /> Giriş yap
          </Link>
          <Link
            href={`/${locale}/register?next=${encodeURIComponent(`/${locale}/invite/${token}`)}`}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-white/10 text-[var(--color-text-primary)] text-sm font-semibold rounded-xl hover:border-white/20 transition-colors"
          >
            Hesap oluştur
          </Link>
        </div>
      </Centered>
    );
  }

  // Signed in but with the wrong account.
  if (currentUserEmail?.toLowerCase() !== preview.email.toLowerCase()) {
    return (
      <Centered>
        <Header bad>Yanlış hesapla giriş yapılmış</Header>
        <Subtitle org={preview.orgName} email={preview.email} role={preview.role} />
        <p className="text-sm text-[var(--color-text-secondary)] text-center my-4">
          Şu an <strong>{currentUserEmail}</strong> ile giriş yapılmış, ancak davet{' '}
          <strong>{preview.email}</strong> adresine gönderilmiş. Doğru hesapla giriş
          yapıp tekrar dene.
        </p>
        <Link
          href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/invite/${token}`)}`}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <LogIn size={14} /> Hesap değiştir
        </Link>
      </Centered>
    );
  }

  const onAccept = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await acceptInvitationAction({ token });
        // claims now include the new orgId; refresh ID token + session cookie
        // so the dashboard sees it without a sign-out / sign-in cycle.
        await refreshClaims();
        router.push(`/${locale}/organizations/${result.orgId}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Davet kabul edilemedi.');
      }
    });
  };

  return (
    <Centered>
      <Header>Sana bir kurum daveti var</Header>
      <Subtitle org={preview.orgName} email={preview.email} role={preview.role} />
      <p className="text-sm text-[var(--color-text-secondary)] text-center my-4">
        Davete katılmak için aşağıdaki butona bas. {preview.orgName} adına proje
        açabilir, ortak token havuzunu kullanabilir, kuruma özel proje türlerini
        görebilirsin.
      </p>
      {error && (
        <div className="mb-3 bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-xl px-4 py-3 text-sm text-[var(--color-error)]">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={onAccept}
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Sparkles size={14} />
        )}
        Daveti kabul et
      </button>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] px-4">
      <div className="w-full max-w-md bg-[var(--color-card)] rounded-2xl border border-white/5 p-8 flex flex-col">
        {children}
      </div>
    </div>
  );
}

function Header({
  bad,
  children,
}: {
  bad?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center mb-4">
      <div
        className={
          'w-14 h-14 rounded-2xl border flex items-center justify-center mb-3 ' +
          (bad
            ? 'bg-[var(--color-error)]/10 border-[var(--color-error)]/20'
            : 'bg-[var(--color-accent)]/15 border-[var(--color-accent)]/30')
        }
      >
        {bad ? (
          <AlertTriangle size={26} className="text-[var(--color-error)]" />
        ) : (
          <Building2 size={26} className="text-[var(--color-accent)]" />
        )}
      </div>
      <h1 className="text-xl font-bold text-[var(--color-text-primary)] text-center">
        {children}
      </h1>
    </div>
  );
}

function Subtitle({
  org,
  email,
  role,
}: {
  org: string;
  email: string;
  role: string;
}) {
  return (
    <p className="text-sm text-[var(--color-text-secondary)] text-center">
      <strong className="text-[var(--color-text-primary)]">{org}</strong>
      {' · '}
      <span className="font-mono">{email}</span>
      {' · '}
      <span className="inline-flex items-center gap-1">
        <CheckCircle2 size={12} className="text-[var(--color-accent)]" /> {roleLabel(role)}
      </span>
    </p>
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
