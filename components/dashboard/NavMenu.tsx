'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
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
  MessageSquare,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  const tGroups = useTranslations('nav.groups');
  const tItems = useTranslations('nav.items');
  const tCommon = useTranslations('common');

  const localePath = (p: string) => `/${locale}${p === '/' ? '' : p}`;

  const groups: NavGroup[] = [
    {
      label: tGroups('mainAccess'),
      items: [
        { icon: Home, label: tItems('home'), href: localePath('/home') },
        { icon: FolderGit2, label: tItems('projects'), href: localePath('/projects') },
      ],
    },
    {
      label: tGroups('startNewProject'),
      items: featuredTypes.slice(0, 4).map((t) => ({
        icon: projectTypeIcon(t.iconName),
        label: t.name[locale as 'tr' | 'en' | 'es'] ?? t.name.en,
        href: localePath(`/project-types/${t.slug}`),
      })),
    },
    {
      label: tGroups('tools'),
      items: [
        { icon: BookOpen, label: tItems('myTemplates'), href: '#', soon: true },
        { icon: Archive, label: tItems('archive'), href: localePath('/archive') },
        { icon: BarChart2, label: tItems('stats'), href: '#', soon: true },
      ],
    },
    {
      label: tGroups('workspace'),
      items: [
        { icon: Building2, label: tItems('organizations'), href: localePath('/organizations') },
      ],
    },
    {
      label: tGroups('account'),
      items: [
        { icon: CreditCard, label: tItems('creditsBilling'), href: localePath('/billing') },
        { icon: Settings, label: tItems('settings'), href: localePath('/settings') },
        { icon: MessageSquare, label: tItems('support'), href: localePath('/support') },
        { icon: HelpCircle, label: tItems('help'), href: '#', soon: true },
      ],
    },
  ];

  if (isAdmin) {
    groups.push({
      label: tGroups('management'),
      items: [
        { icon: ArrowRight, label: tItems('adminPanel'), href: localePath('/admin') },
      ],
    });
  }

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
                item.href === localePath('/home')
                  ? pathname === item.href
                  : pathname?.startsWith(item.href) ?? false;
              return (
                <Link
                  key={item.href + item.label}
                  href={item.soon ? '#' : item.href}
                  onClick={item.soon ? (e) => e.preventDefault() : undefined}
                  className={cn(
                    'flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
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
                      {tCommon('comingSoon')}
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
    </div>
  );
}
