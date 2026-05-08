'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, FileUp, Loader2, Sparkles } from 'lucide-react';
import {
  draftFromGuideAction,
  draftFromGuidePdfAction,
} from '@/lib/actions/projectTypes';
import type { ProjectTypeWriteInput } from '@/types/projectType';
import type { ProjectCategory } from '@/types/projectCategory';
import ProjectTypeBuilder from '../[id]/ProjectTypeBuilder';
import { cn } from '@/lib/utils';

interface Props {
  locale: string;
  categories: ProjectCategory[];
}

type SourceMode = 'paste' | 'pdf';

export default function FromGuideClient({ locale, categories }: Props) {
  const t = useTranslations('admin.fromGuide');

  const [draft, setDraft] = useState<ProjectTypeWriteInput | null>(null);

  if (draft) {
    return (
      <ProjectTypeBuilder
        initial={draft}
        mode="create"
        locale={locale}
        categories={categories}
      />
    );
  }

  // The AI-suggested categoryHint is intentionally dropped on the floor —
  // admins resolve it to a real categoryId in the builder's General tab.
  return (
    <FromGuideForm
      locale={locale}
      onDrafted={(d) => setDraft(d)}
      t={t}
    />
  );
}

function FromGuideForm({
  locale,
  onDrafted,
  t,
}: {
  locale: string;
  onDrafted: (draft: ProjectTypeWriteInput) => void;
  t: ReturnType<typeof useTranslations<'admin.fromGuide'>>;
}) {
  const [mode, setMode] = useState<SourceMode>('paste');
  const [pasted, setPasted] = useState('');
  const [pdf, setPdf] = useState<File | null>(null);
  const [hintLanguage, setHintLanguage] = useState<'tr' | 'en' | 'es' | 'auto'>(
    'auto',
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleGenerate = () => {
    setError(null);
    if (mode === 'paste' && pasted.trim().length < 80) {
      setError(t('errorTooShort'));
      return;
    }
    if (mode === 'pdf' && !pdf) {
      setError(t('errorNoPdf'));
      return;
    }
    startTransition(async () => {
      try {
        if (mode === 'pdf' && pdf) {
          const fd = new FormData();
          fd.set('pdf', pdf);
          fd.set('hintLanguage', hintLanguage);
          const result = await draftFromGuidePdfAction(fd);
          onDrafted(result.draft);
        } else {
          const result = await draftFromGuideAction({
            guide: pasted,
            hintLanguage,
          });
          onDrafted(result.draft);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errorGeneric'));
      }
    });
  };

  return (
    <main className="min-h-full px-6 lg:px-10 py-12">
      <header className="max-w-3xl mx-auto mb-8 flex items-center gap-4">
        <Link
          href={`/${locale}/admin/project-types`}
          className="w-9 h-9 rounded-md bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={16} className="text-[var(--color-text-secondary)]" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
            {t('title')}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            {t('subtitle')}
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center gap-1 border border-white/10 rounded-md p-1 w-fit">
          <button
            type="button"
            onClick={() => setMode('paste')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded transition-colors',
              mode === 'paste'
                ? 'bg-white/10 text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
            )}
          >
            {t('tabPaste')}
          </button>
          <button
            type="button"
            onClick={() => setMode('pdf')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded transition-colors',
              mode === 'pdf'
                ? 'bg-white/10 text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
            )}
          >
            {t('tabPdf')}
          </button>
        </div>

        {mode === 'paste' ? (
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder={t('pastePlaceholder')}
            rows={14}
            className="w-full bg-[var(--color-card)] border border-white/10 rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] resize-y"
          />
        ) : (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full border border-dashed border-white/15 rounded-md p-10 flex flex-col items-center justify-center gap-2 text-[var(--color-text-secondary)] hover:border-white/25 hover:text-[var(--color-text-primary)] transition-colors"
            >
              <FileUp size={22} />
              <span className="text-sm">
                {pdf ? pdf.name : t('pdfDropzone')}
              </span>
              {pdf && (
                <span className="text-[11px] text-[var(--color-text-secondary)]/70">
                  {(pdf.size / 1024 / 1024).toFixed(2)} MB
                </span>
              )}
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <label className="text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)]">
            {t('outputLanguage')}
          </label>
          <select
            value={hintLanguage}
            onChange={(e) =>
              setHintLanguage(e.target.value as typeof hintLanguage)
            }
            className="bg-[var(--color-card)] border border-white/10 rounded-md px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
          >
            <option value="auto">auto</option>
            <option value="tr">tr</option>
            <option value="en">en</option>
            <option value="es">es</option>
          </select>
        </div>

        {error && (
          <div className="text-xs text-[var(--color-error)] bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-md bg-[var(--color-accent)] text-[var(--color-background)] hover:bg-[var(--color-accent)]/90 transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            {isPending ? t('generating') : t('generate')}
          </button>
        </div>

        <div className="text-[11px] text-[var(--color-text-secondary)]/70 leading-relaxed border-t border-white/5 pt-4">
          {t('helper')}
        </div>
      </div>
    </main>
  );
}
