import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Building2, Plus, Users, Wallet } from 'lucide-react';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { getServerSession } from '@/lib/server/getServerSession';
import { listOrgsForUser } from '@/lib/server/organizations';
import { routing } from '@/i18n/routing';

export const dynamic = 'force-dynamic';

export default async function OrganizationsListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await getServerSession();
  if (!session) redirect(`/${locale}/login`);

  const orgs = await listOrgsForUser(session.uid);

  return (
    <div className="min-h-full pb-12">
      <header className="flex items-center justify-between py-6 px-8 bg-[var(--color-background)] sticky top-0 z-10 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 flex items-center justify-center">
            <Building2 size={18} className="text-[var(--color-accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
              Kurumlarım
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {orgs.length} kurum
            </p>
          </div>
        </div>
        <Link
          href={`/${locale}/organizations/new`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus size={15} /> Yeni kurum
        </Link>
      </header>

      <main className="px-8 max-w-5xl mx-auto mt-8">
        {orgs.length === 0 ? (
          <div className="bg-[var(--color-card)] rounded-2xl border border-dashed border-white/10 p-10 text-center">
            <Building2
              size={36}
              className="mx-auto mb-4 text-[var(--color-text-secondary)]"
            />
            <p className="text-sm text-[var(--color-text-primary)] font-medium mb-1">
              Henüz bir kuruma üye değilsin
            </p>
            <p className="text-sm text-[var(--color-text-secondary)] mb-5">
              Kurum açtığında ekip üyelerini davet edip ortak proje yazabilirsin.
              Kuruma özel proje türleri sadece kurum üyelerine görünür.
            </p>
            <Link
              href={`/${locale}/organizations/new`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Plus size={15} /> Kurum oluştur
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orgs.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/${locale}/organizations/${o.id}`}
                  className="block bg-[var(--color-card)] rounded-2xl border border-white/5 hover:border-[var(--color-accent)]/30 p-5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center shrink-0">
                        <Building2 size={20} className="text-[var(--color-accent)]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-[var(--color-text-primary)] truncate">
                          {o.name}
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                          {o.country ?? '—'} ·{' '}
                          {o.subscriptionTier.toUpperCase()} ·{' '}
                          {o.seatLimit} koltuk
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                    <span className="flex items-center gap-1.5">
                      <Wallet size={12} className="text-[var(--color-accent)]" />
                      {o.tokenBalance.toLocaleString(locale)} token
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users size={12} />
                      üye listesi →
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
