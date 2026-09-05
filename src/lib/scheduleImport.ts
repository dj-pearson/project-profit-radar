/**
 * Parse an imported schedule into schedule_tasks rows (US-329, US-044).
 *
 * src/pages/ScheduleImport.tsx was three hardcoded arrays - a list of supported
 * formats, a field-mapping table and a preview of an imaginary project starting
 * 2026-03-01 - with no file input, no parser and no route. It claimed Microsoft
 * Project, Primavera P6 and Asta Powerproject support and had none of it.
 *
 * This parses what a contractor actually has: a spreadsheet exported from
 * whichever tool, as CSV or XLSX. Header matching is forgiving because every
 * tool names the columns differently, and predecessors are resolved by the row
 * number or WBS code the source used, which is how those files reference each
 * other.
 *
 * Pure: the caller reads the file and passes rows of cells. Nothing here
 * touches the network or the DOM, so every mapping rule is testable.
 */

export interface ParsedScheduleTask {
  /** The identifier the source file used, for resolving predecessors. */
  sourceId: string;
  name: string;
  /** YYYY-MM-DD. */
  startDate: string;
  durationDays: number;
  sortOrder: number;
  /** Source ids this task follows. */
  predecessors: string[];
}

export interface ScheduleImportResult {
  tasks: ParsedScheduleTask[];
  /** Rows that could not be used, with the reason, so nothing fails silently. */
  skipped: Array<{ row: number; reason: string }>;
  /** Predecessor references that matched no row in the file. */
  unresolved: Array<{ task: string; reference: string }>;
}

/** Header aliases, lowercased and stripped of anything but letters. */
const FIELDS = {
  id: ['id', 'uniqueid', 'taskid', 'activityid', 'wbs', 'wbscode', 'no', 'line'],
  name: ['name', 'taskname', 'activityname', 'task', 'activity', 'description', 'title'],
  start: ['start', 'startdate', 'begin', 'begindate', 'earlystart', 'plannedstart'],
  finish: ['finish', 'finishdate', 'end', 'enddate', 'earlyfinish', 'plannedfinish'],
  duration: ['duration', 'durationdays', 'days', 'dur'],
  predecessors: ['predecessors', 'predecessor', 'depends', 'dependson', 'preds'],
} as const;

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

/**
 * Map the header row to field positions.
 *
 * Returns -1 for a field the file does not carry; the caller decides which
 * absences are fatal. Only name and a start are truly required - duration can
 * come from a finish date, and an id from the row number.
 */
export function mapHeaders(header: string[]): Record<keyof typeof FIELDS, number> {
  const cells = header.map((h) => normalise(String(h ?? '')));
  const find = (aliases: readonly string[]) => {
    for (const alias of aliases) {
      const i = cells.indexOf(alias);
      if (i !== -1) return i;
    }
    // A looser second pass: "Task Name (WBS)" normalises to "tasknamewbs".
    for (const alias of aliases) {
      const i = cells.findIndex((c) => c.includes(alias));
      if (i !== -1) return i;
    }
    return -1;
  };

  return {
    id: find(FIELDS.id),
    name: find(FIELDS.name),
    start: find(FIELDS.start),
    finish: find(FIELDS.finish),
    duration: find(FIELDS.duration),
    predecessors: find(FIELDS.predecessors),
  };
}

/**
 * Parse a date cell.
 *
 * Accepts ISO, US M/D/YYYY, and the numeric serial that xlsx hands back for a
 * real date cell. Returns YYYY-MM-DD, or null. Ambiguous D/M vs M/D is read as
 * US, because that is what the tools these files come from write; a date that
 * matters is better wrong loudly than silently reinterpreted, so the caller
 * shows every parsed row before writing anything.
 */
export function parseDateCell(value: unknown): string | null {
  if (value == null || value === '') return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toIso(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    // Excel serial: day 1 is 1900-01-01, with the famous phantom 1900-02-29,
    // which is why the epoch offset is 25569 against the Unix epoch.
    if (value < 1 || value > 100000) return null;
    const ms = (value - 25569) * 86400 * 1000;
    const d = new Date(ms);
    return toIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }

  const text = String(value).trim();

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
  if (iso) return toIso(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const slash = /^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})$/.exec(text);
  if (slash) {
    const year = Number(slash[3]) < 100 ? 2000 + Number(slash[3]) : Number(slash[3]);
    return toIso(year, Number(slash[1]), Number(slash[2]));
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return toIso(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  }
  return null;
}

/** "5d", "5 days", "5" and 5 all mean five. "0" means a milestone, kept as 1. */
export function parseDuration(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(1, Math.round(value));
  const match = /(-?\d+(?:\.\d+)?)/.exec(String(value));
  if (!match) return null;
  return Math.max(1, Math.round(Number(match[1])));
}

/** "3", "3FS", "3FS+2d", "3,4" and "3;4" all reference rows 3 and 4. */
export function parsePredecessors(value: unknown): string[] {
  if (value == null || value === '') return [];
  return String(value)
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter((part) => part && part !== '-')
    // Strip the relationship type and lag: only finish-to-start is modelled,
    // which is what schedule_task_dependencies stores.
    .map((part) => part.replace(/\s*(FS|SS|FF|SF)\s*[+-]?\s*\d*\s*[dhw]?\s*$/i, '').trim())
    .filter(Boolean);
}

export function daysBetween(startIso: string, finishIso: string): number | null {
  const start = Date.parse(`${startIso}T00:00:00Z`);
  const finish = Date.parse(`${finishIso}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(finish)) return null;
  const days = Math.round((finish - start) / 86400000) + 1;
  return days >= 1 ? days : null;
}

/**
 * Turn a sheet into tasks.
 *
 * `rows` is the whole sheet including its header row, as the cell values the
 * spreadsheet library produced.
 */
export function parseScheduleSheet(rows: unknown[][]): ScheduleImportResult {
  const skipped: ScheduleImportResult['skipped'] = [];
  const unresolved: ScheduleImportResult['unresolved'] = [];

  if (rows.length < 2) {
    return { tasks: [], skipped: [{ row: 0, reason: 'The file has no rows under its header.' }], unresolved };
  }

  const cols = mapHeaders((rows[0] as unknown[]).map((c) => String(c ?? '')));
  if (cols.name === -1) {
    return {
      tasks: [],
      skipped: [{ row: 0, reason: 'No task-name column. Expected a column named Task Name, Activity or Description.' }],
      unresolved,
    };
  }
  if (cols.start === -1) {
    return {
      tasks: [],
      skipped: [{ row: 0, reason: 'No start-date column. Expected a column named Start or Start Date.' }],
      unresolved,
    };
  }

  const tasks: ParsedScheduleTask[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (!row || row.every((c) => c == null || String(c).trim() === '')) continue;

    const name = String(row[cols.name] ?? '').trim();
    if (!name) {
      skipped.push({ row: i + 1, reason: 'No task name.' });
      continue;
    }

    const startDate = parseDateCell(row[cols.start]);
    if (!startDate) {
      skipped.push({ row: i + 1, reason: `Could not read a start date from "${String(row[cols.start] ?? '')}".` });
      continue;
    }

    let durationDays = cols.duration === -1 ? null : parseDuration(row[cols.duration]);
    if (durationDays == null && cols.finish !== -1) {
      const finish = parseDateCell(row[cols.finish]);
      if (finish) durationDays = daysBetween(startDate, finish);
    }
    if (durationDays == null) durationDays = 1;

    tasks.push({
      sourceId: String(row[cols.id] ?? '').trim() || String(i),
      name,
      startDate,
      durationDays,
      sortOrder: i,
      predecessors: cols.predecessors === -1 ? [] : parsePredecessors(row[cols.predecessors]),
    });
  }

  // Report references the file makes to rows it does not contain, rather than
  // dropping them. A schedule that lost half its dependencies on import looks
  // fine and behaves wrongly the first time somebody drags a task.
  const known = new Set(tasks.map((t) => t.sourceId));
  for (const task of tasks) {
    for (const ref of task.predecessors) {
      if (!known.has(ref)) unresolved.push({ task: task.name, reference: ref });
    }
  }

  return { tasks, skipped, unresolved };
}

/**
 * Build YYYY-MM-DD without going through Date, which would apply a timezone
 * and can shift the day. Returns null on a value that is not a real date, so
 * a caller cannot mistake an empty string for a parsed one.
 */
function toIso(year: number, month: number, day: number): string | null {
  if (!Number.isFinite(year) || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}`;
}
