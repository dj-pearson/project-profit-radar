/**
 * US-329: one schedule that drives the crew.
 *
 * Three systems coexisted and only one held data. schedule_tasks with its
 * dependencies and baselines is real, and had no assignee column at all, so
 * the Gantt could be perfect and nobody on the crew would learn of it.
 * ScheduleManagement fetched projects and handed them to four components that
 * made no Supabase call, drawing one bar per project. crew_assignments was a
 * separate day board with no link back, and its arrival_notification_sent
 * column had never been set by anything.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import {
  summariseSchedule, groupTasksByWeek, mondayOf, parseLocalDate, isoDate,
  type ScheduleBoardRow,
} from '../scheduleBoard';
import {
  mapHeaders, parseDateCell, parseDuration, parsePredecessors, daysBetween,
  parseScheduleSheet,
} from '../scheduleImport';

const strip = (path: string) =>
  readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('--'))
    .join('\n');

const task = (over: Partial<ScheduleBoardRow> = {}): ScheduleBoardRow => ({
  schedule_task_id: 't1',
  project_id: 'p1',
  project_name: 'Maple St',
  project_status: 'active',
  task_name: 'Framing',
  start_date: '2026-09-07',
  end_date: '2026-09-11',
  duration_days: 5,
  status: 'not_started',
  assignee_count: 0,
  assignee_names: null,
  ...over,
});

describe('the company schedule board (US-329)', () => {
  it('counts work nobody is on, which is the number that matters on a Monday', () => {
    const summary = summariseSchedule([
      task({ schedule_task_id: 'a', assignee_count: 0 }),
      task({ schedule_task_id: 'b', assignee_count: 2 }),
      task({ schedule_task_id: 'c', assignee_count: 0 }),
    ]);
    expect(summary.total).toBe(3);
    expect(summary.unassigned).toBe(2);
    expect(summary.assignments).toBe(2);
  });

  it('counts distinct projects, not rows', () => {
    const summary = summariseSchedule([
      task({ schedule_task_id: 'a', project_id: 'p1' }),
      task({ schedule_task_id: 'b', project_id: 'p1' }),
      task({ schedule_task_id: 'c', project_id: 'p2' }),
    ]);
    expect(summary.projects).toBe(2);
  });

  it('starts the week on Monday, not Sunday', () => {
    // A construction week starts Monday. A board that files Monday under the
    // previous week is read wrong every time.
    expect(isoDate(mondayOf(new Date(2026, 8, 7)))).toBe('2026-09-07');  // a Monday
    expect(isoDate(mondayOf(new Date(2026, 8, 9)))).toBe('2026-09-07');  // Wednesday
    expect(isoDate(mondayOf(new Date(2026, 8, 13)))).toBe('2026-09-07'); // Sunday
    expect(isoDate(mondayOf(new Date(2026, 8, 14)))).toBe('2026-09-14'); // next Monday
  });

  it('parses a date as local midnight, not UTC', () => {
    // new Date('2026-09-07') is UTC and shifts back a day west of Greenwich,
    // which would move Monday's work into the previous week.
    const d = parseLocalDate('2026-09-07');
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(8);
    expect(d?.getDate()).toBe(7);
  });

  it('groups into weeks in order and sorts within a week', () => {
    const weeks = groupTasksByWeek([
      task({ schedule_task_id: 'c', start_date: '2026-09-16', task_name: 'Roofing' }),
      task({ schedule_task_id: 'b', start_date: '2026-09-09', task_name: 'Zebra' }),
      task({ schedule_task_id: 'a', start_date: '2026-09-09', task_name: 'Alpha' }),
    ]);
    expect(weeks.map((w) => w.weekStart)).toEqual(['2026-09-07', '2026-09-14']);
    expect(weeks[0].tasks.map((t) => t.task_name)).toEqual(['Alpha', 'Zebra']);
  });

  it('drops a row with an unreadable date rather than grouping it wrongly', () => {
    expect(groupTasksByWeek([task({ start_date: 'sometime next spring' })])).toEqual([]);
  });
});

describe('importing a schedule from a spreadsheet (US-044, US-329)', () => {
  it('matches headers however the exporting tool named them', () => {
    expect(mapHeaders(['Activity ID', 'Activity Name', 'Early Start', 'Predecessors']))
      .toMatchObject({ id: 0, name: 1, start: 2, predecessors: 3 });
    expect(mapHeaders(['Task ID', 'Task Name', 'Start Date', 'Finish Date', 'Duration']))
      .toMatchObject({ id: 0, name: 1, start: 2, finish: 3, duration: 4 });
  });

  it('reports -1 for a column the file does not have', () => {
    expect(mapHeaders(['Name', 'Start']).predecessors).toBe(-1);
  });

  it('reads ISO, US slash dates and Excel serials', () => {
    expect(parseDateCell('2026-09-07')).toBe('2026-09-07');
    expect(parseDateCell('9/7/2026')).toBe('2026-09-07');
    expect(parseDateCell('09/07/26')).toBe('2026-09-07');
    // 46272 is 2026-09-07 in Excel's serial numbering.
    expect(parseDateCell(46272)).toBe('2026-09-07');
  });

  it('returns null rather than a guess on an unreadable date', () => {
    expect(parseDateCell('')).toBeNull();
    expect(parseDateCell(null)).toBeNull();
    expect(parseDateCell('TBD')).toBeNull();
  });

  it('reads durations however they are written', () => {
    expect(parseDuration('5d')).toBe(5);
    expect(parseDuration('5 days')).toBe(5);
    expect(parseDuration(5)).toBe(5);
    expect(parseDuration('0')).toBe(1);   // a milestone still occupies a day
    expect(parseDuration('')).toBeNull();
  });

  it('strips the relationship type and lag off a predecessor', () => {
    // Only finish-to-start is modelled, which is what
    // schedule_task_dependencies stores.
    expect(parsePredecessors('3')).toEqual(['3']);
    expect(parsePredecessors('3FS')).toEqual(['3']);
    expect(parsePredecessors('3FS+2d')).toEqual(['3']);
    expect(parsePredecessors('3,4')).toEqual(['3', '4']);
    expect(parsePredecessors('3; 4')).toEqual(['3', '4']);
    expect(parsePredecessors('-')).toEqual([]);
  });

  it('counts days inclusively, the way a schedule does', () => {
    // Monday to Friday is five working days, not four.
    expect(daysBetween('2026-09-07', '2026-09-11')).toBe(5);
    expect(daysBetween('2026-09-07', '2026-09-07')).toBe(1);
    expect(daysBetween('2026-09-11', '2026-09-07')).toBeNull();
  });

  it('parses a whole sheet, including dependencies', () => {
    const result = parseScheduleSheet([
      ['ID', 'Task Name', 'Start', 'Finish', 'Predecessors'],
      ['1', 'Mobilisation', '2026-09-07', '2026-09-08', ''],
      ['2', 'Excavation', '2026-09-09', '2026-09-15', '1'],
      ['3', 'Footings', '2026-09-16', '2026-09-18', '2FS'],
    ]);
    expect(result.tasks).toHaveLength(3);
    expect(result.tasks[1]).toMatchObject({
      sourceId: '2', name: 'Excavation', startDate: '2026-09-09', durationDays: 7,
      predecessors: ['1'],
    });
    expect(result.skipped).toEqual([]);
    expect(result.unresolved).toEqual([]);
  });

  it('takes duration from a finish date when there is no duration column', () => {
    const result = parseScheduleSheet([
      ['Task', 'Start', 'End'],
      ['Framing', '2026-09-07', '2026-09-11'],
    ]);
    expect(result.tasks[0].durationDays).toBe(5);
  });

  it('names the rows it could not use instead of dropping them quietly', () => {
    const result = parseScheduleSheet([
      ['Task Name', 'Start'],
      ['Good', '2026-09-07'],
      ['', '2026-09-08'],
      ['No date', 'whenever'],
    ]);
    expect(result.tasks).toHaveLength(1);
    expect(result.skipped.map((s) => s.row)).toEqual([3, 4]);
    expect(result.skipped[1].reason).toMatch(/whenever/);
  });

  it('reports a predecessor pointing at a row the file does not contain', () => {
    // A schedule that lost half its dependencies on import looks fine and
    // behaves wrongly the first time somebody drags a task.
    const result = parseScheduleSheet([
      ['ID', 'Task Name', 'Start', 'Predecessors'],
      ['1', 'Framing', '2026-09-07', '99'],
    ]);
    expect(result.unresolved).toEqual([{ task: 'Framing', reference: '99' }]);
  });

  it('refuses a sheet with no task-name or start column, and says which', () => {
    expect(parseScheduleSheet([['Cost', 'Notes'], ['1', 'x']]).skipped[0].reason)
      .toMatch(/task-name column/);
    expect(parseScheduleSheet([['Task Name'], ['Framing']]).skipped[0].reason)
      .toMatch(/start-date column/);
  });

  it('skips blank rows without calling them errors', () => {
    const result = parseScheduleSheet([
      ['Task Name', 'Start'],
      ['Framing', '2026-09-07'],
      ['', ''],
      ['Roofing', '2026-09-14'],
    ]);
    expect(result.tasks).toHaveLength(2);
    expect(result.skipped).toEqual([]);
  });
});

describe('the database wires assignment to the crew board (US-329)', () => {
  const sql = strip('supabase/migrations/20260903170000_schedule_assignment.sql');

  it('gives schedule_tasks assignees', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.schedule_task_assignees/);
    expect(sql).toMatch(/UNIQUE \(schedule_task_id, crew_member_id\)/);
  });

  it('generates the crew_assignments row rather than asking twice', () => {
    const fn = sql.slice(sql.indexOf('FUNCTION public.assign_schedule_task_crew'));
    expect(fn).toMatch(/INSERT INTO public\.crew_assignments/);
    expect(fn).toMatch(/schedule_task_id/);
  });

  it('finally sets arrival_notification_sent, which nothing ever set', () => {
    expect(sql).toMatch(/arrival_notification_sent = true/);
  });

  it('notifies through the table the notification centre reads', () => {
    // useSimpleNotifications.ts:53 reads real_time_notifications. Writing
    // anywhere else would be a notification nobody sees.
    expect(sql).toMatch(/INSERT INTO public\.real_time_notifications/);
    expect(sql).toMatch(/'task_assignment'/);
    expect(sql).toMatch(/'timeline_change'/);
  });

  it('uses only notification types the existing CHECK already admits', () => {
    // 20250919164232 constrains type; adding a value would be a tightening
    // failure waiting to happen on an older client.
    const allowed = readFileSync(
      'supabase/migrations/20250919164232_5c9b8a12-18b5-4835-b53b-35aec2640f7e.sql', 'utf8'
    );
    expect(allowed).toMatch(/'task_assignment'/);
    expect(allowed).toMatch(/'timeline_change'/);
    expect(sql).not.toMatch(/real_time_notifications_type_check/);
  });

  it('notifies every assignee when a task is rescheduled', () => {
    // ProjectSchedule's drag cascades through dependencies, so one drag moves
    // many tasks. That is exactly why this is a trigger.
    const fn = sql.slice(sql.indexOf('FUNCTION public.notify_schedule_task_reschedule'));
    expect(fn).toMatch(/FOR v_row IN/);
    expect(fn).toMatch(/UPDATE public\.crew_assignments/);
    expect(sql).toMatch(/AFTER UPDATE OF start_date, duration_days ON public\.schedule_tasks/);
  });

  it('does nothing when a task is updated without moving', () => {
    const fn = sql.slice(sql.indexOf('FUNCTION public.notify_schedule_task_reschedule'));
    expect(fn).toMatch(/IF NEW\.start_date = OLD\.start_date AND NEW\.duration_days = OLD\.duration_days THEN\s*\n\s*RETURN NEW;/);
  });

  it('takes the day-board row away when the assignment is removed', () => {
    // Otherwise the crew keeps showing up for work reassigned a week ago.
    expect(sql).toMatch(/FUNCTION public\.unassign_schedule_task_crew/);
    expect(sql).toMatch(/DELETE FROM public\.crew_assignments WHERE id = OLD\.crew_assignment_id/);
  });

  it('is additive: no drops and no new constraints on existing tables', () => {
    expect(sql).not.toMatch(/DROP TABLE/);
    expect(sql).not.toMatch(/DROP COLUMN/);
    expect(sql).not.toMatch(/ALTER TABLE public\.crew_assignments[\s\S]{0,60}ADD CONSTRAINT/);
  });

  it('keeps concurrent indexes in their own file', () => {
    expect(sql).not.toMatch(/CONCURRENTLY/);
    expect(strip('supabase/migrations/20260903180000_schedule_assignment_indexes.sql'))
      .toMatch(/CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedule_task_assignees_task/);
  });

  it('records the decision on the two tables with no readers', () => {
    expect(sql).toMatch(/COMMENT ON TABLE public\.schedule_conflicts[\s\S]{0,60}DEPRECATED/);
    expect(sql).toMatch(/COMMENT ON TABLE public\.project_milestones[\s\S]{0,40}KEPT/);
  });
});

describe('the pages guard on a role group that exists (US-329)', () => {
  // ROLE_GROUPS.MANAGEMENT does not exist. RoleGuard calls
  // allowedRoles.includes(...), so passing undefined throws and the page
  // crashes on load. `npm run build` cannot catch it - vite strips types
  // without checking them - and it shipped for one commit.
  const groups = readFileSync('src/components/auth/RoleGuard.tsx', 'utf8');
  const declared = [...groups.matchAll(/^ {2}([A-Z_]+): \[/gm)].map((m) => m[1]);

  for (const page of [
    'src/pages/ScheduleManagement.tsx',
    'src/pages/ScheduleImport.tsx',
  ]) {
    it(`${page.split('/').pop()} names a real group`, () => {
      for (const [, name] of strip(page).matchAll(/ROLE_GROUPS\.([A-Z_]+)/g)) {
        expect(declared).toContain(name);
      }
    });
  }

  it('gates assigning on the roles the RLS policy actually allows', () => {
    // TEAM_MANAGERS excludes field_supervisor, and a superintendent is the
    // person who does this. A group that does not match the policy either
    // hides a legitimate button or shows one the database refuses.
    expect(groups).toMatch(/CREW_SCHEDULERS: \['root_admin', 'admin', 'project_manager', 'field_supervisor'\]/);
    expect(strip('src/components/schedule/ScheduleTaskAssignees.tsx'))
      .toMatch(/useRoleCheck\(ROLE_GROUPS\.CREW_SCHEDULERS\)/);
  });

  it('restricts writing assignees to the same roles in the database', () => {
    // The trigger that writes crew_assignments is SECURITY DEFINER and
    // bypasses that table's own policy, so a permissive policy here would let
    // office_staff schedule a crew through the back door.
    const sql = strip('supabase/migrations/20260903170000_schedule_assignment.sql');
    const write = sql.slice(sql.indexOf('CREATE POLICY "Supervisors assign their company crew"'));
    for (const role of ['admin', 'project_manager', 'field_supervisor', 'root_admin']) {
      expect(write).toMatch(new RegExp(`'${role}'`));
    }
    expect(write).not.toMatch(/'office_staff'/);
    expect(write).not.toMatch(/'accounting'/);
  });

  it('guards each policy on the name it creates, so a re-run is safe', () => {
    const sql = readFileSync('supabase/migrations/20260903170000_schedule_assignment.sql', 'utf8');
    const created = [...sql.matchAll(/CREATE POLICY "([^"]+)"/g)].map((m) => m[1]);
    const guarded = [...sql.matchAll(/policyname = '([^']+)'/g)].map((m) => m[1]);
    expect(created.sort()).toEqual(guarded.sort());
  });
});

describe('one schedule, not three (US-329)', () => {
  it('deleted the four components that drew projects as bars', () => {
    for (const name of ['ProjectGanttChart', 'ScheduleCalendar', 'ScheduleOverview', 'ProjectTimeline']) {
      expect(existsSync(`src/components/schedule/${name}.tsx`)).toBe(false);
    }
  });

  it('makes ScheduleManagement read the real schedule', () => {
    const page = strip('src/pages/ScheduleManagement.tsx');
    expect(page).toMatch(/from\('schedule_board'\)/);
    expect(page).not.toMatch(/ProjectGanttChart|ScheduleOverview|ProjectTimeline/);
  });

  it('routes the schedule import and links it from the schedule page', () => {
    expect(strip('src/routes/projectRoutes.tsx')).toMatch(/path="\/schedule-import"/);
    expect(strip('src/pages/ScheduleManagement.tsx')).toMatch(/\/schedule-import/);
  });

  it('makes the import real rather than a preview of an imaginary project', () => {
    const page = strip('src/pages/ScheduleImport.tsx');
    expect(page).not.toMatch(/const previewData/);
    expect(page).not.toMatch(/const supportedFormats/);
    expect(page).toMatch(/from\('schedule_tasks'\)/);
    expect(page).toMatch(/from\('schedule_task_dependencies'\)/);
  });

  it('shows a crew member their scheduled work alongside their to-do list', () => {
    expect(strip('src/pages/MyTasks.tsx')).toMatch(/<MyScheduledWork \/>/);
    expect(existsSync('src/components/schedule/MyScheduledWork.tsx')).toBe(true);
  });

  it('writes down which table holds what', () => {
    const agents = readFileSync('src/AGENTS.md', 'utf8');
    expect(agents).toMatch(/schedule_tasks` is \*\*the schedule\*\*/);
    expect(agents).toMatch(/`tasks` is the/);
    expect(agents).toMatch(/never write\s*\n?`?crew_assignments` directly/);
  });
});
