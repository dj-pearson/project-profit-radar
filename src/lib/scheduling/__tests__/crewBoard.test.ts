import { describe, it, expect } from 'vitest';
import {
  startOfWeek,
  getWeekDays,
  addWeeks,
  hasTimeOverlap,
  detectConflicts,
  buildCrewWeek,
  type BoardCrewMember,
  type BoardAssignment,
} from '../crewBoard';

describe('week date math', () => {
  it('finds the Monday start of a week', () => {
    // 2026-06-25 is a Thursday -> Monday is 2026-06-22
    expect(startOfWeek('2026-06-25')).toBe('2026-06-22');
    // A Sunday belongs to the week that started the prior Monday
    expect(startOfWeek('2026-06-28')).toBe('2026-06-22');
    // A Monday maps to itself
    expect(startOfWeek('2026-06-22')).toBe('2026-06-22');
  });

  it('lists 7 days Mon→Sun', () => {
    const days = getWeekDays('2026-06-25');
    expect(days).toEqual([
      '2026-06-22', '2026-06-23', '2026-06-24', '2026-06-25',
      '2026-06-26', '2026-06-27', '2026-06-28',
    ]);
  });

  it('navigates weeks forward and back', () => {
    expect(addWeeks('2026-06-22', 1)).toBe('2026-06-29');
    expect(addWeeks('2026-06-22', -1)).toBe('2026-06-15');
  });
});

describe('hasTimeOverlap', () => {
  it('detects overlapping ranges', () => {
    expect(hasTimeOverlap('08:00', '12:00', '11:00', '15:00')).toBe(true);
    expect(hasTimeOverlap('08:00', '12:00', '12:00', '16:00')).toBe(false); // touching, no overlap
    expect(hasTimeOverlap('08:00', '17:00', '09:00', '10:00')).toBe(true); // contained
    expect(hasTimeOverlap('08:00', '10:00', '13:00', '15:00')).toBe(false);
  });
  it('handles HH:MM:SS', () => {
    expect(hasTimeOverlap('08:00:00', '12:00:00', '11:30:00', '13:00:00')).toBe(true);
  });
});

describe('detectConflicts', () => {
  it('flags double-booked overlapping assignments for the same member/day', () => {
    const assignments: BoardAssignment[] = [
      { id: 'a', crew_member_id: 'c1', project_id: 'p1', assigned_date: '2026-06-22', start_time: '08:00', end_time: '12:00' },
      { id: 'b', crew_member_id: 'c1', project_id: 'p2', assigned_date: '2026-06-22', start_time: '11:00', end_time: '15:00' },
      { id: 'c', crew_member_id: 'c1', project_id: 'p3', assigned_date: '2026-06-23', start_time: '08:00', end_time: '12:00' }, // different day
      { id: 'd', crew_member_id: 'c2', project_id: 'p1', assigned_date: '2026-06-22', start_time: '08:00', end_time: '12:00' }, // different member
    ];
    const conflicts = detectConflicts(assignments);
    expect(conflicts.has('a')).toBe(true);
    expect(conflicts.has('b')).toBe(true);
    expect(conflicts.has('c')).toBe(false);
    expect(conflicts.has('d')).toBe(false);
  });

  it('does not flag back-to-back assignments', () => {
    const conflicts = detectConflicts([
      { id: 'a', crew_member_id: 'c1', project_id: 'p1', assigned_date: '2026-06-22', start_time: '08:00', end_time: '12:00' },
      { id: 'b', crew_member_id: 'c1', project_id: 'p2', assigned_date: '2026-06-22', start_time: '12:00', end_time: '16:00' },
    ]);
    expect(conflicts.size).toBe(0);
  });
});

describe('buildCrewWeek', () => {
  const crew: BoardCrewMember[] = [
    { id: 'c1', name: 'Alice' },
    { id: 'c2', name: 'Bob' },
    { id: 'c3', name: 'Carol' },
  ];
  const assignments: BoardAssignment[] = [
    { id: 'a', crew_member_id: 'c1', project_id: 'p1', assigned_date: '2026-06-22', start_time: '08:00', end_time: '12:00', project_name: 'Job A' },
    { id: 'b', crew_member_id: 'c1', project_id: 'p2', assigned_date: '2026-06-24', start_time: '08:00', end_time: '16:00' },
    { id: 'c', crew_member_id: 'c2', project_id: 'p1', assigned_date: '2026-06-22', start_time: '08:00', end_time: '12:00' },
    // outside the week -> ignored
    { id: 'x', crew_member_id: 'c1', project_id: 'p1', assigned_date: '2026-07-10', start_time: '08:00', end_time: '12:00' },
  ];
  const board = buildCrewWeek({ crew, assignments, weekStart: '2026-06-25' });

  it('normalizes to the Monday week start and 7 days', () => {
    expect(board.weekStart).toBe('2026-06-22');
    expect(board.weekDays).toHaveLength(7);
  });

  it('places assignments into the right crew/day cells, ignoring out-of-week', () => {
    const alice = board.rows.find((r) => r.member.id === 'c1')!;
    expect(alice.cellsByDate['2026-06-22'].map((a) => a.id)).toEqual(['a']);
    expect(alice.cellsByDate['2026-06-24'].map((a) => a.id)).toEqual(['b']);
    expect(alice.assignmentCount).toBe(2); // 'x' excluded
  });

  it('lists crew with no assignments this week as unassigned', () => {
    expect(board.unassignedCrew.map((m) => m.id)).toEqual(['c3']);
  });

  it('exposes an empty conflict set when there are no overlaps', () => {
    expect(board.conflicts.size).toBe(0);
  });

  it('every row has a cell for each weekday', () => {
    for (const row of board.rows) {
      expect(Object.keys(row.cellsByDate)).toHaveLength(7);
    }
  });
});
