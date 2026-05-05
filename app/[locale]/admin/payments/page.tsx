'use client';

import { useState, useEffect } from 'react';
import { Search, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminPaymentView {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  credits: number;
  packageName: string;
  status: string;
  createdAt: string | null;
}

const statusCfg: Record<string, { label: string; icon: React.ElementType; badge: string }> = {
  completed: { label: 'Başarılı', icon: CheckCircle2, badge: 'text-[var(--color-success)] bg-[var(--color-success)]/10 border-[var(--color-success)]/20' },
  failed:    { label: 'Başarısız', icon: XCircle,     badge: 'text-[var(--color-error)] bg-[var(--color-error)]/10 border-[var(--color-error)]/20' },
  refunded:  { label: 'İade',      icon: RefreshCw,   badge: 'text-[var(--color-warning)] bg-[var(--color-warning)]/10 border-[var(--color-warning)]/20' },
};

async function fetchPayments(): Promise<AdminPaymentView[]> {
  const res = await fetch('/api/admin/payments');
  if (!res.ok) throw new Error('Failed to fetch payments');
  return res.json();
}

export default function AdminPaymentsPage() {
  const [search, setSearch] = useState('');
  const [payments, setPayments] = useState<AdminPaymentView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments()
      .then(setPayments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = payments.filter((p) =>
    p.userEmail.toLowerCase().includes(search.toLowerCase()) ||
    p.packageName.toLowerCase().includes(search.toLowerCase()),
  );

  const completed = payments.filter((p) => p.status === 'completed');
  const totalRevenue = completed.reduce((s, p) => s + p.amount, 0);
  const failCount = payments.filter((p) => p.status === 'failed').length;
  const refundCount = payments.filter((p) => p.status === 'refunded').length;

  return (
    <div className="min-h-full pb-12">
      <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Ödemeler</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            {loading ? 'Yükleniyor…' : `Toplam ${payments.length} işlem`}
          </p>
        </div>
      </header>

      <div className="px-8 py-6 max-w-7xl mx-auto space-y-5">

        {/* Özet kartlar */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[var(--color-card)] rounded-xl border border-white/5 p-4 text-center">
            <p className="text-2xl font-bold tabular-nums text-[var(--color-success)]">{totalRevenue.toLocaleString('tr-TR')} TL</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">{completed.length} başarılı ödeme</p>
          </div>
          <div className="bg-[var(--color-card)] rounded-xl border border-white/5 p-4 text-center">
            <p className="text-2xl font-bold tabular-nums text-[var(--color-error)]">{failCount}</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">Başarısız işlem</p>
          </div>
          <div className="bg-[var(--color-card)] rounded-xl border border-white/5 p-4 text-center">
            <p className="text-2xl font-bold tabular-nums text-[var(--color-warning)]">{refundCount}</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">İade işlemi</p>
          </div>
        </div>

        {/* Arama */}
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kullanıcı veya paket adı ara..."
            className="w-full bg-[var(--color-card)] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
          />
        </div>

        {/* Tablo */}
        <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-[var(--color-sidebar)]/50">
                {['Kullanıcı', 'Paket', 'Tutar', 'Kredi', 'Tarih', 'Durum'].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-sm text-[var(--color-text-secondary)]">Yükleniyor…</td>
                </tr>
              ) : filtered.map((pay) => {
                const s = statusCfg[pay.status] ?? { label: pay.status, icon: RefreshCw, badge: 'text-[var(--color-text-secondary)] bg-white/5 border-white/10' };
                const StatusIcon = s.icon;
                return (
                  <tr key={pay.id} className="hover:bg-white/[0.025] transition-colors">
                    <td className="px-5 py-4 text-sm text-[var(--color-text-primary)]">{pay.userEmail}</td>
                    <td className="px-5 py-4 text-sm text-[var(--color-text-secondary)]">{pay.packageName || '—'}</td>
                    <td className="px-5 py-4 text-sm tabular-nums font-semibold text-[var(--color-text-primary)]">{pay.amount.toLocaleString('tr-TR')} TL</td>
                    <td className="px-5 py-4 text-sm tabular-nums text-[var(--color-text-primary)]">{pay.credits.toLocaleString('tr-TR')}</td>
                    <td className="px-5 py-4 text-xs text-[var(--color-text-secondary)]">
                      {pay.createdAt ? new Date(pay.createdAt).toLocaleDateString('tr-TR') : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border', s.badge)}>
                        <StatusIcon size={11} />
                        {s.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-[var(--color-text-secondary)]">Sonuç bulunamadı.</div>
          )}
        </div>

      </div>
    </div>
  );
}
