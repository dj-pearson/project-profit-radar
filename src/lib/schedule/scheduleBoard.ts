/**
 * US-223: pure helpers tying the persisted schedule (DB rows) to the existing
 * critical-path engine and computing baseline-vs-actual slip. I/O-free so the
 * mapping + slip math are unit-testable.
 */
import type { CpmTask } from '@/lib/schedule/criticalPath';

export interface ScheduleTaskRow {
  id: string;
  company_id: string;
  project_id: string;
  name: string;
  start_date: string; // YYYY-MM-DD
  duration_days: number;
  status: string;
  sort_order: number;
}

export interface ScheduleDependencyRow {
  id: string;
  predecessor_id: string;
  successor_id: string;
  lag_days: number;
}

/** Snapshot of a task captured in a baseline (stored as JSONB). */
export interface BaselineTaskSnapshot {
  id: string;
  name: string;
  start_date: string;
  duration_days: number;
  end_date: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse a YYYY-MM-DD date string to a UTC-midnight Date. */
export function parseDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

/** Add `n` days to a YYYY-MM-DD string, returning a new YYYY-MM-DD string. */
export function addDays(dateStr: string, n: number): string {
  const d = parseDate(dateStr);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Whole-day difference a − b (positive when a is later). */
export function diffDays(a: string, b: string): number {
  return Math.round((parseDate(a).getTime() - parseDate(b).getTime()) / DAY_MS);
}

/** A schedule task's end date = start + duration days. */
export function taskEndDate(task: Pick<ScheduleTaskRow, 'start_date' | 'duration_days'>): string {
  return addDays(task.start_date, task.duration_days);
}

/**
 * Map persisted tasks + dependencies to the CPM engine's input shape. Each
 * task's `dependencies` are the ids of its predecessors (finish-to-start).
 */
export function toCpmTasks(tasks: ScheduleTaskRow[], deps: ScheduleDependencyRow[]): CpmTask[] {
  const predecessorsByTask = new Map<string, string[]>();
  for (const dep of deps) {
    const list = predecessorsByTask.get(dep.successor_id) ?? [];
    list.push(dep.predecessor_id);
    predecessorsByTask.set(dep.successor_id, list);
  }
  return tasks.map((t) => ({
    id: t.id,
    duration: t.duration_days,
    dependencies: predecessorsByTask.get(t.id) ?? [],
  }));
}

/** Build a baseline snapshot array from the current tasks. */
export function snapshotTasks(tasks: ScheduleTaskRow[]): BaselineTaskSnapshot[] {
  return tasks.map((t) => ({
    id: t.id,
    name: t.name,
    start_date: t.start_date,
    duration_days: t.duration_days,
    end_date: taskEndDate(t),
  }));
}

/**
 * Schedule slip in days: the largest amount by which any current task now ends
 * later than its baseline finish. Tasks absent from the baseline are ignored.
 * Floors at 0 (a schedule finishing early is not a slip).
 */
export function computeScheduleSlipDays(
  current: ScheduleTaskRow[],
  baseline: BaselineTaskSnapshot[]
): number {
  if (!baseline.length) return 0;
  const baselineEndById = new Map(baseline.map((b) => [b.id, b.end_date]));
  let maxSlip = 0;
  for (const task of current) {
    const baselineEnd = baselineEndById.get(task.id);
    if (!baselineEnd) continue;
    const slip = diffDays(taskEndDate(task), baselineEnd);
    if (slip > maxSlip) maxSlip = slip;
  }
  return maxSlip;
}
