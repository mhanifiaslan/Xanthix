'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Legacy editor route — now redirects to the unified ProjectView
 * which includes inline TipTap editing.
 *
 * @module editor/page
 * @see SKILLS.md Faz 6 - Workspace ve Belge Üretimi
 */
export default function ProjectEditorPage() {
  const params = useParams();
  const router = useRouter();
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
        <span className="text-sm">Proje görünümüne yönlendiriliyor…</span>
      </div>
    </div>
  );
}
