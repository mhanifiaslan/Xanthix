"use client";

import { useState } from "react";
import { mockPayments } from "@/lib/mock-admin";
import { Search, Download, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type PayStatus = "hepsi" | "basarili" | "basarisiz" | "iade";

const statusCfg = {
  basarili: { label: "Basarili", icon: CheckCircle2, color: "text-[var(--color-success)] bg-[var(--color-success)]/10 border-[var(--color-success)]/20" },
  basarisiz: { label: "Basarisiz", icon: XCircle, color: "text-[var(--color-error)] bg-[var(--color-error)]/10 border-[var(--color-error)]/20" },
  iade: { label: "Iade", icon: RefreshCw, color: "text-[var(--color-warning)] bg-[var(--color-warning)]/10 border-[var(--color-warning)]/20" },
};

export default function AdminPaymentsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PayStatus>("hepsi");

  const filters: { value: PayStatus; label: string }[] = [
    { value: "hepsi", label: "Hepsi" },
    { value: "basarili", label: "Basarili" },
    { value: "basarisiz", label: "Basarisiz" },
    { value: "iade", label: "Iade" },
  ];

  const filtered = mockPayments.filter((p) => {
    const matchSearch =
      p.userName.toLowerCase().includes(search.toLowerCase()) ||
      p.reference.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "hepsi" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalRevenue = mockPayments
    .filter((p) => p.status === "basarili")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalRefunds = mockPayments
    .filter((p) => p.status === "iade")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="min-h-full pb-12">
      <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Odemeler</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">Tum odeme islemleri</p>
        </div>
        <button
          onClick={() => console.log("CSV export")}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-white/20 transition-colors"
        >
          <Download size={15} />
          CSV Indir
        </button>
      </header>

      <div className="px-8 py-6 max-w-7xl mx-auto space-y-6">

        {/* Ozet Kartlar */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[var(--color-card)] rounded-xl border border-white/5 p-5">
            <p className="text-xs text-[var(--color-text-secondary)] mb-2">Toplam Gelir</p>
            <p className="text-2xl font-bold tabular-nums text-[var(--color-success)]">
              {totalRevenue.toLocaleString("tr-TR")} TL
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              {mockPayments.filter((p) => p.status === "basarili").length} basarili odeme
            </p>
          </div>
          <div className="bg-[var(--color-card)] rounded-xl border border-white/5 p-5">
            <p className="text-xs text-[var(--color-text-secondary)] mb-2">Basarisiz Odemeler</p>
            <p className="text-2xl font-bold tabular-nums text-[var(--color-error)]">
              {mockPayments.filter((p) => p.status === "basarisiz").length}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              %{Math.round((mockPayments.filter((p) => p.status === "basarisiz").length / mockPayments.length) * 100)} basarisizlik orani
            </p>
          </div>
          <div className="bg-[var(--color-card)] rounded-xl border border-white/5 p-5">
            <p className="text-xs text-[var(--color-text-secondary)] mb-2">Toplam Iade</p>
            <p className="text-2xl font-bold tabular-nums text-[var(--color-warning)]">
              {totalRefunds.toLocaleString("tr-TR")} TL
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              {mockPayments.filter((p) => p.status === "iade").length} iade islemi
            </p>
          </div>
        </div>

        {/* Filtreler */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kullanici veya referans no ara..."
              className="w-full bg-[var(--color-card)] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
            />
          </div>
          <div className="flex gap-2">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  "px-3 py-2 rounded-lg text-xs font-medium border transition-colors",
                  statusFilter === f.value
                    ? "bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30 text-[var(--color-accent)]"
                    : "bg-[var(--color-card)] border-white/5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tablo */}
        <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-[var(--color-sidebar)]/50">
                {["Tarih", "Kullanici", "Paket", "Kredi", "Tutar", "Yontem", "Referans", "Durum"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((pay) => {
                const s = statusCfg[pay.status];
                const StatusIcon = s.icon;
                return (
                  <tr key={pay.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5 text-xs text-[var(--color-text-secondary)]">{pay.date}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-[var(--color-text-primary)]">{pay.userName}</td>
                    <td className="px-5 py-3.5 text-sm text-[var(--color-text-primary)]">{pay.package}</td>
                    <td className="px-5 py-3.5 text-sm tabular-nums text-[var(--color-text-primary)]">{pay.credits}</td>
                    <td className="px-5 py-3.5 text-sm tabular-nums font-semibold text-[var(--color-text-primary)]">
                      {pay.amount.toLocaleString("tr-TR")} TL
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[var(--color-text-secondary)]">{pay.method}</td>
                    <td className="px-5 py-3.5 text-xs font-mono text-[var(--color-text-secondary)]">{pay.reference}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn("flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-md text-xs font-medium border", s.color)}>
                        <StatusIcon size={11} /> {s.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="py-12 text-center text-sm text-[var(--color-text-secondary)]">Sonuc bulunamadi.</p>
          )}
        </div>
      </div>
    </div>
  );
}
