/**
 * Time tracking summary report logic (US-071).
 *
 * Pure aggregation over time entries — no React, no Supabase — so labor totals,
 * overtime flagging, and budgeted-vs-actual comparisons are unit testable.
 */

export interface TimeEntryInput {
  id: string;
  user_id: string;
  project_id: string | null;
  start_time: string;
  end_time?: string | null;
  total_hours?: number | null;
  break_duration?: number | null; // minutes
}

export interface ProjectMeta {
  id: string;
  name: string;
  estimated_hours?: number | null;
}

export interface EmployeeMeta {
  id: string;
  name: string;
}

/** Hours for a single entry: prefer total_hours, else derive from start/end minus break. */
export function entryHours(entry: TimeEntryInput): number {
  if (typeof entry.total_hours === 'number' && entry.total_hours > 0) {
    return entry.total_hours;
  }
  if (entry.end_time) {
    const start = new Date(entry.start_time).getTime();
    const end = new Date(entry.end_time).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      const breakHours = (entry.break_duration ?? 0) / 60;
      return Math.max((end - start) / 3_600_000 - breakHours, 0);
    }
  }
  return 0;
}

/** ISO week key (YYYY-Www) for grouping weekly totals / overtime. */
export function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (target.getUTCDay() + 6) % 7; // Mon=0
  target.setUTCDate(target.getUTCDate() - dayNum + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(
    ((target.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7
  );
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export interface HoursByProject {
  projectId: string | null;
  projectName: string;
  hours: number;
  estimatedHours: number | null;
  variance: number | null; // actual - estimated
}

/** Total hours per project, joined with project metadata + budgeted-vs-actual variance. */
export function hoursByProject(
  entries: TimeEntryInput[],
  projects: ProjectMeta[]
): HoursByProject[] {
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const totals = new Map<string, number>();
  for (const e of entries) {
    const key = e.project_id ?? '__none__';
    totals.set(key, (totals.get(key) ?? 0) + entryHours(e));
  }
  return Array.from(totals.entries())
    .map(([key, hours]) => {
      const meta = key === '__none__' ? undefined : projectMap.get(key);
      const estimated = meta?.estimated_hours ?? null;
      return {
        projectId: key === '__none__' ? null : key,
        projectName: meta?.name ?? (key === '__none__' ? 'Unassigned' : 'Unknown project'),
        hours: round2(hours),
        estimatedHours: estimated,
        variance: estimated != null ? round2(hours - estimated) : null,
      };
    })
    .sort((a, b) => b.hours - a.hours);
}

export interface HoursByEmployee {
  userId: string;
  employeeName: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
}

const OVERTIME_THRESHOLD = 40;

/**
 * Per-employee totals with overtime split. Overtime is any hours beyond 40 in a
 * single ISO week, summed across all weeks in range.
 */
export function hoursByEmployee(
  entries: TimeEntryInput[],
  employees: EmployeeMeta[]
): HoursByEmployee[] {
  const empMap = new Map(employees.map((e) => [e.id, e]));
  // user -> week -> hours
  const byUserWeek = new Map<string, Map<string, number>>();
  for (const e of entries) {
    const week = isoWeekKey(e.start_time);
    const weeks = byUserWeek.get(e.user_id) ?? new Map<string, number>();
    weeks.set(week, (weeks.get(week) ?? 0) + entryHours(e));
    byUserWeek.set(e.user_id, weeks);
  }
  return Array.from(byUserWeek.entries())
    .map(([userId, weeks]) => {
      let total = 0;
      let overtime = 0;
      for (const wkHours of weeks.values()) {
        total += wkHours;
        if (wkHours > OVERTIME_THRESHOLD) overtime += wkHours - OVERTIME_THRESHOLD;
      }
      return {
        userId,
        employeeName: empMap.get(userId)?.name ?? `User ${userId.slice(0, 8)}`,
        totalHours: round2(total),
        regularHours: round2(total - overtime),
        overtimeHours: round2(overtime),
      };
    })
    .sort((a, b) => b.totalHours - a.totalHours);
}

export interface HoursByDayOfWeek {
  day: string;
  dayIndex: number; // 0=Sunday
  hours: number;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Total hours grouped by day of week (always returns all 7 days). */
export function hoursByDayOfWeek(entries: TimeEntryInput[]): HoursByDayOfWeek[] {
  const totals = new Array(7).fill(0);
  for (const e of entries) {
    const d = new Date(e.start_time);
    if (!Number.isNaN(d.getTime())) totals[d.getDay()] += entryHours(e);
  }
  return DAY_LABELS.map((day, i) => ({ day, dayIndex: i, hours: round2(totals[i]) }));
}

/** Grand total hours across all entries. */
export function totalHours(entries: TimeEntryInput[]): number {
  return round2(entries.reduce((sum, e) => sum + entryHours(e), 0));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
