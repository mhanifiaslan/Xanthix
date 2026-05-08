import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { getProjectTypeById } from '@/lib/server/projectTypes';
import { listCategories } from '@/lib/server/projectCategories';
import { routing } from '@/i18n/routing';
import ProjectTypeBuilder from './ProjectTypeBuilder';

export const dynamic = 'force-dynamic';

export default async function AdminProjectTypeEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [type, categories] = await Promise.all([
    getProjectTypeById(id),
    listCategories({ includeInactive: false }),
  ]);
  if (!type) notFound();

  return (
    <ProjectTypeBuilder
      initial={type}
      mode="edit"
      locale={locale}
      categories={categories}
    />
  );
}
