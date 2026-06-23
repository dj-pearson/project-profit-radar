import { describe, it, expect } from 'vitest';
import {
  entryHours, isoWeekKey, hoursByProject, hoursByEmployee, hoursByDayOfWeek, totalHours,
} from '../timeReports';

describe('entryHours', () => {
  it('prefers total_hours when present', () => {
    expect(entryHours({ id: '1', user_id: 'u', project_id: 'p', start_time: '2026-06-01T08:00:00Z', total_hours: 7.5 })).toBe(7.5);
  });
  it('derives from start/end minus break', () => {
    const h = entryHours({ id: '1', user_id: 'u', project_id: 'p', start_time: '2026-06-01T08:00:00Z', end_time: '2026-06-01T17:00:00Z', break_duration: 60 });
    expect(h).toBe(8); // 9h - 1h break
  });
  it('returns 0 when no usable data', () => {
    expect(entryHours({ id: '1', user_id: 'u', project_id: 'p', start_time: '2026-06-01T08:00:00Z' })).toBe(0);
  });
});

describe('isoWeekKey', () => {
  it('groups same-week dates together', () => {
    expect(isoWeekKey('2026-06-22T00:00:00Z')).toBe(isoWeekKey('2026-06-24T00:00:00Z'));
  });
  it('separates different weeks', () => {
    expect(isoWeekKey('2026-06-22T00:00:00Z')).not.toBe(isoWeekKey('2026-06-29T00:00:00Z'));
  });
});

describe('hoursByProject', () => {
  const projects = [
    { id: 'p1', name: 'Alpha', estimated_hours: 10 },
    { id: 'p2', name: 'Beta' },
  ];
  const entries = [
    { id: '1', user_id: 'u1', project_id: 'p1', start_time: '2026-06-01T08:00:00Z', total_hours: 6 },
    { id: '2', user_id: 'u1', project_id: 'p1', start_time: '2026-06-02T08:00:00Z', total_hours: 6 },
    { id: '3', user_id: 'u2', project_id: 'p2', start_time: '2026-06-02T08:00:00Z', total_hours: 4 },
    { id: '4', user_id: 'u2', project_id: null, start_time: '2026-06-02T08:00:00Z', total_hours: 2 },
  ];
  it('sums hours per project and computes variance', () => {
    const res = hoursByProject(entries, projects);
    const p1 = res.find((r) => r.projectId === 'p1')!;
    expect(p1.hours).toBe(12);
    expect(p1.estimatedHours).toBe(10);
    expect(p1.variance).toBe(2); // 12 actual - 10 estimated
  });
  it('labels null project as Unassigned and sorts by hours desc', () => {
    const res = hoursByProject(entries, projects);
    expect(res[0].projectId).toBe('p1');
    expect(res.find((r) => r.projectId === null)?.projectName).toBe('Unassigned');
  });
});

describe('hoursByEmployee', () => {
  const employees = [{ id: 'u1', name: 'Pat Crew' }];
  it('flags overtime beyond 40h in a single week', () => {
    // Mon-Fri (June 22-26, 2026) x 9h = 45h in one ISO week -> 5h OT
    const entries = ['22', '23', '24', '25', '26'].map((d, i) => ({
      id: String(i), user_id: 'u1', project_id: 'p1', start_time: `2026-06-${d}T08:00:00Z`, total_hours: 9,
    }));
    const res = hoursByEmployee(entries, employees);
    expect(res[0].totalHours).toBe(45);
    expect(res[0].overtimeHours).toBe(5);
    expect(res[0].regularHours).toBe(40);
  });
  it('falls back to a user id label when employee unknown', () => {
    const res = hoursByEmployee(
      [{ id: '1', user_id: 'abcdef12-0000', project_id: 'p', start_time: '2026-06-01T08:00:00Z', total_hours: 3 }],
      []
    );
    expect(res[0].employeeName).toContain('abcdef12');
  });
});

describe('hoursByDayOfWeek', () => {
  it('always returns 7 days and buckets correctly', () => {
    const res = hoursByDayOfWeek([
      { id: '1', user_id: 'u', project_id: 'p', start_time: '2026-06-22T08:00:00Z', total_hours: 8 }, // Monday
    ]);
    expect(res).toHaveLength(7);
    expect(res.find((d) => d.day === 'Mon')!.hours).toBe(8);
  });
});

describe('totalHours', () => {
  it('sums all entries', () => {
    expect(totalHours([
      { id: '1', user_id: 'u', project_id: 'p', start_time: '2026-06-01T08:00:00Z', total_hours: 3 },
      { id: '2', user_id: 'u', project_id: 'p', start_time: '2026-06-01T08:00:00Z', total_hours: 4.5 },
    ])).toBe(7.5);
  });
});
