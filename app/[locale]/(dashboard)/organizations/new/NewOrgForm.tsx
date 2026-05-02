'use client';

import { type FormEvent, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Loader2 } from 'lucide-react';
import { createOrgAction } from '@/lib/actions/organizations';
import { useAuth } from '@/lib/auth/AuthProvider';

export default function NewOrgForm({ locale }: { locale: string }) {
  const router = useRouter();
  const { refreshClaims } = useAuth();
  const [name, setName] = useState('');
  const [country, setCountry] = useState('TR');
  const [vatNumber, setVatNumber] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError('Kurum adı en az 2 karakter olmalı.');
      return;
    }
    startTransition(async () => {
      try {
        const { id } = await createOrgAction({
          name: name.trim(),
          country: country.trim() || undefined,
          vatNumber: vatNumber.trim() || undefined,
          billingEmail: billingEmail.trim() || undefined,
        });
        // syncOrgClaims has already updated the user's custom claims server-
        // side; refreshClaims forces the ID token + session cookie to roll so
        // org-only project types and the new orgIds appear immediately.
        await refreshClaims();
        router.replace(`/${locale}/organizations/${id}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Kurum oluşturulamadı.');
      }
    });
  };

  return (
    <div className="min-h-full pb-12">
      <header className="px-8 py-5 border-b border-white/5 flex items-center gap-4">
        <Link
          href={`/${locale}/organizations`}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
        >
          <ArrowLeft size={18} className="text-[var(--color-text-secondary)]" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
            Yeni kurum
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Kurumun adını ve fatura bilgilerini gir.
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-8 py-8 max-w-2xl mx-auto space-y-6">
        <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-6 space-y-5">
          <div className="flex items-start gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center shrink-0">
              <Building2 size={20} className="text-[var(--color-accent)]" />
            </div>
            <div>
              <p className="text-base font-semibold text-[var(--color-text-primary)]">
                Kurum bilgileri
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                Kurum açıldıktan sonra ekip üyelerini davet edebilir, ortak token
                havuzu üzerinden proje yazabilirsin.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
              Kurum adı *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Örn: Yenilik Atölyesi A.Ş."
              className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                Ülke kodu
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase())}
                maxLength={3}
                placeholder="TR"
                className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                Vergi / VAT no
              </label>
              <input
                type="text"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
                placeholder="opsiyonel"
                className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all"
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
              placeholder="opsiyonel — boşsa kendi e-postan kullanılır"
              className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all"
            />
          </div>
        </div>

        {error && (
          <div className="bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-xl px-4 py-3 text-sm text-[var(--color-error)]">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending || name.trim().length < 2}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            Kurumu oluştur
          </button>
        </div>
      </form>
    </div>
  );
}
