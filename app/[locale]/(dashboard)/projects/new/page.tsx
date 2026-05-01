import { notFound, redirect } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { getServerSession } from '@/lib/server/getServerSession';
import { getProjectTypeBySlug } from '@/lib/server/projectTypes';
import { routing } from '@/i18n/routing';
import NewProjectForm from './NewProjectForm';

export const dynamic = 'force-dynamic';

export default async function NewProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await getServerSession();
  if (!session) redirect(`/${locale}/login`);

  const { type: typeSlug } = await searchParams;
  if (!typeSlug) redirect(`/${locale}/project-types`);

  const type = await getProjectTypeBySlug(typeSlug, { orgIds: session.orgIds });
  if (!type) notFound();

  return <NewProjectForm projectType={type} locale={locale} />;
}
