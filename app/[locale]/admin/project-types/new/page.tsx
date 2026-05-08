import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { listCategories } from '@/lib/server/projectCategories';
import ProjectTypeBuilder from '../[id]/ProjectTypeBuilder';
import type { ProjectTypeWriteInput } from '@/types/projectType';

export const dynamic = 'force-dynamic';

const BLANK: ProjectTypeWriteInput = {
  id: '',
  slug: '',
  name: '',
  description: '',
  categoryId: null,
  subCategoryId: null,
  tier: 'standard',
  outputLanguage: 'auto',
  visibility: 'public',
  iconName: 'FolderGit2',
  active: true,
  version: '1.0.0',
  generatedFromGuide: false,
  sections: [
    {
      id: 'summary',
      order: 0,
      title: 'Project Summary',
      description: 'Summary of the project goal and objectives.',
      agentPromptTemplate:
        'Write a concise summary of the project based on:\n\nUser idea:\n{{userIdea}}\n\nKeep it grounded and concrete.',
      criteria: ['Clear and specific', 'Goals are measurable'],
      outputType: 'markdown',
    },
  ],
  evaluationCriteria: [],
  reportTemplates: [],
};

export default async function AdminProjectTypeNewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const categories = await listCategories({ includeInactive: false });

  return (
    <ProjectTypeBuilder
      initial={BLANK}
      mode="create"
      locale={locale}
      categories={categories}
    />
  );
}
