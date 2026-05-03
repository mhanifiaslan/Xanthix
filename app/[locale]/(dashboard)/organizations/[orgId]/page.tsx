import { notFound, redirect } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { getServerSession } from '@/lib/server/getServerSession';
import { getOrgDoc, listMembers, getMemberDoc } from '@/lib/server/organizations';
import { listPendingInvitations } from '@/lib/server/invitations';
import { listProjectsByOrg } from '@/lib/server/projects';
import { routing } from '@/i18n/routing';
import OrgDetail from './OrgDetail';

export const dynamic = 'force-dynamic';

export default async function OrgDetailPage({
  params,
}: {
  params: Promise<{ locale: string; orgId: string }>;
}) {
  const { locale, orgId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await getServerSession();
  if (!session) redirect(`/${locale}/login`);

  const myMembership = await getMemberDoc(orgId, session.uid);
  if (!myMembership && session.role !== 'super_admin') notFound();

  const [org, members, projects, invitations] = await Promise.all([
    getOrgDoc(orgId),
    listMembers(orgId),
    listProjectsByOrg(orgId),
    listPendingInvitations(orgId),
  ]);
  if (!org) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') ?? '';

  return (
    <OrgDetail
      locale={locale}
      org={{
        id: org.id,
        name: org.name,
        country: org.country ?? null,
        vatNumber: org.vatNumber ?? null,
        billingEmail: org.billingEmail ?? null,
        subscriptionTier: org.subscriptionTier,
        seatLimit: org.seatLimit,
        tokenBalance: org.tokenBalance,
        ownerUid: org.ownerUid,
      }}
      members={members.map((m) => ({
        uid: m.uid,
        email: m.email ?? null,
        name: m.name ?? null,
        role: m.role,
      }))}
      projects={projects.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        currentSectionIndex: p.currentSectionIndex,
        totalSections: p.totalSections,
        tokensSpent: p.tokensSpent,
        projectTypeSlug: p.projectTypeSlug,
      }))}
      invitations={invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        token: inv.token,
        acceptUrl: `${baseUrl}/${locale}/invite/${inv.token}`,
        expiresAt:
          typeof inv.expiresAt === 'string'
            ? inv.expiresAt
            : inv.expiresAt?.toISOString() ?? null,
      }))}
      myUid={session.uid}
      myRole={myMembership?.role ?? 'viewer'}
    />
  );
}
