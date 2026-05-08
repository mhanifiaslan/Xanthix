import { notFound, redirect } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { getServerSession } from '@/lib/server/getServerSession';
import { listCategories } from '@/lib/server/projectCategories';
import { routing } from '@/i18n/routing';
import CategoriesManager from './CategoriesManager';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await getServerSession();
  if (!session) redirect(`/${locale}/login`);
  if (session.role !== 'admin' && session.role !== 'super_admin') notFound();

  const categories = await listCategories({ includeInactive: true });

  return <CategoriesManager initial={categories} />;
}
