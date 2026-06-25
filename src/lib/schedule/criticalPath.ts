/**
 * Critical Path Method (CPM) engine for project scheduling (US-223 core / US-234).
 *
 * Pure, framework-free schedule math so it is unit testable:
 *   - forward pass  → early start (ES) / early finish (EF)
 *   - backward pass → late start (LS) / late finish (LF)
 *   - total float (LS − ES) and free float (min successor ES − EF − lag)
 *   - critical path = tasks with zero total float
 *   - dependency-cascade rescheduling (finish-to-start, push-only)
 *
 * Topologically ordered (Kahn) so it is O(V+E) — the previous recursive
 * implementation in scheduleUtils re-walked the graph per task. Cycles are
 * reported via `hasCycle` instead of throwing so the UI degrades gracefully.
 */

export interface CpmTask {
  id: string;
  duration: number;
  /** Predecessor task ids (finish-to-start). */
  dependencies: string[];
}

export interface TaskTiming {
  id: string;
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  /** LS − ES; days a task can slip without delaying project completion. */
  totalFloat: number;
  /** Days a task can slip without delaying its earliest successor. */
  freeFloat: number;
  isCritical: boolean;
}

export interface ScheduleComputation {
  timings: Map<string, TaskTiming>;
  projectDuration: number;
  /** Critical-path task ids ordered by early start. */
  criticalPath: string[];
  /** True when a dependency cycle prevents a valid schedule. */
  hasCycle: boolean;
}

/** Default: no lag between predecessor finish and successor start. */
type LagFn = (predId: string, taskId: string) => number;
const noLag: LagFn = () => 0;

/**
 * Topological order of task ids via Kahn's algorithm. Returns `{ order, hasCycle }`;
 * when a cycle exists, `order` contains only the acyclic prefix.
 */
function topoOrder(tasks: CpmTask[]): { order: string[]; hasCycle: boolean } {
  const ids = new Set(tasks.map((t) => t.id));
  const indegree = new Map<string, number>();
  const successors = new Map<string, string[]>();
  for (const t of tasks) {
    indegree.set(t.id, 0);
    successors.set(t.id, []);
  }
  for (const t of tasks) {
    for (const dep of t.dependencies) {
      if (!ids.has(dep)) continue; // ignore dangling dependency
      indegree.set(t.id, (indegree.get(t.id) ?? 0) + 1);
      successors.get(dep)!.push(t.id);
    }
  }
  // Stable seed order = input order, so equal-rank tasks keep deterministic output.
  const queue = tasks.filter((t) => (indegree.get(t.id) ?? 0) === 0).map((t) => t.id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const succ of successors.get(id) ?? []) {
      const d = (indegree.get(succ) ?? 0) - 1;
      indegree.set(succ, d);
      if (d === 0) queue.push(succ);
    }
  }
  return { order, hasCycle: order.length !== tasks.length };
}

/** Compute ES/EF/LS/LF, float, and the critical path for a task network. */
export function computeSchedule(tasks: CpmTask[], lagOf: LagFn = noLag): ScheduleComputation {
  const timings = new Map<string, TaskTiming>();
  if (tasks.length === 0) {
    return { timings, projectDuration: 0, criticalPath: [], hasCycle: false };
  }

  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const { order, hasCycle } = topoOrder(tasks);

  if (hasCycle) {
    // Can't produce a valid schedule; return zeroed timings flagged non-critical.
    for (const t of tasks) {
      timings.set(t.id, {
        id: t.id,
        earlyStart: 0,
        earlyFinish: t.duration,
        lateStart: 0,
        lateFinish: t.duration,
        totalFloat: 0,
        freeFloat: 0,
        isCritical: false,
      });
    }
    return { timings, projectDuration: 0, criticalPath: [], hasCycle: true };
  }

  const successors = new Map<string, string[]>();
  for (const t of tasks) successors.set(t.id, []);
  for (const t of tasks) {
    for (const dep of t.dependencies) {
      if (taskMap.has(dep)) successors.get(dep)!.push(t.id);
    }
  }

  const es = new Map<string, number>();
  const ef = new Map<string, number>();

  // Forward pass.
  let projectDuration = 0;
  for (const id of order) {
    const t = taskMap.get(id)!;
    let start = 0;
    for (const dep of t.dependencies) {
      if (!taskMap.has(dep)) continue;
      start = Math.max(start, (ef.get(dep) ?? 0) + lagOf(dep, id));
    }
    es.set(id, start);
    ef.set(id, start + t.duration);
    projectDuration = Math.max(projectDuration, start + t.duration);
  }

  // Backward pass.
  const ls = new Map<string, number>();
  const lf = new Map<string, number>();
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i];
    const t = taskMap.get(id)!;
    const succs = successors.get(id) ?? [];
    let finish = projectDuration;
    if (succs.length > 0) {
      finish = Math.min(...succs.map((s) => (ls.get(s) ?? projectDuration) - lagOf(id, s)));
    }
    lf.set(id, finish);
    ls.set(id, finish - t.duration);
  }

  // Float + critical flags + free float.
  const criticalPath: string[] = [];
  for (const id of order) {
    const succs = successors.get(id) ?? [];
    const totalFloat = (ls.get(id) ?? 0) - (es.get(id) ?? 0);
    let freeFloat = totalFloat;
    if (succs.length > 0) {
      const minSuccEs = Math.min(...succs.map((s) => (es.get(s) ?? 0) - lagOf(id, s)));
      freeFloat = Math.max(0, minSuccEs - (ef.get(id) ?? 0));
    }
    const isCritical = totalFloat <= 0;
    timings.set(id, {
      id,
      earlyStart: es.get(id) ?? 0,
      earlyFinish: ef.get(id) ?? 0,
      lateStart: ls.get(id) ?? 0,
      lateFinish: lf.get(id) ?? 0,
      totalFloat,
      freeFloat,
      isCritical,
    });
    if (isCritical) criticalPath.push(id);
  }
  criticalPath.sort((a, b) => (es.get(a) ?? 0) - (es.get(b) ?? 0));

  return { timings, projectDuration, criticalPath, hasCycle: false };
}

/**
 * Annotate tasks with `isOnCriticalPath`, returning the timings alongside so
 * callers can surface per-task float/slack. Works on any object carrying
 * id/duration/dependencies (e.g. the schedule `Task` type).
 */
export function annotateCriticalPath<
  T extends CpmTask & { isOnCriticalPath?: boolean }
>(tasks: T[], lagOf: LagFn = noLag): { tasks: T[]; computation: ScheduleComputation } {
  const computation = computeSchedule(tasks, lagOf);
  const annotated = tasks.map((t) => ({
    ...t,
    isOnCriticalPath: computation.timings.get(t.id)?.isCritical ?? false,
  }));
  return { tasks: annotated, computation };
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export interface DatedTask {
  id: string;
  duration: number;
  dependencies: string[];
  startDate: Date;
  endDate: Date;
}

/**
 * Reschedule `movedId` to `newStart` and cascade the change to dependents
 * (finish-to-start, push-only): any task that would now start before its
 * latest predecessor finish is pushed later to resolve the violation; tasks
 * with slack are left in place. Durations are preserved. Returns new task
 * objects (input is not mutated).
 */
export function cascadeReschedule<T extends DatedTask>(
  tasks: T[],
  movedId: string,
  newStart: Date,
  lagOf: LagFn = noLag
): T[] {
  const result = new Map(tasks.map((t) => [t.id, { ...t }]));
  const moved = result.get(movedId);
  if (!moved) return tasks;

  moved.startDate = new Date(newStart);
  moved.endDate = addDays(moved.startDate, moved.duration);

  const { order } = topoOrder(tasks);
  for (const id of order) {
    if (id === movedId) continue;
    const task = result.get(id);
    if (!task) continue;
    let earliest: number | null = null;
    for (const dep of task.dependencies) {
      const depTask = result.get(dep);
      if (!depTask) continue;
      const minStart = depTask.endDate.getTime() + lagOf(dep, id) * MS_PER_DAY;
      earliest = earliest == null ? minStart : Math.max(earliest, minStart);
    }
    if (earliest != null && task.startDate.getTime() < earliest) {
      task.startDate = new Date(earliest);
      task.endDate = addDays(task.startDate, task.duration);
    }
  }

  // Preserve input ordering.
  return tasks.map((t) => result.get(t.id)!);
}
