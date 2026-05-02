'use client';

import { useState, useTransition } from 'react';
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
  Loader2,
  Plus,
  Save,
  Trash2,
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

export default function EditForm({ initial, mode, locale }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    // We accept Zod's input type so .default() fields can be omitted in defaultValues.
    resolver: zodResolver(projectTypeWriteSchema) as never,
    defaultValues: initial as FormValues,
    mode: 'onSubmit',
  });

  const sections = useFieldArray({ control, name: 'sections' });

  const onSubmit = (values: FormValues) => {
    setError(null);
    startTransition(async () => {
      try {
        // Re-number orders to match array position so display stays sane
        // even if the admin reordered cards.
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="min-h-full pb-12">
      <header className="px-8 py-5 border-b border-white/5 flex items-center justify-between sticky top-0 z-10 bg-[var(--color-background)]">
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
            disabled={isPending || !isDirty && mode === 'edit'}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Kaydet
          </button>
        </div>
      </header>

      <div className="px-8 py-8 max-w-5xl mx-auto space-y-8">
        {error && (
          <div className="bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-xl px-4 py-3 text-sm text-[var(--color-error)]">
            {error}
          </div>
        )}

        {/* ---- Metadata ------------------------------------------------- */}
        <section className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-6 space-y-5">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            Genel bilgiler
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="ID"
              hint="lower-kebab; kaydedildikten sonra değiştirme"
              error={errors.id?.message}
            >
              <input
                {...register('id')}
                disabled={mode === 'edit'}
                className={inputCls}
                placeholder="erasmus-ka210"
              />
            </Field>
            <Field
              label="Slug (URL)"
              hint="lower-kebab"
              error={errors.slug?.message}
            >
              <input {...register('slug')} className={inputCls} />
            </Field>
          </div>

          <LocalizedField
            label="Ad"
            register={register}
            namePrefix="name"
            error={errors.name as Record<string, { message?: string }> | undefined}
          />
          <LocalizedField
            label="Açıklama"
            multiline
            register={register}
            namePrefix="description"
            error={errors.description as Record<string, { message?: string }> | undefined}
          />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Kategori" error={errors.category?.message}>
              <select {...register('category')} className={inputCls}>
                {PROJECT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tier" error={errors.tier?.message}>
              <select {...register('tier')} className={inputCls}>
                {PROJECT_TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Çıktı dili" error={errors.outputLanguage?.message}>
              <select {...register('outputLanguage')} className={inputCls}>
                {PROJECT_OUTPUT_LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Görünürlük" error={errors.visibility?.message}>
              <select {...register('visibility')} className={inputCls}>
                {PROJECT_VISIBILITIES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="İkon">
              <select {...register('iconName')} className={inputCls}>
                {ICON_OPTIONS.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sürüm">
              <input {...register('version')} className={inputCls} placeholder="1.0.0" />
            </Field>
            <Field label="Aktif?">
              <label className="flex items-center gap-2 mt-2">
                <input type="checkbox" {...register('active')} className="rounded" />
                <span className="text-sm text-[var(--color-text-secondary)]">
                  Kullanıcılara göster
                </span>
              </label>
            </Field>
            <Field label="Rehberden üretildi?">
              <label className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  {...register('generatedFromGuide')}
                  className="rounded"
                />
                <span className="text-sm text-[var(--color-text-secondary)]">
                  AI ile taslak üretildi
                </span>
              </label>
            </Field>
          </div>
        </section>

        {/* ---- Sections ------------------------------------------------- */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Bölümler ({sections.fields.length})
            </h2>
            <button
              type="button"
              onClick={() =>
                sections.append({
                  id: `section-${sections.fields.length + 1}`,
                  order: sections.fields.length,
                  title: { tr: '', en: '', es: '' },
                  description: { tr: '', en: '', es: '' },
                  agentPromptTemplate: '',
                  criteria: [],
                  outputType: 'markdown',
                  requiresUserInput: false,
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Plus size={14} /> Bölüm ekle
            </button>
          </div>

          <ol className="space-y-3">
            {sections.fields.map((field, index) => (
              <SectionEditor
                key={field.id}
                index={index}
                control={control}
                register={register}
                onMoveUp={index > 0 ? () => sections.move(index, index - 1) : undefined}
                onMoveDown={
                  index < sections.fields.length - 1
                    ? () => sections.move(index, index + 1)
                    : undefined
                }
                onRemove={() => sections.remove(index)}
                errors={errors.sections?.[index] as Record<string, unknown> | undefined}
              />
            ))}
          </ol>
        </section>
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
    </form>
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
    <li className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
          <span className="w-7 h-7 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center text-xs font-bold text-[var(--color-accent)]">
            {index + 1}
          </span>
          Bölüm
        </span>
        <div className="flex items-center gap-1">
          <IconButton onClick={onMoveUp} disabled={!onMoveUp} title="Yukarı taşı">
            <ArrowUp size={14} />
          </IconButton>
          <IconButton onClick={onMoveDown} disabled={!onMoveDown} title="Aşağı taşı">
            <ArrowDown size={14} />
          </IconButton>
          <IconButton onClick={onRemove} title="Bölümü sil" tone="danger">
            <Trash2 size={14} />
          </IconButton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
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
          rows={8}
          className={inputCls + ' font-mono text-xs'}
        />
      </Field>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
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

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
            Kabul kriterleri
          </p>
          <button
            type="button"
            onClick={() => criteria.append('' as never)}
            className="inline-flex items-center gap-1 text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
          >
            <Plus size={12} /> Kriter ekle
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
                className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-error)]"
                aria-label="Kriteri sil"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <UserInputFieldsEditor sectionIndex={index} control={control} register={register} />

      {errors && Object.keys(errors).length > 0 && (
        <p className="text-xs text-[var(--color-error)]">
          Bu bölümde doğrulama hataları var (alanları kontrol et).
        </p>
      )}
    </li>
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
    <div className="rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wider">
          Wizard alanları
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
          className="inline-flex items-center gap-1 text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
        >
          <Plus size={12} /> Alan ekle
        </button>
      </div>
      {fields.fields.length === 0 ? (
        <p className="text-xs text-[var(--color-text-secondary)] italic">
          Henüz alan yok. Kullanıcıdan ek bilgi almak için bir alan ekle.
        </p>
      ) : (
        <ul className="space-y-3">
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
    <li className="rounded-lg border border-white/10 bg-[var(--color-background)] p-3 space-y-3 relative">
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-2 p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-error)]"
        aria-label="Alanı sil"
      >
        <Trash2 size={12} />
      </button>

      <div className="grid grid-cols-2 gap-3 pr-6">
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
        <label className="flex items-center gap-2 mt-1">
          <input
            type="checkbox"
            {...register(
              `sections.${sectionIndex}.userInputSchema.fields.${fieldIndex}.required` as const,
            )}
            className="rounded"
          />
          <span className="text-sm text-[var(--color-text-secondary)]">
            Wizard bu alan boş bırakılırsa devam etmesin
          </span>
        </label>
      </Field>

      {fieldType === 'select' && (
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
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
              className="inline-flex items-center gap-1 text-[10px] text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
            >
              <Plus size={10} /> Seçenek ekle
            </button>
          </div>
          {options.fields.length === 0 ? (
            <p className="text-[10px] text-[var(--color-text-secondary)] italic">
              Seçenek tanımlanmadı.
            </p>
          ) : (
            <ul className="space-y-2">
              {options.fields.map((o, oi) => (
                <li key={o.id} className="grid grid-cols-[120px_1fr_28px] gap-2 items-start">
                  <input
                    {...register(
                      `sections.${sectionIndex}.userInputSchema.fields.${fieldIndex}.options.${oi}.value` as const,
                    )}
                    className={inputCls}
                    placeholder="value"
                  />
                  <div className="grid grid-cols-3 gap-1">
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
                    className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-error)]"
                    aria-label="Seçeneği sil"
                  >
                    <Trash2 size={12} />
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
  'w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all disabled:opacity-60';

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
      <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-[10px] text-[var(--color-text-secondary)]/70 mt-1">{hint}</p>
      )}
      {error && <p className="text-xs text-[var(--color-error)] mt-1">{error}</p>}
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
      <p className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
        {label}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {(['tr', 'en', 'es'] as const).map((loc) => (
          <div key={loc}>
            <Tag
              {...register(`${namePrefix}.${loc}` as never)}
              rows={multiline ? 2 : undefined}
              placeholder={loc.toUpperCase()}
              className={inputCls}
            />
            {error?.[loc]?.message && (
              <p className="text-xs text-[var(--color-error)] mt-1">{error[loc].message}</p>
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
        'p-1.5 rounded-lg border border-white/10 text-[var(--color-text-secondary)] disabled:opacity-30 transition-colors ' +
        (tone === 'danger'
          ? 'hover:text-[var(--color-error)] hover:border-[var(--color-error)]/30'
          : 'hover:text-[var(--color-text-primary)] hover:border-white/20')
      }
    >
      {children}
    </button>
  );
}
