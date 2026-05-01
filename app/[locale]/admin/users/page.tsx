"use client";

import { useState } from "react";
import { mockUsers } from "@/lib/mock-admin";
import { Search, UserPlus, MoreVertical, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const planColors: Record<string, string> = {
  Deneme: "text-[var(--color-text-secondary)] bg-white/5 border-white/10",
  Standart: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  Pro: "text-[var(--color-accent)] bg-[var(--color-accent)]/10 border-[var(--color-accent)]/20",
  Kurumsal: "text-amber-400 bg-amber-400/10 border-amber-400/20",
};

const statusColors: Record<string, string> = {
  aktif: "text-[var(--color-success)] bg-[var(--color-success)]/10 border-[var(--color-success)]/20",
  pasif: "text-[var(--color-text-secondary)] bg-white/5 border-white/10",
  "banlı": "text-[var(--color-error)] bg-[var(--color-error)]/10 border-[var(--color-error)]/20",
};

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("Tumu");
  const router = useRouter();

  const plans = ["Tumu", "Deneme", "Standart", "Pro", "Kurumsal"];

  const filtered = mockUsers.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchPlan = planFilter === "Tumu" || u.plan === planFilter;
    return matchSearch && matchPlan;
  });

  return (
    <div className="min-h-full pb-12">
      <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Kullanicilar</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Toplam {mockUsers.length} kullanici kayitli
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors">
          <UserPlus size={15} />
          Kullanici Ekle
        </button>
      </header>

      <div className="px-8 py-6 max-w-7xl mx-auto space-y-5">

        {/* Filtreler */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ad veya email ile ara..."
              className="w-full bg-[var(--color-card)] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
            />
          </div>
          <div className="flex gap-2">
            {plans.map((p) => (
              <button
                key={p}
                onClick={() => setPlanFilter(p)}
                className={cn(
                  "px-3 py-2 rounded-lg text-xs font-medium border transition-colors",
                  planFilter === p
                    ? "bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30 text-[var(--color-accent)]"
                    : "bg-[var(--color-card)] border-white/5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-white/10"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Tablo */}
        <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-[var(--color-sidebar)]/50">
                {["Kullanici", "Plan", "Kredi", "Proje", "Toplam Harcama", "Son Giris", "Durum", ""].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => router.push(`/admin/users/${user.id}`)}
                  className="hover:bg-white/[0.025] transition-colors cursor-pointer"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{user.name}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full border", planColors[user.plan])}>
                      {user.plan}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm tabular-nums text-[var(--color-text-primary)]">
                    {user.credits.toLocaleString("tr-TR")}
                  </td>
                  <td className="px-5 py-4 text-sm tabular-nums text-[var(--color-text-primary)]">
                    {user.projectCount}
                  </td>
                  <td className="px-5 py-4 text-sm tabular-nums text-[var(--color-text-primary)]">
                    {user.totalSpent.toLocaleString("tr-TR")} TL
                  </td>
                  <td className="px-5 py-4 text-xs text-[var(--color-text-secondary)]">
                    {user.lastLogin}
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full border", statusColors[user.status])}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                    <button className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-colors">
                      <MoreVertical size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-[var(--color-text-secondary)]">
              Sonuc bulunamadi.
            </div>
          )}
        </div>

        {/* Ozet satiri */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Aktif", value: mockUsers.filter(u => u.status === "aktif").length, color: "text-[var(--color-success)]" },
            { label: "Pasif", value: mockUsers.filter(u => u.status === "pasif").length, color: "text-[var(--color-text-secondary)]" },
            { label: "Banli", value: mockUsers.filter(u => u.status === "banlı").length, color: "text-[var(--color-error)]" },
            { label: "Pro/Kurumsal", value: mockUsers.filter(u => u.plan === "Pro" || u.plan === "Kurumsal").length, color: "text-[var(--color-accent)]" },
          ].map((s) => (
            <div key={s.label} className="bg-[var(--color-card)] rounded-xl border border-white/5 p-4 text-center">
              <p className={cn("text-2xl font-bold tabular-nums", s.color)}>{s.value}</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">{s.label}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
