'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  Archive,
  ArrowRight,
  BarChart2,
  BookOpen,
  Building2,
  CreditCard,
  FolderGit2,
  HelpCircle,
  Home,
  LogOut,
  MessageSquare,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthProvider';
import { projectTypeIcon } from '@/components/shared/ProjectTypeIcon';
import type { ProjectType } from '@/types/projectType';

interface NavMenuProps {
  featuredTypes: ProjectType[];
  isAdmin: boolean;
}

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  soon?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export default function NavMenu({ featuredTypes, isAdmin }: NavMenuProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const { signOut } = useAuth();
  const router = useRouter();

  const localePath = (p: string) => `/${locale}${p === '/' ? '' : p}`;

  const groups: NavGroup[] = [
    {
      label: 'Ana erişim',
      items: [
        { icon: Home, label: 'Ana sayfa', href: localePath('/') },
        { icon: FolderGit2, label: 'Projelerim', href: localePath('/projects') },
      ],
    },
    {
      label: 'Yeni proje başla',
      items: featuredTypes.slice(0, 4).map((t) => ({
        icon: projectTypeIcon(t.iconName),
        label: t.name[locale as 'tr' | 'en' | 'es'] ?? t.name.en,
        href: localePath(`/project-types/${t.slug}`),
      })),
    },
    {
      label: 'Araçlar',
      items: [
        { icon: BookOpen, label: 'Şablonlarım', href: '#', soon: true },
        { icon: Archive, label: 'Arşiv', href: localePath('/archive') },
        { icon: BarChart2, label: 'İstatistikler', href: '#', soon: true },
      ],
    },
    {
      label: 'Çalışma alanı',
      items: [
        { icon: Building2, label: 'Kurumlarım', href: localePath('/organizations') },
      ],
    },
    {
      label: 'Hesap',
      items: [
        { icon: CreditCard, label: 'Kredi & fatura', href: localePath('/billing') },
        { icon: Settings, label: 'Ayarlar', href: localePath('/settings') },
        { icon: MessageSquare, label: 'Destek', href: localePath('/support') },
        { icon: HelpCircle, label: 'Yardım', href: '#', soon: true },
      ],
    },
  ];

  if (isAdmin) {
    groups.push({
      label: 'Yönetim',
      items: [
        { icon: ArrowRight, label: 'Admin paneli', href: localePath('/admin') },
      ],
    });
  }

  const handleLogout = async () => {
    await signOut();
    router.push(localePath('/login'));
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-2 pb-4">
      {groups.map((group, gi) => (
        <div key={gi} className={cn('mb-1', gi > 0 && 'mt-4')}>
          <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]/60">
            {group.label}
          </p>
          <nav className="space-y-0.5">
            {group.items.map((item) => {
              const isActive =
                item.href === localePath('/')
                  ? pathname === item.href
                  : pathname?.startsWith(item.href) ?? false;
              return (
                <Link
                  key={item.href + item.label}
                  href={item.soon ? '#' : item.href}
                  onClick={item.soon ? (e) => e.preventDefault() : undefined}
                  className={cn(
                    'flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[var(--color-card)] text-[var(--color-text-primary)]'
                      : item.soon
                        ? 'text-[var(--color-text-secondary)]/50 cursor-default'
                        : 'text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-[var(--color-text-primary)]',
                  )}
                >
                  <span className="flex items-center gap-3">
                    <item.icon
                      size={16}
                      className={isActive ? 'text-[var(--color-accent)]' : ''}
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

      <div className="mt-auto pt-4 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-error)]/5 hover:text-[var(--color-error)] transition-colors"
        >
          <LogOut size={16} />
          Çıkış yap
        </button>
      </div>
    </div>
  );
}
