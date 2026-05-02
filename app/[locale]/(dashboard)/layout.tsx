import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/server/getServerSession';
import { listProjectTypes } from '@/lib/server/projectTypes';
import { listOrgsWithMembershipForUser } from '@/lib/server/organizations';
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

  // Single collectionGroup roundtrip returns every (org, member) pair the
  // user belongs to — used for both the workspace switcher subtitles and
  // the active-workspace validation. No more N+1 getMemberDoc loops.
  const [workspace, orgPairs] = await Promise.all([
    getActiveWorkspace(session.uid),
    listOrgsWithMembershipForUser(session.uid),
  ]);

  // Scope project types + wallet to the active workspace, in parallel.
  const effectiveOrgIds =
    workspace.kind === 'org' ? [workspace.orgId] : [];
  const [featuredTypes, walletBalance] = await Promise.all([
    listProjectTypes({ orgIds: effectiveOrgIds }),
    getTokenBalance({
      userId: session.uid,
      orgId: workspace.kind === 'org' ? workspace.orgId : null,
    }),
  ]);

  const workspaceOrgs = orgPairs.map(({ org, member }) => ({
    kind: 'org' as const,
    orgId: org.id,
    name: org.name,
    role: member.role,
    memberCount: undefined,
  }));

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
