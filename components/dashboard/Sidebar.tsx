'use client';

import { Bot } from 'lucide-react';
import CreditDisplay from './CreditDisplay';
import NavMenu from './NavMenu';
import UserMenuCell, {
  type OrgWorkspaceOption,
} from '@/components/shared/sidebar/UserMenuCell';
import type { ProjectType } from '@/types/projectType';

interface SidebarProps {
  featuredTypes: ProjectType[];
  isAdmin: boolean;
  workspace:
    | { kind: 'personal' }
    | { kind: 'org'; orgId: string; orgName: string };
  workspaceOrgs: OrgWorkspaceOption[];
  /** Either user uid (personal workspace) or org id (org workspace). */
  walletDisplay: {
    kind: 'personal' | 'org';
    orgId?: string;
    initialBalance: number;
    label: string;
  };
  locale: string;
}

export default function Sidebar({
  featuredTypes,
  isAdmin,
  workspace,
  workspaceOrgs,
  walletDisplay,
}: SidebarProps) {
  return (
    <aside className="w-[280px] bg-[var(--color-sidebar)] h-full flex flex-col border-r border-white/5 flex-shrink-0">
      <div className="px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30 flex items-center justify-center">
            <Bot size={14} className="text-[var(--color-accent)]" />
          </div>
          <span className="text-sm font-bold text-[var(--color-text-primary)] tracking-tight">
            Xanthix.ai
          </span>
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-y-auto pt-3">
        <CreditDisplay wallet={walletDisplay} />
        <NavMenu featuredTypes={featuredTypes} isAdmin={isAdmin} />
      </div>
      <UserMenuCell
        variant="user"
        workspace={workspace}
        workspaceOrgs={workspaceOrgs}
      />
    </aside>
  );
}
