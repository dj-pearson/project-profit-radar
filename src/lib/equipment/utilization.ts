/**
 * Equipment utilization logic (US-080).
 *
 * Pure, framework-free aggregation of equipment_assignments into per-equipment
 * utilization rates and idle detection, so it is unit testable and reused by
 * the Equipment "Assignments" / utilization dashboard.
 *
 * Utilization is day-based (assignment day-coverage over a window) since the
 * schema has no hour meter; effective dates prefer actuals over planned.
 */

/** Equipment is "idle" when unassigned for at least this many days. */
export const IDLE_THRESHOLD_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toTime(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const t = (value instanceof Date ? value : new Date(value)).getTime();
  return Number.isFinite(t) ? t : null;
}

function diffDays(fromMs: number, toMs: number): number {
  return Math.max(0, Math.round((toMs - fromMs) / MS_PER_DAY));
}

export interface EquipmentLike {
  id: string;
  name?: string | null;
  status?: string | null;
}

export interface AssignmentLike {
  equipment_id: string;
  project_id?: string | null;
  start_date?: string | Date | null;
  end_date?: string | Date | null;
  actual_start_date?: string | Date | null;
  actual_end_date?: string | Date | null;
  assignment_status?: string | null;
}

/** Statuses that should not count toward utilization. */
const IGNORED_STATUSES = new Set(['cancelled', 'canceled', 'void', 'rejected']);

interface Interval {
  start: number;
  end: number;
}

/** Effective [start,end] interval for an assignment (actuals win over planned). */
function effectiveInterval(a: AssignmentLike): Interval | null {
  const start = toTime(a.actual_start_date) ?? toTime(a.start_date);
  const end = toTime(a.actual_end_date) ?? toTime(a.end_date);
  if (start == null || end == null || end < start) return null;
  return { start, end };
}

/** Clip an interval to [windowStart, windowEnd]; null if no overlap. */
function clip(interval: Interval, windowStart: number, windowEnd: number): Interval | null {
  const start = Math.max(interval.start, windowStart);
  const end = Math.min(interval.end, windowEnd);
  return end > start ? { start, end } : null;
}

/** Total covered days across a set of intervals, merging overlaps (no double count). */
export function unionDays(intervals: Interval[]): number {
  if (intervals.length === 0) return 0;
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  let total = 0;
  let curStart = sorted[0].start;
  let curEnd = sorted[0].end;
  for (let i = 1; i < sorted.length; i++) {
    const iv = sorted[i];
    if (iv.start <= curEnd) {
      curEnd = Math.max(curEnd, iv.end);
    } else {
      total += diffDays(curStart, curEnd);
      curStart = iv.start;
      curEnd = iv.end;
    }
  }
  total += diffDays(curStart, curEnd);
  return total;
}

export interface EquipmentUtilizationRow {
  equipmentId: string;
  name: string;
  status: string;
  /** Distinct days the item was assigned within the window. */
  assignedDays: number;
  windowDays: number;
  /** assignedDays / windowDays, clamped to [0,1]. */
  utilizationRate: number;
  /** True when no assignment overlaps the last IDLE_THRESHOLD_DAYS up to asOf. */
  isIdle: boolean;
  /** True when an assignment covers asOf and has not been returned. */
  isCurrentlyAssigned: boolean;
  /** Days since the most recent assignment ended (null if never assigned). */
  daysSinceLastAssignment: number | null;
  /** Number of assignments (non-ignored) touching the window. */
  assignmentCount: number;
}

export interface FleetUtilizationSummary {
  rows: EquipmentUtilizationRow[];
  totals: {
    equipmentCount: number;
    currentlyAssigned: number;
    idleCount: number;
    /** Average utilization rate across all equipment (0–1). */
    avgUtilization: number;
  };
}

export interface UtilizationWindow {
  windowStart: string | Date;
  windowEnd: string | Date;
  /** "Now" for idle/active checks; defaults to windowEnd. */
  asOf?: string | Date;
}

/** Compute per-equipment utilization and idle status over a window. */
export function computeEquipmentUtilization(
  equipment: EquipmentLike[],
  assignments: AssignmentLike[],
  window: UtilizationWindow
): FleetUtilizationSummary {
  const windowStart = toTime(window.windowStart)!;
  const windowEnd = toTime(window.windowEnd)!;
  const asOf = toTime(window.asOf) ?? windowEnd;
  const windowDays = Math.max(0, diffDays(windowStart, windowEnd));
  const idleCutoff = asOf - IDLE_THRESHOLD_DAYS * MS_PER_DAY;

  const byEquipment = new Map<string, AssignmentLike[]>();
  for (const a of assignments) {
    if (IGNORED_STATUSES.has((a.assignment_status ?? '').toLowerCase())) continue;
    const arr = byEquipment.get(a.equipment_id) ?? [];
    arr.push(a);
    byEquipment.set(a.equipment_id, arr);
  }

  const rows = equipment.map((eq): EquipmentUtilizationRow => {
    const list = byEquipment.get(eq.id) ?? [];
    const intervals: Interval[] = [];
    let lastEnd: number | null = null;
    let currentlyAssigned = false;
    let overlapsIdleWindow = false;

    for (const a of list) {
      const iv = effectiveInterval(a);
      if (!iv) continue;
      const clipped = clip(iv, windowStart, windowEnd);
      if (clipped) intervals.push(clipped);

      lastEnd = lastEnd == null ? iv.end : Math.max(lastEnd, iv.end);
      const returned = toTime(a.actual_end_date) != null && toTime(a.actual_end_date)! <= asOf;
      if (iv.start <= asOf && asOf <= iv.end && !returned) currentlyAssigned = true;
      // Overlaps the trailing idle window [idleCutoff, asOf]?
      if (iv.end >= idleCutoff && iv.start <= asOf) overlapsIdleWindow = true;
    }

    const assignedDays = unionDays(intervals);
    const utilizationRate = windowDays > 0 ? Math.min(1, assignedDays / windowDays) : 0;
    const daysSinceLastAssignment =
      lastEnd == null ? null : Math.max(0, diffDays(Math.min(lastEnd, asOf), asOf));

    return {
      equipmentId: eq.id,
      name: eq.name ?? 'Unnamed equipment',
      status: eq.status ?? 'unknown',
      assignedDays,
      windowDays,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      isIdle: !overlapsIdleWindow,
      isCurrentlyAssigned: currentlyAssigned,
      daysSinceLastAssignment,
      assignmentCount: intervals.length,
    };
  });

  rows.sort((a, b) => b.utilizationRate - a.utilizationRate || a.name.localeCompare(b.name));

  const currentlyAssigned = rows.filter((r) => r.isCurrentlyAssigned).length;
  const idleCount = rows.filter((r) => r.isIdle).length;
  const avgUtilization =
    rows.length > 0
      ? Math.round((rows.reduce((s, r) => s + r.utilizationRate, 0) / rows.length) * 100) / 100
      : 0;

  return {
    rows,
    totals: {
      equipmentCount: rows.length,
      currentlyAssigned,
      idleCount,
      avgUtilization,
    },
  };
}
