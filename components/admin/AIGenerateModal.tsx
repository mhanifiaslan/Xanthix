'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { FileUp, Loader2, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  generateCriteriaAction,
  generateEvaluationCriteriaAction,
  generateFillingInstructionsAction,
  generatePromptTemplateAction,
} from '@/lib/actions/projectTypeAI';
import type { EvaluationCriterion } from '@/types/projectType';
import Markdown from '@/components/shared/Markdown';

export type AIGenerateMode =
  | 'prompt-template'
  | 'criteria'
  | 'evaluation-criteria'
  | 'filling-instructions';

export interface AIGenerateContext {
  projectTypeName?: string;
  projectTypeDescription?: string;
  sectionTitle?: string;
  sectionDescription?: string;
  reportTemplateName?: string;
  outputLanguage?: 'tr' | 'en' | 'es' | 'auto';
}

type AcceptValue = string | string[] | EvaluationCriterion[];

interface Props {
  mode: AIGenerateMode;
  context: AIGenerateContext;
  onAccept: (value: AcceptValue) => void;
  onClose: () => void;
}

type SourceTab = 'paste' | 'pdf';

interface PreviewState {
  // The shape varies by mode — kept loose here, narrow in the renderer.
  raw: AcceptValue;
}

export default function AIGenerateModal({
  mode,
  context,
  onAccept,
  onClose,
}: Props) {
  const t = useTranslations('admin.builder.aiGenerate');
  const [tab, setTab] = useState<SourceTab>('paste');
  const [pasted, setPasted] = useState('');
  const [pdf, setPdf] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // Lock body scroll while modal is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ESC to close.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const buildFormData = (): FormData => {
    const fd = new FormData();
    fd.set('projectTypeName', context.projectTypeName ?? '');
    fd.set('projectTypeDescription', context.projectTypeDescription ?? '');
    fd.set('sectionTitle', context.sectionTitle ?? '');
    fd.set('sectionDescription', context.sectionDescription ?? '');
    fd.set('reportTemplateName', context.reportTemplateName ?? '');
    fd.set('outputLanguage', context.outputLanguage ?? 'auto');
    if (tab === 'pdf' && pdf) {
      fd.set('pdf', pdf);
    } else if (tab === 'paste') {
      fd.set('sourceText', pasted);
    }
    return fd;
  };

  const handleGenerate = () => {
    setError(null);
    setPreview(null);
    if (tab === 'paste' && pasted.trim().length < 30) {
      setError(t('errorTooShort'));
      return;
    }
    if (tab === 'pdf' && !pdf) {
      setError(t('errorNoPdf'));
      return;
    }
    const fd = buildFormData();
    startTransition(async () => {
      try {
        let result: AcceptValue;
        if (mode === 'prompt-template') {
          const r = await generatePromptTemplateAction(fd);
          result = r.promptTemplate;
        } else if (mode === 'criteria') {
          const r = await generateCriteriaAction(fd);
          result = r.criteria;
        } else if (mode === 'evaluation-criteria') {
          const r = await generateEvaluationCriteriaAction(fd);
          result = r.criteria;
        } else {
          const r = await generateFillingInstructionsAction(fd);
          result = r.instructions;
        }
        setPreview({ raw: result });
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errorGeneric'));
      }
    });
  };

  const accept = () => {
    if (!preview) return;
    onAccept(preview.raw);
    onClose();
  };

  const title = (() => {
    switch (mode) {
      case 'prompt-template':
        return t('titlePromptTemplate');
      case 'criteria':
        return t('titleCriteria');
      case 'evaluation-criteria':
        return t('titleEvaluationCriteria');
      case 'filling-instructions':
        return t('titleFillingInstructions');
    }
  })();

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl max-h-[90vh] bg-[var(--color-card)] border border-white/10 rounded-md shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-white/5">
          <div className="w-9 h-9 rounded-md bg-[var(--color-accent)]/15 text-[var(--color-accent)] flex items-center justify-center shrink-0">
            <Sparkles size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)]/70">
              {t('subtitle')}
            </p>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)] truncate">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5 flex items-center justify-center"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 border border-white/10 rounded-md p-1 w-fit">
            <button
              type="button"
              onClick={() => setTab('paste')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded transition-colors',
                tab === 'paste'
                  ? 'bg-white/10 text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
              )}
            >
              {t('tabPaste')}
            </button>
            <button
              type="button"
              onClick={() => setTab('pdf')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded transition-colors',
                tab === 'pdf'
                  ? 'bg-white/10 text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
              )}
            >
              {t('tabPdf')}
            </button>
          </div>

          {tab === 'paste' ? (
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder={t('pastePlaceholder')}
              rows={8}
              className="w-full bg-[var(--color-background)] border border-white/10 rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] resize-y"
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
                className="w-full border border-dashed border-white/15 rounded-md p-6 flex flex-col items-center justify-center gap-2 text-[var(--color-text-secondary)] hover:border-white/25 hover:text-[var(--color-text-primary)] transition-colors"
              >
                <FileUp size={20} />
                <span className="text-sm">
                  {pdf ? pdf.name : t('pdfDropzone')}
                </span>
                {pdf && (
                  <span className="text-[11px] text-[var(--color-text-secondary)]/70">
                    {(pdf.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                )}
              </button>
              {pdf && (
                <button
                  type="button"
                  onClick={() => setPdf(null)}
                  className="mt-2 text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-error)]"
                >
                  {t('clearPdf')}
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="text-xs text-[var(--color-error)] bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {preview && <Preview mode={mode} value={preview.raw} t={t} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm rounded-md border border-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-white/20 transition-colors disabled:opacity-50"
          >
            {t('cancel')}
          </button>

          {preview ? (
            <>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md border border-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-white/20 transition-colors disabled:opacity-50"
              >
                {isPending && <Loader2 size={13} className="animate-spin" />}
                {t('regenerate')}
              </button>
              <button
                type="button"
                onClick={accept}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-[var(--color-accent)] text-[var(--color-background)] hover:bg-[var(--color-accent)]/90 transition-colors disabled:opacity-50"
              >
                {t('accept')}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-[var(--color-accent)] text-[var(--color-background)] hover:bg-[var(--color-accent)]/90 transition-colors disabled:opacity-50"
            >
              {isPending && <Loader2 size={13} className="animate-spin" />}
              <Sparkles size={13} />
              {isPending ? t('generating') : t('generate')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Preview renderer ───────────────────────────────────────────────────────

function Preview({
  mode,
  value,
  t,
}: {
  mode: AIGenerateMode;
  value: AcceptValue;
  t: ReturnType<typeof useTranslations<'admin.builder.aiGenerate'>>;
}) {
  return (
    <div className="border border-white/10 rounded-md bg-[var(--color-background)]/50 p-4 space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-[var(--color-accent)] font-semibold">
        {t('previewLabel')}
      </p>

      {mode === 'prompt-template' && typeof value === 'string' && (
        <pre className="text-[12px] font-mono text-[var(--color-text-primary)] whitespace-pre-wrap">
          {value}
        </pre>
      )}

      {mode === 'filling-instructions' && typeof value === 'string' && (
        <Markdown>{value}</Markdown>
      )}

      {mode === 'criteria' && Array.isArray(value) && (
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-[var(--color-text-primary)]">
          {(value as string[]).map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      )}

      {mode === 'evaluation-criteria' && Array.isArray(value) && (
        <ul className="space-y-2">
          {(value as EvaluationCriterion[]).map((c) => (
            <li
              key={c.id}
              className="border border-white/5 rounded-md p-3 bg-[var(--color-card)]/40"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {c.name}
                </p>
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]/70">
                  weight {c.weight}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                {c.description}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
