'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Loader2,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import {
  draftFromGuideAction,
  draftFromGuidePdfAction,
} from '@/lib/actions/projectTypes';
import EditForm from '../EditForm';
import type { ProjectTypeWriteInput } from '@/types/projectType';

type Lang = 'tr' | 'en' | 'es' | 'auto';

export default function FromGuideClient({ locale }: { locale: string }) {
  const [mode, setMode] = useState<'paste' | 'upload'>('upload');
  const [guide, setGuide] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState<Lang>('auto');
  const [draft, setDraft] = useState<ProjectTypeWriteInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileChosen = (f: File | null) => {
    setError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      setError('PDF 15 MB üzerinde olamaz.');
      return;
    }
    if (
      f.type !== 'application/pdf' &&
      !f.name.toLowerCase().endsWith('.pdf')
    ) {
      setError('Yalnızca PDF dosyası yükleyebilirsin.');
      return;
    }
    setFile(f);
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        let result: ProjectTypeWriteInput;
        if (mode === 'upload') {
          if (!file) {
            setError('Önce bir PDF dosyası seç.');
            return;
          }
          const fd = new FormData();
          fd.set('pdf', file);
          fd.set('hintLanguage', language);
          result = await draftFromGuidePdfAction(fd);
        } else {
          if (guide.trim().length < 80) {
            setError('Lütfen rehberden en az 80 karakter yapıştır.');
            return;
          }
          result = await draftFromGuideAction({
            guide: guide.trim(),
            hintLanguage: language,
          });
        }
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
            PDF rehberi yükle veya metin yapıştır — AI section yapısını ve prompt'ları çıkarsın.
          </p>
        </div>
      </header>

      <div className="px-8 py-8 max-w-3xl mx-auto space-y-6">
        <div className="rounded-2xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 p-5">
          <div className="flex items-start gap-3">
            <Sparkles size={20} className="text-[var(--color-accent)] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                Nasıl çalışır?
              </p>
              <ul className="mt-2 space-y-1.5 text-xs text-[var(--color-text-secondary)] list-disc pl-4">
                <li>
                  Resmi çağrı dokümanını PDF olarak yükle, ya da rehberden ilgili
                  bölümleri metin olarak yapıştır.
                </li>
                <li>
                  Üret butonuna bas — AI section listesi, prompt taslakları ve
                  metadata'yı çıkarır (~30-60 saniye).
                </li>
                <li>
                  Açılan editörde her şey düzenlenebilir.
                  Beğendiğinde <strong>Kaydet</strong>.
                </li>
                <li className="text-[var(--color-warning)]">
                  Taranmış (görsel) PDF'lerden metin çıkmaz; OCR'lı PDF kullan.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[var(--color-card)] border border-white/5">
          <button
            type="button"
            onClick={() => setMode('upload')}
            disabled={isPending}
            className={
              'flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ' +
              (mode === 'upload'
                ? 'bg-[var(--color-background)] text-[var(--color-text-primary)] shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]')
            }
          >
            <Upload size={14} /> PDF yükle
          </button>
          <button
            type="button"
            onClick={() => setMode('paste')}
            disabled={isPending}
            className={
              'flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ' +
              (mode === 'paste'
                ? 'bg-[var(--color-background)] text-[var(--color-text-primary)] shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]')
            }
          >
            <FileText size={14} /> Metin yapıştır
          </button>
        </div>

        {mode === 'upload' ? (
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
              PDF dosyası
            </label>
            {file ? (
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText size={20} className="text-[var(--color-accent)] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {(file.size / 1024).toLocaleString('tr-TR', {
                        maximumFractionDigits: 0,
                      })}{' '}
                      KB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-error)] transition-colors shrink-0"
                  aria-label="Dosyayı kaldır"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label
                htmlFor="pdf-input"
                className="block rounded-xl border-2 border-dashed border-white/10 hover:border-[var(--color-accent)]/40 transition-colors p-8 text-center cursor-pointer"
              >
                <Upload className="mx-auto mb-3 text-[var(--color-text-secondary)]" size={28} />
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  PDF dosyası seç
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  Çağrı rehberi · maksimum 15 MB · OCR'lı (metin tabanlı) PDF
                </p>
              </label>
            )}
            <input
              ref={fileInputRef}
              id="pdf-input"
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              onChange={(e) => onFileChosen(e.target.files?.[0] ?? null)}
              disabled={isPending}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-[var(--color-text-primary)]">
              Rehber metni
            </label>
            <textarea
              value={guide}
              onChange={(e) => setGuide(e.target.value)}
              rows={16}
              placeholder="Çağrı dokümanından kapsam, başvuru bölümleri ve kriterleri içeren bölümleri buraya yapıştır…"
              className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all resize-y"
              disabled={isPending}
            />
            <p className="text-xs text-[var(--color-text-secondary)]">
              {guide.trim().length} karakter / 80+ gerekli
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
            Çıktı dili önerisi
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Lang)}
            className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
            disabled={isPending}
          >
            <option value="auto">Otomatik (kullanıcı seçer)</option>
            <option value="tr">Türkçe</option>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
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
            disabled={
              isPending ||
              (mode === 'upload' ? !file : guide.trim().length < 80)
            }
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            {isPending
              ? mode === 'upload'
                ? 'PDF okunuyor + AI hazırlıyor…'
                : 'AI taslak hazırlıyor…'
              : 'Taslak üret'}
          </button>
        </div>
      </div>
    </div>
  );
}
