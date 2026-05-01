"use client";

import { useParams, useRouter } from "next/navigation";
import { mockUsers, mockPayments, mockTickets } from "@/lib/mock-admin";
import {
  ArrowLeft, Ban, CreditCard, UserCheck, Plus, Minus,
  Mail, Calendar, FolderGit2, MessageSquare, CheckCircle2, Clock, XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

const planColors: Record<string, string> = {
  Deneme: "text-[var(--color-text-secondary)] bg-white/5 border-white/10",
  Standart: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  Pro: "text-[var(--color-accent)] bg-[var(--color-accent)]/10 border-[var(--color-accent)]/20",
  Kurumsal: "text-amber-400 bg-amber-400/10 border-amber-400/20",
};

const ticketStatusCfg = {
  beklemede: { icon: Clock, color: "text-[var(--color-warning)]" },
  yanitlandi: { icon: MessageSquare, color: "text-[var(--color-accent)]" },
  cozuldu: { icon: CheckCircle2, color: "text-[var(--color-success)]" },
};

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const user = mockUsers.find((u) => u.id === params.id);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--color-text-secondary)]">Kullanici bulunamadi.</p>
      </div>
    );
  }

  const userPayments = mockPayments.filter((p) => p.userId === user.id);
  const userTickets = mockTickets.filter((t) => t.userId === user.id);

  return (
    <div className="min-h-full pb-12">
      {/* Header */}
      <header className="px-8 py-4 border-b border-white/5 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-[var(--color-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ArrowLeft size={17} />
        </button>
        <div className="flex items-center gap-4 flex-1">
          <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full border border-white/10 object-cover" />
          <div>
            <h1 className="text-base font-bold text-[var(--color-text-primary)]">{user.name}</h1>
            <p className="text-xs text-[var(--color-text-secondary)]">{user.email}</p>
          </div>
          <span className={cn("ml-2 text-xs font-medium px-2.5 py-1 rounded-full border", planColors[user.plan])}>
            {user.plan}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => console.log("Kredi ekle:", user.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 text-[var(--color-success)] hover:bg-[var(--color-success)]/20 transition-colors"
          >
            <Plus size={13} /> Kredi Ekle
          </button>
          <button
            onClick={() => console.log("Kredi cikar:", user.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 text-[var(--color-error)] hover:bg-[var(--color-error)]/20 transition-colors"
          >
            <Minus size={13} /> Kredi Cikar
          </button>
          <button
            onClick={() => console.log("Plan degistir:", user.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-card)] border border-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <CreditCard size={13} /> Plan Degistir
          </button>
          {user.status === "aktif" ? (
            <button
              onClick={() => console.log("Banla:", user.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-error)]/5 border border-[var(--color-error)]/20 text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors"
            >
              <Ban size={13} /> Banla
            </button>
          ) : (
            <button
              onClick={() => console.log("Aktifle:", user.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-success)]/5 border border-[var(--color-success)]/20 text-[var(--color-success)] hover:bg-[var(--color-success)]/10 transition-colors"
            >
              <UserCheck size={13} /> Aktifle
            </button>
          )}
        </div>
      </header>

      <div className="px-8 py-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Sol — Meta */}
          <div className="space-y-5">
            <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Hesap Bilgileri</h2>
              {[
                { icon: Mail,        label: "Email",          value: user.email },
                { icon: Calendar,    label: "Kayit Tarihi",   value: user.joinedAt },
                { icon: Clock,       label: "Son Giris",      value: user.lastLogin },
                { icon: FolderGit2,  label: "Proje Sayisi",   value: `${user.projectCount} proje` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-background)] border border-white/5 flex items-center justify-center shrink-0">
                    <Icon size={14} className="text-[var(--color-accent)]" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-br from-[var(--color-accent)]/10 to-[var(--color-card)] rounded-2xl border border-[var(--color-accent)]/20 p-5">
              <p className="text-xs text-[var(--color-text-secondary)] mb-1">Mevcut Kredi</p>
              <p className="text-4xl font-bold tabular-nums text-[var(--color-text-primary)]">
                {user.credits.toLocaleString("tr-TR")}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                Toplam harcanan:{" "}
                <strong className="text-[var(--color-text-primary)]">
                  {user.totalSpent.toLocaleString("tr-TR")} TL
                </strong>
              </p>
            </div>
          </div>

          {/* Sag — Odemeler + Talepler */}
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Odeme Gecmisi</h2>
              </div>
              {userPayments.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-[var(--color-text-secondary)]">
                  Odeme gecmisi bulunamadi.
                </p>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5">
                      {["Tarih", "Paket", "Kredi", "Tutar", "Durum"].map((h) => (
                        <th key={h} className="px-5 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {userPayments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-white/[0.02]">
                        <td className="px-5 py-3 text-xs text-[var(--color-text-secondary)]">{pay.date}</td>
                        <td className="px-5 py-3 text-sm text-[var(--color-text-primary)]">{pay.package}</td>
                        <td className="px-5 py-3 text-sm tabular-nums text-[var(--color-text-primary)]">{pay.credits}</td>
                        <td className="px-5 py-3 text-sm tabular-nums text-[var(--color-text-primary)]">
                          {pay.amount.toLocaleString("tr-TR")} TL
                        </td>
                        <td className="px-5 py-3">
                          <span className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full border",
                            pay.status === "basarili"
                              ? "text-[var(--color-success)] bg-[var(--color-success)]/10 border-[var(--color-success)]/20"
                              : pay.status === "basarisiz"
                                ? "text-[var(--color-error)] bg-[var(--color-error)]/10 border-[var(--color-error)]/20"
                                : "text-[var(--color-warning)] bg-[var(--color-warning)]/10 border-[var(--color-warning)]/20"
                          )}>
                            {pay.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {userTickets.length > 0 && (
              <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-5">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Destek Talepleri</h2>
                <div className="space-y-3">
                  {userTickets.map((ticket) => {
                    const cfg = ticketStatusCfg[ticket.status];
                    const Icon = cfg.icon;
                    return (
                      <div key={ticket.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-background)] border border-white/5">
                        <div>
                          <p className="text-sm font-medium text-[var(--color-text-primary)]">{ticket.subject}</p>
                          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{ticket.createdAt}</p>
                        </div>
                        <Icon size={16} className={cfg.color} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
