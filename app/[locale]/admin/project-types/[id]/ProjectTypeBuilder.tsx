'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { nanoid } from 'nanoid';
import {
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  FileOutput,
  Layers,
  Loader2,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { upsertProjectTypeAction } from '@/lib/actions/projectTypes';
import { uploadReportTemplateAction } from '@/lib/actions/reportTemplates';
import {
  MODEL_OVERRIDES,
  PROJECT_OUTPUT_LANGUAGES,
  PROJECT_TIERS,
  PROJECT_VISIBILITIES,
  SECTION_OUTPUT_TYPES,
  evaluationCriterionSchema,
  projectTypeWriteSchema,
  reportTemplateSchema,
  type EvaluationCriterion,
  type ProjectTypeWriteInput,
  type ReportTemplate,
  type Section,
} from '@/types/projectType';
import type { ProjectCategory } from '@/types/projectCategory';
import AIGenerateModal, {
  type AIGenerateContext,
  type AIGenerateMode,
} from '@/components/admin/AIGenerateModal';

type Tab = 'general' | 'sections' | 'evaluation' | 'reports';

// We normalize to fully-defaulted output shapes locally (Section[] +
// EvaluationCriterion[] + ReportTemplate[]) so editor components don't
// have to cope with optional fields.
type Draft = Omit<
  ProjectTypeWriteInput,
  'sections' | 'evaluationCriteria' | 'reportTemplates'
> & {
  sections: Section[];
  evaluationCriteria: EvaluationCriterion[];
  reportTemplates: ReportTemplate[];
};

const ICON_NAMES = [
  'FolderGit2',
  'GraduationCap',
  'Microscope',
  'Building2',
  'Rocket',
  'Sparkles',
] as const;

interface Props {
  initial: ProjectTypeWriteInput;
  mode: 'create' | 'edit';
  locale: string;
  categories: ProjectCategory[];
}

function ensureSectionDefaults(s: Section, fallbackOrder: number): Section {
  return {
    id: s.id || `sec_${nanoid(6)}`,
    order: typeof s.order === 'number' ? s.order : fallbackOrder,
    title: s.title ?? '',
    description: s.description ?? '',
    agentPromptTemplate: s.agentPromptTemplate ?? '',
    criteria: s.criteria ?? [],
    rubric: s.rubric ?? null,
    outputType: s.outputType ?? 'markdown',
    modelOverride: s.modelOverride ?? null,
    estimatedTokens: s.estimatedTokens ?? null,
  };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export default function ProjectTypeBuilder({
  initial,
  mode,
  locale,
  categories,
}: Props) {
  const t = useTranslations('admin.builder');
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('general');
  const [draft, setDraft] = useState<Draft>({
    ...initial,
    sections: (initial.sections ?? []).map((s, i) =>
      ensureSectionDefaults(s as Section, i),
    ),
    evaluationCriteria: (initial.evaluationCriteria ?? []).map((c) =>
      evaluationCriterionSchema.parse({
        id: c.id || `eval_${nanoid(6)}`,
        name: c.name,
        description: c.description,
        weight: c.weight ?? 1,
      }),
    ),
    reportTemplates: (initial.reportTemplates ?? []).map((r) =>
      reportTemplateSchema.parse(r),
    ),
  });
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    draft.sections[0]?.id ?? '',
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // AI generation modal state — driven by section editor + evaluation editor.
  const [aiModal, setAiModal] = useState<{
    mode: AIGenerateMode;
    onAccept: (value: string | string[] | EvaluationCriterion[]) => void;
  } | null>(null);

  const aiContext: AIGenerateContext = useMemo(() => {
    const sec = draft.sections.find((s) => s.id === selectedSectionId);
    return {
      projectTypeName: draft.name,
      projectTypeDescription: draft.description,
      sectionTitle: sec?.title,
      sectionDescription: sec?.description,
      outputLanguage: draft.outputLanguage,
    };
  }, [
    draft.name,
    draft.description,
    draft.outputLanguage,
    draft.sections,
    selectedSectionId,
  ]);

  const topLevelCategories = useMemo(
    () => categories.filter((c) => c.parentId === null && c.active),
    [categories],
  );
  const subCategories = useMemo(
    () =>
      draft.categoryId
        ? categories.filter(
            (c) => c.parentId === draft.categoryId && c.active,
          )
        : [],
    [categories, draft.categoryId],
  );

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const updateSection = (id: string, patch: Partial<Section>) => {
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      ),
    }));
  };

  const addSection = () => {
    const id = `sec_${nanoid(6)}`;
    setDraft((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          id,
          order: prev.sections.length,
          title: 'New section',
          description: 'Describe what this section captures.',
          agentPromptTemplate:
            'Write the {{section.title}} for the project.\n\nContext:\nUser idea: {{userIdea}}\nPrevious sections: {{previousSections}}',
          criteria: [],
          outputType: 'markdown',
        },
      ],
    }));
    setSelectedSectionId(id);
  };

  const removeSection = (id: string) => {
    setDraft((prev) => {
      const next = prev.sections.filter((s) => s.id !== id);
      return {
        ...prev,
        sections: next.map((s, i) => ({ ...s, order: i })),
      };
    });
    if (selectedSectionId === id) {
      const remaining = draft.sections.filter((s) => s.id !== id);
      setSelectedSectionId(remaining[0]?.id ?? '');
    }
  };

  const moveSection = (id: string, dir: -1 | 1) => {
    setDraft((prev) => {
      const arr = [...prev.sections];
      const idx = arr.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= arr.length) return prev;
      const tmp = arr[idx];
      arr[idx] = arr[newIdx];
      arr[newIdx] = tmp;
      return { ...prev, sections: arr.map((s, i) => ({ ...s, order: i })) };
    });
  };

  const handleSubmit = () => {
    setError(null);

    // Auto-fill ID from slug for create mode if empty.
    const next: Draft = { ...draft };
    if (mode === 'create' && !next.id && next.slug) {
      next.id = next.slug;
    }
    if (next.slug) next.slug = slugify(next.slug);
    if (!next.id && next.name) next.id = slugify(next.name);

    const parsed = projectTypeWriteSchema.safeParse(next);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path = issue.path.join('.');
      setError(`${path || 'form'}: ${issue.message}`);
      // jump to the first failing tab
      if (path.startsWith('sections')) setTab('sections');
      else setTab('general');
      return;
    }

    startTransition(async () => {
      try {
        const stored = await upsertProjectTypeAction(parsed.data);
        if (mode === 'create') {
          router.push(`/${locale}/admin/project-types/${stored.id}`);
        } else {
          router.refresh();
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t('saveFailed'),
        );
      }
    });
  };

  const selectedSection = useMemo(
    () => draft.sections.find((s) => s.id === selectedSectionId) ?? null,
    [draft.sections, selectedSectionId],
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-[var(--color-background)]/95 backdrop-blur border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)]/70">
              {mode === 'create' ? t('createButton') : t('saveButton')}
            </p>
            <h1 className="text-xl font-semibold text-[var(--color-text-primary)] truncate">
              {draft.name || t('fieldName')}
            </h1>
          </div>
          {error && (
            <div className="text-xs text-[var(--color-error)] bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 rounded-md px-3 py-1.5 max-w-md">
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-[var(--color-accent)] text-[var(--color-background)] hover:bg-[var(--color-accent)]/90 transition-colors disabled:opacity-50"
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            {isPending
              ? mode === 'create'
                ? t('creating')
                : t('saving')
              : mode === 'create'
                ? t('createButton')
                : t('saveButton')}
          </button>
        </div>

        <nav className="max-w-6xl mx-auto px-6 flex items-center gap-1 -mb-px">
          <TabButton
            active={tab === 'general'}
            onClick={() => setTab('general')}
            icon={<Settings2 size={14} />}
            label={t('tabGeneral')}
          />
          <TabButton
            active={tab === 'sections'}
            onClick={() => setTab('sections')}
            icon={<Layers size={14} />}
            label={t('tabSections')}
          />
          <TabButton
            active={tab === 'evaluation'}
            onClick={() => setTab('evaluation')}
            icon={<ClipboardCheck size={14} />}
            label={t('tabEvaluation')}
          />
          <TabButton
            active={tab === 'reports'}
            onClick={() => setTab('reports')}
            icon={<FileOutput size={14} />}
            label={t('tabReports')}
          />
        </nav>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        {tab === 'general' && (
          <GeneralTab
            draft={draft}
            update={update}
            mode={mode}
            topLevelCategories={topLevelCategories}
            subCategories={subCategories}
            allCategoriesEmpty={categories.length === 0}
            t={t}
          />
        )}

        {tab === 'sections' && (
          <SectionsTab
            sections={draft.sections}
            selectedId={selectedSectionId}
            onSelect={setSelectedSectionId}
            onAdd={addSection}
            onRemove={removeSection}
            onMove={moveSection}
            selected={selectedSection}
            updateSection={updateSection}
            openAi={(mode, onAccept) => setAiModal({ mode, onAccept })}
            t={t}
          />
        )}

        {tab === 'evaluation' && (
          <EvaluationTab
            criteria={draft.evaluationCriteria ?? []}
            onChange={(next) => update('evaluationCriteria', next)}
            openAi={(onAccept) =>
              setAiModal({ mode: 'evaluation-criteria', onAccept })
            }
            t={t}
          />
        )}
        {tab === 'reports' && (
          <ReportsTab
            projectTypeId={mode === 'edit' ? (draft.id ?? '') : ''}
            templates={draft.reportTemplates}
            onChange={(next) => update('reportTemplates', next)}
            openAi={(onAccept) =>
              setAiModal({ mode: 'filling-instructions', onAccept })
            }
            mode={mode}
            t={t}
          />
        )}
      </main>

      {aiModal && (
        <AIGenerateModal
          mode={aiModal.mode}
          context={aiContext}
          onAccept={(value) => {
            aiModal.onAccept(value);
            setAiModal(null);
          }}
          onClose={() => setAiModal(null)}
        />
      )}
    </div>
  );
}

// ─── Tabs ───────────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
        active
          ? 'border-[var(--color-accent)] text-[var(--color-text-primary)]'
          : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ComingSoon({ message }: { message: string }) {
  return (
    <div className="border border-dashed border-white/10 rounded-md p-12 text-center text-sm text-[var(--color-text-secondary)]">
      {message}
    </div>
  );
}

// ─── Tab 1: General ─────────────────────────────────────────────────────────

type TFn = ReturnType<typeof useTranslations<'admin.builder'>>;

function GeneralTab({
  draft,
  update,
  mode,
  topLevelCategories,
  subCategories,
  allCategoriesEmpty,
  t,
}: {
  draft: Draft;
  update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  mode: 'create' | 'edit';
  topLevelCategories: ProjectCategory[];
  subCategories: ProjectCategory[];
  allCategoriesEmpty: boolean;
  t: TFn;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <Field label={t('fieldId')}>
        <input
          type="text"
          value={draft.id ?? ''}
          onChange={(e) => update('id', slugify(e.target.value))}
          disabled={mode === 'edit'}
          placeholder="tubitak-1507"
          className="input"
        />
      </Field>

      <Field label={t('fieldSlug')}>
        <input
          type="text"
          value={draft.slug ?? ''}
          onChange={(e) => update('slug', slugify(e.target.value))}
          placeholder="tubitak-1507"
          className="input"
        />
      </Field>

      <Field label={t('fieldName')} className="md:col-span-2">
        <input
          type="text"
          value={draft.name ?? ''}
          onChange={(e) => update('name', e.target.value)}
          className="input"
        />
      </Field>

      <Field label={t('fieldDescription')} className="md:col-span-2">
        <textarea
          value={draft.description ?? ''}
          onChange={(e) => update('description', e.target.value)}
          rows={3}
          className="input resize-y"
        />
      </Field>

      <Field label={t('fieldCategory')}>
        {allCategoriesEmpty ? (
          <p className="text-xs text-[var(--color-text-secondary)] py-2">
            {t('fieldNoCategoriesAvailable')}
          </p>
        ) : (
          <select
            value={draft.categoryId ?? ''}
            onChange={(e) => {
              const v = e.target.value || null;
              update('categoryId', v);
              update('subCategoryId', null);
            }}
            className="input bg-[var(--color-background)]"
          >
            <option value="">—</option>
            {topLevelCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field label={t('fieldSubCategory')}>
        {!draft.categoryId || subCategories.length === 0 ? (
          <p className="text-xs text-[var(--color-text-secondary)] py-2">
            {t('fieldNoSubCategories')}
          </p>
        ) : (
          <select
            value={draft.subCategoryId ?? ''}
            onChange={(e) =>
              update('subCategoryId', e.target.value || null)
            }
            className="input bg-[var(--color-background)]"
          >
            <option value="">—</option>
            {subCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field label={t('fieldTier')}>
        <select
          value={draft.tier}
          onChange={(e) =>
            update('tier', e.target.value as Draft['tier'])
          }
          className="input bg-[var(--color-background)]"
        >
          {PROJECT_TIERS.map((tier) => (
            <option key={tier} value={tier}>
              {tier}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t('fieldOutputLanguage')}>
        <select
          value={draft.outputLanguage}
          onChange={(e) =>
            update(
              'outputLanguage',
              e.target.value as Draft['outputLanguage'],
            )
          }
          className="input bg-[var(--color-background)]"
        >
          {PROJECT_OUTPUT_LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t('fieldVisibility')}>
        <select
          value={draft.visibility}
          onChange={(e) =>
            update('visibility', e.target.value as Draft['visibility'])
          }
          className="input bg-[var(--color-background)]"
        >
          {PROJECT_VISIBILITIES.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t('fieldIcon')}>
        <select
          value={draft.iconName ?? 'FolderGit2'}
          onChange={(e) => update('iconName', e.target.value)}
          className="input bg-[var(--color-background)]"
        >
          {ICON_NAMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t('fieldVersion')}>
        <input
          type="text"
          value={draft.version ?? '1.0.0'}
          onChange={(e) => update('version', e.target.value)}
          className="input"
        />
      </Field>

      <Field label={t('fieldActive')}>
        <label className="flex items-center gap-2 py-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={draft.active ?? true}
            onChange={(e) => update('active', e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm text-[var(--color-text-secondary)]">
            {draft.active ? 'on' : 'off'}
          </span>
        </label>
      </Field>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          background: var(--color-card);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 10px 12px;
          font-size: 14px;
          color: var(--color-text-primary);
          outline: none;
          transition: border-color 0.15s;
        }
        :global(.input:focus) {
          border-color: var(--color-accent);
        }
        :global(.input:disabled) {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
        {label}
      </label>
      {children}
    </div>
  );
}

function FieldWithAi({
  label,
  onAi,
  aiLabel,
  children,
}: {
  label: string;
  onAi?: () => void;
  aiLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
          {label}
        </label>
        {onAi && (
          <button
            type="button"
            onClick={onAi}
            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md border border-[var(--color-accent)]/30 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors"
          >
            <Sparkles size={10} />
            {aiLabel ?? 'AI'}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Tab 2: Sections ────────────────────────────────────────────────────────

type OpenAi = (
  mode: AIGenerateMode,
  onAccept: (value: string | string[] | EvaluationCriterion[]) => void,
) => void;

function SectionsTab({
  sections,
  selectedId,
  onSelect,
  onAdd,
  onRemove,
  onMove,
  selected,
  updateSection,
  openAi,
  t,
}: {
  sections: Section[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  selected: Section | null;
  updateSection: (id: string, patch: Partial<Section>) => void;
  openAi: OpenAi;
  t: TFn;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
      {/* Left: list */}
      <aside className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
            {t('sectionsHeading')}
          </h3>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md border border-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-white/20 transition-colors"
          >
            <Plus size={11} /> {t('addSection')}
          </button>
        </div>
        <ul className="space-y-1">
          {sections.map((s, idx) => (
            <li
              key={s.id}
              className={cn(
                'group flex items-center gap-1 rounded-md px-2 py-2 cursor-pointer border transition-colors',
                selectedId === s.id
                  ? 'bg-[var(--color-card)] border-[var(--color-accent)]/40'
                  : 'border-transparent hover:bg-white/[0.03]',
              )}
              onClick={() => onSelect(s.id)}
            >
              <span className="text-[10px] font-mono text-[var(--color-text-secondary)]/60 w-5 text-center">
                {idx + 1}
              </span>
              <span className="flex-1 text-sm text-[var(--color-text-primary)] truncate">
                {s.title || '(untitled)'}
              </span>
              <span className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(s.id, -1);
                  }}
                  disabled={idx === 0}
                  className="w-5 h-5 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-30 flex items-center justify-center"
                  aria-label="Up"
                >
                  <ChevronUp size={11} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(s.id, 1);
                  }}
                  disabled={idx === sections.length - 1}
                  className="w-5 h-5 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-30 flex items-center justify-center"
                  aria-label="Down"
                >
                  <ChevronDown size={11} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(s.id);
                  }}
                  className="w-5 h-5 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-error)] flex items-center justify-center"
                  aria-label="Remove"
                >
                  <Trash2 size={11} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      </aside>

      {/* Right: detail */}
      <div>
        {!selected ? (
          <div className="border border-dashed border-white/10 rounded-md p-12 text-center text-sm text-[var(--color-text-secondary)]">
            {t('addSection')} →
          </div>
        ) : (
          <SectionDetail
            section={selected}
            update={(patch) => updateSection(selected.id, patch)}
            openAi={openAi}
            t={t}
          />
        )}
      </div>
    </div>
  );
}

function SectionDetail({
  section,
  update,
  openAi,
  t,
}: {
  section: Section;
  update: (patch: Partial<Section>) => void;
  openAi: OpenAi;
  t: TFn;
}) {
  return (
    <div className="space-y-5">
      <Field label={t('sectionTitle')}>
        <input
          type="text"
          value={section.title}
          onChange={(e) => update({ title: e.target.value })}
          className="input"
        />
      </Field>

      <Field label={t('sectionDescription')}>
        <textarea
          value={section.description}
          onChange={(e) => update({ description: e.target.value })}
          rows={2}
          className="input resize-y"
        />
      </Field>

      <FieldWithAi
        label={t('sectionPromptTemplate')}
        onAi={() =>
          openAi('prompt-template', (value) => {
            if (typeof value === 'string') {
              update({ agentPromptTemplate: value });
            }
          })
        }
        aiLabel={t('aiGenerateButton')}
      >
        <textarea
          value={section.agentPromptTemplate}
          onChange={(e) =>
            update({ agentPromptTemplate: e.target.value })
          }
          rows={8}
          className="input font-mono text-[13px] resize-y"
        />
        <p className="text-[10px] text-[var(--color-text-secondary)]/70 mt-1">
          {t('sectionPlaceholdersHint')}
        </p>
      </FieldWithAi>

      <CriteriaList
        items={section.criteria}
        onChange={(criteria) => update({ criteria })}
        onAi={() =>
          openAi('criteria', (value) => {
            if (Array.isArray(value) && typeof value[0] === 'string') {
              update({ criteria: value as string[] });
            }
          })
        }
        aiLabel={t('aiGenerateButton')}
        t={t}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label={t('sectionOutputType')}>
          <select
            value={section.outputType}
            onChange={(e) =>
              update({
                outputType: e.target.value as Section['outputType'],
              })
            }
            className="input bg-[var(--color-background)]"
          >
            {SECTION_OUTPUT_TYPES.map((ot) => (
              <option key={ot} value={ot}>
                {ot}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('sectionModelOverride')}>
          <select
            value={section.modelOverride ?? ''}
            onChange={(e) =>
              update({
                modelOverride:
                  (e.target.value as Section['modelOverride']) || null,
              })
            }
            className="input bg-[var(--color-background)]"
          >
            <option value="">{t('sectionDefaultTier')}</option>
            {MODEL_OVERRIDES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('sectionEstimatedTokens')}>
          <input
            type="number"
            value={section.estimatedTokens ?? ''}
            min={0}
            onChange={(e) =>
              update({
                estimatedTokens: e.target.value
                  ? Math.max(0, parseInt(e.target.value, 10))
                  : null,
              })
            }
            className="input"
          />
        </Field>
      </div>

      <RubricEditor
        rubric={section.rubric ?? null}
        onChange={(rubric) => update({ rubric })}
        t={t}
      />

      <style jsx>{`
        :global(.input) {
          width: 100%;
          background: var(--color-card);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 10px 12px;
          font-size: 14px;
          color: var(--color-text-primary);
          outline: none;
          transition: border-color 0.15s;
        }
        :global(.input:focus) {
          border-color: var(--color-accent);
        }
      `}</style>
    </div>
  );
}

function CriteriaList({
  items,
  onChange,
  onAi,
  aiLabel,
  t,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  onAi?: () => void;
  aiLabel?: string;
  t: TFn;
}) {
  const [draft, setDraft] = useState('');
  return (
    <FieldWithAi
      label={t('sectionCriteria')}
      onAi={onAi}
      aiLabel={aiLabel}
    >
      <ul className="space-y-1.5 mb-2">
        {items.map((c, i) => (
          <li
            key={i}
            className="flex items-center gap-2 bg-[var(--color-card)]/60 border border-white/5 rounded-md px-3 py-1.5"
          >
            <span className="text-[10px] font-mono text-[var(--color-text-secondary)]/60 w-4 shrink-0">
              {i + 1}
            </span>
            <input
              type="text"
              value={c}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
              className="flex-1 bg-transparent border-0 text-sm focus:outline-none text-[var(--color-text-primary)]"
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="w-6 h-6 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-error)] flex items-center justify-center"
            >
              <Trash2 size={11} />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim()) {
              e.preventDefault();
              onChange([...items, draft.trim()]);
              setDraft('');
            }
          }}
          placeholder="…"
          className="input flex-1"
        />
        <button
          type="button"
          onClick={() => {
            if (draft.trim()) {
              onChange([...items, draft.trim()]);
              setDraft('');
            }
          }}
          className="inline-flex items-center gap-1 px-3 py-2 text-xs rounded-md border border-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-white/20 transition-colors"
        >
          <Plus size={11} /> {t('sectionAddCriterion')}
        </button>
      </div>
    </FieldWithAi>
  );
}

function RubricEditor({
  rubric,
  onChange,
  t,
}: {
  rubric: Section['rubric'];
  onChange: (next: Section['rubric']) => void;
  t: TFn;
}) {
  if (!rubric) {
    return (
      <div>
        <button
          type="button"
          onClick={() =>
            onChange({
              dimensions: [
                {
                  id: `dim_${nanoid(4)}`,
                  name: 'Clarity',
                  descriptor:
                    '5: Crystal clear and well-structured. 1: Vague or off-topic.',
                  maxPoints: 5,
                },
              ],
              passingThreshold: 0.7,
              maxRevisionAttempts: 2,
            })
          }
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-dashed border-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-white/20 transition-colors"
        >
          <Plus size={11} /> {t('sectionAddRubric')}
        </button>
      </div>
    );
  }

  return (
    <div className="border border-white/10 rounded-md p-4 space-y-4 bg-[var(--color-card)]/30">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
          {t('sectionRubric')}
        </h4>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-error)]"
        >
          {t('sectionRemoveRubric')}
        </button>
      </div>

      <ul className="space-y-3">
        {rubric.dimensions.map((d, i) => (
          <li
            key={d.id}
            className="border border-white/5 rounded-md p-3 space-y-2"
          >
            <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_40px] gap-2">
              <input
                type="text"
                value={d.name}
                placeholder={t('rubricDimensionName')}
                onChange={(e) => {
                  const next = [...rubric.dimensions];
                  next[i] = { ...d, name: e.target.value };
                  onChange({ ...rubric, dimensions: next });
                }}
                className="input"
              />
              <input
                type="number"
                value={d.maxPoints}
                min={1}
                max={20}
                placeholder={t('rubricMaxPoints')}
                onChange={(e) => {
                  const next = [...rubric.dimensions];
                  next[i] = {
                    ...d,
                    maxPoints: Math.max(
                      1,
                      Math.min(20, parseInt(e.target.value, 10) || 1),
                    ),
                  };
                  onChange({ ...rubric, dimensions: next });
                }}
                className="input"
              />
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...rubric,
                    dimensions: rubric.dimensions.filter(
                      (_, j) => j !== i,
                    ),
                  })
                }
                className="w-9 h-9 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 flex items-center justify-center"
              >
                <Trash2 size={12} />
              </button>
            </div>
            <textarea
              value={d.descriptor}
              placeholder={t('rubricDimensionDescriptor')}
              onChange={(e) => {
                const next = [...rubric.dimensions];
                next[i] = { ...d, descriptor: e.target.value };
                onChange({ ...rubric, dimensions: next });
              }}
              rows={2}
              className="input resize-y"
            />
          </li>
        ))}
      </ul>

      {rubric.dimensions.length < 8 && (
        <button
          type="button"
          onClick={() =>
            onChange({
              ...rubric,
              dimensions: [
                ...rubric.dimensions,
                {
                  id: `dim_${nanoid(4)}`,
                  name: '',
                  descriptor: '',
                  maxPoints: 5,
                },
              ],
            })
          }
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-white/20 transition-colors"
        >
          <Plus size={11} /> {t('sectionAddCriterion')}
        </button>
      )}

      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
        <Field label={t('rubricPassingThreshold')}>
          <input
            type="number"
            value={rubric.passingThreshold}
            min={0}
            max={1}
            step={0.05}
            onChange={(e) =>
              onChange({
                ...rubric,
                passingThreshold: Math.max(
                  0,
                  Math.min(1, parseFloat(e.target.value) || 0),
                ),
              })
            }
            className="input"
          />
        </Field>
        <Field label={t('rubricMaxRevisionAttempts')}>
          <input
            type="number"
            value={rubric.maxRevisionAttempts}
            min={0}
            max={3}
            onChange={(e) =>
              onChange({
                ...rubric,
                maxRevisionAttempts: Math.max(
                  0,
                  Math.min(3, parseInt(e.target.value, 10) || 0),
                ),
              })
            }
            className="input"
          />
        </Field>
      </div>
    </div>
  );
}

// ─── Tab 3: Evaluation criteria (project-level final QA) ────────────────────

function EvaluationTab({
  criteria,
  onChange,
  openAi,
  t,
}: {
  criteria: EvaluationCriterion[];
  onChange: (next: EvaluationCriterion[]) => void;
  openAi: (
    onAccept: (value: string | string[] | EvaluationCriterion[]) => void,
  ) => void;
  t: TFn;
}) {
  const tEval = useTranslations('admin.builder.evaluation');

  const addEmpty = () => {
    onChange([
      ...criteria,
      evaluationCriterionSchema.parse({
        id: `eval_${nanoid(6)}`,
        name: '',
        description: '',
        weight: 1,
      }),
    ]);
  };

  const update = (idx: number, patch: Partial<EvaluationCriterion>) => {
    const next = [...criteria];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const remove = (idx: number) => {
    onChange(criteria.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 border border-white/5 rounded-md p-4 bg-[var(--color-card)]/40">
        <p className="text-sm text-[var(--color-text-secondary)] max-w-2xl leading-relaxed">
          {tEval('intro')}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              openAi((value) => {
                if (
                  Array.isArray(value) &&
                  value.length > 0 &&
                  typeof value[0] === 'object'
                ) {
                  // Merge AI-generated criteria into the list, replacing any
                  // empty rows (admin's blank starter rows).
                  const cleaned = criteria.filter(
                    (c) => c.name.trim() || c.description.trim(),
                  );
                  onChange([...cleaned, ...(value as EvaluationCriterion[])]);
                }
              })
            }
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--color-accent)]/30 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors"
          >
            <Sparkles size={11} />
            {t('aiGenerateButton')}
          </button>
          <button
            type="button"
            onClick={addEmpty}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-white/20 transition-colors"
          >
            <Plus size={11} />
            {tEval('addCriterion')}
          </button>
        </div>
      </div>

      {criteria.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-md p-12 text-center text-sm text-[var(--color-text-secondary)]">
          {tEval('empty')}
        </div>
      ) : (
        <ul className="space-y-3">
          {criteria.map((c, i) => (
            <li
              key={c.id}
              className="border border-white/10 rounded-md p-4 bg-[var(--color-card)]/30 space-y-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_40px] gap-2">
                <input
                  type="text"
                  value={c.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  placeholder={tEval('fieldName')}
                  className="input"
                />
                <input
                  type="number"
                  value={c.weight}
                  min={0}
                  max={10}
                  step={1}
                  onChange={(e) =>
                    update(i, {
                      weight: Math.max(
                        0,
                        Math.min(10, parseFloat(e.target.value) || 0),
                      ),
                    })
                  }
                  placeholder={tEval('fieldWeight')}
                  className="input"
                />
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="w-9 h-9 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 flex items-center justify-center"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <textarea
                value={c.description}
                onChange={(e) => update(i, { description: e.target.value })}
                placeholder={tEval('fieldDescription')}
                rows={2}
                className="input resize-y"
              />
            </li>
          ))}
        </ul>
      )}

      <style jsx>{`
        :global(.input) {
          width: 100%;
          background: var(--color-card);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 10px 12px;
          font-size: 14px;
          color: var(--color-text-primary);
          outline: none;
          transition: border-color 0.15s;
        }
        :global(.input:focus) {
          border-color: var(--color-accent);
        }
      `}</style>
    </div>
  );
}

// ─── Tab 4: Reports ─────────────────────────────────────────────────────────

function ReportsTab({
  projectTypeId,
  templates,
  onChange,
  openAi,
  mode,
  t,
}: {
  projectTypeId: string;
  templates: ReportTemplate[];
  onChange: (next: ReportTemplate[]) => void;
  openAi: (
    onAccept: (value: string | string[] | EvaluationCriterion[]) => void,
  ) => void;
  mode: 'create' | 'edit';
  t: TFn;
}) {
  const tRpt = useTranslations('admin.builder.reports');

  if (mode === 'create') {
    return (
      <div className="border border-dashed border-white/10 rounded-md p-12 text-center text-sm text-[var(--color-text-secondary)]">
        {tRpt('saveFirst')}
      </div>
    );
  }

  const update = (idx: number, patch: Partial<ReportTemplate>) => {
    const next = [...templates];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const remove = (idx: number) => {
    onChange(templates.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-5">
      <div className="border border-white/5 rounded-md p-4 bg-[var(--color-card)]/40 space-y-2">
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          {tRpt('intro')}
        </p>
        <p className="text-[11px] text-[var(--color-text-secondary)]/80 font-mono">
          {tRpt('placeholdersHint')}
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-md p-12 text-center text-sm text-[var(--color-text-secondary)]">
          {tRpt('empty')}
        </div>
      ) : (
        <ul className="space-y-3">
          {templates.map((tpl, i) => (
            <ReportTemplateCard
              key={tpl.id}
              template={tpl}
              update={(patch) => update(i, patch)}
              remove={() => remove(i)}
              openAi={openAi}
              t={t}
              tRpt={tRpt}
            />
          ))}
        </ul>
      )}

      <NewTemplateUpload
        projectTypeId={projectTypeId}
        onUploaded={(meta) => {
          onChange([
            ...templates,
            reportTemplateSchema.parse({
              id: meta.templateId,
              name: meta.originalFilename.replace(/\.[^.]+$/, ''),
              fileFormat: meta.fileFormat,
              storagePath: meta.storagePath,
              originalFilename: meta.originalFilename,
              fillingInstructions:
                'Replace placeholders with the matching project section content.',
            }),
          ]);
        }}
        tRpt={tRpt}
      />

      <style jsx>{`
        :global(.input) {
          width: 100%;
          background: var(--color-card);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 10px 12px;
          font-size: 14px;
          color: var(--color-text-primary);
          outline: none;
          transition: border-color 0.15s;
        }
        :global(.input:focus) {
          border-color: var(--color-accent);
        }
      `}</style>
    </div>
  );
}

function ReportTemplateCard({
  template,
  update,
  remove,
  openAi,
  t,
  tRpt,
}: {
  template: ReportTemplate;
  update: (patch: Partial<ReportTemplate>) => void;
  remove: () => void;
  openAi: (
    onAccept: (value: string | string[] | EvaluationCriterion[]) => void,
  ) => void;
  t: TFn;
  tRpt: ReturnType<typeof useTranslations<'admin.builder.reports'>>;
}) {
  return (
    <li className="border border-white/10 rounded-md p-4 bg-[var(--color-card)]/30 space-y-3">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded',
            template.fileFormat === 'docx'
              ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
              : 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
          )}
        >
          {template.fileFormat}
        </span>
        <input
          type="text"
          value={template.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder={tRpt('fieldName')}
          className="input flex-1"
        />
        <button
          type="button"
          onClick={remove}
          className="w-9 h-9 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 flex items-center justify-center"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {template.originalFilename && (
        <p className="text-[11px] text-[var(--color-text-secondary)]/70 font-mono truncate">
          {template.originalFilename}
        </p>
      )}

      <FieldWithAi
        label={tRpt('fieldFillingInstructions')}
        onAi={() =>
          openAi((value) => {
            if (typeof value === 'string') {
              update({ fillingInstructions: value });
            }
          })
        }
        aiLabel={t('aiGenerateButton')}
      >
        <textarea
          value={template.fillingInstructions}
          onChange={(e) => update({ fillingInstructions: e.target.value })}
          rows={4}
          placeholder={tRpt('fieldFillingInstructionsPlaceholder')}
          className="input resize-y"
        />
      </FieldWithAi>
    </li>
  );
}

function NewTemplateUpload({
  projectTypeId,
  onUploaded,
  tRpt,
}: {
  projectTypeId: string;
  onUploaded: (meta: {
    templateId: string;
    storagePath: string;
    fileFormat: 'docx' | 'pdf';
    originalFilename: string;
    sizeBytes: number;
  }) => void;
  tRpt: ReturnType<typeof useTranslations<'admin.builder.reports'>>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set('projectTypeId', projectTypeId);
      fd.set('file', file);
      const meta = await uploadReportTemplateAction(fd);
      onUploaded(meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : tRpt('uploadFailed'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileRef}
        type="file"
        accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handle(file);
        }}
        className="hidden"
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
        className="w-full border border-dashed border-white/15 rounded-md p-6 flex flex-col items-center justify-center gap-2 text-[var(--color-text-secondary)] hover:border-white/25 hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Plus size={18} />
        )}
        <span className="text-sm">
          {uploading ? tRpt('uploading') : tRpt('addNew')}
        </span>
        <span className="text-[10px] text-[var(--color-text-secondary)]/60">
          {tRpt('formatHint')}
        </span>
      </button>
      {error && (
        <p className="text-xs text-[var(--color-error)] bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 rounded-md px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
