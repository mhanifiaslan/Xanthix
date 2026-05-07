'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowUp, Mic, Plus, SlidersHorizontal } from 'lucide-react';

/**
 * Home chat input — sits at the bottom of the home content area. Pressing
 * Enter (or the send arrow) navigates to the onboarder at /projects/start
 * with the prompt encoded in the URL.
 */
export default function HomeChatBar() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('home');
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    const params = new URLSearchParams({ prompt: trimmed });
    router.push(`/${locale}/projects/start?${params.toString()}`);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const onInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    setValue(el.value);
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  };

  return (
    <div className="w-full bg-[var(--color-card)] border border-white/10 rounded-lg shadow-lg shadow-black/30 transition-colors focus-within:border-[var(--color-accent)]/40">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onInput}
        onKeyDown={onKeyDown}
        rows={1}
        placeholder={t('chatPlaceholder')}
        className="w-full resize-none bg-transparent px-5 pt-4 pb-2 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/70 focus:outline-none"
      />
      <div className="flex items-center justify-between px-2 py-2 border-t border-white/5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Attach"
            className="w-8 h-8 rounded-md hover:bg-white/5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors flex items-center justify-center"
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            aria-label="Settings"
            className="w-8 h-8 rounded-md hover:bg-white/5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors flex items-center justify-center"
          >
            <SlidersHorizontal size={14} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[var(--color-text-secondary)] px-2.5 py-1 rounded-md bg-white/5 border border-white/5">
            {t('modeAuto')}
          </span>
          <button
            type="button"
            aria-label={t('voiceLabel')}
            title={t('voiceLabel')}
            className="w-8 h-8 rounded-md hover:bg-white/5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors flex items-center justify-center"
          >
            <Mic size={15} />
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={value.trim().length === 0}
            aria-label={t('sendLabel')}
            className="w-8 h-8 rounded-md bg-[var(--color-text-primary)] text-[var(--color-background)] hover:bg-[var(--color-text-primary)]/85 disabled:bg-white/10 disabled:text-[var(--color-text-secondary)]/40 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            <ArrowUp size={15} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
