import { notFound, redirect } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { getServerSession } from '@/lib/server/getServerSession';
import { getProjectTypeBySlug } from '@/lib/server/projectTypes';
import { listOrgsForUser } from '@/lib/server/organizations';
import { getActiveWorkspace } from '@/lib/server/workspace';
import { routing } from '@/i18n/routing';
import NewProjectForm from './NewProjectForm';

export const dynamic = 'force-dynamic';

export default async function NewProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string; org?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await getServerSession();
  if (!session) redirect(`/${locale}/login`);

  const { type: typeSlug, org: preselectedOrg } = await searchParams;
  if (!typeSlug) redirect(`/${locale}/project-types`);

  // Pull the user's orgs + active workspace in parallel; the active
  // workspace becomes the default project context unless the URL pinned
  // a different one via ?org=.
  const [orgs, workspace] = await Promise.all([
    listOrgsForUser(session.uid),
    getActiveWorkspace(session.uid),
  ]);
  const orgIds = orgs.map((o) => o.id);

  const type = await getProjectTypeBySlug(typeSlug, { orgIds });
  if (!type) notFound();

  const fallbackContext =
    preselectedOrg ??
    (workspace.kind === 'org' ? workspace.orgId : null);

  return (
    <NewProjectForm
      projectType={type}
      locale={locale}
      orgs={orgs.map((o) => ({
        id: o.id,
        name: o.name,
        tokenBalance: o.tokenBalance,
      }))}
      preselectedOrgId={fallbackContext}
    />
  );
}
