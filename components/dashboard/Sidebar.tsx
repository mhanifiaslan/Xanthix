'use client';

import CreditDisplay from './CreditDisplay';
import NavMenu from './NavMenu';
import WorkspaceSwitcher, {
  type WorkspaceOption,
} from './WorkspaceSwitcher';
import type { ProjectType } from '@/types/projectType';

interface SidebarProps {
  featuredTypes: ProjectType[];
  isAdmin: boolean;
  workspace:
    | { kind: 'personal' }
    | { kind: 'org'; orgId: string; orgName: string };
  workspaceOrgs: WorkspaceOption[];
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
  locale,
}: SidebarProps) {
  return (
    <aside className="w-[280px] bg-[var(--color-sidebar)] h-full flex flex-col border-r border-white/5 flex-shrink-0">
      <div className="flex-1 flex flex-col pt-4 overflow-y-auto">
        <WorkspaceSwitcher
          active={workspace}
          orgs={workspaceOrgs}
          locale={locale}
        />
        <CreditDisplay wallet={walletDisplay} />
        <NavMenu featuredTypes={featuredTypes} isAdmin={isAdmin} />
      </div>
    </aside>
  );
}
