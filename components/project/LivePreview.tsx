'use client';

import { useTranslations } from 'next-intl';
import Markdown from '@/components/shared/Markdown';
import GanttView from '@/components/shared/GanttView';

interface LivePreviewProps {
  content: string;
  outputType: string;
  /** When true, render the typing caret indicator. */
  isStreaming: boolean;
  locale: string;
}

/**
 * Center-pane content area showing the current section's rendered output.
 * When `isStreaming` is true, a caret blinks at the end to make progress
 * obvious. Empty state shows a hint until any content arrives.
 */
export default function LivePreview({
  content,
  outputType,
  isStreaming,
  locale,
}: LivePreviewProps) {
  const t = useTranslations('projectView');

  if (!content && !isStreaming) {
    return (
      <div className="rounded-md border border-dashed border-white/10 bg-[var(--color-card)]/30 px-6 py-12 text-center">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {t('previewEmpty')}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-white/5 bg-[var(--color-card)]/60 p-5 lg:p-6 min-h-[200px]">
      {outputType === 'gantt' ? (
        <GanttView content={content} locale={locale} />
      ) : (
        <div className="relative">
          <Markdown>{content}</Markdown>
          {isStreaming && (
            <span
              aria-hidden
              className="inline-block w-2 h-5 align-middle ml-0.5 bg-[var(--color-accent)] animate-pulse"
            />
          )}
        </div>
      )}
    </div>
  );
}
