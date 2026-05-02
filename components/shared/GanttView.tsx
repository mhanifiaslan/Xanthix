'use client';

import { useMemo } from 'react';
import { parseGantt, type GanttTask } from '@/lib/gantt/parse';

interface Props {
  content: string;
  locale?: string;
}

export default function GanttView({ content, locale = 'tr' }: Props) {
  const parsed = useMemo(() => parseGantt(content), [content]);

  if (!parsed) {
    // Fall back to monospace JSON so the user at least sees what AI returned.
    return (
      <pre className="text-xs leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-wrap font-mono bg-[var(--color-background)] border border-white/5 rounded-xl p-3 overflow-x-auto">
        {content}
      </pre>
    );
  }

  const { tasks, rangeStart, rangeEnd } = parsed;
  const totalMs =
    rangeStart && rangeEnd && rangeEnd > rangeStart
      ? rangeEnd.getTime() - rangeStart.getTime()
      : 0;

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });

  return (
    <div className="space-y-4">
      {rangeStart && rangeEnd && (
        <p className="text-xs text-[var(--color-text-secondary)]">
          {dateFormatter.format(rangeStart)} → {dateFormatter.format(rangeEnd)}
          {' · '}
          {tasks.length} görev
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-white/5 bg-[var(--color-background)]">
        <table className="w-full text-xs">
          <thead className="bg-white/5">
            <tr>
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-[10px] text-[var(--color-text-secondary)] w-14">
                ID
              </th>
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-[10px] text-[var(--color-text-secondary)]">
                Görev
              </th>
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-[10px] text-[var(--color-text-secondary)] w-28">
                Başlangıç
              </th>
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-[10px] text-[var(--color-text-secondary)] w-28">
                Bitiş
              </th>
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-[10px] text-[var(--color-text-secondary)] w-16">
                Süre
              </th>
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-[10px] text-[var(--color-text-secondary)] w-28">
                Bağımlı
              </th>
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-[10px] text-[var(--color-text-secondary)] min-w-[280px]">
                Zaman çizgisi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {tasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                rangeStart={rangeStart}
                totalMs={totalMs}
                dateFormatter={dateFormatter}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  rangeStart,
  totalMs,
  dateFormatter,
}: {
  task: GanttTask;
  rangeStart: Date | null;
  totalMs: number;
  dateFormatter: Intl.DateTimeFormat;
}) {
  let leftPct = 0;
  let widthPct = 0;
  if (rangeStart && totalMs > 0 && task.start && task.end) {
    leftPct = ((task.start.getTime() - rangeStart.getTime()) / totalMs) * 100;
    widthPct =
      ((task.end.getTime() - task.start.getTime()) / totalMs) * 100;
    if (widthPct < 1.5) widthPct = 1.5; // tiny tasks still visible
  }

  return (
    <tr className="align-top">
      <td className="px-3 py-2 font-mono text-[var(--color-accent)]">{task.id}</td>
      <td className="px-3 py-2 text-[var(--color-text-primary)]">{task.name}</td>
      <td className="px-3 py-2 text-[var(--color-text-secondary)] tabular-nums">
        {task.start ? dateFormatter.format(task.start) : '—'}
      </td>
      <td className="px-3 py-2 text-[var(--color-text-secondary)] tabular-nums">
        {task.end ? dateFormatter.format(task.end) : '—'}
      </td>
      <td className="px-3 py-2 text-[var(--color-text-secondary)] tabular-nums">
        {task.durationLabel}
      </td>
      <td className="px-3 py-2 text-[var(--color-text-secondary)]">
        {task.dependencies.length > 0 ? (
          <span className="font-mono text-[10px]">
            {task.dependencies.join(', ')}
          </span>
        ) : (
          '—'
        )}
      </td>
      <td className="px-3 py-2">
        <div className="relative h-3 rounded-full bg-white/5 overflow-hidden">
          {widthPct > 0 ? (
            <div
              className="absolute top-0 h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-indigo-400"
              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
              title={
                task.start && task.end
                  ? `${dateFormatter.format(task.start)} → ${dateFormatter.format(task.end)}`
                  : undefined
              }
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-[10px] text-[var(--color-text-secondary)]">
              tarih yok
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}
