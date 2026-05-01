"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home, FolderGit2, GraduationCap, Microscope, Building2,
  BookOpen, Archive, BarChart2, CreditCard, Settings, MessageSquare, HelpCircle, LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthProvider";

const groups = [
  {
    label: "Ana Erisim",
    items: [
      { icon: Home,       label: "Ana Sayfa",   href: "/" },
      { icon: FolderGit2, label: "Projelerim",  href: "/projects" },
    ],
  },
  {
    label: "Yeni Proje Basla",
    items: [
      { icon: GraduationCap, label: "Erasmus+ KA210",  href: "/project-types/ka210" },
      { icon: Microscope,    label: "TUBITAK 2209-A",  href: "/project-types/tubitak-2209a" },
      { icon: Building2,     label: "Kalkinma Ajansi", href: "/project-types/kalkinma-ajansi" },
    ],
  },
  {
    label: "Araclar",
    items: [
      { icon: BookOpen,  label: "Sablonlarim",  href: "/templates",   soon: true },
      { icon: Archive,   label: "Arsiv",         href: "/archive" },
      { icon: BarChart2, label: "Istatistikler", href: "/statistics",  soon: true },
    ],
  },
  {
    label: "Hesap",
    items: [
      { icon: CreditCard,   label: "Kredi ve Fatura", href: "/billing" },
      { icon: Settings,     label: "Ayarlar",         href: "/settings" },
      { icon: MessageSquare,label: "Destek",          href: "/support" },
      { icon: HelpCircle,   label: "Yardim",          href: "/help",    soon: true },
    ],
  },
];

export default function NavMenu() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-2 pb-4">
      {groups.map((group, gi) => (
        <div key={gi} className={cn("mb-1", gi > 0 && "mt-4")}>
          <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]/60">
            {group.label}
          </p>
          <nav className="space-y-0.5">
            {group.items.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
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
                    <item.icon
                      size={16}
                      className={isActive ? "text-[var(--color-accent)]" : ""}
                    />
                    {item.label}
                  </span>
                  {item.soon && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 uppercase tracking-wide">
                      Yakında
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          {gi < groups.length - 1 && (
            <div className="mt-3 border-t border-white/5" />
          )}
        </div>
      ))}

      {/* Logout */}
      <div className="mt-auto pt-4 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-error)]/5 hover:text-[var(--color-error)] transition-colors"
        >
          <LogOut size={16} />
          Cikis Yap
        </button>
      </div>
    </div>
  );
}
