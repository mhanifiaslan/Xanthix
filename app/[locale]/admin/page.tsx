import { getAdminMetrics, listAdminUsers, listAdminPayments } from '@/lib/server/adminData';
import { Users, TrendingUp, DollarSign, Layers, ArrowUpRight, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

function MetricCard({
  label, value, sub, icon: Icon, trend, trendUp,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; trend?: string; trendUp?: boolean;
}) {
  return (
    <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-5">
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm text-[var(--color-text-secondary)]">{label}</p>
        <div className="w-9 h-9 rounded-xl bg-[var(--color-background)] border border-white/5 flex items-center justify-center">
          <Icon size={16} className="text-[var(--color-accent)]" />
        </div>
      </div>
      <p className="text-3xl font-bold tabular-nums text-[var(--color-text-primary)] mb-1">{value}</p>
      {sub && <p className="text-xs text-[var(--color-text-secondary)]">{sub}</p>}
      {trend && (
        <div className={cn('flex items-center gap-1 text-xs font-medium mt-2', trendUp ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]')}>
          <ArrowUpRight size={12} />
          {trend}
        </div>
      )}
    </div>
  );
}

const paymentStatusCfg: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  completed: { label: 'Başarılı', icon: CheckCircle2, color: 'text-[var(--color-success)]' },
  failed:    { label: 'Başarısız', icon: XCircle, color: 'text-[var(--color-error)]' },
  refunded:  { label: 'İade', icon: RefreshCw, color: 'text-[var(--color-warning)]' },
};

export default async function AdminDashboardPage() {
  const [metrics, recentUsers, recentPayments] = await Promise.all([
    getAdminMetrics(),
    listAdminUsers(5),
    listAdminPayments(5),
  ]);

  return (
    <div className="min-h-full pb-12">
      <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Admin Dashboard</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">Sistem geneli özet</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--color-success)]">
          <span className="w-2 h-2 bg-[var(--color-success)] rounded-full animate-pulse" />
          Tüm sistemler çalışıyor
        </div>
      </header>

      <div className="px-8 py-8 max-w-7xl mx-auto space-y-8">

        {/* Metrik Kartları */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Toplam Kullanıcı"
            value={metrics.totalUsers.toLocaleString('tr-TR')}
            icon={Users}
            sub="Firebase Auth kayıtlı"
          />
          <MetricCard
            label="Toplam Proje"
            value={metrics.totalProjects.toLocaleString('tr-TR')}
            icon={Layers}
            sub="Firestore projeler"
          />
          <MetricCard
            label="Toplam Satın Alma"
            value={metrics.totalPurchases.toLocaleString('tr-TR')}
            icon={DollarSign}
            sub="Tamamlanan işlemler"
          />
          <MetricCard
            label="AI Token Harcaması"
            value="—"
            icon={TrendingUp}
            sub="Yakında aktif edilecek"
          />
        </div>

        {/* Son Kullanıcılar + Ödemeler */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Son kullanıcılar */}
          <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Son Kayıt Olan Kullanıcılar</h2>
              <Link href="./admin/users" className="text-xs text-[var(--color-accent)] hover:underline">Tümünü gör</Link>
            </div>
            <div className="divide-y divide-white/5">
              {recentUsers.length === 0 ? (
                <p className="px-6 py-8 text-sm text-[var(--color-text-secondary)] text-center">Henüz kullanıcı yok.</p>
              ) : recentUsers.map((user) => (
                <div key={user.uid} className="px-6 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30 flex items-center justify-center text-xs font-bold text-[var(--color-accent)]">
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{user.displayName}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{user.email}</p>
                    </div>
                  </div>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full border font-medium',
                    user.disabled
                      ? 'text-[var(--color-error)] bg-[var(--color-error)]/10 border-[var(--color-error)]/20'
                      : 'text-[var(--color-success)] bg-[var(--color-success)]/10 border-[var(--color-success)]/20'
                  )}>
                    {user.disabled ? 'Pasif' : 'Aktif'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Son ödemeler */}
          <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Son Ödemeler</h2>
              <Link href="./admin/payments" className="text-xs text-[var(--color-accent)] hover:underline">Tümünü gör</Link>
            </div>
            <div className="divide-y divide-white/5">
              {recentPayments.length === 0 ? (
                <p className="px-6 py-8 text-sm text-[var(--color-text-secondary)] text-center">Henüz ödeme kaydı yok.</p>
              ) : recentPayments.map((pay) => {
                const s = paymentStatusCfg[pay.status] ?? { label: pay.status, icon: RefreshCw, color: 'text-[var(--color-text-secondary)]' };
                const StatusIcon = s.icon;
                return (
                  <div key={pay.id} className="px-6 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{pay.userEmail}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {pay.packageName} · {pay.createdAt ? new Date(pay.createdAt).toLocaleDateString('tr-TR') : '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold tabular-nums text-[var(--color-text-primary)]">
                        {pay.amount.toLocaleString('tr-TR')} TL
                      </p>
                      <StatusIcon size={14} className={s.color} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
