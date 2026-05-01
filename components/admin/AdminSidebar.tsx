"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, CreditCard, FolderGit2, DollarSign,
  TicketIcon, Settings, LogOut, Bot, ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthProvider";

const groups: {
  label: string;
  items: { icon: React.ElementType; label: string; href: string; soon?: boolean }[];
}[] = [
  {
    label: "Genel",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
      { icon: Users,           label: "Kullanicilar", href: "/admin/users" },
      { icon: CreditCard,      label: "Odemeler", href: "/admin/payments" },
    ],
  },
  {
    label: "Icerik",
    items: [
      { icon: FolderGit2, label: "Proje Turleri", href: "/admin/project-types" },
      { icon: DollarSign, label: "Fiyatlandirma", href: "/admin/pricing" },
    ],
  },
  {
    label: "Destek",
    items: [
      { icon: TicketIcon, label: "Talepler", href: "/admin/support", soon: true },
    ],
  },
  {
    label: "Sistem",
    items: [
      { icon: Settings, label: "Ayarlar", href: "/admin/settings", soon: true },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { signOut, user } = useAuth();
  const router = useRouter();

  return (
    <aside className="w-[260px] bg-[var(--color-sidebar)] h-full flex flex-col border-r border-white/5 shrink-0">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30 flex items-center justify-center">
            <Bot size={16} className="text-[var(--color-accent)]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--color-text-primary)]">Projectmenager</p>
            <div className="flex items-center gap-1 text-[10px] text-[var(--color-accent)]">
              <ShieldCheck size={10} />
              Admin Paneli
            </div>
          </div>
        </div>
      </div>

      {/* Admin user */}
      <div className="px-3 py-3 border-b border-white/5">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30 flex items-center justify-center text-xs font-bold text-[var(--color-accent)]">
            A
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-primary)]">{user?.name}</p>
            <p className="text-[10px] text-[var(--color-text-secondary)]">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-2 py-4 flex flex-col">
        {groups.map((group, gi) => (
          <div key={gi} className={cn("mb-1", gi > 0 && "mt-4")}>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]/60">
              {group.label}
            </p>
            <nav className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.soon ? "#" : item.href}
                    onClick={item.soon ? (e) => e.preventDefault() : undefined}
                    className={cn(
                      "flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[var(--color-card)] text-[var(--color-text-primary)]"
                        : item.soon
                          ? "text-[var(--color-text-secondary)]/50 cursor-default"
                          : "text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-[var(--color-text-primary)]"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <item.icon size={16} className={isActive ? "text-[var(--color-accent)]" : ""} />
                      {item.label}
                    </span>
                    {item.soon && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 uppercase">
                        Yakında
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
            {gi < groups.length - 1 && <div className="mt-3 border-t border-white/5" />}
          </div>
        ))}

        <div className="mt-auto pt-4 border-t border-white/5">
          <button
            onClick={async () => { await signOut(); router.push("/login"); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-error)]/5 hover:text-[var(--color-error)] transition-colors"
          >
            <LogOut size={16} />
            Cikis Yap
          </button>
        </div>
      </div>
    </aside>
  );
}
