"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  LayoutDashboard, Users, CreditCard, FolderGit2, DollarSign,
  TicketIcon, Settings, Bot, ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import UserMenuCell from "@/components/shared/sidebar/UserMenuCell";

interface AdminGroup {
  labelKey: string;
  items: { icon: React.ElementType; labelKey: string; href: string; soon?: boolean }[];
}

const groups: AdminGroup[] = [
  {
    labelKey: "general",
    items: [
      { icon: LayoutDashboard, labelKey: "dashboard", href: "/admin" },
      { icon: Users,           labelKey: "users", href: "/admin/users" },
      { icon: CreditCard,      labelKey: "payments", href: "/admin/payments" },
    ],
  },
  {
    labelKey: "content",
    items: [
      { icon: FolderGit2, labelKey: "projectTypes", href: "/admin/project-types" },
      { icon: DollarSign, labelKey: "pricing", href: "/admin/pricing" },
    ],
  },
  {
    labelKey: "support",
    items: [
      { icon: TicketIcon, labelKey: "supportTickets", href: "/admin/support", soon: true },
    ],
  },
  {
    labelKey: "system",
    items: [
      { icon: Settings, labelKey: "settings", href: "/admin/settings", soon: true },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const locale = useLocale();
  const tBrand = useTranslations("admin.brand");
  const tGroups = useTranslations("admin.nav.groups");
  const tItems = useTranslations("admin.nav.items");
  const tCommon = useTranslations("common");

  const localizedHref = (href: string) => `/${locale}${href}`;

  return (
    <aside className="w-[260px] bg-[var(--color-sidebar)] h-full flex flex-col border-r border-white/5 shrink-0">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30 flex items-center justify-center">
            <Bot size={16} className="text-[var(--color-accent)]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--color-text-primary)]">{tBrand("name")}</p>
            <div className="flex items-center gap-1 text-[10px] text-[var(--color-accent)]">
              <ShieldCheck size={10} />
              {tBrand("subtitle")}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-2 py-4 flex flex-col">
        {groups.map((group, gi) => (
          <div key={gi} className={cn("mb-1", gi > 0 && "mt-4")}>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]/60">
              {tGroups(group.labelKey)}
            </p>
            <nav className="space-y-0.5">
              {group.items.map((item) => {
                const localized = localizedHref(item.href);
                const isActive =
                  item.href === "/admin"
                    ? pathname === localized
                    : pathname.startsWith(localized);

                return (
                  <Link
                    key={item.href}
                    href={item.soon ? "#" : localized}
                    onClick={item.soon ? (e) => e.preventDefault() : undefined}
                    className={cn(
                      "flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[var(--color-card)] text-[var(--color-text-primary)]"
                        : item.soon
                          ? "text-[var(--color-text-secondary)]/50 cursor-default"
                          : "text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-[var(--color-text-primary)]"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <item.icon size={16} className={isActive ? "text-[var(--color-accent)]" : ""} />
                      {tItems(item.labelKey)}
                    </span>
                    {item.soon && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 uppercase">
                        {tCommon("comingSoon")}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
            {gi < groups.length - 1 && <div className="mt-3 border-t border-white/5" />}
          </div>
        ))}
      </div>

      <UserMenuCell variant="admin" />
    </aside>
  );
}
