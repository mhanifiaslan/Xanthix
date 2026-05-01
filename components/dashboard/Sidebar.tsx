'use client';

import UserCard from './UserCard';
import CreditDisplay from './CreditDisplay';
import NavMenu from './NavMenu';
import type { ProjectType } from '@/types/projectType';

interface SidebarProps {
  featuredTypes: ProjectType[];
  isAdmin: boolean;
}

export default function Sidebar({ featuredTypes, isAdmin }: SidebarProps) {
  return (
    <aside className="w-[280px] bg-[var(--color-sidebar)] h-full flex flex-col border-r border-white/5 flex-shrink-0">
      <div className="flex-1 flex flex-col pt-4 overflow-y-auto">
        <div className="px-2">
          <UserCard />
        </div>
        <CreditDisplay />
        <NavMenu featuredTypes={featuredTypes} isAdmin={isAdmin} />
      </div>
    </aside>
  );
}
