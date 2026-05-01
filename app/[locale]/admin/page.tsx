import { adminMetrics, mockUsers, mockPayments, revenueChartData, userGrowthData } from "@/lib/mock-admin";
import { Users, TrendingUp, DollarSign, Percent, ArrowUpRight, ArrowDownRight, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

function MetricCard({
  label, value, sub, icon: Icon, trend, trendUp, accent,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; trend?: string; trendUp?: boolean; accent?: string;
}) {
  return (
    <div className={cn("bg-[var(--color-card)] rounded-2xl border border-white/5 p-5", accent && `border-l-2 border-l-[${accent}]`)}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm text-[var(--color-text-secondary)]">{label}</p>
        <div className="w-9 h-9 rounded-xl bg-[var(--color-background)] border border-white/5 flex items-center justify-center">
          <Icon size={16} className="text-[var(--color-accent)]" />
        </div>
      </div>
      <p className="text-3xl font-bold tabular-nums text-[var(--color-text-primary)] mb-1">{value}</p>
      {sub && <p className="text-xs text-[var(--color-text-secondary)]">{sub}</p>}
      {trend && (
        <div className={cn("flex items-center gap-1 text-xs font-medium mt-2", trendUp ? "text-[var(--color-success)]" : "text-[var(--color-error)]")}>
          {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trend}
        </div>
      )}
    </div>
  );
}

function MiniBar({ data, height = 40 }: { data: number[]; height?: number }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-[var(--color-accent)] opacity-70 transition-all hover:opacity-100"
          style={{ height: `${(v / max) * 100}%` }}
        />
      ))}
    </div>
  );
}

const paymentStatus = {
  basarili: { label: "Basarili", icon: CheckCircle2, color: "text-[var(--color-success)]" },
  basarisiz: { label: "Basarisiz", icon: XCircle, color: "text-[var(--color-error)]" },
  iade: { label: "Iade", icon: RefreshCw, color: "text-[var(--color-warning)]" },
};

export default function AdminDashboardPage() {
  const recentUsers = mockUsers.slice(0, 5);
  const recentPayments = mockPayments.slice(0, 5);

  return (
    <div className="min-h-full pb-12">
      <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Admin Dashboard</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">Gunluk ozet ve sistem durumu</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--color-success)]">
          <span className="w-2 h-2 bg-[var(--color-success)] rounded-full animate-pulse" />
          Tum sistemler calisiyor
        </div>
      </header>

      <div className="px-8 py-8 max-w-7xl mx-auto space-y-8">

        {/* Metrik Kartlari */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Bugunki Aktif Kullanici"
            value={adminMetrics.todayActiveUsers.toLocaleString("tr-TR")}
            icon={Users}
            trend="+12% dunden"
            trendUp
          />
          <MetricCard
            label="Dunki Gelir"
            value={`${adminMetrics.yesterdayRevenue.toLocaleString("tr-TR")} TL`}
            icon={DollarSign}
            sub="8 odeme islemi"
            trend="+8% haftadan"
            trendUp
          />
          <MetricCard
            label="Dunki AI Maliyeti"
            value={`$${adminMetrics.yesterdayAiCost.toLocaleString("tr-TR")}`}
            icon={TrendingUp}
            sub="USD cinsinden"
            trend="-3% haftadan"
            trendUp={false}
          />
          <MetricCard
            label="Kar Marji (dun)"
            value={`%${adminMetrics.marginRate}`}
            icon={Percent}
            trend="+2.1 puan"
            trendUp
          />
        </div>

        {/* Grafikler */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Aylik Gelir (TL)</h2>
                <p className="text-2xl font-bold tabular-nums text-[var(--color-text-primary)] mt-1">
                  {adminMetrics.totalRevenue.toLocaleString("tr-TR")} TL
                </p>
              </div>
              <span className="text-xs text-[var(--color-success)] bg-[var(--color-success)]/10 px-2 py-1 rounded-full border border-[var(--color-success)]/20">
                +24% YoY
              </span>
            </div>
            <MiniBar data={revenueChartData.map((d) => d.revenue)} height={80} />
            <div className="flex justify-between mt-2">
              {revenueChartData.map((d) => (
                <span key={d.month} className="text-[10px] text-[var(--color-text-secondary)]">{d.month}</span>
              ))}
            </div>
          </div>

          <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Toplam Kullanici</h2>
                <p className="text-2xl font-bold tabular-nums text-[var(--color-text-primary)] mt-1">
                  {adminMetrics.totalUsers.toLocaleString("tr-TR")}
                </p>
              </div>
              <span className="text-xs text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-2 py-1 rounded-full border border-[var(--color-accent)]/20">
                +{Math.round((userGrowthData[5].users - userGrowthData[0].users) / userGrowthData[0].users * 100)}% 6 ay
              </span>
            </div>
            <MiniBar data={userGrowthData.map((d) => d.users)} height={80} />
            <div className="flex justify-between mt-2">
              {userGrowthData.map((d) => (
                <span key={d.month} className="text-[10px] text-[var(--color-text-secondary)]">{d.month}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Son Olaylar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Son kullanicilar */}
          <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Son Katilan Kullanicilar</h2>
              <a href="/admin/users" className="text-xs text-[var(--color-accent)] hover:underline">Tumunu gor</a>
            </div>
            <div className="divide-y divide-white/5">
              {recentUsers.map((user) => (
                <div key={user.id} className="px-6 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{user.name}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{user.plan} · {user.joinedAt}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full border font-medium",
                    user.status === "aktif" ? "text-[var(--color-success)] bg-[var(--color-success)]/10 border-[var(--color-success)]/20"
                      : user.status === "banlı" ? "text-[var(--color-error)] bg-[var(--color-error)]/10 border-[var(--color-error)]/20"
                        : "text-[var(--color-text-secondary)] bg-white/5 border-white/10"
                  )}>
                    {user.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Son odemeler */}
          <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Son Odemeler</h2>
              <a href="/admin/payments" className="text-xs text-[var(--color-accent)] hover:underline">Tumunu gor</a>
            </div>
            <div className="divide-y divide-white/5">
              {recentPayments.map((pay) => {
                const s = paymentStatus[pay.status];
                const StatusIcon = s.icon;
                return (
                  <div key={pay.id} className="px-6 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{pay.userName}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{pay.package} · {pay.date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold tabular-nums text-[var(--color-text-primary)]">
                        {pay.amount.toLocaleString("tr-TR")} TL
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
