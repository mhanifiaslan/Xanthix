'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { FolderGit2, Home } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { projectTypeIcon } from '@/components/shared/ProjectTypeIcon';
import type { ProjectType } from '@/types/projectType';

interface RecentProject {
  id: string;
  title: string;
}

interface NavMenuProps {
  featuredTypes: ProjectType[];
  recents: RecentProject[];
}

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  /** When true, only an exact pathname match marks the item active. */
  exact?: boolean;
}

interface NavGroup {
  label: string;
  /** Optional inline link rendered on the right of the group label (e.g. "View all"). */
  trailing?: { label: string; href: string };
  items: NavItem[];
}

export default function NavMenu({ featuredTypes, recents }: NavMenuProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const tGroups = useTranslations('nav.groups');
  const tItems = useTranslations('nav.items');

  const localePath = (p: string) => `/${locale}${p === '/' ? '' : p}`;

  const groups: NavGroup[] = [
    {
      label: tGroups('mainAccess'),
      items: [
        { icon: Home, label: tItems('home'), href: localePath('/home'), exact: true },
        { icon: FolderGit2, label: tItems('projects'), href: localePath('/projects') },
      ],
    },
  ];

  if (recents.length > 0) {
    groups.push({
      label: tGroups('recents'),
      trailing: { label: tGroups('viewAll'), href: localePath('/projects') },
      items: recents.map((p) => ({
        icon: FolderGit2,
        label: p.title || tItems('untitledProject'),
        href: localePath(`/projects/${p.id}`),
      })),
    });
  }

  groups.push({
    label: tGroups('startNewProject'),
    items: featuredTypes.slice(0, 4).map((t) => ({
      icon: projectTypeIcon(t.iconName),
      label: t.name,
      href: localePath(`/project-types/${t.slug}`),
    })),
  });

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-2 pb-4">
      {groups.map((group, gi) => (
        <div key={gi} className={cn('mb-1', gi > 0 && 'mt-4')}>
          <div className="px-3 mb-1 flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]/60">
              {group.label}
            </p>
            {group.trailing && (
              <Link
                href={group.trailing.href}
                className="text-[10px] font-medium text-[var(--color-text-secondary)]/60 hover:text-[var(--color-accent)] transition-colors"
              >
                {group.trailing.label}
              </Link>
            )}
          </div>
          <nav className="space-y-0.5">
            {group.items.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname?.startsWith(item.href) ?? false;
              return (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[var(--color-card)] text-[var(--color-text-primary)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-[var(--color-text-primary)]',
                  )}
                >
                  <item.icon
                    size={16}
                    className={cn(
                      'shrink-0',
                      isActive ? 'text-[var(--color-accent)]' : '',
                    )}
                  />
                  <span className="truncate">{item.label}</span>
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
