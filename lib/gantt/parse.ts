// -----------------------------------------------------------------------------
// Gantt parsing
//
// Vertex returns the timeline section as JSON. We accept several shapes that
// have shown up in real outputs:
//   1. { months: number, tasks: Task[] }
//   2. { tasks: Task[] }
//   3. Task[]                                      (a bare array)
//
// And each Task may use any of:
//   - { id, name, start (ISO or month#), duration, dependencies?, end? }
//   - { id, name, start, end, dependencies? }      (start/end as ISO date)
//
// We normalise into one shape downstream. Dates are kept as Date objects so
// callers can format / position freely.
// -----------------------------------------------------------------------------

export interface GanttTask {
  id: string;
  name: string;
  start: Date | null;
  end: Date | null;
  durationLabel: string;
  dependencies: string[];
}

export interface ParsedGantt {
  tasks: GanttTask[];
  /** Earliest start across the whole plan, or null if dates aren't usable. */
  rangeStart: Date | null;
  /** Latest end across the whole plan, or null if dates aren't usable. */
  rangeEnd: Date | null;
}

interface RawTask {
  id?: unknown;
  name?: unknown;
  title?: unknown;
  start?: unknown;
  end?: unknown;
  duration?: unknown;
  dependencies?: unknown;
}

export function parseGantt(content: string): ParsedGantt | null {
  if (!content) return null;
  const trimmed = content.trim();
  if (!trimmed) return null;

  // Try strict, then fenced, then first { … } block.
  const candidate = tryParseJson(trimmed);
  if (candidate === undefined) return null;

  let rawList: RawTask[] | null = null;
  if (Array.isArray(candidate)) {
    rawList = candidate as RawTask[];
  } else if (candidate && typeof candidate === 'object') {
    const c = candidate as { tasks?: unknown; items?: unknown };
    if (Array.isArray(c.tasks)) rawList = c.tasks as RawTask[];
    else if (Array.isArray(c.items)) rawList = c.items as RawTask[];
  }
  if (!rawList || rawList.length === 0) return null;

  const tasks: GanttTask[] = rawList
    .map((row, idx) => normaliseTask(row, idx))
    .filter((t): t is GanttTask => !!t);

  if (tasks.length === 0) return null;

  let rangeStart: Date | null = null;
  let rangeEnd: Date | null = null;
  for (const t of tasks) {
    if (t.start && (!rangeStart || t.start < rangeStart)) rangeStart = t.start;
    if (t.end && (!rangeEnd || t.end > rangeEnd)) rangeEnd = t.end;
  }

  return { tasks, rangeStart, rangeEnd };
}

function tryParseJson(text: string): unknown | undefined {
  try {
    return JSON.parse(text);
  } catch {
    // fall through
  }
  const fence = /```(?:json)?\s*([\s\S]+?)\s*```/i.exec(text);
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1]);
    } catch {
      // fall through
    }
  }
  // Detect bare array OR object slice.
  const firstBrace = Math.min(
    ...['[', '{']
      .map((c) => text.indexOf(c))
      .filter((i) => i >= 0)
      .concat([Number.POSITIVE_INFINITY]),
  );
  const lastBrace = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'));
  if (firstBrace !== Number.POSITIVE_INFINITY && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1));
    } catch {
      // give up
    }
  }
  return undefined;
}

function normaliseTask(raw: RawTask, idx: number): GanttTask | null {
  const id = typeof raw.id === 'string' ? raw.id : `T${idx + 1}`;
  const name =
    typeof raw.name === 'string'
      ? raw.name
      : typeof raw.title === 'string'
        ? raw.title
        : id;

  const start = parseDateLike(raw.start);
  let end = parseDateLike(raw.end);

  // If end missing but start + duration available, derive end (treating
  // duration as days when it's a small integer, months when it's small + the
  // model used months semantics).
  if (start && !end && typeof raw.duration === 'number') {
    end = new Date(start);
    end.setDate(end.getDate() + Math.max(1, Math.round(raw.duration)));
  }

  const durationLabel =
    typeof raw.duration === 'number'
      ? String(raw.duration)
      : typeof raw.duration === 'string'
        ? raw.duration
        : start && end
          ? String(daysBetween(start, end))
          : '';

  const deps = Array.isArray(raw.dependencies)
    ? raw.dependencies.filter((d): d is string => typeof d === 'string')
    : [];

  if (!name && !start && !end) return null;

  return { id, name, start, end, durationLabel, dependencies: deps };
}

function parseDateLike(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    // Could be a month index — leave as null since we can't anchor.
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    // Bare YYYY-MM-DD or full ISO.
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)));
}
