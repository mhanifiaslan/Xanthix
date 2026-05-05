'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  deleteGuideAction,
  listGuidesAction,
  setActiveGuideAction,
  uploadGuideAction,
} from '@/lib/actions/projectTypeGuides';

interface GuideView {
  id: string;
  title: string;
  originalFilename: string;
  pageCount: number;
  chunkCount: number;
  status: 'processing' | 'ready' | 'failed';
  statusMessage: string | null;
  active: boolean;
  uploadedAt: string | null;
}

interface Props {
  locale: string;
  projectTypeId: string;
  projectTypeName: string;
  initialGuides: GuideView[];
}

const MAX_PDF_BYTES = 15 * 1024 * 1024;

export default function GuidesClient({
  locale,
  projectTypeId,
  projectTypeName,
  initialGuides,
}: Props) {
  const router = useRouter();
  const [guides, setGuides] = useState<GuideView[]>(initialGuides);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [setActive, setSetActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadPending, startUploadTransition] = useTransition();
  const [actionPending, startActionTransition] = useTransition();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll while any guide is still processing — embedding can take 30-90s.
  useEffect(() => {
    const hasProcessing = guides.some((g) => g.status === 'processing');
    if (!hasProcessing) return;
    const t = setInterval(async () => {
      try {
        const fresh = await listGuidesAction({ projectTypeId });
        setGuides(
          fresh.map((g) => ({
            id: g.id,
            title: g.title,
            originalFilename: g.originalFilename,
            pageCount: g.pageCount,
            chunkCount: g.chunkCount,
            status: g.status,
            statusMessage: g.statusMessage ?? null,
            active: g.active,
            uploadedAt:
              typeof g.uploadedAt === 'string'
                ? g.uploadedAt
                : g.uploadedAt?.toISOString() ?? null,
          })),
        );
      } catch {
        // network blip; next tick will retry
      }
    }, 3000);
    return () => clearInterval(t);
  }, [guides, projectTypeId]);

  const onFileChosen = (f: File | null) => {
    setError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > MAX_PDF_BYTES) {
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
    if (!title.trim()) {
      setTitle(f.name.replace(/\.pdf$/i, ''));
    }
  };

  const handleUpload = () => {
    setError(null);
    if (!file) {
      setError('Önce bir PDF dosyası seç.');
      return;
    }
    if (!title.trim()) {
      setError('Klavuza bir başlık ver.');
      return;
    }
    startUploadTransition(async () => {
      try {
        const fd = new FormData();
        fd.set('projectTypeId', projectTypeId);
        fd.set('title', title.trim());
        fd.set('pdf', file);
        fd.set('setActive', setActive ? 'true' : 'false');
        await uploadGuideAction(fd);
        // Reset form, then refresh list from server.
        setFile(null);
        setTitle('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        const fresh = await listGuidesAction({ projectTypeId });
        setGuides(
          fresh.map((g) => ({
            id: g.id,
            title: g.title,
            originalFilename: g.originalFilename,
            pageCount: g.pageCount,
            chunkCount: g.chunkCount,
            status: g.status,
            statusMessage: g.statusMessage ?? null,
            active: g.active,
            uploadedAt:
              typeof g.uploadedAt === 'string'
                ? g.uploadedAt
                : g.uploadedAt?.toISOString() ?? null,
          })),
        );
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Yükleme başarısız.');
      }
    });
  };

  const handleSetActive = (guideId: string) => {
    startActionTransition(async () => {
      try {
        await setActiveGuideAction({ projectTypeId, guideId });
        setGuides((prev) =>
          prev.map((g) => ({ ...g, active: g.id === guideId })),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Aktif yapılamadı.');
      }
    });
  };

  const handleDelete = (guideId: string) => {
    startActionTransition(async () => {
      try {
        await deleteGuideAction({ projectTypeId, guideId });
        setGuides((prev) => prev.filter((g) => g.id !== guideId));
        setConfirmDeleteId(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Silme başarısız.');
      }
    });
  };

  return (
    <div className="min-h-full pb-12">
      <header className="px-8 py-5 border-b border-white/5 flex items-center gap-4">
        <Link
          href={`/${locale}/admin/project-types/${projectTypeId}`}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
        >
          <ArrowLeft size={18} className="text-[var(--color-text-secondary)]" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] truncate">
            Klavuzlar — {projectTypeName}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            AI üretim sırasında her bölümün ilgili klavuz pasajlarını referans alır.
            Aynı anda yalnızca bir klavuz aktif olur; yeni proje başladığında o anki
            aktif sürüm o projeye sabitlenir.
          </p>
        </div>
      </header>

      <div className="px-8 py-8 max-w-4xl mx-auto space-y-8">
        {/* Upload form */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center">
              <Upload size={18} className="text-[var(--color-accent)]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                Yeni Kılavuz Yükle
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                RAG arama motoru için PDF dökümanını sisteme tanıtın
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6 items-start">
              <label className="block w-full">
                <span className="text-sm font-medium text-[var(--color-text-secondary)] block mb-2">
                  Kılavuz Başlığı
                </span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: TUBITAK 1507 - 2026 Çağrısı"
                  className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)] transition-all"
                />
              </label>

              <label className="block w-full">
                <span className="text-sm font-medium text-[var(--color-text-secondary)] block mb-2">
                  PDF Dosyası (Maks 15 MB)
                </span>
                <div className={`relative rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center p-6 text-center ${
                  file ? 'border-[var(--color-accent)]/50 bg-[var(--color-accent)]/5' : 'border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]'
                }`}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => onFileChosen(e.target.files?.[0] ?? null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  
                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-[var(--color-success)]/20 flex items-center justify-center mb-1">
                        <CheckCircle2 size={24} className="text-[var(--color-success)]" />
                      </div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">
                        {file.name}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          onFileChosen(null);
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20 text-xs font-semibold transition-colors relative z-10"
                      >
                        <Trash2 size={14} /> Dosyayı Kaldır
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-1">
                        <Upload size={24} className="text-[var(--color-text-secondary)]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">
                          PDF yüklemek için tıklayın veya sürükleyin
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                          Sadece .pdf formatında, maksimum 15MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>

            <label className="flex items-start gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={setActive}
                onChange={(e) => setSetActive(e.target.checked)}
                className="mt-0.5 accent-[var(--color-accent)]"
              />
              <span className="text-xs text-[var(--color-text-secondary)]">
                Yükleme bitince bu klavuzu aktif yap (yeni projeler bu sürümü
                referans alır; mevcut projeler kendi sürümlerini korur).
              </span>
            </label>
          </div>

          {error && (
            <div className="rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 px-3 py-2 text-xs text-[var(--color-danger)]">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleUpload}
            disabled={uploadPending || !file || !title.trim()}
            className="px-5 py-2.5 rounded-xl bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent)]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {uploadPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Yükleniyor + işleniyor (30-90 sn)…
              </>
            ) : (
              <>
                <Upload size={16} />
                Yükle ve indeksle
              </>
            )}
          </button>
        </section>

        {/* Guides list */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            Mevcut klavuzlar ({guides.length})
          </h2>

          {guides.length === 0 && (
            <p className="text-sm text-[var(--color-text-secondary)] py-8 text-center border border-dashed border-white/10 rounded-2xl">
              Henüz hiç klavuz yüklenmedi.
            </p>
          )}

          {guides.map((g) => (
            <div
              key={g.id}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-[var(--color-text-secondary)]" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                      {g.title}
                    </h3>
                    {g.active && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-success)] bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 rounded-full px-2 py-0.5">
                        <CheckCircle2 size={10} />
                        Aktif
                      </span>
                    )}
                    <StatusPill status={g.status} />
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    {g.originalFilename} · {g.pageCount} sayfa · {g.chunkCount} chunk
                    {g.uploadedAt && ` · ${formatDate(g.uploadedAt)}`}
                  </p>
                  {g.status === 'failed' && g.statusMessage && (
                    <p className="text-xs text-[var(--color-danger)] mt-1">
                      Hata: {g.statusMessage}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {g.status === 'ready' && !g.active && (
                    <button
                      type="button"
                      onClick={() => handleSetActive(g.id)}
                      disabled={actionPending}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-[var(--color-text-primary)] transition-colors disabled:opacity-40 flex items-center gap-1.5"
                    >
                      <Star size={12} />
                      Aktif yap
                    </button>
                  )}
                  {confirmDeleteId === g.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDelete(g.id)}
                        disabled={actionPending}
                        className="px-3 py-1.5 rounded-lg bg-[var(--color-danger)] hover:bg-[var(--color-danger)]/90 text-xs font-medium text-white transition-colors disabled:opacity-40"
                      >
                        Onayla
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-[var(--color-text-primary)]"
                      >
                        İptal
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(g.id)}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-[var(--color-danger)]/20 border border-white/10 hover:border-[var(--color-danger)]/40 flex items-center justify-center transition-colors"
                      aria-label="Klavuzu sil"
                    >
                      <Trash2 size={14} className="text-[var(--color-text-secondary)]" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: GuideView['status'] }) {
  if (status === 'processing') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-warning)] bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 rounded-full px-2 py-0.5">
        <Loader2 size={10} className="animate-spin" />
        İşleniyor
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-danger)] bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 rounded-full px-2 py-0.5">
        Hata
      </span>
    );
  }
  return null;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
