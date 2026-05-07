'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  archiveProjectAction,
  deleteProjectAction,
  restoreProjectAction,
} from '@/lib/actions/projects';

export interface ProjectRow {
  id: string;
  title: string;
  status: 'draft' | 'generating' | 'paused' | 'ready' | 'failed' | 'archived';
  currentSectionIndex: number;
  totalSections: number;
  tokensSpent: number;
  projectTypeSlug: string;
  updatedAt: string | null;
}

type StatusFilter = 'all' | 'active' | 'ready' | 'failed' | 'archived';

interface ProjectsTableProps {
  locale: string;
  projects: ProjectRow[];
}

export default function ProjectsTable({ locale, projects: serverProjects }: ProjectsTableProps) {
  const t = useTranslations('projects');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [actionError, setActionError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>(serverProjects);

  // Sync local state when the server hands us a new list (router.refresh after
  // an action, page revisit, etc.). Local optimistic mutations stay in place
  // until the next server prop arrives.
  useEffect(() => {
    setProjects(serverProjects);
  }, [serverProjects]);

  const removeProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updateStatus = useCallback(
    (id: string, status: ProjectRow['status']) => {
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status } : p)),
      );
    },
    [],
  );

  const filtered = useMemo(() => {
    if (filter === 'all') return projects.filter((p) => p.status !== 'archived');
    if (filter === 'active') {
      return projects.filter(
        (p) => p.status === 'draft' || p.status === 'generating' || p.status === 'paused',
      );
    }
    if (filter === 'ready') return projects.filter((p) => p.status === 'ready');
    if (filter === 'failed') return projects.filter((p) => p.status === 'failed');
    if (filter === 'archived') return projects.filter((p) => p.status === 'archived');
    return projects;
  }, [projects, filter]);

  const filterOptions: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'all', label: t('filterAll'), count: projects.filter((p) => p.status !== 'archived').length },
    { id: 'active', label: t('filterActive'), count: projects.filter((p) => p.status === 'draft' || p.status === 'generating' || p.status === 'paused').length },
    { id: 'ready', label: t('filterReady'), count: projects.filter((p) => p.status === 'ready').length },
    { id: 'failed', label: t('filterFailed'), count: projects.filter((p) => p.status === 'failed').length },
    { id: 'archived', label: t('filterArchived'), count: projects.filter((p) => p.status === 'archived').length },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {filterOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setFilter(opt.id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
              filter === opt.id
                ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30 text-[var(--color-accent)]'
                : 'bg-[var(--color-card)] border-white/5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-white/15',
            )}
          >
            {opt.label}
            <span className="text-[10px] opacity-70 tabular-nums">{opt.count}</span>
          </button>
        ))}
      </div>

      {actionError && (
        <p className="text-xs text-[var(--color-error)] bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-md px-3 py-2">
          {actionError}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="bg-[var(--color-card)]/40 border border-dashed border-white/10 rounded-md py-12 text-center text-sm text-[var(--color-text-secondary)]">
          {t('noResults')}
        </div>
      ) : (
        <div className="bg-[var(--color-card)]/40 border border-white/5 rounded-md">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]/70">
                  {t('tableTitle')}
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]/70 hidden md:table-cell w-[140px]">
                  {t('tableType')}
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]/70 w-[120px]">
                  {t('tableStatus')}
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]/70 hidden lg:table-cell w-[160px]">
                  {t('tableProgress')}
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]/70 hidden lg:table-cell w-[80px] text-right">
                  {t('tableTokens')}
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]/70 hidden md:table-cell w-[100px]">
                  {t('tableUpdated')}
                </th>
                <th className="w-[44px]" aria-label={t('tableActions')} />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((p) => (
                <ProjectRow
                  key={p.id}
                  project={p}
                  locale={locale}
                  onError={setActionError}
                  onRemoved={() => removeProject(p.id)}
                  onStatusChanged={(s) => updateStatus(p.id, s)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProjectRow({
  project,
  locale,
  onError,
  onRemoved,
  onStatusChanged,
}: {
  project: ProjectRow;
  locale: string;
  onError: (msg: string | null) => void;
  onRemoved: () => void;
  onStatusChanged: (status: ProjectRow['status']) => void;
}) {
  const t = useTranslations('projects');
  const progress =
    project.totalSections === 0
      ? 0
      : Math.round((project.currentSectionIndex / project.totalSections) * 100);

  const statusLabel = (() => {
    switch (project.status) {
      case 'draft': return t('statusDraft');
      case 'generating': return t('statusGenerating');
      case 'paused': return t('statusPaused');
      case 'ready': return t('statusReady');
      case 'failed': return t('statusFailed');
      case 'archived': return t('statusArchived');
    }
  })();

  return (
    <tr className="group hover:bg-white/[0.025] transition-colors">
      <td className="px-4 py-3">
        <Link
          href={`/${locale}/projects/${project.id}`}
          className="text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors line-clamp-1"
        >
          {project.title}
        </Link>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-xs font-mono text-[var(--color-text-secondary)] truncate block max-w-[140px]">
          {project.projectTypeSlug}
        </span>
      </td>
      <td className="px-4 py-3">
        <StatusChip status={project.status} label={statusLabel} />
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden max-w-[100px]">
            <div
              className={cn(
                'h-full transition-all',
                project.status === 'failed'
                  ? 'bg-[var(--color-error)]'
                  : project.status === 'ready'
                    ? 'bg-[var(--color-success)]'
                    : 'bg-[var(--color-accent)]',
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] tabular-nums text-[var(--color-text-secondary)] w-8 text-right">
            {project.currentSectionIndex}/{project.totalSections}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell text-right">
        <span className="text-xs tabular-nums text-[var(--color-text-secondary)]">
          {project.tokensSpent.toLocaleString(locale)}
        </span>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-xs text-[var(--color-text-secondary)] tabular-nums">
          {project.updatedAt
            ? new Date(project.updatedAt).toLocaleDateString(locale, {
                month: 'short',
                day: '2-digit',
              })
            : '—'}
        </span>
      </td>
      <td className="px-2 py-3 text-right">
        <RowMenu
          project={project}
          locale={locale}
          onError={onError}
          onRemoved={onRemoved}
          onStatusChanged={onStatusChanged}
        />
      </td>
    </tr>
  );
}

function StatusChip({
  status,
  label,
}: {
  status: ProjectRow['status'];
  label: string;
}) {
  const cfg: Record<ProjectRow['status'], { cls: string; icon: React.ReactNode }> = {
    draft: { cls: 'bg-white/5 border-white/10 text-[var(--color-text-secondary)]', icon: <CircleDashed size={10} /> },
    generating: { cls: 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30 text-[var(--color-accent)]', icon: <Loader2 size={10} className="animate-spin" /> },
    paused: { cls: 'bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30 text-[var(--color-warning)]', icon: <CircleDashed size={10} /> },
    ready: { cls: 'bg-[var(--color-success)]/10 border-[var(--color-success)]/30 text-[var(--color-success)]', icon: <CheckCircle2 size={10} /> },
    failed: { cls: 'bg-[var(--color-error)]/10 border-[var(--color-error)]/30 text-[var(--color-error)]', icon: <AlertTriangle size={10} /> },
    archived: { cls: 'bg-white/5 border-white/10 text-[var(--color-text-secondary)]/70', icon: <Archive size={10} /> },
  };
  const c = cfg[status];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium', c.cls)}>
      {c.icon}
      {label}
    </span>
  );
}

function RowMenu({
  project,
  locale,
  onError,
  onRemoved,
  onStatusChanged,
}: {
  project: ProjectRow;
  locale: string;
  onError: (msg: string | null) => void;
  onRemoved: () => void;
  onStatusChanged: (status: ProjectRow['status']) => void;
}) {
  const t = useTranslations('projects');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [isPending, startTransition] = useTransition();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const computePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 176; // Tailwind w-44
    const menuHeight = 144; // ~3 items * 36px + paddings
    const margin = 6;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + margin;
    const top = openUp
      ? Math.max(8, rect.top - menuHeight - margin)
      : rect.bottom + margin;
    const left = Math.min(
      Math.max(8, rect.right - menuWidth),
      window.innerWidth - menuWidth - 8,
    );
    setMenuPos({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const node = e.target as Node;
      if (
        !buttonRef.current?.contains(node) &&
        !menuRef.current?.contains(node)
      ) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onShift = () => setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    window.addEventListener('scroll', onShift, true);
    window.addEventListener('resize', onShift);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
      window.removeEventListener('scroll', onShift, true);
      window.removeEventListener('resize', onShift);
    };
  }, [open]);

  const isArchived = project.status === 'archived';

  const onArchiveToggle = () => {
    setOpen(false);
    onError(null);
    const confirmMsg = isArchived ? t('confirmRestore') : t('confirmArchive');
    if (!confirm(confirmMsg)) return;
    startTransition(async () => {
      try {
        if (isArchived) {
          await restoreProjectAction(project.id);
          onStatusChanged('draft');
        } else {
          await archiveProjectAction(project.id);
          onStatusChanged('archived');
        }
        router.refresh();
      } catch (err) {
        onError(err instanceof Error ? err.message : t('actionFailed'));
      }
    });
  };

  const onDelete = () => {
    setOpen(false);
    onError(null);
    if (!confirm(t('confirmDelete', { title: project.title }))) return;
    startTransition(async () => {
      try {
        await deleteProjectAction(project.id);
        onRemoved();
        router.refresh();
      } catch (err) {
        onError(err instanceof Error ? err.message : t('actionFailed'));
      }
    });
  };

  const toggleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (open) {
      setOpen(false);
    } else {
      computePosition();
      setOpen(true);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        disabled={isPending}
        aria-label={t('rowActionMenu')}
        className={cn(
          'w-7 h-7 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-colors flex items-center justify-center disabled:opacity-50',
          'opacity-0 group-hover:opacity-100 focus:opacity-100',
          open && 'opacity-100',
        )}
      >
        {isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <MoreHorizontal size={14} />
        )}
      </button>
      {open && menuPos && (
        <div
          ref={menuRef}
          style={{ top: menuPos.top, left: menuPos.left }}
          className="fixed z-50 w-44 rounded-md border border-white/10 bg-[var(--color-card)] shadow-2xl overflow-hidden"
        >
          <Link
            href={`/${locale}/projects/${project.id}`}
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-white/5 transition-colors"
          >
            <ExternalLink size={13} />
            {t('actionOpen')}
          </Link>
          <button
            type="button"
            onClick={onArchiveToggle}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-colors"
          >
            {isArchived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
            {isArchived ? t('actionRestore') : t('actionArchive')}
          </button>
          <div className="h-px bg-white/5" />
          <button
            type="button"
            onClick={onDelete}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors"
          >
            <Trash2 size={13} />
            {t('actionDelete')}
          </button>
        </div>
      )}
    </>
  );
}
