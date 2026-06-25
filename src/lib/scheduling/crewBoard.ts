/**
 * Crew scheduling board logic (US-106).
 *
 * Pure, framework-free helpers for the weekly crew board: week-date math,
 * double-booking conflict detection, and the crew × day grid model (including
 * the unassigned-crew list). UTC-based date handling keeps it deterministic and
 * unit testable.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parse a YYYY-MM-DD string to a UTC-midnight timestamp. */
function parseDate(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
}

/** Format a UTC timestamp as YYYY-MM-DD. */
function formatDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Monday-based start of the week containing `date` (YYYY-MM-DD). */
export function startOfWeek(date: string): string {
  const ms = parseDate(date);
  const dow = new Date(ms).getUTCDay(); // 0=Sun..6=Sat
  const delta = dow === 0 ? -6 : 1 - dow;
  return formatDate(ms + delta * MS_PER_DAY);
}

/** The 7 day strings (Mon→Sun) for the week starting at `weekStart`. */
export function getWeekDays(weekStart: string): string[] {
  const base = parseDate(startOfWeek(weekStart));
  return Array.from({ length: 7 }, (_, i) => formatDate(base + i * MS_PER_DAY));
}

/** Shift a week start by `n` weeks (negative = earlier). */
export function addWeeks(weekStart: string, n: number): string {
  return formatDate(parseDate(startOfWeek(weekStart)) + n * 7 * MS_PER_DAY);
}

/** Minutes since midnight for an "HH:MM" / "HH:MM:SS" time (0 if unparseable). */
function timeToMinutes(time: string | null | undefined): number {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** True when two [start,end) time ranges overlap. */
export function hasTimeOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  const as = timeToMinutes(aStart);
  const ae = timeToMinutes(aEnd);
  const bs = timeToMinutes(bStart);
  const be = timeToMinutes(bEnd);
  return as < be && bs < ae;
}

export interface BoardCrewMember {
  id: string;
  name: string;
  role?: string | null;
}

export interface BoardAssignment {
  id: string;
  crew_member_id: string;
  project_id: string;
  assigned_date: string;
  start_time: string;
  end_time: string;
  project_name?: string | null;
  status?: string | null;
}

/**
 * Ids of assignments that double-book a crew member: same member, same day,
 * overlapping time as at least one other assignment.
 */
export function detectConflicts(assignments: BoardAssignment[]): Set<string> {
  const conflicts = new Set<string>();
  const byMemberDay = new Map<string, BoardAssignment[]>();
  for (const a of assignments) {
    const key = `${a.crew_member_id}|${a.assigned_date}`;
    const arr = byMemberDay.get(key) ?? [];
    arr.push(a);
    byMemberDay.set(key, arr);
  }
  for (const group of byMemberDay.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (hasTimeOverlap(group[i].start_time, group[i].end_time, group[j].start_time, group[j].end_time)) {
          conflicts.add(group[i].id);
          conflicts.add(group[j].id);
        }
      }
    }
  }
  return conflicts;
}

export interface CrewBoardRow {
  member: BoardCrewMember;
  /** date (YYYY-MM-DD) → assignments in that cell. */
  cellsByDate: Record<string, BoardAssignment[]>;
  /** Total assignments for the member this week. */
  assignmentCount: number;
}

export interface CrewBoard {
  weekStart: string;
  weekDays: string[];
  rows: CrewBoardRow[];
  /** Crew members with no assignments in the week. */
  unassignedCrew: BoardCrewMember[];
  /** Assignment ids that are double-booked. */
  conflicts: Set<string>;
}

/** Build the weekly crew × day grid model. */
export function buildCrewWeek(input: {
  crew: BoardCrewMember[];
  assignments: BoardAssignment[];
  weekStart: string;
}): CrewBoard {
  const weekStart = startOfWeek(input.weekStart);
  const weekDays = getWeekDays(weekStart);
  const weekDaySet = new Set(weekDays);

  // Only assignments that fall within this week.
  const weekAssignments = input.assignments.filter((a) => weekDaySet.has(a.assigned_date));
  const conflicts = detectConflicts(weekAssignments);

  const byMember = new Map<string, BoardAssignment[]>();
  for (const a of weekAssignments) {
    const arr = byMember.get(a.crew_member_id) ?? [];
    arr.push(a);
    byMember.set(a.crew_member_id, arr);
  }

  const rows: CrewBoardRow[] = input.crew.map((member) => {
    const cellsByDate: Record<string, BoardAssignment[]> = {};
    for (const day of weekDays) cellsByDate[day] = [];
    const memberAssignments = byMember.get(member.id) ?? [];
    for (const a of memberAssignments) {
      cellsByDate[a.assigned_date].push(a);
    }
    return { member, cellsByDate, assignmentCount: memberAssignments.length };
  });

  const unassignedCrew = input.crew.filter((m) => (byMember.get(m.id)?.length ?? 0) === 0);

  return { weekStart, weekDays, rows, unassignedCrew, conflicts };
}
