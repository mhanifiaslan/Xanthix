'use client';

import { useMemo, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, FolderTree, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from '@/lib/actions/categories';
import type { ProjectCategory } from '@/types/projectCategory';

interface Props {
  initial: ProjectCategory[];
}

interface DraftCategory {
  id: string | null;
  slug: string;
  name: string;
  description: string;
  parentId: string | null;
  order: number;
  active: boolean;
}

function emptyDraft(parentId: string | null = null): DraftCategory {
  return {
    id: null,
    slug: '',
    name: '',
    description: '',
    parentId,
    order: 0,
    active: true,
  };
}

function fromCategory(c: ProjectCategory): DraftCategory {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description ?? '',
    parentId: c.parentId,
    order: c.order,
    active: c.active,
  };
}

export default function CategoriesManager({ initial }: Props) {
  const t = useTranslations('admin.categories');
  const router = useRouter();
  const [categories, setCategories] = useState<ProjectCategory[]>(initial);
  const [editing, setEditing] = useState<DraftCategory | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const tree = useMemo(() => {
    const tops = categories
      .filter((c) => c.parentId === null)
      .sort((a, b) => a.order - b.order);
    const byParent = new Map<string, ProjectCategory[]>();
    for (const c of categories) {
      if (c.parentId) {
        const list = byParent.get(c.parentId) ?? [];
        list.push(c);
        byParent.set(c.parentId, list);
      }
    }
    for (const list of byParent.values()) {
      list.sort((a, b) => a.order - b.order);
    }
    return { tops, byParent };
  }, [categories]);

  const handleSave = () => {
    if (!editing) return;
    setError(null);
    if (editing.name.trim().length < 1 || editing.slug.trim().length < 1) {
      setError(t('saveFailed'));
      return;
    }
    startTransition(async () => {
      try {
        if (editing.id) {
          await updateCategoryAction({
            id: editing.id,
            slug: editing.slug.trim(),
            name: editing.name.trim(),
            description: editing.description.trim() || null,
            parentId: editing.parentId,
            order: editing.order,
            active: editing.active,
          });
          setCategories((prev) =>
            prev.map((c) =>
              c.id === editing.id
                ? {
                    ...c,
                    slug: editing.slug.trim(),
                    name: editing.name.trim(),
                    description: editing.description.trim() || null,
                    parentId: editing.parentId,
                    order: editing.order,
                    active: editing.active,
                  }
                : c,
            ),
          );
        } else {
          const { id } = await createCategoryAction({
            slug: editing.slug.trim(),
            name: editing.name.trim(),
            description: editing.description.trim() || null,
            parentId: editing.parentId,
            order: editing.order,
            active: editing.active,
          });
          setCategories((prev) => [
            ...prev,
            {
              id,
              slug: editing.slug.trim(),
              name: editing.name.trim(),
              description: editing.description.trim() || null,
              parentId: editing.parentId,
              order: editing.order,
              active: editing.active,
            },
          ]);
        }
        setEditing(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : t('saveFailed'));
      }
    });
  };

  const handleDelete = (cat: ProjectCategory) => {
    if (!confirm(t('confirmDelete', { name: cat.name }))) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteCategoryAction(cat.id);
        // Cascade: also drop sub-categories under this id from local state.
        setCategories((prev) =>
          prev.filter((c) => c.id !== cat.id && c.parentId !== cat.id),
        );
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : t('saveFailed'));
      }
    });
  };

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className="min-h-full pb-12">
      <header className="px-6 lg:px-10 py-5 border-b border-white/5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 flex items-center justify-center">
            <FolderTree size={17} className="text-[var(--color-accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
              {t('title')}
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              {t('subtitle')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditing(emptyDraft(null))}
          className="inline-flex items-center gap-2 px-3 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-md transition-colors"
        >
          <Plus size={14} /> {t('newButton')}
        </button>
      </header>

      <main className="px-6 lg:px-10 max-w-4xl mx-auto mt-6 space-y-4">
        {error && (
          <p className="text-xs text-[var(--color-error)] bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        {tree.tops.length === 0 ? (
          <div className="bg-[var(--color-card)]/40 border border-dashed border-white/10 rounded-md p-10 text-center text-sm text-[var(--color-text-secondary)]">
            {t('noCategories')}
          </div>
        ) : (
          <ul className="bg-[var(--color-card)]/40 border border-white/5 rounded-md divide-y divide-white/5">
            {tree.tops.map((top) => (
              <CategoryRow
                key={top.id}
                category={top}
                children={tree.byParent.get(top.id) ?? []}
                expanded={expanded[top.id] ?? true}
                onToggle={() => toggle(top.id)}
                onEdit={() => setEditing(fromCategory(top))}
                onAddSub={() => setEditing(emptyDraft(top.id))}
                onDelete={() => handleDelete(top)}
                onEditChild={(c) => setEditing(fromCategory(c))}
                onDeleteChild={(c) => handleDelete(c)}
                disabled={isPending}
              />
            ))}
          </ul>
        )}
      </main>

      {editing && (
        <EditDialog
          draft={editing}
          parentName={
            editing.parentId
              ? categories.find((c) => c.id === editing.parentId)?.name ?? null
              : null
          }
          onChange={setEditing}
          onSave={handleSave}
          onCancel={() => {
            setEditing(null);
            setError(null);
          }}
          isPending={isPending}
        />
      )}
    </div>
  );
}

function CategoryRow({
  category,
  children,
  expanded,
  onToggle,
  onEdit,
  onAddSub,
  onDelete,
  onEditChild,
  onDeleteChild,
  disabled,
}: {
  category: ProjectCategory;
  children: ProjectCategory[];
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onAddSub: () => void;
  onDelete: () => void;
  onEditChild: (c: ProjectCategory) => void;
  onDeleteChild: (c: ProjectCategory) => void;
  disabled: boolean;
}) {
  const t = useTranslations('admin.categories');
  return (
    <li>
      <div className="flex items-center gap-2 px-4 py-3 hover:bg-white/[0.02] transition-colors">
        <button
          type="button"
          onClick={onToggle}
          aria-label="Toggle"
          className="w-6 h-6 rounded-md text-[var(--color-text-secondary)] hover:bg-white/5 flex items-center justify-center"
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
            {category.name}
            {!category.active && (
              <span className="ml-2 text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]/60">
                inactive
              </span>
            )}
          </p>
          <p className="text-[11px] text-[var(--color-text-secondary)] font-mono truncate">
            {category.slug}
          </p>
        </div>
        <RowActions
          onAddSub={onAddSub}
          onEdit={onEdit}
          onDelete={onDelete}
          disabled={disabled}
          showAddSub
        />
      </div>
      {expanded && (
        <div className="bg-[var(--color-background)]/40 border-t border-white/5">
          {children.length === 0 ? (
            <p className="px-12 py-3 text-xs text-[var(--color-text-secondary)]/70">
              {t('noSubcategories')}
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {children.map((sub) => (
                <li
                  key={sub.id}
                  className="flex items-center gap-2 px-12 py-2.5 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--color-text-primary)] truncate">
                      {sub.name}
                      {!sub.active && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]/60">
                          inactive
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-secondary)] font-mono truncate">
                      {sub.slug}
                    </p>
                  </div>
                  <RowActions
                    onEdit={() => onEditChild(sub)}
                    onDelete={() => onDeleteChild(sub)}
                    disabled={disabled}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

function RowActions({
  onAddSub,
  onEdit,
  onDelete,
  showAddSub = false,
  disabled = false,
}: {
  onAddSub?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  showAddSub?: boolean;
  disabled?: boolean;
}) {
  const t = useTranslations('admin.categories');
  return (
    <div className="flex items-center gap-1 shrink-0">
      {showAddSub && onAddSub && (
        <button
          type="button"
          onClick={onAddSub}
          disabled={disabled}
          title={t('addSubcategoryButton')}
          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md border border-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-white/20 transition-colors disabled:opacity-50"
        >
          <Plus size={11} /> {t('newSubButton')}
        </button>
      )}
      <button
        type="button"
        onClick={onEdit}
        disabled={disabled}
        title={t('editButton')}
        className="w-7 h-7 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5 flex items-center justify-center disabled:opacity-50"
      >
        <Pencil size={12} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        title={t('deleteButton')}
        className="w-7 h-7 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 flex items-center justify-center disabled:opacity-50"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

function EditDialog({
  draft,
  parentName,
  onChange,
  onSave,
  onCancel,
  isPending,
}: {
  draft: DraftCategory;
  parentName: string | null;
  onChange: (next: DraftCategory) => void;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const t = useTranslations('admin.categories');
  return (
    <div
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-lg bg-[var(--color-card)] border border-white/10 rounded-md shadow-2xl p-6 space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)]/70">
            {parentName ? parentName : t('rootLevel')}
          </p>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mt-0.5">
            {draft.id ? t('editButton') : t('newButton')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label={t('fieldName')}>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => onChange({ ...draft, name: e.target.value })}
              placeholder={t('fieldNamePlaceholder')}
              className="w-full bg-[var(--color-background)] border border-white/10 rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </Field>
          <Field label={t('fieldSlug')}>
            <input
              type="text"
              value={draft.slug}
              onChange={(e) =>
                onChange({
                  ...draft,
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                })
              }
              placeholder={t('fieldSlugPlaceholder')}
              className="w-full bg-[var(--color-background)] border border-white/10 rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </Field>
        </div>

        <Field label={t('fieldDescription')}>
          <textarea
            rows={2}
            value={draft.description}
            onChange={(e) => onChange({ ...draft, description: e.target.value })}
            className="w-full bg-[var(--color-background)] border border-white/10 rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('fieldOrder')}>
            <input
              type="number"
              value={draft.order}
              onChange={(e) =>
                onChange({ ...draft, order: Number(e.target.value) || 0 })
              }
              className="w-full bg-[var(--color-background)] border border-white/10 rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)] mt-6">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => onChange({ ...draft, active: e.target.checked })}
              className="accent-[var(--color-accent)]"
            />
            {t('fieldActive')}
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-md border border-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-white/20"
          >
            {t('cancelButton')}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isPending || draft.name.trim().length < 1 || draft.slug.trim().length < 1}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors',
              'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white disabled:opacity-50',
            )}
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            {isPending ? t('saving') : t('saveButton')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
