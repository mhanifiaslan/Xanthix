'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { draftFromGuideAction } from '@/lib/actions/projectTypes';
import EditForm from '../EditForm';
import type { ProjectTypeWriteInput } from '@/types/projectType';

export default function FromGuideClient({ locale }: { locale: string }) {
  const [guide, setGuide] = useState('');
  const [language, setLanguage] = useState<'tr' | 'en' | 'es' | 'auto'>('auto');
  const [draft, setDraft] = useState<ProjectTypeWriteInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await draftFromGuideAction({
          guide: guide.trim(),
          hintLanguage: language,
        });
        setDraft(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Taslak oluşturulamadı.');
      }
    });
  };

  if (draft) {
    return <EditForm initial={draft} mode="create" locale={locale} />;
  }

  return (
    <div className="min-h-full pb-12">
      <header className="px-8 py-5 border-b border-white/5 flex items-center gap-4">
        <Link
          href={`/${locale}/admin/project-types`}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
        >
          <ArrowLeft size={18} className="text-[var(--color-text-secondary)]" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
            AI ile rehberden taslak oluştur
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Çağrı rehberini yapıştır, AI section yapısını ve prompt'ları taslak olarak çıkarsın.
          </p>
        </div>
      </header>

      <div className="px-8 py-8 max-w-3xl mx-auto space-y-6">
        <div className="rounded-2xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 p-5">
          <div className="flex items-start gap-3 mb-3">
            <Sparkles size={20} className="text-[var(--color-accent)] mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                Nasıl çalışır?
              </p>
              <ul className="mt-2 space-y-1.5 text-xs text-[var(--color-text-secondary)] list-disc pl-4">
                <li>
                  Resmi çağrı dokümanından (TÜBİTAK, AB, KOSGEB, vs) ilgili kısımları
                  buraya yapıştır — kapsam, başvuru bölümleri, değerlendirme kriterleri.
                </li>
                <li>
                  Üret butonuna bas. AI section listesini, prompt taslaklarını ve metadata'yı
                  doldurur. ~30-60 saniye sürer.
                </li>
                <li>
                  Açılan editörde her şeyi düzenleyebilirsin. Beğendiğinde
                  <strong> Kaydet</strong>.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-[var(--color-text-primary)]">
            Rehber metni
          </label>
          <textarea
            value={guide}
            onChange={(e) => setGuide(e.target.value)}
            rows={20}
            placeholder="Çağrı dokümanından kapsam, başvuru bölümleri ve kriterleri içeren bölümleri buraya yapıştır…"
            className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all resize-y"
            disabled={isPending}
          />
          <p className="text-xs text-[var(--color-text-secondary)]">
            {guide.trim().length} karakter / 80+ karakter gerekli
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
              Çıktı dili önerisi
            </label>
            <select
              value={language}
              onChange={(e) =>
                setLanguage(e.target.value as 'tr' | 'en' | 'es' | 'auto')
              }
              className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
              disabled={isPending}
            >
              <option value="auto">Otomatik (kullanıcı seçer)</option>
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-xl px-4 py-3 text-sm text-[var(--color-error)]">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={isPending || guide.trim().length < 80}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            {isPending ? 'AI taslak hazırlıyor…' : 'Taslak üret'}
          </button>
        </div>
      </div>
    </div>
  );
}
