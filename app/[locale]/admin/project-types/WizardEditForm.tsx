'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useForm,
  useFieldArray,
  useWatch,
  type Control,
  type UseFormRegister,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Loader2,
  Plus,
  Save,
  Trash2,
  Play,
  Bot
} from 'lucide-react';
import {
  PROJECT_CATEGORIES,
  PROJECT_OUTPUT_LANGUAGES,
  PROJECT_TIERS,
  PROJECT_VISIBILITIES,
  SECTION_OUTPUT_TYPES,
  MODEL_OVERRIDES,
  projectTypeWriteSchema,
  type ProjectTypeWriteInput,
} from '@/types/projectType';
import {
  deleteProjectTypeAction,
  upsertProjectTypeAction,
  testPromptAction
} from '@/lib/actions/projectTypes';

type FormValues = ProjectTypeWriteInput;

interface Props {
  initial: FormValues;
  mode: 'create' | 'edit';
  locale: string;
}

const ICON_OPTIONS = [
  'FolderGit2',
  'GraduationCap',
  'Microscope',
  'Building2',
  'Rocket',
  'Sparkles',
];

export default function WizardEditForm({ initial, mode, locale }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [activeTab, setActiveTab] = useState<'genel' | 'bolumler'>('genel');
  const [activeSectionIndex, setActiveSectionIndex] = useState<number>(0);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(projectTypeWriteSchema) as never,
    defaultValues: initial as FormValues,
    mode: 'onSubmit',
  });

  const sections = useFieldArray({ control, name: 'sections' });

  const onSubmit = (values: FormValues) => {
    setError(null);
    startTransition(async () => {
      try {
        const normalized: FormValues = {
          ...values,
          sections: values.sections.map((s, i) => ({ ...s, order: i })),
        };
        const { id } = await upsertProjectTypeAction(normalized);
        router.replace(`/${locale}/admin/project-types/${id}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Kaydetme başarısız.');
      }
    });
  };

  const onInvalid = (formErrors: Record<string, unknown>) => {
    const summary = collectErrorMessages(formErrors).slice(0, 5);
    setError(
      summary.length > 0
        ? `Form alanlarında hata var:\n• ${summary.join('\n• ')}`
        : 'Form alanlarında doğrulama hataları var. Kırmızı işaretli alanları kontrol et.',
    );
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const onDelete = () => {
    if (!initial.id) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteProjectTypeAction({ id: initial.id });
        router.replace(`/${locale}/admin/project-types`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Silme başarısız.');
      }
    });
  };

  const handleAddSection = () => {
    sections.append({
      id: `section-${sections.fields.length + 1}`,
      order: sections.fields.length,
      title: { tr: '', en: '', es: '' },
      description: { tr: '', en: '', es: '' },
      agentPromptTemplate: '',
      criteria: [],
      outputType: 'markdown',
      requiresUserInput: false,
    });
    setActiveSectionIndex(sections.fields.length);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="min-h-full pb-12">
      <header className="px-8 py-5 border-b border-white/5 sticky top-0 z-10 bg-[var(--color-background)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href={`/${locale}/admin/project-types`}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
            >
              <ArrowLeft size={18} className="text-[var(--color-text-secondary)]" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[var(--color-text-primary)] truncate">
                {mode === 'create' ? 'Yeni proje türü' : 'Proje türü düzenle'}
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                {sections.fields.length} bölüm tanımlı
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {mode === 'edit' && (
              <Link
                href={`/${locale}/admin/project-types/${initial.id}/guides`}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-white/10 bg-white/5 text-[var(--color-text-primary)] hover:bg-white/10 transition-colors"
              >
                <BookOpen size={14} /> Kılavuzlar
              </Link>
            )}
            {mode === 'edit' && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-[var(--color-error)]/30 text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors disabled:opacity-50"
              >
                <Trash2 size={14} /> Sil
              </button>
            )}
            <button
              type="submit"
              disabled={isPending || (!isDirty && mode === 'edit')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Kaydet
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6 mt-6 border-b border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('genel')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'genel'
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            Genel Bilgiler
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bolumler')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'bolumler'
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            Bölüm Sihirbazı (Step-Builder)
          </button>
        </div>
      </header>

      <div className="px-8 py-8 w-full max-w-[1600px] mx-auto space-y-8">
        {error && (
          <div className="bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-xl px-4 py-3 text-sm text-[var(--color-error)] whitespace-pre-line">
            {error}
          </div>
        )}

        {/* ---- Metadata Tab ------------------------------------------------- */}
        {activeTab === 'genel' && (
          <section className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-6 space-y-5 max-w-4xl">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Genel Bilgiler
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <Field label="ID" hint="lower-kebab; kaydedildikten sonra değiştirme" error={errors.id?.message}>
                <input {...register('id')} disabled={mode === 'edit'} className={inputCls} placeholder="erasmus-ka210" />
              </Field>
              <Field label="Slug (URL)" hint="lower-kebab" error={errors.slug?.message}>
                <input {...register('slug')} className={inputCls} />
              </Field>
            </div>

            <LocalizedField label="Ad" register={register} namePrefix="name" error={errors.name as Record<string, { message?: string }> | undefined} />
            <LocalizedField label="Açıklama" multiline register={register} namePrefix="description" error={errors.description as Record<string, { message?: string }> | undefined} />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Kategori" error={errors.category?.message}>
                <select {...register('category')} className={inputCls}>
                  {PROJECT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Tier" error={errors.tier?.message}>
                <select {...register('tier')} className={inputCls}>
                  {PROJECT_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Çıktı dili" error={errors.outputLanguage?.message}>
                <select {...register('outputLanguage')} className={inputCls}>
                  {PROJECT_OUTPUT_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </Field>
              <Field label="Görünürlük" error={errors.visibility?.message}>
                <select {...register('visibility')} className={inputCls}>
                  {PROJECT_VISIBILITIES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="İkon">
                <select {...register('iconName')} className={inputCls}>
                  {ICON_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </Field>
              <Field label="Sürüm">
                <input {...register('version')} className={inputCls} placeholder="1.0.0" />
              </Field>
              <Field label="Aktif?">
                <label className="flex items-center gap-2 mt-2">
                  <input type="checkbox" {...register('active')} className="rounded" />
                  <span className="text-sm text-[var(--color-text-secondary)]">Kullanıcılara göster</span>
                </label>
              </Field>
              <Field label="Rehberden üretildi?">
                <label className="flex items-center gap-2 mt-2">
                  <input type="checkbox" {...register('generatedFromGuide')} className="rounded" />
                  <span className="text-sm text-[var(--color-text-secondary)]">AI ile taslak üretildi</span>
                </label>
              </Field>
            </div>
          </section>
        )}

        {/* ---- Step Builder Tab ------------------------------------------------- */}
        {activeTab === 'bolumler' && (
          <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr_400px] gap-6 items-start">
            {/* Sidebar List */}
            <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-4 space-y-4 sticky top-32 max-h-[calc(100vh-140px)] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Bölümler ({sections.fields.length})</h3>
                <button
                  type="button"
                  onClick={handleAddSection}
                  className="p-1 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded-md transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
              <ul className="space-y-2">
                {sections.fields.map((field, index) => {
                  const title = watch(`sections.${index}.title.tr`) || watch(`sections.${index}.id`) || `Bölüm ${index + 1}`;
                  const isActive = activeSectionIndex === index;
                  return (
                    <li key={field.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveSectionIndex(index)}
                        className={`flex-1 text-left px-3 py-2 rounded-lg text-sm truncate transition-colors ${
                          isActive ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-medium border border-[var(--color-accent)]/20' : 'text-[var(--color-text-secondary)] hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        {index + 1}. {title}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {sections.fields.length === 0 && (
                <p className="text-xs text-[var(--color-text-secondary)] italic text-center py-4">Henüz bölüm eklenmedi.</p>
              )}
            </div>

            {/* Active Section Editor */}
            <div className="space-y-6">
              {sections.fields.map((field, index) => (
                <div key={field.id} className={activeSectionIndex === index ? 'block' : 'hidden'}>
                  <SectionEditor
                    index={index}
                    control={control}
                    register={register}
                    onMoveUp={index > 0 ? () => { sections.move(index, index - 1); setActiveSectionIndex(index - 1); } : undefined}
                    onMoveDown={index < sections.fields.length - 1 ? () => { sections.move(index, index + 1); setActiveSectionIndex(index + 1); } : undefined}
                    onRemove={() => {
                      sections.remove(index);
                      setActiveSectionIndex(Math.max(0, index - 1));
                    }}
                    errors={errors.sections?.[index] as Record<string, unknown> | undefined}
                  />
                </div>
              ))}
              {sections.fields.length === 0 && (
                <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-8 text-center">
                  <p className="text-sm text-[var(--color-text-secondary)] mb-4">Düzenlenecek bir bölüm yok.</p>
                  <button
                    type="button"
                    onClick={handleAddSection}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    <Plus size={14} /> Yeni Bölüm Ekle
                  </button>
                </div>
              )}
            </div>

            {/* AI Prompt Chat Panel */}
            <div className="sticky top-32 h-[calc(100vh-140px)]">
              {sections.fields.length > 0 && activeSectionIndex >= 0 ? (
                <AIPromptTester
                  control={control}
                  sectionIndex={activeSectionIndex}
                  tier={watch('tier')}
                />
              ) : (
                <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-6 h-full flex flex-col items-center justify-center text-center opacity-50">
                  <Bot size={48} className="text-[var(--color-text-secondary)] mb-4" />
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">AI Prompt Tester</p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-2">Bir bölüm seçerek veya ekleyerek prompt test edebilirsiniz.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-card)] rounded-2xl border border-white/10 p-6 max-w-md w-full">
            <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">
              Bu proje türü silinsin mi?
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Geri alınamaz. Bu türle açılmış mevcut projeler silinmez ama yeni proje
              açılamaz hale gelir.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-white/20 transition-colors"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={isPending}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--color-error)] hover:bg-[var(--color-error)]/80 text-white transition-colors disabled:opacity-50"
              >
                Evet, sil
              </button>
            </div>
          </div>
        </div>
      )}

      {isPending && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-[var(--color-card)] rounded-2xl border border-white/10 px-8 py-6 flex items-center gap-4 max-w-sm">
            <Loader2 size={28} className="animate-spin text-[var(--color-accent)] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                Kaydediliyor…
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                Birkaç saniye sürebilir, lütfen bekle.
              </p>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

// ---- AI Prompt Tester Panel ------------------------------------------------

function AIPromptTester({
  control,
  sectionIndex,
  tier,
}: {
  control: Control<FormValues>;
  sectionIndex: number;
  tier: string;
}) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ text: string; error?: string } | null>(null);
  
  const promptTemplate = useWatch({
    control,
    name: `sections.${sectionIndex}.agentPromptTemplate` as const,
  });

  const modelOverride = useWatch({
    control,
    name: `sections.${sectionIndex}.modelOverride` as const,
  });

  // State for simulated inputs
  const [userIdea, setUserIdea] = useState('Projemin amacı eğitimde dijitalleşmeyi artırmak.');
  
  const handleTest = async () => {
    if (!promptTemplate) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      // Simulate prompt hydration for testing
      const simulatedPrompt = promptTemplate
        .replace(/{{userIdea}}/g, userIdea)
        .replace(/{{previousSections}}/g, '(Boş)')
        .replace(/{{userInputs}}/g, '(Boş)');

      const res = await testPromptAction({
        systemPrompt: 'You are an AI assistant helping a user write a project application.',
        userPrompt: simulatedPrompt,
        outputLanguage: 'tr',
        modelOverride: modelOverride || undefined,
      });

      if (res.success && res.text) {
        setTestResult({ text: res.text });
      } else {
        setTestResult({ text: '', error: res.error || 'Test failed.' });
      }
    } catch (err) {
      setTestResult({ text: '', error: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-[#0f1115] rounded-2xl border border-white/5 flex flex-col h-full overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-white/5 bg-[#14161a] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-[var(--color-text-primary)]">
          <Bot size={16} className="text-[var(--color-accent)]" />
          <span className="text-sm font-semibold">AI Test Paneli</span>
        </div>
        <span className="text-[10px] px-2 py-1 rounded bg-white/5 text-[var(--color-text-secondary)]">
          {modelOverride || tier || 'Varsayılan Model'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Test Inputs */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
              Test Fikri ({'{{userIdea}}'})
            </label>
            <textarea
              value={userIdea}
              onChange={(e) => setUserIdea(e.target.value)}
              rows={2}
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/60 focus:outline-none focus:border-[var(--color-accent)] transition-all"
              placeholder="Test için varsayılan proje fikri..."
            />
          </div>
        </div>

        {/* Results */}
        {testResult && (
          <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h4 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
              Çıktı
            </h4>
            {testResult.error ? (
              <div className="p-3 bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-xl text-xs text-[var(--color-error)] whitespace-pre-line">
                {testResult.error}
              </div>
            ) : (
              <div className="p-4 bg-[#1a1d24] border border-white/5 rounded-xl text-sm text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed shadow-inner">
                {testResult.text}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/5 bg-[#14161a] shrink-0">
        <button
          type="button"
          onClick={handleTest}
          disabled={isTesting || !promptTemplate}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
        >
          {isTesting ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Yükleniyor...
            </>
          ) : (
            <>
              <Play size={14} /> Promptu Test Et
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ---- Section card ----------------------------------------------------------

function SectionEditor({
  index,
  control,
  register,
  onMoveUp,
  onMoveDown,
  onRemove,
  errors,
}: {
  index: number;
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove: () => void;
  errors?: Record<string, unknown>;
}) {
  const criteria = useFieldArray({ control, name: `sections.${index}.criteria` as never });

  return (
    <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-6 space-y-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <span className="inline-flex items-center gap-3 text-lg font-bold text-[var(--color-text-primary)]">
          <span className="w-8 h-8 rounded-xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center text-sm font-bold text-[var(--color-accent)]">
            {index + 1}
          </span>
          Bölüm Detayları
        </span>
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg">
          <IconButton onClick={onMoveUp} disabled={!onMoveUp} title="Yukarı taşı">
            <ArrowUp size={14} />
          </IconButton>
          <IconButton onClick={onMoveDown} disabled={!onMoveDown} title="Aşağı taşı">
            <ArrowDown size={14} />
          </IconButton>
          <div className="w-[1px] h-4 bg-white/10 mx-1" />
          <IconButton onClick={onRemove} title="Bölümü sil" tone="danger">
            <Trash2 size={14} />
          </IconButton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="ID" hint="aynı şablonda benzersiz">
          <input
            {...register(`sections.${index}.id` as const)}
            className={inputCls}
            placeholder="summary"
          />
        </Field>
        <Field label="Çıktı tipi">
          <select
            {...register(`sections.${index}.outputType` as const)}
            className={inputCls}
          >
            {SECTION_OUTPUT_TYPES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <LocalizedField
        label="Başlık"
        register={register}
        namePrefix={`sections.${index}.title`}
      />
      <LocalizedField
        label="Açıklama"
        multiline
        register={register}
        namePrefix={`sections.${index}.description`}
      />

      <Field
        label="Prompt şablonu"
        hint="{{userIdea}}, {{previousSections}}, {{userInputs}} placeholder'ları kullanılabilir"
      >
        <textarea
          {...register(`sections.${index}.agentPromptTemplate` as const)}
          rows={10}
          className={inputCls + ' font-mono text-sm leading-relaxed'}
          placeholder="Modelin bu bölümü üretirken takip edeceği talimatlar..."
        />
      </Field>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label="Model override">
          <select
            {...register(`sections.${index}.modelOverride` as const)}
            className={inputCls}
          >
            <option value="">— (tier varsayılanı)</option>
            {MODEL_OVERRIDES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tahmini token">
          <input
            type="number"
            {...register(`sections.${index}.estimatedTokens` as const, {
              valueAsNumber: true,
            })}
            className={inputCls}
          />
        </Field>
        <Field label="Kullanıcı girişi ister mi?">
          <label className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              {...register(`sections.${index}.requiresUserInput` as const)}
              className="rounded"
            />
            <span className="text-sm text-[var(--color-text-secondary)]">
              Wizard'da ek alan göster
            </span>
          </label>
        </Field>
      </div>

      <div className="bg-white/5 rounded-xl p-4 border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            Kabul Kriterleri
          </p>
          <button
            type="button"
            onClick={() => criteria.append('' as never)}
            className="inline-flex items-center gap-1.5 px-2 py-1 bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-xs font-semibold rounded-lg hover:bg-[var(--color-accent)]/20 transition-colors"
          >
            <Plus size={12} /> Ekle
          </button>
        </div>
        <ul className="space-y-2">
          {criteria.fields.map((c, ci) => (
            <li key={c.id} className="flex items-center gap-2">
              <input
                {...register(`sections.${index}.criteria.${ci}` as const)}
                className={inputCls}
                placeholder="Örn: Sayısal hedefler net belirtilmeli"
              />
              <button
                type="button"
                onClick={() => criteria.remove(ci)}
                className="p-2 bg-white/5 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors"
                aria-label="Kriteri sil"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
          {criteria.fields.length === 0 && (
            <p className="text-xs text-[var(--color-text-secondary)] italic">Henüz kabul kriteri eklenmedi.</p>
          )}
        </ul>
      </div>

      <UserInputFieldsEditor sectionIndex={index} control={control} register={register} />
      <RubricEditor sectionIndex={index} control={control} register={register} />

      {errors && Object.keys(errors).length > 0 && (
        <p className="text-sm text-[var(--color-error)] mt-4 p-3 bg-[var(--color-error)]/10 rounded-lg border border-[var(--color-error)]/20">
          Bu bölümde doğrulama hataları var (alanları kontrol et).
        </p>
      )}
    </div>
  );
}

// ---- User input schema editor ---------------------------------------------

const FIELD_TYPES = ['text', 'textarea', 'number', 'select', 'date'] as const;

function UserInputFieldsEditor({
  sectionIndex,
  control,
  register,
}: {
  sectionIndex: number;
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
}) {
  const requiresInput = useWatch({
    control,
    name: `sections.${sectionIndex}.requiresUserInput` as const,
  });

  const fields = useFieldArray({
    control,
    name: `sections.${sectionIndex}.userInputSchema.fields` as never,
  });

  if (!requiresInput) return null;

  return (
    <div className="rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-[var(--color-accent)]">
          Wizard Özel Alanları
        </p>
        <button
          type="button"
          onClick={() =>
            fields.append({
              id: `field_${fields.fields.length + 1}`,
              label: { tr: '', en: '', es: '' },
              type: 'text',
              required: false,
            } as never)
          }
          className="inline-flex items-center gap-1.5 px-2 py-1 bg-[var(--color-accent)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          <Plus size={12} /> Alan ekle
        </button>
      </div>
      {fields.fields.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)] italic">
          Henüz alan yok. Kullanıcıdan ek bilgi almak için bir alan ekle.
        </p>
      ) : (
        <ul className="space-y-4">
          {fields.fields.map((f, fi) => (
            <UserInputFieldEditor
              key={f.id}
              control={control}
              register={register}
              sectionIndex={sectionIndex}
              fieldIndex={fi}
              onRemove={() => fields.remove(fi)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// ---- Rubric editor --------------------------------------------------------

function RubricEditor({
  sectionIndex,
  control,
  register,
}: {
  sectionIndex: number;
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
}) {
  const dimensions = useFieldArray({
    control,
    name: `sections.${sectionIndex}.rubric.dimensions` as never,
  });

  const enabled = dimensions.fields.length > 0;

  const enable = () => {
    dimensions.append({
      id: 'excellence',
      name: { tr: 'Mükemmellik', en: 'Excellence', es: 'Excelencia' },
      descriptor: {
        tr: '5: Tam, somut, kanıt-bazlı; 3: Yeterli; 1: Belirsiz veya konu dışı.',
        en: '5: Complete, concrete, evidence-driven; 3: Adequate; 1: Vague or off-topic.',
        es: '5: Completo, concreto, basado en evidencia; 3: Adecuado; 1: Vago o fuera de tema.',
      },
      maxPoints: 5,
    } as never);
  };

  const disable = () => {
    while (dimensions.fields.length > 0) {
      dimensions.remove(0);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--color-success)]/20 bg-[var(--color-success)]/5 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-[var(--color-success)]">
            Otomatik Değerlendirme (Rubric)
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            AI üretimden sonra çıktıyı puanlar; gerekiyorsa kendi kendine revize eder.
          </p>
        </div>
        {enabled ? (
          <button
            type="button"
            onClick={disable}
            className="text-sm text-[var(--color-error)] hover:text-white px-3 py-1.5 hover:bg-[var(--color-error)] rounded-lg transition-colors"
          >
            Kapat
          </button>
        ) : (
          <button
            type="button"
            onClick={enable}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-success)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--color-success)]/80 transition-colors"
          >
            <Plus size={14} /> Rubric Ekle
          </button>
        )}
      </div>

      {enabled && (
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Geçer eşiği"
              hint="Toplam puanın oranı (örn 0.7 = %70)"
            >
              <input
                type="number"
                step="0.05"
                min={0}
                max={1}
                {...register(
                  `sections.${sectionIndex}.rubric.passingThreshold` as const,
                  { valueAsNumber: true },
                )}
                className={inputCls}
                placeholder="0.7"
              />
            </Field>
            <Field
              label="Maks. otomatik revize"
              hint="Başarısız olursa AI kaç kez tekrar denesin"
            >
              <input
                type="number"
                min={0}
                max={3}
                {...register(
                  `sections.${sectionIndex}.rubric.maxRevisionAttempts` as const,
                  { valueAsNumber: true },
                )}
                className={inputCls}
                placeholder="2"
              />
            </Field>
          </div>

          <div className="space-y-3">
            {dimensions.fields.map((d, di) => (
              <div
                key={d.id}
                className="rounded-xl border border-white/10 bg-[var(--color-background)] p-4 space-y-4"
              >
                <div className="grid grid-cols-3 gap-3">
                  <Field label="ID">
                    <input
                      {...register(
                        `sections.${sectionIndex}.rubric.dimensions.${di}.id` as const,
                      )}
                      className={inputCls}
                      placeholder="excellence"
                    />
                  </Field>
                  <Field label="Maks puan">
                    <input
                      type="number"
                      min={1}
                      max={20}
                      {...register(
                        `sections.${sectionIndex}.rubric.dimensions.${di}.maxPoints` as const,
                        { valueAsNumber: true },
                      )}
                      className={inputCls}
                    />
                  </Field>
                  <div className="flex items-end justify-end">
                    <IconButton
                      onClick={() => dimensions.remove(di)}
                      title="Boyutu sil"
                      tone="danger"
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                </div>
                <LocalizedField
                  label="İsim"
                  register={register}
                  namePrefix={`sections.${sectionIndex}.rubric.dimensions.${di}.name`}
                />
                <LocalizedField
                  label="Skorlama açıklaması"
                  multiline
                  register={register}
                  namePrefix={`sections.${sectionIndex}.rubric.dimensions.${di}.descriptor`}
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              dimensions.append({
                id: `dim-${dimensions.fields.length + 1}`,
                name: { tr: '', en: '', es: '' },
                descriptor: { tr: '', en: '', es: '' },
                maxPoints: 5,
              } as never)
            }
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-success)] hover:text-[var(--color-success)]/80"
          >
            <Plus size={14} /> Yeni Boyut Ekle
          </button>
        </div>
      )}
    </div>
  );
}

function UserInputFieldEditor({
  control,
  register,
  sectionIndex,
  fieldIndex,
  onRemove,
}: {
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
  sectionIndex: number;
  fieldIndex: number;
  onRemove: () => void;
}) {
  const fieldType = useWatch({
    control,
    name: `sections.${sectionIndex}.userInputSchema.fields.${fieldIndex}.type` as const,
  });

  const options = useFieldArray({
    control,
    name: `sections.${sectionIndex}.userInputSchema.fields.${fieldIndex}.options` as never,
  });

  return (
    <li className="rounded-xl border border-white/10 bg-[var(--color-background)] p-4 space-y-4 relative">
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/5 text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors"
        aria-label="Alanı sil"
      >
        <Trash2 size={14} />
      </button>

      <div className="grid grid-cols-2 gap-4 pr-10">
        <Field label="Alan ID">
          <input
            {...register(
              `sections.${sectionIndex}.userInputSchema.fields.${fieldIndex}.id` as const,
            )}
            className={inputCls}
            placeholder="team_size"
          />
        </Field>
        <Field label="Tip">
          <select
            {...register(
              `sections.${sectionIndex}.userInputSchema.fields.${fieldIndex}.type` as const,
            )}
            className={inputCls}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <LocalizedField
        label="Etiket"
        register={register}
        namePrefix={`sections.${sectionIndex}.userInputSchema.fields.${fieldIndex}.label`}
      />
      <LocalizedField
        label="Placeholder (opsiyonel)"
        register={register}
        namePrefix={`sections.${sectionIndex}.userInputSchema.fields.${fieldIndex}.placeholder`}
      />

      <Field label="Zorunlu mu?">
        <label className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            {...register(
              `sections.${sectionIndex}.userInputSchema.fields.${fieldIndex}.required` as const,
            )}
            className="rounded w-4 h-4 text-[var(--color-accent)] bg-white/5 border-white/10"
          />
          <span className="text-sm text-[var(--color-text-primary)]">
            Kullanıcı bu alanı doldurmadan ilerleyemez
          </span>
        </label>
      </Field>

      {fieldType === 'select' && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 mt-2 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Seçenekler
            </p>
            <button
              type="button"
              onClick={() =>
                options.append({
                  value: '',
                  label: { tr: '', en: '', es: '' },
                } as never)
              }
              className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/10 rounded-lg text-xs text-[var(--color-text-primary)] hover:bg-white/20 transition-colors"
            >
              <Plus size={12} /> Seçenek ekle
            </button>
          </div>
          {options.fields.length === 0 ? (
            <p className="text-xs text-[var(--color-text-secondary)] italic">
              Seçenek tanımlanmadı.
            </p>
          ) : (
            <ul className="space-y-2">
              {options.fields.map((o, oi) => (
                <li key={o.id} className="grid grid-cols-[140px_1fr_32px] gap-3 items-start">
                  <input
                    {...register(
                      `sections.${sectionIndex}.userInputSchema.fields.${fieldIndex}.options.${oi}.value` as const,
                    )}
                    className={inputCls}
                    placeholder="value"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    {(['tr', 'en', 'es'] as const).map((loc) => (
                      <input
                        key={loc}
                        {...register(
                          `sections.${sectionIndex}.userInputSchema.fields.${fieldIndex}.options.${oi}.label.${loc}` as const,
                        )}
                        className={inputCls}
                        placeholder={loc.toUpperCase()}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => options.remove(oi)}
                    className="p-2 bg-white/5 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors"
                    aria-label="Seçeneği sil"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

// ---- Reusable bits ---------------------------------------------------------

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all disabled:opacity-60';

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-[11px] text-[var(--color-text-secondary)]/70 mt-1.5 leading-snug">{hint}</p>
      )}
      {error && <p className="text-sm text-[var(--color-error)] mt-1.5 font-medium">{error}</p>}
    </div>
  );
}

function LocalizedField({
  label,
  multiline = false,
  register,
  namePrefix,
  error,
}: {
  label: string;
  multiline?: boolean;
  register: UseFormRegister<FormValues>;
  namePrefix: string;
  error?: Record<string, { message?: string }>;
}) {
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <div>
      <p className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
        {label}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(['tr', 'en', 'es'] as const).map((loc) => (
          <div key={loc}>
            <Tag
              {...register(`${namePrefix}.${loc}` as never)}
              rows={multiline ? 2 : undefined}
              placeholder={loc.toUpperCase()}
              className={inputCls}
            />
            {error?.[loc]?.message && (
              <p className="text-xs text-[var(--color-error)] mt-1 font-medium">{error[loc].message}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  disabled,
  title,
  tone = 'default',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={
        'p-1.5 rounded-lg text-[var(--color-text-secondary)] disabled:opacity-30 transition-colors ' +
        (tone === 'danger'
          ? 'hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10'
          : 'hover:text-[var(--color-text-primary)] hover:bg-white/10')
      }
    >
      {children}
    </button>
  );
}

function collectErrorMessages(
  errors: Record<string, unknown>,
  prefix = '',
): string[] {
  const out: string[] = [];
  for (const key of Object.keys(errors)) {
    const node = errors[key] as Record<string, unknown> | { message?: string };
    const path = prefix ? `${prefix}.${key}` : key;
    if (node && typeof node === 'object') {
      if ('message' in node && typeof node.message === 'string') {
        out.push(`${path}: ${node.message}`);
      } else {
        out.push(...collectErrorMessages(node as Record<string, unknown>, path));
      }
    }
  }
  return out;
}
