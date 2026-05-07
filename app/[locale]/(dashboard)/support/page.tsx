'use client';

import { useState } from 'react';
import { MessageSquare, Mail, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function SupportPage() {
  const t = useTranslations('support');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setSubject('');
      setMessage('');
    }, 3000);
  };

  return (
    <div className="min-h-full pb-12">
      <header className="px-8 py-6 border-b border-white/5">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
          {t('title')}
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
          {t('subtitle')}
        </p>
      </header>

      <div className="px-8 py-8 max-w-3xl mx-auto space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href={`mailto:${t('emailAddress')}`}
            className="flex items-center gap-4 p-5 bg-[var(--color-card)] border border-white/5 rounded-2xl hover:border-white/10 transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center">
              <Mail size={18} className="text-[var(--color-accent)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                {t('emailTitle')}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {t('emailAddress')}
              </p>
            </div>
          </a>
          <div className="flex items-center gap-4 p-5 bg-[var(--color-card)] border border-white/5 rounded-2xl text-left">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 flex items-center justify-center">
              <MessageSquare size={18} className="text-[var(--color-success)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {t('chatTitle')}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {t('chatHours')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-6">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">
            {t('formTitle')}
          </h2>
          {sent ? (
            <div className="flex items-center gap-3 p-4 bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 rounded-xl">
              <CheckCircle2 size={18} className="text-[var(--color-success)]" />
              <p className="text-sm text-[var(--color-success)] font-medium">
                {t('sent')}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                  {t('subjectLabel')}
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  placeholder={t('subjectPlaceholder')}
                  className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                  {t('messageLabel')}
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={5}
                  placeholder={t('messagePlaceholder')}
                  className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all resize-none"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {t('submit')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
