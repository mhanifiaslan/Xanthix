import { notFound, redirect } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { getServerSession } from '@/lib/server/getServerSession';
import { getProjectTypeById } from '@/lib/server/projectTypes';
import { listGuidesForType } from '@/lib/server/projectTypeGuides';
import { routing } from '@/i18n/routing';
import GuidesClient from './GuidesClient';

export const dynamic = 'force-dynamic';

export default async function AdminProjectTypeGuidesPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await getServerSession();
  if (!session) redirect(`/${locale}/login`);
  if (session.role !== 'admin' && session.role !== 'super_admin') {
    redirect(`/${locale}`);
  }

  const type = await getProjectTypeById(id);
  if (!type) notFound();

  const guides = await listGuidesForType(id);

  return (
    <GuidesClient
      locale={locale}
      projectTypeId={id}
      projectTypeName={type.name.tr ?? type.name.en}
      initialGuides={guides.map((g) => ({
        id: g.id,
        title: g.title,
        originalFilename: g.originalFilename,
        pageCount: g.pageCount,
        chunkCount: g.chunkCount,
        status: g.status,
        statusMessage: g.statusMessage ?? null,
        active: g.active,
        uploadedAt:
          typeof g.uploadedAt === 'string'
            ? g.uploadedAt
            : g.uploadedAt?.toISOString() ?? null,
      }))}
    />
  );
}
