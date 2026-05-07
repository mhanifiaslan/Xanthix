'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, FileEdit, Loader2, Sparkles, X } from 'lucide-react';
import { reviseSectionAction } from '@/lib/actions/projects';

interface InlineActionsProps {
  projectId: string;
  sectionId: string;
  outputType: string;
  canEdit: boolean;
  isEditing: boolean;
  saveStatus: 'saved' | 'saving' | 'error';
  onToggleEdit: () => void;
}

/**
 * Action strip beneath the live preview. The "edit manually" toggle is
 * controlled by the parent (so the parent can swap the preview for an
 * inline TipTap editor); the "revise with AI" prompt lives here as a local
 * inline drawer.
 */
export default function InlineActions({
  projectId,
  sectionId,
  outputType,
  canEdit,
  isEditing,
  saveStatus,
  onToggleEdit,
}: InlineActionsProps) {
  const t = useTranslations('projectView');
  const [revising, setRevising] = useState(false);
  const [reviseText, setReviseText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canEdit) return null;

  const submitRevise = () => {
    setError(null);
    if (reviseText.trim().length < 8) {
      setError(t('reviseRequestTooShort'));
      return;
    }
    startTransition(async () => {
      try {
        await reviseSectionAction({
          projectId,
          sectionId,
          instruction: reviseText.trim(),
        });
        setReviseText('');
        setRevising(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('reviseError'));
      }
    });
  };

  if (isEditing) {
    return (
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onToggleEdit}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white transition-colors"
        >
          {saveStatus === 'saving' ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <CheckCircle2 size={12} />
          )}
          {saveStatus === 'saving' ? t('sectionEditSaving') : t('sectionEditFinish')}
        </button>
      </div>
    );
  }

  if (revising) {
    return (
      <div className="rounded-md border border-[var(--color-accent)]/30 bg-gradient-to-br from-[var(--color-accent)]/5 to-transparent p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <Sparkles size={15} className="text-[var(--color-accent)]" />
            {t('reviseDialogTitle')}
          </p>
          <button
            type="button"
            onClick={() => {
              setRevising(false);
              setError(null);
            }}
            className="p-1 rounded-md text-[var(--color-text-secondary)] hover:text-white hover:bg-white/10 transition-colors"
            aria-label={t('reviseDialogClose')}
          >
            <X size={14} />
          </button>
        </div>
        <textarea
          rows={3}
          value={reviseText}
          onChange={(e) => setReviseText(e.target.value)}
          placeholder={t('revisePlaceholder')}
          disabled={isPending}
          className="w-full bg-[var(--color-background)] border border-white/10 rounded-md px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-y"
        />
        {error && (
          <p className="text-xs text-[var(--color-error)]">{error}</p>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={submitRevise}
            disabled={isPending || reviseText.trim().length < 8}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {isPending ? t('reviseSubmitting') : t('reviseSubmit')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => setRevising(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-[var(--color-accent)]/10 to-[#6b4cff]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 hover:border-[var(--color-accent)]/40 transition-colors"
      >
        <Sparkles size={13} />
        {t('reviseButton')}
      </button>
      {outputType !== 'gantt' && (
        <button
          type="button"
          onClick={onToggleEdit}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white/5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-white/10 hover:border-white/20 transition-colors"
        >
          <FileEdit size={13} />
          {t('sectionEditButton')}
        </button>
      )}
    </div>
  );
}
