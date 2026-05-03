import { notFound, redirect } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { getServerSession } from '@/lib/server/getServerSession';
import { getProjectDoc, listSectionsByProject } from '@/lib/server/projects';
import { getMemberDoc, getOrgDoc } from '@/lib/server/organizations';
import { routing } from '@/i18n/routing';
import ProjectView from './ProjectView';

export const dynamic = 'force-dynamic';

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await getServerSession();
  if (!session) redirect(`/${locale}/login`);

  const project = await getProjectDoc(id);
  if (!project) notFound();

  // Owner, super_admin, or any member of the project's org can view it.
  const isOwner = project.ownerUid === session.uid;
  const isSuperAdmin = session.role === 'super_admin';
  let isOrgMember = false;
  if (!isOwner && !isSuperAdmin && project.orgId) {
    const member = await getMemberDoc(project.orgId, session.uid);
    isOrgMember = !!member;
  }
  if (!isOwner && !isSuperAdmin && !isOrgMember) {
    notFound();
  }

  const [initialSections, org] = await Promise.all([
    listSectionsByProject(id),
    project.orgId ? getOrgDoc(project.orgId) : Promise.resolve(null),
  ]);

  return (
    <ProjectView
      projectId={id}
      locale={locale}
      initialProject={{
        title: project.title,
        idea: project.idea,
        status: project.status,
        currentSectionIndex: project.currentSectionIndex,
        totalSections: project.totalSections,
        tokensSpent: project.tokensSpent,
        failureReason: project.failureReason ?? null,
        outputLanguage: project.outputLanguage,
        projectTypeSlug: project.projectTypeSlug,
        orgId: project.orgId ?? null,
        orgName: org?.name ?? null,
      }}
      initialSections={initialSections.map((s) => ({
        id: s.id,
        order: s.order,
        title: s.title,
        content: s.content,
        outputType: s.outputType,
        status: s.status,
        failureReason: s.failureReason ?? null,
        scorecard: s.scorecard ?? null,
      }))}
    />
  );
}
