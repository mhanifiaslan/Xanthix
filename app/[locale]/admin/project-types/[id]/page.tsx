import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { getProjectTypeById } from '@/lib/server/projectTypes';
import { routing } from '@/i18n/routing';
import EditForm from '../EditForm';

export const dynamic = 'force-dynamic';

export default async function AdminProjectTypeEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const type = await getProjectTypeById(id);
  if (!type) notFound();

  return <EditForm initial={type} mode="edit" locale={locale} />;
}
