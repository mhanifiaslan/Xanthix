'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

/**
 * Legacy editor route — redirects to the unified ProjectView which now
 * includes inline TipTap editing.
 */
export default function ProjectEditorPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('redirect');
  const projectId = params.id as string;

  useEffect(() => {
    if (projectId) {
      router.replace(`../${projectId}`);
    }
  }, [projectId, router]);

  return (
    <div className="flex items-center justify-center h-screen bg-[var(--color-background)]">
      <div className="flex items-center gap-3 text-[var(--color-text-secondary)]">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">{t('loading')}</span>
      </div>
    </div>
  );
}
