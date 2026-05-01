import { notFound, redirect } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { getServerSession } from '@/lib/server/getServerSession';
import { getProjectDoc, listSectionsByProject } from '@/lib/server/projects';
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
  if (project.ownerUid !== session.uid && session.role !== 'super_admin') {
    notFound();
  }

  const initialSections = await listSectionsByProject(id);

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
      }}
      initialSections={initialSections.map((s) => ({
        id: s.id,
        order: s.order,
        title: s.title,
        content: s.content,
        outputType: s.outputType,
        status: s.status,
        failureReason: s.failureReason ?? null,
      }))}
    />
  );
}
