import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getServerSession } from '@/lib/server/getServerSession';
import { listProjectTypes } from '@/lib/server/projectTypes';
import { listOrgsWithMembershipForUser } from '@/lib/server/organizations';
import { getActiveWorkspace } from '@/lib/server/workspace';
import {
  getTokenBalance,
  listProjectsByOrg,
  listProjectsByOwner,
} from '@/lib/server/projects';
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

  // Scope project types + wallet + recents to the active workspace, in parallel.
  const effectiveOrgIds =
    workspace.kind === 'org' ? [workspace.orgId] : [];
  const [featuredTypes, walletBalance, recentsRaw] = await Promise.all([
    listProjectTypes({ orgIds: effectiveOrgIds }),
    getTokenBalance({
      userId: session.uid,
      orgId: workspace.kind === 'org' ? workspace.orgId : null,
    }),
    workspace.kind === 'org'
      ? listProjectsByOrg(workspace.orgId)
      : listProjectsByOwner(session.uid),
  ]);

  // Personal workspace: hide org-scoped projects so the sidebar matches Home.
  const recentsScoped =
    workspace.kind === 'org'
      ? recentsRaw
      : recentsRaw.filter((p) => !p.orgId);
  const recents = recentsScoped
    .slice()
    .sort(
      (a, b) =>
        new Date(b.updatedAt ?? 0).getTime() -
        new Date(a.updatedAt ?? 0).getTime(),
    )
    .slice(0, 5)
    .map((p) => ({ id: p.id, title: p.title }));

  const workspaceOrgs = orgPairs.map(({ org, member }) => ({
    kind: 'org' as const,
    orgId: org.id,
    name: org.name,
    role: member.role,
    memberCount: undefined,
  }));

  const tWallet = await getTranslations({ locale, namespace: 'wallet' });
  const walletLabel =
    workspace.kind === 'org'
      ? tWallet('orgLabel', { name: workspace.orgName })
      : tWallet('personalLabel');

  return (
    <DashboardLayoutClient
      sidebar={
        <Sidebar
          featuredTypes={featuredTypes.slice(0, 4)}
          isAdmin={isAdmin}
          workspace={workspace}
          workspaceOrgs={workspaceOrgs}
          recents={recents}
          walletDisplay={{
            kind: workspace.kind === 'org' ? 'org' : 'personal',
            orgId: workspace.kind === 'org' ? workspace.orgId : undefined,
            initialBalance: walletBalance,
            label: walletLabel,
          }}
          locale={locale}
        />
      }
    >
      {children}
    </DashboardLayoutClient>
  );
}
