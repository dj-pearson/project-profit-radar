import { describe, it, expect } from 'vitest';
import {
  computeSchedule,
  annotateCriticalPath,
  cascadeReschedule,
  type CpmTask,
  type DatedTask,
} from '../criticalPath';

describe('computeSchedule — linear chain', () => {
  const tasks: CpmTask[] = [
    { id: 'A', duration: 3, dependencies: [] },
    { id: 'B', duration: 5, dependencies: ['A'] },
    { id: 'C', duration: 2, dependencies: ['B'] },
  ];
  const r = computeSchedule(tasks);

  it('sums durations into project duration', () => {
    expect(r.projectDuration).toBe(10);
  });

  it('makes every task critical with zero float', () => {
    expect(r.criticalPath).toEqual(['A', 'B', 'C']);
    for (const id of ['A', 'B', 'C']) {
      expect(r.timings.get(id)!.totalFloat).toBe(0);
      expect(r.timings.get(id)!.isCritical).toBe(true);
    }
  });

  it('computes early start/finish correctly', () => {
    expect(r.timings.get('A')).toMatchObject({ earlyStart: 0, earlyFinish: 3 });
    expect(r.timings.get('B')).toMatchObject({ earlyStart: 3, earlyFinish: 8 });
    expect(r.timings.get('C')).toMatchObject({ earlyStart: 8, earlyFinish: 10 });
  });
});

describe('computeSchedule — diamond with a non-critical branch', () => {
  // A -> B(6) -> D ; A -> C(2) -> D. The C branch has slack.
  const tasks: CpmTask[] = [
    { id: 'A', duration: 2, dependencies: [] },
    { id: 'B', duration: 6, dependencies: ['A'] },
    { id: 'C', duration: 2, dependencies: ['A'] },
    { id: 'D', duration: 3, dependencies: ['B', 'C'] },
  ];
  const r = computeSchedule(tasks);

  it('finds the longest path as critical', () => {
    expect(r.projectDuration).toBe(11); // 2 + 6 + 3
    expect(r.criticalPath).toEqual(['A', 'B', 'D']);
  });

  it('gives the short branch total + free float', () => {
    const c = r.timings.get('C')!;
    expect(c.isCritical).toBe(false);
    expect(c.totalFloat).toBe(4); // B is 4 days longer than C
    expect(c.freeFloat).toBe(4); // can slip 4 days before delaying D
  });

  it('keeps the long branch critical', () => {
    expect(r.timings.get('B')!.totalFloat).toBe(0);
    expect(r.timings.get('D')!.isCritical).toBe(true);
  });
});

describe('computeSchedule — parallel independent tasks', () => {
  const tasks: CpmTask[] = [
    { id: 'A', duration: 10, dependencies: [] },
    { id: 'B', duration: 4, dependencies: [] },
  ];
  const r = computeSchedule(tasks);

  it('project duration is the longest task', () => {
    expect(r.projectDuration).toBe(10);
  });

  it('only the longest is critical; the shorter has float', () => {
    expect(r.timings.get('A')!.isCritical).toBe(true);
    expect(r.timings.get('B')!.totalFloat).toBe(6);
    expect(r.timings.get('B')!.freeFloat).toBe(6); // no successors -> free float = total float
  });
});

describe('computeSchedule — lag support', () => {
  it('honors lag between predecessor and successor', () => {
    const tasks: CpmTask[] = [
      { id: 'A', duration: 3, dependencies: [] },
      { id: 'B', duration: 2, dependencies: ['A'] },
    ];
    const r = computeSchedule(tasks, (pred, succ) => (pred === 'A' && succ === 'B' ? 2 : 0));
    expect(r.timings.get('B')!.earlyStart).toBe(5); // 3 finish + 2 lag
    expect(r.projectDuration).toBe(7);
  });
});

describe('computeSchedule — edge cases', () => {
  it('handles an empty task list', () => {
    const r = computeSchedule([]);
    expect(r.projectDuration).toBe(0);
    expect(r.criticalPath).toEqual([]);
    expect(r.hasCycle).toBe(false);
  });

  it('detects a dependency cycle without throwing', () => {
    const tasks: CpmTask[] = [
      { id: 'A', duration: 1, dependencies: ['B'] },
      { id: 'B', duration: 1, dependencies: ['A'] },
    ];
    const r = computeSchedule(tasks);
    expect(r.hasCycle).toBe(true);
    expect(r.criticalPath).toEqual([]);
  });

  it('ignores dangling dependencies', () => {
    const tasks: CpmTask[] = [
      { id: 'A', duration: 4, dependencies: ['ghost'] },
      { id: 'B', duration: 2, dependencies: ['A'] },
    ];
    const r = computeSchedule(tasks);
    expect(r.hasCycle).toBe(false);
    expect(r.timings.get('A')!.earlyStart).toBe(0);
    expect(r.projectDuration).toBe(6);
  });
});

describe('annotateCriticalPath', () => {
  it('sets isOnCriticalPath on each task', () => {
    const { tasks } = annotateCriticalPath([
      { id: 'A', duration: 5, dependencies: [], isOnCriticalPath: false },
      { id: 'B', duration: 1, dependencies: [], isOnCriticalPath: false },
    ]);
    const byId = Object.fromEntries(tasks.map((t) => [t.id, t.isOnCriticalPath]));
    expect(byId.A).toBe(true);
    expect(byId.B).toBe(false);
  });

  it('does not mutate the input array', () => {
    const input = [{ id: 'A', duration: 1, dependencies: [], isOnCriticalPath: false }];
    annotateCriticalPath(input);
    expect(input[0].isOnCriticalPath).toBe(false);
  });
});

describe('cascadeReschedule', () => {
  const d = (s: string) => new Date(s + 'T00:00:00Z');
  const tasks: DatedTask[] = [
    { id: 'A', duration: 2, dependencies: [], startDate: d('2026-01-01'), endDate: d('2026-01-03') },
    { id: 'B', duration: 3, dependencies: ['A'], startDate: d('2026-01-03'), endDate: d('2026-01-06') },
    { id: 'C', duration: 1, dependencies: ['B'], startDate: d('2026-01-06'), endDate: d('2026-01-07') },
  ];

  it('pushes dependents when a predecessor moves later', () => {
    const out = cascadeReschedule(tasks, 'A', d('2026-01-06'));
    const byId = Object.fromEntries(out.map((t) => [t.id, t]));
    expect(byId.A.startDate.toISOString()).toBe(d('2026-01-06').toISOString());
    expect(byId.A.endDate.toISOString()).toBe(d('2026-01-08').toISOString());
    // B must start no earlier than A's new finish (Jan 8)
    expect(byId.B.startDate.toISOString()).toBe(d('2026-01-08').toISOString());
    expect(byId.B.endDate.toISOString()).toBe(d('2026-01-11').toISOString());
    // C cascades after B
    expect(byId.C.startDate.toISOString()).toBe(d('2026-01-11').toISOString());
  });

  it('preserves task durations through the cascade', () => {
    const out = cascadeReschedule(tasks, 'A', d('2026-01-06'));
    for (const t of out) {
      const days = (t.endDate.getTime() - t.startDate.getTime()) / (24 * 60 * 60 * 1000);
      expect(days).toBe(t.duration);
    }
  });

  it('does not pull dependents earlier when slack exists (push-only)', () => {
    // Move A earlier; B already starts after A's finish, so it should stay.
    const out = cascadeReschedule(tasks, 'A', d('2025-12-20'));
    const byId = Object.fromEntries(out.map((t) => [t.id, t]));
    expect(byId.A.startDate.toISOString()).toBe(d('2025-12-20').toISOString());
    expect(byId.B.startDate.toISOString()).toBe(d('2026-01-03').toISOString()); // unchanged
  });

  it('returns the input unchanged when the moved task is missing', () => {
    const out = cascadeReschedule(tasks, 'ghost', d('2026-02-01'));
    expect(out).toBe(tasks);
  });
});
