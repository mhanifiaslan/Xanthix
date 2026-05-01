"use client";

import { pricingPackages, mockPayments } from "@/lib/mock-admin";
import { userProfile } from "@/lib/mock-data";
import { Wallet, TrendingDown, CheckCircle2, XCircle, RefreshCw, Download, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BillingPage() {
  const myPayments = mockPayments.filter((p) => p.userId === "u1");

  const statusConfig = {
    basarili: { label: "Basarili", icon: CheckCircle2, color: "text-[var(--color-success)] bg-[var(--color-success)]/10 border-[var(--color-success)]/20" },
    basarisiz: { label: "Basarisiz", icon: XCircle, color: "text-[var(--color-error)] bg-[var(--color-error)]/10 border-[var(--color-error)]/20" },
    iade: { label: "Iade", icon: RefreshCw, color: "text-[var(--color-warning)] bg-[var(--color-warning)]/10 border-[var(--color-warning)]/20" },
  };

  return (
    <div className="min-h-full pb-12">
      <header className="px-8 py-6 border-b border-white/5">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Kredi ve Fatura</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">Kredi bakiyenizi ve odeme gecmisinizi yonetin.</p>
      </header>

      <div className="px-8 py-8 max-w-5xl mx-auto space-y-8">

        {/* Mevcut Durum */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-gradient-to-br from-[var(--color-accent)]/15 to-[var(--color-card)] rounded-2xl border border-[var(--color-accent)]/20 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)] mb-1">{userProfile.plan}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold tabular-nums text-[var(--color-text-primary)]">{userProfile.credits}</span>
                  <span className="text-lg text-[var(--color-text-secondary)]">kredi</span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                  Ortalama gunluk tuketim: ~15 kredi · Tahminen <strong className="text-[var(--color-warning)]">30 gun</strong> yeter
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30 flex items-center justify-center">
                <Wallet size={22} className="text-[var(--color-accent)]" />
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-5 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-[var(--color-text-secondary)] mb-2">
              <TrendingDown size={16} />
              <span className="text-sm">Toplam harcanan</span>
            </div>
            <p className="text-3xl font-bold tabular-nums text-[var(--color-text-primary)]">1.200 TL</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">3 odeme, son 4 ay</p>
          </div>
        </div>

        {/* Kredi Paketleri */}
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Kredi Paketi Satin Al</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pricingPackages.map((pkg) => (
              <div
                key={pkg.id}
                className={cn(
                  "relative bg-[var(--color-card)] rounded-2xl border p-5 flex flex-col",
                  pkg.isPopular ? "border-[var(--color-accent)]/40" : "border-white/5"
                )}
              >
                {pkg.isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-bold bg-[var(--color-accent)] text-white rounded-full">
                    En Populer
                  </span>
                )}
                <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">{pkg.name}</p>
                <div className="flex-1">
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-bold tabular-nums text-[var(--color-text-primary)]">
                      {pkg.credits}
                    </span>
                    <span className="text-sm text-[var(--color-text-secondary)]">kredi</span>
                  </div>
                  {pkg.bonus > 0 && (
                    <div className="flex items-center gap-1 text-xs text-[var(--color-success)] mb-3">
                      <Zap size={11} />
                      +{pkg.bonus} bonus kredi
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-lg font-bold text-[var(--color-text-primary)] mb-3">
                    {pkg.price === 0 ? "Ucretsiz" : `${pkg.price.toLocaleString("tr-TR")} TL`}
                  </p>
                  <button
                    onClick={() => console.log(`Satin al: ${pkg.name}`)}
                    className={cn(
                      "w-full py-2 text-sm font-semibold rounded-xl transition-colors",
                      pkg.isPopular
                        ? "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white"
                        : "border border-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-white/20"
                    )}
                  >
                    {pkg.price === 0 ? "Aktif" : "Satin Al"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Odeme Gecmisi */}
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Odeme Gecmisi</h2>
          <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-[var(--color-sidebar)]/50">
                  <th className="px-6 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Tarih</th>
                  <th className="px-6 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Paket</th>
                  <th className="px-6 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Kredi</th>
                  <th className="px-6 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Tutar</th>
                  <th className="px-6 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider text-right">Fatura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {myPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-[var(--color-text-secondary)]">
                      Henuz odeme gecmisiniz bulunmuyor.
                    </td>
                  </tr>
                ) : myPayments.map((pay) => {
                  const s = statusConfig[pay.status];
                  const StatusIcon = s.icon;
                  return (
                    <tr key={pay.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)]">{pay.date}</td>
                      <td className="px-6 py-4 text-sm font-medium text-[var(--color-text-primary)]">{pay.package}</td>
                      <td className="px-6 py-4 text-sm tabular-nums text-[var(--color-text-primary)]">{pay.credits}</td>
                      <td className="px-6 py-4 text-sm tabular-nums text-[var(--color-text-primary)]">
                        {pay.amount.toLocaleString("tr-TR")} TL
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-md text-xs font-medium border", s.color)}>
                          <StatusIcon size={11} /> {s.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => console.log(`Fatura indir: ${pay.reference}`)}
                          className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:bg-white/5 transition-colors"
                          aria-label="Fatura indir"
                        >
                          <Download size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
