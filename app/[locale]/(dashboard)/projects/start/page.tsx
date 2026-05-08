import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { listProjectTypes, getProjectTypeBySlug } from '@/lib/server/projectTypes';
import { listCategories } from '@/lib/server/projectCategories';
import { listOrgsForUser } from '@/lib/server/organizations';
import { getServerSession } from '@/lib/server/getServerSession';
import { getActiveWorkspace } from '@/lib/server/workspace';
import { routing, type Locale } from '@/i18n/routing';
import SimpleStartForm from './SimpleStartForm';
import TypeGrid from './TypeGrid';

export const dynamic = 'force-dynamic';

interface SearchParams {
  type?: string;
  prompt?: string;
  cat?: string;
}

export default async function ProjectStartPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await getServerSession();
  if (!session) redirect(`/${locale}/login`);

  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: 'start' });
  const loc = locale as Locale;

  const workspace = await getActiveWorkspace(session.uid);
  const orgIds = workspace.kind === 'org' ? [workspace.orgId] : session.orgIds.slice();

  // ── Type selection screen ─────────────────────────────────────────────
  if (!sp.type) {
    const [types, categories] = await Promise.all([
      listProjectTypes({ orgIds }),
      listCategories({ includeInactive: false }),
    ]);

    return (
      <main className="min-h-full px-6 lg:px-10 py-12">
        <header className="max-w-4xl mx-auto mb-8 flex items-center gap-4">
          <Link
            href={`/${locale}/home`}
            className="w-10 h-10 rounded-md bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
            aria-label={t('backTitle')}
          >
            <ArrowLeft size={18} className="text-[var(--color-text-secondary)]" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              {t('selectTypeTitle')}
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              {t('selectTypeBody')}
            </p>
          </div>
        </header>

        <TypeGrid
          locale={locale}
          prompt={sp.prompt ?? ''}
          initialCategoryId={sp.cat ?? null}
          types={types.map((tp) => ({
            id: tp.id,
            slug: tp.slug,
            name: tp.name,
            description: tp.description,
            iconName: tp.iconName,
            tier: tp.tier,
            categoryId: tp.categoryId ?? null,
            subCategoryId: tp.subCategoryId ?? null,
            sectionsCount: tp.sections.length,
          }))}
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            parentId: c.parentId,
          }))}
        />
      </main>
    );
  }

  // ── Chat panel for the selected type ─────────────────────────────────
  const projectType = await getProjectTypeBySlug(sp.type, { orgIds });
  if (!projectType) notFound();

  const orgs = await listOrgsForUser(session.uid);
  const orgOptions = orgs.map((o) => ({
    id: o.id,
    name: o.name,
    tokenBalance: o.tokenBalance,
  }));

  return (
    <SimpleStartForm
      locale={locale}
      projectType={{
        id: projectType.id,
        slug: projectType.slug,
        name: projectType.name,
        description: projectType.description,
        iconName: projectType.iconName,
        tier: projectType.tier,
        visibility: projectType.visibility,
        sections: projectType.sections.map((s) => ({
          id: s.id,
          title: s.title,
        })),
      }}
      orgs={orgOptions}
      preselectedOrgId={
        workspace.kind === 'org' ? workspace.orgId : null
      }
      initialPrompt={sp.prompt ?? ''}
    />
  );
}
