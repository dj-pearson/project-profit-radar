/**
 * Grouping and counting for the company schedule (US-329).
 *
 * Pure, so the numbers a superintendent reads off the schedule page - how much
 * work has nobody on it, how many crew are booked - can be tested without a
 * database. The old page computed nothing: it handed projects to four
 * components that made no data call and drew one bar per project.
 *
 * Note this is not src/lib/schedule/scheduleBoard.ts, which is US-223's
 * critical-path helper for one project's Gantt. This is the company-wide list.
 */

export interface ScheduleBoardRow {
  schedule_task_id: string;
  project_id: string;
  project_name: string;
  project_status: string | null;
  task_name: string;
  start_date: string;
  end_date: string | null;
  duration_days: number;
  status: string;
  assignee_count: number;
  assignee_names: string | null;
}

export interface ScheduleSummary {
  total: number;
  /** Tasks with nobody on them. The number that matters on a Monday. */
  unassigned: number;
  /** Crew bookings across every task; one person on three tasks counts three. */
  assignments: number;
  projects: number;
}

export function summariseSchedule(rows: ScheduleBoardRow[]): ScheduleSummary {
  return {
    total: rows.length,
    unassigned: rows.filter((r) => (Number(r.assignee_count) || 0) === 0).length,
    assignments: rows.reduce((sum, r) => sum + (Number(r.assignee_count) || 0), 0),
    projects: new Set(rows.map((r) => r.project_id)).size,
  };
}

export interface ScheduleWeek {
  /** ISO date of the Monday this week starts on. */
  weekStart: string;
  tasks: ScheduleBoardRow[];
}

/**
 * Group tasks into the weeks they start in, Monday-first.
 *
 * Monday rather than Sunday because a construction week starts Monday and a
 * board that puts Monday at the end of the previous week is read wrong every
 * time. Dates are parsed as local midnight from the YYYY-MM-DD the database
 * returns: `new Date('2026-09-07')` is parsed as UTC and shifts a day backwards
 * west of Greenwich, which would put Monday's work in the previous week.
 */
export function groupTasksByWeek(rows: ScheduleBoardRow[]): ScheduleWeek[] {
  const weeks = new Map<string, ScheduleBoardRow[]>();

  for (const row of rows) {
    const start = parseLocalDate(row.start_date);
    if (!start) continue;
    const key = isoDate(mondayOf(start));
    const list = weeks.get(key) || [];
    list.push(row);
    weeks.set(key, list);
  }

  return [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, tasks]) => ({
      weekStart,
      tasks: tasks.sort(
        (a, b) =>
          a.start_date.localeCompare(b.start_date) ||
          a.project_name.localeCompare(b.project_name) ||
          a.task_name.localeCompare(b.task_name)
      ),
    }));
}

export function parseLocalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function mondayOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // getDay() is 0 for Sunday, so Sunday belongs to the week that started six
  // days earlier, not the one starting tomorrow.
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

export function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
