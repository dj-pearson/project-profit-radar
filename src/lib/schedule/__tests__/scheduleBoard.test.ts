/**
 * US-223: schedule persistence <-> CPM mapping + baseline slip
 */
import { describe, it, expect } from 'vitest';
import {
  addDays,
  diffDays,
  taskEndDate,
  toCpmTasks,
  snapshotTasks,
  computeScheduleSlipDays,
  buildLagFn,
  wouldCreateCycle,
  type ScheduleTaskRow,
  type ScheduleDependencyRow,
} from '@/lib/schedule/scheduleBoard';

const task = (over: Partial<ScheduleTaskRow> & { id: string; start_date: string; duration_days: number }): ScheduleTaskRow => ({
  company_id: 'c1',
  project_id: 'p1',
  name: 'Task',
  status: 'not-started',
  sort_order: 0,
  ...over,
});

describe('date helpers (US-223)', () => {
  it('adds days across month boundaries', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02');
  });
  it('computes whole-day differences', () => {
    expect(diffDays('2026-02-02', '2026-01-30')).toBe(3);
    expect(diffDays('2026-01-30', '2026-02-02')).toBe(-3);
  });
  it('derives end date from start + duration', () => {
    expect(taskEndDate({ start_date: '2026-03-01', duration_days: 5 })).toBe('2026-03-06');
  });
});

describe('toCpmTasks (US-223)', () => {
  it('maps dependencies to predecessor id lists', () => {
    const tasks = [
      task({ id: 'a', start_date: '2026-01-01', duration_days: 2 }),
      task({ id: 'b', start_date: '2026-01-03', duration_days: 3 }),
      task({ id: 'c', start_date: '2026-01-06', duration_days: 1 }),
    ];
    const deps: ScheduleDependencyRow[] = [
      { id: 'd1', predecessor_id: 'a', successor_id: 'b', lag_days: 0 },
      { id: 'd2', predecessor_id: 'b', successor_id: 'c', lag_days: 0 },
    ];
    const cpm = toCpmTasks(tasks, deps);
    expect(cpm.find((t) => t.id === 'b')?.dependencies).toEqual(['a']);
    expect(cpm.find((t) => t.id === 'c')?.dependencies).toEqual(['b']);
    expect(cpm.find((t) => t.id === 'a')?.dependencies).toEqual([]);
    expect(cpm.find((t) => t.id === 'b')?.duration).toBe(3);
  });
});

describe('buildLagFn (US-223)', () => {
  it('returns saved lag per edge and 0 for unknown edges', () => {
    const deps: ScheduleDependencyRow[] = [
      { id: 'd1', predecessor_id: 'a', successor_id: 'b', lag_days: 3 },
    ];
    const lagOf = buildLagFn(deps);
    expect(lagOf('a', 'b')).toBe(3);
    expect(lagOf('b', 'c')).toBe(0);
  });
});

describe('wouldCreateCycle (US-223)', () => {
  const deps: ScheduleDependencyRow[] = [
    { id: 'd1', predecessor_id: 'a', successor_id: 'b', lag_days: 0 },
    { id: 'd2', predecessor_id: 'b', successor_id: 'c', lag_days: 0 },
  ];
  it('flags a self-link', () => {
    expect(wouldCreateCycle(deps, 'a', 'a')).toBe(true);
  });
  it('flags a back-edge that closes a cycle', () => {
    // a->b->c exists; adding c->a would cycle.
    expect(wouldCreateCycle(deps, 'c', 'a')).toBe(true);
  });
  it('allows an acyclic edge', () => {
    expect(wouldCreateCycle(deps, 'a', 'c')).toBe(false);
  });
});

describe('computeScheduleSlipDays (US-223)', () => {
  const baselineTasks = [
    task({ id: 'a', start_date: '2026-01-01', duration_days: 5 }), // ends 01-06
    task({ id: 'b', start_date: '2026-01-06', duration_days: 4 }), // ends 01-10
  ];
  const baseline = snapshotTasks(baselineTasks);

  it('returns 0 when nothing has slipped', () => {
    expect(computeScheduleSlipDays(baselineTasks, baseline)).toBe(0);
  });

  it('returns the largest finish slip across tasks', () => {
    const current = [
      task({ id: 'a', start_date: '2026-01-01', duration_days: 5 }), // on time
      task({ id: 'b', start_date: '2026-01-09', duration_days: 4 }), // ends 01-13, 3 days late
    ];
    expect(computeScheduleSlipDays(current, baseline)).toBe(3);
  });

  it('ignores tasks finishing early (no negative slip)', () => {
    const current = [task({ id: 'a', start_date: '2026-01-01', duration_days: 2 })]; // ends early
    expect(computeScheduleSlipDays(current, baseline)).toBe(0);
  });

  it('ignores tasks absent from the baseline and an empty baseline', () => {
    const current = [task({ id: 'z', start_date: '2026-05-01', duration_days: 99 })];
    expect(computeScheduleSlipDays(current, baseline)).toBe(0);
    expect(computeScheduleSlipDays(current, [])).toBe(0);
  });
});
