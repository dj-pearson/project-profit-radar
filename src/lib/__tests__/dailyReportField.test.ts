/**
 * US-330: the daily report as the field record.
 *
 * Crew was daily_reports.crew_count - one integer, typed by hand, for people
 * who had already clocked in against the same project on the same day. Photos
 * were a text[] of storage paths on that one row, so nothing could find a
 * photo by project, by date or by who took it, and the four *_items tables
 * created in 20251110000003 were queried by no file in src/.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  crewFromTimeEntries,
  totalCrewHours,
  reconcileDailyReport,
  photoStoragePath,
  projectIdFromPhotoPath,
  crewMemberName,
  OVERTIME_THRESHOLD_HOURS,
} from '../dailyReportField';

const strip = (path: string) =>
  readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('--'))
    .join('\n');

describe('crew comes from the hours already clocked (US-330)', () => {
  it('turns time entries into one row per person', () => {
    const crew = crewFromTimeEntries([
      { user_id: 'u1', total_hours: 8, first_name: 'Dana', last_name: 'Whitfield', role: 'field_supervisor' },
      { user_id: 'u2', total_hours: 7.5, first_name: 'Alex', last_name: 'Reyes', role: 'office_staff' },
    ]);
    expect(crew.map((c) => c.crew_member_name)).toEqual(['Alex Reyes', 'Dana Whitfield']);
    expect(crew[1].hours_worked).toBe(8);
    expect(crew[1].overtime_hours).toBe(0);
  });

  it('sums a split shift before deciding what is overtime', () => {
    // Five hours before lunch and four after is a nine-hour day with one hour
    // of overtime. Splitting each entry separately finds none, which is how a
    // crew that clocks out for lunch loses every overtime hour it works.
    const crew = crewFromTimeEntries([
      { user_id: 'u1', total_hours: 5, first_name: 'Dana' },
      { user_id: 'u1', total_hours: 4, first_name: 'Dana' },
    ]);
    expect(crew).toHaveLength(1);
    expect(crew[0].hours_worked).toBe(OVERTIME_THRESHOLD_HOURS);
    expect(crew[0].overtime_hours).toBe(1);
  });

  it('drops an entry with no hours rather than listing a phantom', () => {
    expect(crewFromTimeEntries([{ user_id: 'u1', total_hours: 0 }])).toEqual([]);
    expect(crewFromTimeEntries([{ user_id: 'u1', total_hours: null }])).toEqual([]);
  });

  it('names somebody with no profile rather than showing a blank row', () => {
    expect(crewMemberName({ user_id: 'u1', total_hours: 8 })).toBe('Crew member');
    expect(crewMemberName({ user_id: 'u1', total_hours: 8, first_name: 'Dana' })).toBe('Dana');
  });

  it('totals regular and overtime together', () => {
    const crew = crewFromTimeEntries([
      { user_id: 'u1', total_hours: 10 },
      { user_id: 'u2', total_hours: 6 },
    ]);
    expect(totalCrewHours(crew)).toBe(16);
  });

  it('rounds to the cent-equivalent so hours do not drift', () => {
    const crew = crewFromTimeEntries([
      { user_id: 'u1', total_hours: 2.333 },
      { user_id: 'u1', total_hours: 2.333 },
      { user_id: 'u1', total_hours: 2.333 },
    ]);
    expect(crew[0].hours_worked).toBe(7);
  });
});

describe('the report and the timesheets reconcile (US-330)', () => {
  it('agrees when they match', () => {
    const r = reconcileDailyReport({
      reportedCrew: 4, timesheetCrew: 4, reportedHours: 32, timesheetHours: 32,
    });
    expect(r.agrees).toBe(true);
    expect(r.message).toBe('');
  });

  it('says so when the crew count differs', () => {
    const r = reconcileDailyReport({
      reportedCrew: 5, timesheetCrew: 4, reportedHours: 32, timesheetHours: 32,
    });
    expect(r.agrees).toBe(false);
    expect(r.message).toContain('5 on the report, 4 on the timesheets');
  });

  it('says so when the hours differ, with the direction', () => {
    const r = reconcileDailyReport({
      reportedCrew: 4, timesheetCrew: 4, reportedHours: 36, timesheetHours: 32,
    });
    expect(r.hoursVariance).toBe(4);
    expect(r.message).toContain('+4h');
  });

  it('tolerates a quarter hour of rounding', () => {
    // A superintendent writing 4 against a clock that recorded 3.98 is not a
    // discrepancy worth a warning; an hour is.
    expect(reconcileDailyReport({
      reportedCrew: 1, timesheetCrew: 1, reportedHours: 4, timesheetHours: 3.98,
    }).agrees).toBe(true);
    expect(reconcileDailyReport({
      reportedCrew: 1, timesheetCrew: 1, reportedHours: 4, timesheetHours: 3,
    }).agrees).toBe(false);
  });

  it('stays quiet when nobody has clocked out yet', () => {
    // A report filed at 4pm is written before the crew clocks out. Telling the
    // superintendent "0 hours on the timesheets" every single day trains them
    // to ignore the warning on the day it is real.
    const r = reconcileDailyReport({
      reportedCrew: 4, timesheetCrew: 0, reportedHours: 32, timesheetHours: 0,
    });
    expect(r.agrees).toBe(true);
    expect(r.message).toBe('');
  });
});

describe('a photo is a record, not a string (US-330)', () => {
  it('puts the project id first in the path, which the bucket policy matches on', () => {
    // project-documents' SELECT policy matches on the first path segment
    // (US-289). A file stored anywhere else is unreadable, or readable by the
    // wrong people, the day that bucket goes private.
    const path = photoStoragePath({ projectId: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', fileName: 'x.jpg' });
    expect(path).toBe('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/daily-reports/x.jpg');
    expect(projectIdFromPhotoPath(path)).toBe('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d');
  });

  it('refuses to read a project id out of a path that has none', () => {
    expect(projectIdFromPhotoPath('daily-reports/x.jpg')).toBeNull();
    expect(projectIdFromPhotoPath('../../etc/passwd')).toBeNull();
  });

  it('writes photo_attachments rows, not just the legacy array', () => {
    const page = strip('src/pages/DailyReports.tsx');
    expect(page).toMatch(/from\('photo_attachments'\)/);
    // The array stays for a release: iOS at MIN_SUPPORTED_IOS_VERSION reads it.
    expect(page).toMatch(/photos: photoUrls\.length > 0 \? photoUrls : null/);
  });

  it('does not lose the report when the photo rows fail', () => {
    // The report is saved by then. Losing it because an index write failed is
    // the worse trade for somebody filing at the end of a shift - but it must
    // not be silent either.
    const page = strip('src/pages/DailyReports.tsx');
    expect(page).toMatch(/were not indexed/);
    expect(page).toMatch(/logger\.error\('Daily report saved but its photos were not recorded'/);
  });

  it('names the foreign key when embedding the crew member', () => {
    // There is no inferable relation between time_entries and user_profiles,
    // so a bare embed returns a SelectQueryError at runtime and the panel
    // shows no timesheet at all. The build does not catch it; a completed
    // typecheck does, which is how this was found.
    const panel = strip('src/components/daily-reports/DailyReportCrewPanel.tsx');
    expect(panel).toMatch(/user_profiles!time_entries_user_id_fkey\(/);
    expect(panel).not.toMatch(/[^!]user_profiles\(first_name/);
  });

  it('counts photos from the table, not the array', () => {
    expect(strip('src/components/project/tabs/ProjectDailyReports.tsx'))
      .toMatch(/photo_attachments\(count\)/);
  });
});

describe('the migration (US-330)', () => {
  const raw = readFileSync('supabase/migrations/20260903190000_daily_report_field_record.sql', 'utf8');
  const sql = strip('supabase/migrations/20260903190000_daily_report_field_record.sql');

  it('is additive: no drops, no tightening of an existing column', () => {
    expect(sql).not.toMatch(/DROP TABLE/);
    expect(sql).not.toMatch(/DROP COLUMN/);
    expect(sql).not.toMatch(/ALTER COLUMN[^;]*SET NOT NULL/);
  });

  it('keeps crew_count, which iOS reads', () => {
    expect(sql).not.toMatch(/DROP COLUMN crew_count/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS crew_hours/);
  });

  it('strands nothing already uploaded', () => {
    expect(sql).toMatch(/INSERT INTO public\.photo_attachments/);
    expect(sql).toMatch(/unnest\(COALESCE\(dr\.photos/);
    // Re-running must not double a photo.
    expect(sql).toMatch(/NOT EXISTS \(\s*SELECT 1 FROM public\.photo_attachments/);
  });

  it('gives every backfilled photo a company, or the policy hides it', () => {
    expect(sql).toMatch(/COALESCE\(dr\.company_id, p\.company_id\)/);
  });

  it('does not overwrite a crew row somebody corrected', () => {
    const fn = sql.slice(sql.indexOf('FUNCTION public.sync_daily_report_crew'));
    expect(fn).toMatch(/HAVING NOT EXISTS/);
  });

  it('pre-fills from every entry, not just approved ones', () => {
    // A report filed the same evening is written before anybody approves
    // anything; filtering to approved would pre-fill nothing on the day it
    // matters.
    const fn = sql.slice(sql.indexOf('FUNCTION public.sync_daily_report_crew'));
    expect(fn).not.toMatch(/approval_status = 'approved'/);
  });

  it('deprecates project_photos rather than building on it', () => {
    // Its `url` column is a permanent public URL, which is the pattern US-289
    // exists to remove.
    expect(raw).toMatch(/COMMENT ON TABLE public\.project_photos[\s\S]{0,60}DEPRECATED \(US-330\)/);
  });

  it('keeps concurrent indexes out of the transactional migration', () => {
    expect(sql).not.toMatch(/CONCURRENTLY/);
    const idx = strip('supabase/migrations/20260903200000_daily_report_photo_indexes.sql');
    expect(idx).toMatch(/CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_report_crew_unique/);
  });

  it('scopes the added policies by company, matching the rest of the app', () => {
    const policies = sql.slice(sql.indexOf('CREATE POLICY "Staff read their company photos"'));
    expect(policies).toMatch(/company_id = public\.get_user_company\(auth\.uid\(\)\)/);
  });

  it('guards each policy on the name it creates, so a re-run is safe', () => {
    const created = [...raw.matchAll(/CREATE POLICY "([^"]+)"/g)].map((m) => m[1]);
    const guarded = [...raw.matchAll(/policyname = '([^']+)'/g)].map((m) => m[1]);
    expect(created.sort()).toEqual(guarded.sort());
  });
});
