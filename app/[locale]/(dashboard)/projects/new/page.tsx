import { notFound, redirect } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { getServerSession } from '@/lib/server/getServerSession';
import { getProjectTypeBySlug } from '@/lib/server/projectTypes';
import { listOrgsForUser } from '@/lib/server/organizations';
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

  // Pull the user's orgs from Firestore directly so newly-joined orgs show
  // up even before the session cookie rotates.
  const orgs = await listOrgsForUser(session.uid);
  const orgIds = orgs.map((o) => o.id);

  const type = await getProjectTypeBySlug(typeSlug, { orgIds });
  if (!type) notFound();

  return (
    <NewProjectForm
      projectType={type}
      locale={locale}
      orgs={orgs.map((o) => ({
        id: o.id,
        name: o.name,
        tokenBalance: o.tokenBalance,
      }))}
      preselectedOrgId={preselectedOrg ?? null}
    />
  );
}
