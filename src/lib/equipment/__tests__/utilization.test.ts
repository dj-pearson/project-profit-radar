import { describe, it, expect } from 'vitest';
import {
  computeEquipmentUtilization,
  unionDays,
  IDLE_THRESHOLD_DAYS,
  type EquipmentLike,
  type AssignmentLike,
} from '../utilization';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe('unionDays', () => {
  const t = (d: string) => new Date(d + 'T00:00:00Z').getTime();
  it('sums non-overlapping intervals', () => {
    expect(
      unionDays([
        { start: t('2026-01-01'), end: t('2026-01-04') }, // 3 days
        { start: t('2026-01-10'), end: t('2026-01-12') }, // 2 days
      ])
    ).toBe(5);
  });
  it('merges overlapping intervals (no double count)', () => {
    expect(
      unionDays([
        { start: t('2026-01-01'), end: t('2026-01-05') }, // 4 days
        { start: t('2026-01-03'), end: t('2026-01-08') }, // overlaps -> union 7
      ])
    ).toBe(7);
  });
  it('handles empty input', () => {
    expect(unionDays([])).toBe(0);
  });
});

describe('computeEquipmentUtilization', () => {
  const equipment: EquipmentLike[] = [
    { id: 'e1', name: 'Excavator', status: 'in_use' },
    { id: 'e2', name: 'Bulldozer', status: 'available' },
    { id: 'e3', name: 'Crane', status: 'available' },
  ];
  // 30-day window
  const window = { windowStart: '2026-01-01', windowEnd: '2026-01-31', asOf: '2026-01-31' };

  const assignments: AssignmentLike[] = [
    // e1 assigned the whole window -> ~100%
    { equipment_id: 'e1', project_id: 'p1', start_date: '2026-01-01', end_date: '2026-01-31', assignment_status: 'active' },
    // e2 assigned 9 days early in the window, ended long before asOf -> idle
    { equipment_id: 'e2', project_id: 'p2', start_date: '2026-01-01', end_date: '2026-01-10', assignment_status: 'completed', actual_end_date: '2026-01-10' },
    // e3 has no assignments at all -> idle, 0%
    // a cancelled assignment that should be ignored
    { equipment_id: 'e3', project_id: 'p3', start_date: '2026-01-20', end_date: '2026-01-31', assignment_status: 'cancelled' },
  ];

  const { rows, totals } = computeEquipmentUtilization(equipment, assignments, window);
  const byId = Object.fromEntries(rows.map((r) => [r.equipmentId, r]));

  it('computes a full-window assignment as ~100% utilization and currently assigned', () => {
    expect(byId.e1.utilizationRate).toBe(1);
    expect(byId.e1.isCurrentlyAssigned).toBe(true);
    expect(byId.e1.isIdle).toBe(false);
  });

  it('computes partial utilization for a short assignment', () => {
    // 9 days out of 30 = 0.3
    expect(byId.e2.assignedDays).toBe(9);
    expect(byId.e2.utilizationRate).toBe(0.3);
  });

  it('flags equipment unassigned for 7+ days as idle', () => {
    // e2 ended Jan 10, asOf Jan 31 -> 21 days idle
    expect(byId.e2.isIdle).toBe(true);
    expect(byId.e2.isCurrentlyAssigned).toBe(false);
    expect(byId.e2.daysSinceLastAssignment).toBe(21);
  });

  it('ignores cancelled assignments and reports never-assigned equipment as idle', () => {
    expect(byId.e3.assignedDays).toBe(0);
    expect(byId.e3.utilizationRate).toBe(0);
    expect(byId.e3.isIdle).toBe(true);
    expect(byId.e3.daysSinceLastAssignment).toBeNull();
  });

  it('rolls up fleet totals', () => {
    expect(totals.equipmentCount).toBe(3);
    expect(totals.currentlyAssigned).toBe(1);
    expect(totals.idleCount).toBe(2); // e2 + e3
    // avg of 1, 0.3, 0 = 0.43
    expect(totals.avgUtilization).toBe(0.43);
  });

  it('sorts rows by utilization descending', () => {
    expect(rows[0].equipmentId).toBe('e1');
  });

  it('treats an assignment overlapping the trailing idle window as not idle', () => {
    const recent: AssignmentLike[] = [
      {
        equipment_id: 'e2',
        start_date: '2026-01-27', // ended 4 days before asOf (< 7)
        end_date: '2026-01-27',
        assignment_status: 'completed',
        actual_end_date: '2026-01-27',
      },
    ];
    const r = computeEquipmentUtilization([equipment[1]], recent, window);
    expect(r.rows[0].isIdle).toBe(false);
  });

  it('prefers actual dates over planned for the effective interval', () => {
    const a: AssignmentLike[] = [
      {
        equipment_id: 'e1',
        start_date: '2026-01-01',
        end_date: '2026-01-31',
        actual_start_date: '2026-01-01',
        actual_end_date: '2026-01-06', // returned early after 5 days
        assignment_status: 'completed',
      },
    ];
    const r = computeEquipmentUtilization([equipment[0]], a, window);
    expect(r.rows[0].assignedDays).toBe(5);
  });

  it('uses IDLE_THRESHOLD_DAYS boundary correctly', () => {
    expect(IDLE_THRESHOLD_DAYS).toBe(7);
    const asOf = new Date('2026-01-31T00:00:00Z').getTime();
    const endedExactly7DaysAgo = new Date(asOf - 7 * MS_PER_DAY).toISOString();
    const a: AssignmentLike[] = [
      { equipment_id: 'e1', start_date: endedExactly7DaysAgo, end_date: endedExactly7DaysAgo, assignment_status: 'completed', actual_end_date: endedExactly7DaysAgo },
    ];
    // Ends exactly at the cutoff -> still counts as overlapping (not idle).
    const r = computeEquipmentUtilization([equipment[0]], a, window);
    expect(r.rows[0].isIdle).toBe(false);
  });
});
