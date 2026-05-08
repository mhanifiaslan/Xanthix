'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { projectTypeIcon } from '@/components/shared/ProjectTypeIcon';

interface TypeForGrid {
  id: string;
  slug: string;
  name: string;
  description: string;
  iconName: string;
  tier: string;
  categoryId: string | null;
  subCategoryId: string | null;
  sectionsCount: number;
}

interface CategoryForGrid {
  id: string;
  name: string;
  parentId: string | null;
}

interface Props {
  locale: string;
  prompt: string;
  types: TypeForGrid[];
  categories: CategoryForGrid[];
  initialCategoryId?: string | null;
}

export default function TypeGrid({
  locale,
  prompt,
  types,
  categories,
  initialCategoryId = null,
}: Props) {
  const t = useTranslations('start');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    initialCategoryId,
  );
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);

  const topLevels = useMemo(
    () =>
      categories.filter((c) => c.parentId === null).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    [categories],
  );

  const subsForSelected = useMemo(
    () =>
      selectedCategoryId
        ? categories
            .filter((c) => c.parentId === selectedCategoryId)
            .sort((a, b) => a.name.localeCompare(b.name))
        : [],
    [categories, selectedCategoryId],
  );

  // Counts shown next to each chip — based on the active selection.
  const countForCategory = (catId: string | null): number => {
    if (catId === null) return types.length;
    return types.filter((tp) => tp.categoryId === catId).length;
  };

  const filtered = useMemo(() => {
    let list = types;
    if (selectedCategoryId) {
      list = list.filter((tp) => tp.categoryId === selectedCategoryId);
    }
    if (selectedSubId) {
      list = list.filter((tp) => tp.subCategoryId === selectedSubId);
    }
    return list;
  }, [types, selectedCategoryId, selectedSubId]);

  if (types.length === 0) {
    return (
      <div className="max-w-xl mx-auto bg-[var(--color-card)] rounded-md border border-dashed border-white/10 p-10 text-center text-sm text-[var(--color-text-secondary)]">
        {t('noTypesAvailable')}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {topLevels.length > 0 && (
        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip
              label={t('filterAll')}
              count={countForCategory(null)}
              active={selectedCategoryId === null}
              onClick={() => {
                setSelectedCategoryId(null);
                setSelectedSubId(null);
              }}
            />
            {topLevels.map((c) => {
              const count = countForCategory(c.id);
              if (count === 0) return null;
              return (
                <Chip
                  key={c.id}
                  label={c.name}
                  count={count}
                  active={selectedCategoryId === c.id}
                  onClick={() => {
                    setSelectedCategoryId(
                      selectedCategoryId === c.id ? null : c.id,
                    );
                    setSelectedSubId(null);
                  }}
                />
              );
            })}
          </div>

          {selectedCategoryId && subsForSelected.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pl-1">
              <SubChip
                label={t('filterAllSubs')}
                active={selectedSubId === null}
                onClick={() => setSelectedSubId(null)}
              />
              {subsForSelected.map((s) => {
                const count = types.filter(
                  (tp) => tp.subCategoryId === s.id,
                ).length;
                if (count === 0) return null;
                return (
                  <SubChip
                    key={s.id}
                    label={`${s.name} · ${count}`}
                    active={selectedSubId === s.id}
                    onClick={() =>
                      setSelectedSubId(selectedSubId === s.id ? null : s.id)
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-[var(--color-card)] rounded-md border border-dashed border-white/10 p-10 text-center text-sm text-[var(--color-text-secondary)]">
          {t('noTypesInCategory')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((type) => {
            const Icon = projectTypeIcon(type.iconName);
            const queryString = prompt
              ? `?type=${type.slug}&prompt=${encodeURIComponent(prompt)}`
              : `?type=${type.slug}`;
            return (
              <Link
                key={type.id}
                href={`/${locale}/projects/start${queryString}`}
                className="group bg-[var(--color-card)]/70 hover:bg-[var(--color-card)] border border-white/5 hover:border-white/15 rounded-md p-5 transition-all duration-200 flex flex-col gap-3"
              >
                <div className="w-10 h-10 rounded-md bg-gradient-to-br from-indigo-500/25 to-violet-500/15 border border-white/10 flex items-center justify-center transition-transform group-hover:scale-105">
                  <Icon size={18} className="text-indigo-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
                    {type.name}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-3">
                    {type.description}
                  </p>
                </div>
                <div className="mt-auto pt-2 border-t border-white/5 flex items-center justify-between text-[10px] uppercase tracking-wider">
                  <span className="text-[var(--color-text-secondary)]/70">
                    {type.tier}
                  </span>
                  <span className="text-[var(--color-accent)]">
                    {type.sectionsCount} {t('sections')}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Chip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors',
        active
          ? 'bg-[var(--color-accent)] text-[var(--color-background)] border-[var(--color-accent)]'
          : 'border-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-white/20',
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          'text-[10px] font-mono',
          active
            ? 'text-[var(--color-background)]/70'
            : 'text-[var(--color-text-secondary)]/60',
        )}
      >
        {count}
      </span>
    </button>
  );
}

function SubChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors',
        active
          ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border-[var(--color-accent)]/40'
          : 'border-white/5 text-[var(--color-text-secondary)]/80 hover:text-[var(--color-text-primary)] hover:border-white/15',
      )}
    >
      {label}
    </button>
  );
}
