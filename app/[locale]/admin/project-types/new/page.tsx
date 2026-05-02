import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import EditForm from '../EditForm';
import type { ProjectTypeWriteInput } from '@/types/projectType';

export const dynamic = 'force-dynamic';

const BLANK: ProjectTypeWriteInput = {
  id: '',
  slug: '',
  name: { tr: '', en: '', es: '' },
  description: { tr: '', en: '', es: '' },
  category: 'custom',
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
      title: { tr: 'Proje Özeti', en: 'Project Summary', es: 'Resumen' },
      description: {
        tr: 'Projenin amacı ve hedeflerinin özeti.',
        en: 'Summary of the project goal and objectives.',
        es: 'Resumen del objetivo y los objetivos del proyecto.',
      },
      agentPromptTemplate:
        'Write a concise summary of the project based on:\n\nUser idea:\n{{userIdea}}\n\nKeep it grounded and concrete.',
      criteria: ['Açık ve spesifik', 'Hedefler ölçülebilir'],
      outputType: 'markdown',
      requiresUserInput: false,
    },
  ],
};

export default async function AdminProjectTypeNewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return <EditForm initial={BLANK} mode="create" locale={locale} />;
}
