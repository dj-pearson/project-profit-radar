/**
 * The mobile daily-report forms write the desktop row.
 *
 * MobileDailyReportManager (/mobile-dashboard) and MobileDailyReport (the
 * "Mobile Report" button on /daily-reports) spread their form state into the
 * daily_reports insert - crew_members, material_usage, report_date, location
 * and more - and PostgREST rejects a row with an unknown column, so neither
 * could save. The allowed list is read out of the generated types rather than
 * typed here, so a column added or dropped in the schema moves the test with it.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

type Res = { data: unknown; error: unknown };

const h = vi.hoisted(() => ({
  inserts: [] as Array<{ table: string; rows: unknown }>,
  uploads: [] as string[],
  rpcs: [] as Array<{ name: string; args: unknown }>,
}));

vi.mock('@/integrations/supabase/client', () => {
  const from = (table: string) => {
    const q: Record<string, unknown> = {};
    let result: Res = { data: [], error: null };
    q.insert = (rows: unknown) => {
      h.inserts.push({ table, rows });
      const n = Array.isArray(rows) ? rows.length : 1;
      result = { data: table === 'daily_reports' ? { id: 'report-1' } : Array.from({ length: n }, (_, i) => ({ id: `${table}-${i}` })), error: null };
      return q;
    };
    for (const op of ['select', 'eq', 'gte', 'lte', 'lt', 'order', 'limit']) q[op] = () => q;
    q.single = () => Promise.resolve(result);
    q.then = (resolve: (r: Res) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject);
    return q;
  };
  return {
    supabase: {
      from,
      rpc: (name: string, args: unknown) => {
        h.rpcs.push({ name, args });
        return Promise.resolve({ data: 0, error: null });
      },
      storage: {
        from: () => ({
          upload: (path: string) => {
            h.uploads.push(path);
            return Promise.resolve({ data: { path }, error: null });
          },
        }),
      },
      functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
    },
  };
});
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ userProfile: null, user: null }) }));

import { buildDailyReportInsert } from '@/lib/validations/daily-reports';
import { mapWizardReport, mapQuickReport, photoFileFromBase64 } from '../mobileReport';
import { saveDailyReport } from '@/hooks/useDailyReportsPage';
import type { DailyReportData } from '@/components/mobile/daily-report/types';

/**
 * Columns a table accepts: `Tables.<table>.Insert` in the generated types, plus
 * any `ALTER TABLE <table> ... ADD COLUMN` in supabase/migrations. types.ts
 * lags the migrations (photo_attachments.company_id, source and storage_bucket
 * are in 20260903190000 but not in the generated Insert), so either source
 * alone would be wrong in one direction.
 */
function insertColumns(table: string): Set<string> {
  const types = readFileSync('src/integrations/supabase/types.ts', 'utf8');
  const start = types.indexOf(`\n      ${table}: {\n        Row: {`);
  expect(start, `${table} missing from types.ts`).toBeGreaterThan(-1);
  const insert = types.indexOf('Insert: {', start);
  const end = types.indexOf('}', insert);
  const cols = new Set([...types.slice(insert, end).matchAll(/^\s+(\w+)\??:/gm)].map((m) => m[1]));
  expect(cols.size).toBeGreaterThan(3);

  const alter = new RegExp(`ALTER TABLE (?:IF EXISTS )?(?:public\\.)?${table}\\b([^;]*);`, 'gi');
  for (const file of readdirSync('supabase/migrations').filter((f) => f.endsWith('.sql'))) {
    // Comments out first: one of them has a semicolon mid-statement.
    const sql = readFileSync(`supabase/migrations/${file}`, 'utf8').replace(/--[^\n]*/g, '');
    for (const stmt of sql.matchAll(alter)) {
      for (const col of stmt[1].matchAll(/ADD COLUMN (?:IF NOT EXISTS )?(\w+)/gi)) cols.add(col[1]);
    }
  }
  return cols;
}

const DAILY_REPORT_COLUMNS = insertColumns('daily_reports');

function expectOnlyColumns(table: string, rows: unknown) {
  const allowed = table === 'daily_reports' ? DAILY_REPORT_COLUMNS : insertColumns(table);
  for (const row of Array.isArray(rows) ? rows : [rows]) {
    const extra = Object.keys(row as object).filter((k) => !allowed.has(k));
    expect(extra, `${table} insert has non-columns`).toEqual([]);
  }
}

const PROJECT = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
const NOW = new Date('2026-09-24T15:00:00Z');
// 1x1 transparent PNG, small enough to inline.
const PIXEL = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/58BAAQAAf8Ai1gAAAAASUVORK5CYII=';

const wizard: DailyReportData = {
  report_date: '2026-09-24',
  project_id: PROJECT,
  weather_conditions: 'clear',
  temperature: '72',
  work_performed: 'Framed the second floor',
  crew_members: [
    { name: 'Ana Ruiz', role: 'Carpenter', hours_worked: 8, overtime_hours: 2 },
    { name: 'Ben Oduya', role: 'Laborer', hours_worked: 8, overtime_hours: 0 },
  ],
  task_progress: [
    { task_name: 'Wall framing', planned_completion: 60, actual_completion: 50, status: 'behind' },
  ],
  material_usage: [{ material_name: 'studs', quantity_used: 120, unit: 'ea', waste_percentage: 5 }],
  equipment_usage: [{ equipment_name: 'Telehandler', hours_used: 6, condition: 'down' }],
  safety_observations: 'Guardrail missing on east stair',
  quality_issues: '',
  delays_challenges: 'Lumber arrived at 10am',
  photos: [PIXEL],
  next_day_plan: 'Sheathing',
  client_visitors: '',
  deliveries_received: '20 bags concrete',
  total_crew_hours: 18,
  work_completion_percentage: 42,
};

describe('the mobile wizard row (MobileDailyReportManager)', () => {
  const mapped = mapWizardReport(wizard, { userId: 'user-1', gps: { latitude: 45.5, longitude: -122.6, accuracy: 8 }, now: NOW });
  const row = buildDailyReportInsert(mapped.values, { date: mapped.date, photoPaths: [], columns: mapped.columns });

  it('names only daily_reports columns', () => {
    expectOnlyColumns('daily_reports', row);
    for (const gone of ['crew_members', 'material_usage', 'equipment_usage', 'task_progress', 'report_date', 'company_id', 'created_by']) {
      expect(row).not.toHaveProperty(gone);
    }
  });

  it('keeps what the form collected in the columns iOS reads', () => {
    expect(row).toMatchObject({
      project_id: PROJECT,
      date: '2026-09-24',
      crew_count: 2,
      temperature: 72,
      completion_percentage: 42,
      materials_delivered: '120 ea studs\n20 bags concrete',
      equipment_used: 'Telehandler 6h',
      delays_issues: 'Lumber arrived at 10am',
      safety_incidents: 'Guardrail missing on east stair',
      next_day_plan: 'Sheathing',
      quality_issues: null,
      gps_latitude: 45.5,
      submitted_by: 'user-1',
      photos: null,
      signature: null,
    });
    expect(row.work_performed).toContain('Wall framing: 50%');
  });

  it('maps statuses and conditions onto the item tables CHECK values', () => {
    expect(mapped.tasks[0]).toMatchObject({ status: 'in_progress', completion_percentage: 50 });
    expect(mapped.equipment[0]).toMatchObject({ condition: 'needs_repair', notes: 'Down', hours_used: 6 });
  });
});

describe('the quick form row (MobileDailyReport)', () => {
  it('names only daily_reports columns', () => {
    const mapped = mapQuickReport({
      project_id: PROJECT,
      weather_conditions: 'Rain',
      work_performed: 'Poured footings',
      issues_encountered: 'Pump late',
      safety_notes: 'None',
      crew_count: 5,
      visitor_count: 2,
    }, { userId: 'user-1', gps: { latitude: 1, longitude: 2, accuracy: 3 }, now: NOW });
    const row = buildDailyReportInsert(mapped.values, { date: mapped.date, photoPaths: [], columns: mapped.columns });
    expectOnlyColumns('daily_reports', row);
    expect(row).toMatchObject({
      date: '2026-09-24', crew_count: 5, delays_issues: 'Pump late', safety_incidents: 'None',
      client_visitors: '2 visitor(s)', gps_accuracy: 3,
    });
  });
});

describe('saveDailyReport writes the report, its items and its photos', () => {
  beforeEach(() => {
    h.inserts.length = 0;
    h.uploads.length = 0;
    h.rpcs.length = 0;
  });

  it('writes every record the desktop path writes, plus the wizard crew and tasks', async () => {
    const mapped = mapWizardReport(wizard, { userId: 'user-1', now: NOW });
    const saved = await saveDailyReport(
      { ...mapped, photos: wizard.photos.map((b64, i) => photoFileFromBase64(b64, i, 'image/png')) },
      { companyId: 'company-1', userId: 'user-1' },
    );

    expect(saved).toMatchObject({ id: 'report-1', photoCount: 1 });
    for (const { table, rows } of h.inserts) expectOnlyColumns(table, rows);

    const byTable = Object.fromEntries(h.inserts.map((i) => [i.table, i.rows]));
    expect(Object.keys(byTable).sort()).toEqual([
      'daily_report_crew_items',
      'daily_report_equipment_items',
      'daily_report_material_items',
      'daily_report_task_items',
      'daily_reports',
      'photo_attachments',
    ]);

    // The photo went to storage under the project and is in both places:
    // the legacy array iOS reads and a photo_attachments row.
    expect(h.uploads).toHaveLength(1);
    expect(h.uploads[0].startsWith(`${PROJECT}/daily-reports/`)).toBe(true);
    expect((byTable.daily_reports as { photos: string[] }).photos).toEqual(h.uploads);
    expect(byTable.photo_attachments).toEqual([
      expect.objectContaining({
        daily_report_id: 'report-1', project_id: PROJECT, company_id: 'company-1', user_id: 'user-1',
        file_path: h.uploads[0], source: 'daily_report', storage_bucket: 'project-documents',
      }),
    ]);

    expect(byTable.daily_report_material_items).toEqual([
      { material_name: 'studs', quantity: 120, unit: 'ea', waste_percentage: 5, daily_report_id: 'report-1' },
      { material_name: 'concrete', quantity: 20, unit: 'bags', daily_report_id: 'report-1' },
    ]);
    expect(byTable.daily_report_crew_items).toHaveLength(2);
    expect(byTable.daily_report_task_items).toHaveLength(1);

    // And the crew pull from timesheets, same as the desktop form.
    expect(h.rpcs).toEqual([{ name: 'sync_daily_report_crew', args: { p_daily_report_id: 'report-1' } }]);
  });
});

describe('the mobile components', () => {
  it.each([
    'src/components/mobile/MobileDailyReportManager.tsx',
    'src/components/mobile/MobileDailyReport.tsx',
  ])('%s saves through the shared path, not a raw insert', (file) => {
    const src = readFileSync(file, 'utf8');
    expect(src).not.toMatch(/from\('daily_reports'\)/);
    expect(src).toMatch(/useSaveDailyReport\(\)/);
    // Offline, the queued row is the builder's row too.
    expect(src).toMatch(/saveOfflineData\('daily_report', buildDailyReportInsert\(/);
  });
});
