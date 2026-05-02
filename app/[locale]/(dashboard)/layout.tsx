import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/server/getServerSession';
import { listProjectTypes } from '@/lib/server/projectTypes';
import {
  getMemberDoc,
  listOrgsForUser,
} from '@/lib/server/organizations';
import { getActiveWorkspace } from '@/lib/server/workspace';
import { getTokenBalance } from '@/lib/server/projects';
import Sidebar from '@/components/dashboard/Sidebar';
import DashboardLayoutClient from './layout-client';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getServerSession();
  if (!session) redirect(`/${locale}/login`);

  const isAdmin =
    session.role === 'admin' || session.role === 'super_admin';

  // Resolve the active workspace and the user's org list in parallel; the
  // sidebar needs both for the switcher + scoped queries.
  const [workspace, orgs] = await Promise.all([
    getActiveWorkspace(session.uid),
    listOrgsForUser(session.uid),
  ]);

  // Scope project types by workspace: org workspace → public + that org's
  // org_only types; personal workspace → public only.
  const effectiveOrgIds =
    workspace.kind === 'org' ? [workspace.orgId] : [];
  const featuredTypes = await listProjectTypes({ orgIds: effectiveOrgIds });

  // Wallet balance for the active workspace.
  const walletBalance = await getTokenBalance({
    userId: session.uid,
    orgId: workspace.kind === 'org' ? workspace.orgId : null,
  });

  // For each org in the switcher, surface the user's role for the
  // subtitle.
  const workspaceOrgs = await Promise.all(
    orgs.map(async (o) => {
      const member = await getMemberDoc(o.id, session.uid);
      return {
        kind: 'org' as const,
        orgId: o.id,
        name: o.name,
        role: member?.role,
        memberCount: undefined,
      };
    }),
  );

  return (
    <DashboardLayoutClient
      sidebar={
        <Sidebar
          featuredTypes={featuredTypes.slice(0, 4)}
          isAdmin={isAdmin}
          workspace={workspace}
          workspaceOrgs={workspaceOrgs}
          walletDisplay={{
            kind: workspace.kind === 'org' ? 'org' : 'personal',
            orgId: workspace.kind === 'org' ? workspace.orgId : undefined,
            initialBalance: walletBalance,
            label:
              workspace.kind === 'org'
                ? `${workspace.orgName} cüzdanı`
                : 'Kişisel bakiye',
          }}
          locale={locale}
        />
      }
    >
      {children}
    </DashboardLayoutClient>
  );
}
