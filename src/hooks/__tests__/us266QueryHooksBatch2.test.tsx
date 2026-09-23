/**
 * US-266, second pass: the project tabs, the daily-report crew panel, the
 * schedule assignee widget, the estimates table, closeout and project
 * financials (the last has its own render test in ProjectFinancialDashboard.test).
 *
 * Same contract as us266QueryHooks.test.tsx: a failed read is thrown (each of
 * these rendered a failed read as an empty state, and two of those empty
 * states offered to create a duplicate), a write RLS filtered to zero rows
 * fails, keys carry company_id, optimistic edits roll back.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { readFileSync } from 'node:fs';

type Res = { data: unknown; error: unknown };

const h = vi.hoisted(() => ({
  // Keyed by table, or by `table:verb` (select/insert/update/delete) when one
  // table is read and written in the same call.
  results: {} as Record<string, Res>,
  rpc: {} as Record<string, Res>,
  signed: { data: [] as unknown, error: null as unknown },
  invoke: { data: null as unknown, error: null as unknown },
  calls: [] as { table: string; op: string; arg?: unknown }[],
  profile: { company_id: 'c1', id: 'u1', role: 'admin' } as Record<string, unknown> | null,
}));

vi.mock('@/integrations/supabase/client', () => {
  const from = (table: string) => {
    let verb = 'select';
    const res = () => h.results[`${table}:${verb}`] ?? h.results[table] ?? { data: [], error: null };
    const q: Record<string, unknown> = {};
    const chain = (op: string) => (...args: unknown[]) => {
      if (['insert', 'update', 'delete'].includes(op)) verb = op;
      h.calls.push({ table, op, arg: args.length > 1 ? args : args[0] });
      return q;
    };
    for (const op of ['select', 'insert', 'update', 'delete', 'eq', 'in', 'gte', 'lte', 'order', 'limit']) {
      q[op] = chain(op);
    }
    q.single = () => Promise.resolve(res());
    q.maybeSingle = () => Promise.resolve(res());
    q.then = (resolve: (r: Res) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(res()).then(resolve, reject);
    return q;
  };
  return {
    supabase: {
      from,
      rpc: (name: string) => Promise.resolve(h.rpc[name] ?? { data: 0, error: null }),
      storage: { from: () => ({ createSignedUrls: () => Promise.resolve(h.signed) }) },
      functions: { invoke: () => Promise.resolve(h.invoke) },
    },
  };
});
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ userProfile: h.profile, user: h.profile ? { id: 'u1' } : null }),
}));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import { fetchProjectMaterials, deleteMaterialUsage, projectMaterialsKey } from '../useProjectMaterials';
import { fetchProjectCostCodes, insertProjectCostCodes, projectCostCodesKey } from '../useProjectCostCodes';
import { fetchProjectPermits, updateProjectPermit, deleteProjectPermit } from '../useProjectPermits';
import { fetchProjectPunchList, deletePunchListItem, projectPunchListKey, punchListKey } from '../usePunchListPage';
import { fetchProjectContacts, fetchRecentProjectDailyReports, fetchProjectEstimates, projectTabListKey } from '../useProjectTabLists';
import { fetchProjectPhotos } from '../useProjectPhotos';
import { fetchDailyReportCrew, updateCrewHours, useDailyReportCrew, dailyReportCrewKey } from '../useDailyReportCrew';
import { fetchScheduleTaskAssignees, fetchScheduleCrewOptions, assignCrewToTask, unassignCrewFromTask } from '../useScheduleTaskAssignees';
import { fetchEstimatesTable, deleteEstimate, duplicateEstimate, estimatesTableKey } from '../useEstimatesTable';
import {
  fetchProjectCloseout, updateCloseoutItemStatus, sendHandoverNotice, seedProjectCloseout, useProjectCloseout,
} from '../useProjectCloseout';

const boom = { data: null, error: { message: 'boom' } };
const none = { data: [], error: null };

const wrapperFor = (client: QueryClient) => ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);
const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

beforeEach(() => {
  h.results = {};
  h.rpc = {};
  h.signed = { data: [], error: null };
  h.invoke = { data: null, error: null };
  h.calls = [];
  h.profile = { company_id: 'c1', id: 'u1', role: 'admin' };
});

describe('reads throw instead of rendering a failed read as empty', () => {
  it('materials: a failed usage read fails the tab, and the join is exposed as `material`', async () => {
    h.results.materials = { data: [{ id: 'm1' }], error: null };
    h.results.material_usage = { data: [{ id: 'u1', materials: { name: 'Rebar' } }], error: null };
    const out = await fetchProjectMaterials<unknown, { material: { name: string } }>('c1', 'p1');
    expect(out.usage[0].material.name).toBe('Rebar');
    expect(h.calls).toContainEqual({ table: 'materials', op: 'eq', arg: ['company_id', 'c1'] });
    h.results.material_usage = boom;
    await expect(fetchProjectMaterials('c1', 'p1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('cost codes, permits and the project punch list', async () => {
    h.results.project_cost_codes = boom;
    await expect(fetchProjectCostCodes('p1')).rejects.toMatchObject({ message: 'boom' });
    h.results.environmental_permits = boom;
    await expect(fetchProjectPermits('p1')).rejects.toMatchObject({ message: 'boom' });
    h.results.punch_list_items = boom;
    await expect(fetchProjectPunchList('p1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('contacts, recent daily reports and estimates', async () => {
    h.results.project_contacts = boom;
    await expect(fetchProjectContacts('p1')).rejects.toMatchObject({ message: 'boom' });
    h.results.daily_reports = { data: [{ id: 'd1', photo_attachments: [{ count: 3 }] }, { id: 'd2' }], error: null };
    const reports = await fetchRecentProjectDailyReports<{ id: string }>('p1');
    expect(reports.map((r) => r.photo_count)).toEqual([3, 0]);
    h.results.daily_reports = boom;
    await expect(fetchRecentProjectDailyReports('p1')).rejects.toMatchObject({ message: 'boom' });
    await fetchProjectEstimates('p1', 'c1');
    expect(h.calls).toContainEqual({ table: 'estimates', op: 'eq', arg: ['company_id', 'c1'] });
  });

  it('photos: a failed list read throws; a failed signing batch does not', async () => {
    h.results.photo_attachments = boom;
    await expect(fetchProjectPhotos('p1')).rejects.toMatchObject({ message: 'boom' });
    h.results.photo_attachments = {
      data: [{ id: 'ph1', file_path: 'p1/a.jpg', storage_bucket: 'project-documents' }],
      error: null,
    };
    h.signed = { data: null, error: { message: 'no sign' } };
    await expect(fetchProjectPhotos('p1')).resolves.toMatchObject({ photos: [{ id: 'ph1' }], urls: {} });
    h.signed = { data: [{ signedUrl: 'https://signed/a' }], error: null };
    await expect(fetchProjectPhotos('p1')).resolves.toMatchObject({ urls: { ph1: 'https://signed/a' } });
  });

  it('crew: a failed timesheet read throws, a failed name lookup only costs the names', async () => {
    h.results.daily_report_crew_items = none;
    h.results.time_entries = boom;
    await expect(fetchDailyReportCrew('r1', 'p1', '2026-09-23')).rejects.toMatchObject({ message: 'boom' });
    h.results.time_entries = { data: [{ user_id: 'w1', total_hours: 8 }], error: null };
    h.results.user_profiles = boom;
    const crew = await fetchDailyReportCrew('r1', 'p1', '2026-09-23');
    expect(crew.timesheet).toEqual([
      { user_id: 'w1', total_hours: 8, first_name: undefined, last_name: undefined, role: undefined },
    ]);
  });

  it('schedule assignees and crew options', async () => {
    h.results.schedule_task_assignees = boom;
    await expect(fetchScheduleTaskAssignees('t1')).rejects.toMatchObject({ message: 'boom' });
    h.results.user_profiles = boom;
    await expect(fetchScheduleCrewOptions('c1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('estimates table applies the status filter and throws on error', async () => {
    await fetchEstimatesTable('draft');
    expect(h.calls).toContainEqual({ table: 'estimates', op: 'eq', arg: ['status', 'draft'] });
    h.calls = [];
    await fetchEstimatesTable('all');
    expect(h.calls.some((c) => c.op === 'eq')).toBe(false);
    h.results.estimates = boom;
    await expect(fetchEstimatesTable('all')).rejects.toMatchObject({ message: 'boom' });
  });

  it('closeout fails when either the checklist or the summary cannot be read', async () => {
    h.results.project_closeout_items = none;
    h.results.project_closeout_status = boom;
    await expect(fetchProjectCloseout('p1')).rejects.toMatchObject({ message: 'boom' });
    h.results.project_closeout_status = { data: null, error: null };
    h.results.project_closeout_items = boom;
    await expect(fetchProjectCloseout('p1')).rejects.toMatchObject({ message: 'boom' });
  });
});

describe('writes that RLS filtered to zero rows fail', () => {
  it('single-row updates and deletes', async () => {
    h.results.material_usage = none;
    await expect(deleteMaterialUsage('u1')).rejects.toThrow(/not deleted/);
    h.results.environmental_permits = none;
    await expect(updateProjectPermit('e1', { status: 'approved' })).rejects.toThrow(/not updated/);
    await expect(deleteProjectPermit('e1')).rejects.toThrow(/not deleted/);
    h.results.punch_list_items = none;
    await expect(deletePunchListItem('i1')).rejects.toThrow(/not deleted/);
    h.results.daily_report_crew_items = none;
    await expect(updateCrewHours('c1', 'hours_worked', 8)).rejects.toThrow(/not saved/);
    h.results.schedule_task_assignees = none;
    await expect(assignCrewToTask({
      scheduleTaskId: 't1', projectId: 'p1', companyId: 'c1', crewMemberId: 'w1', createdBy: 'u1',
    })).rejects.toThrow(/not saved/);
    await expect(unassignCrewFromTask('a1')).rejects.toThrow(/not removed/);
    h.results.estimates = none;
    await expect(deleteEstimate('e1')).rejects.toThrow(/not deleted/);
    h.results.project_closeout_items = none;
    await expect(updateCloseoutItemStatus('ci1', 'completed')).rejects.toThrow(/not updated/);
  });

  it('a cost code import that RLS trimmed says how many landed', async () => {
    h.results.project_cost_codes = { data: [{ id: 'x' }], error: null };
    const row = { project_id: 'p1', company_id: 'c1', code: '01', description: 'Site', category: 'General' };
    await expect(insertProjectCostCodes([row, { ...row, code: '02' }])).rejects.toThrow(/Only 1 of 2/);
    await expect(insertProjectCostCodes([row])).resolves.toBe(1);
  });

  it('a handover whose timestamp did not save is reported as unstamped', async () => {
    h.results['projects:select'] = { data: { name: 'Job', client_name: 'Ann', client_email: 'a@b.co' }, error: null };
    h.results['projects:update'] = none;
    await expect(sendHandoverNotice('p1')).resolves.toEqual({ to: 'a@b.co', stamped: false });
    h.results['projects:update'] = { data: [{ id: 'p1' }], error: null };
    await expect(sendHandoverNotice('p1')).resolves.toEqual({ to: 'a@b.co', stamped: true });
    h.invoke = { data: null, error: { message: 'smtp down' } };
    await expect(sendHandoverNotice('p1')).rejects.toThrow(/smtp down/);
  });

  it('a duplicated estimate keeps the customer link, not just the name (US-326)', async () => {
    h.results.estimates = { data: { id: 'e2' }, error: null };
    await duplicateEstimate({
      companyId: 'c1',
      source: { title: 'Deck', client_name: 'Ann', client_id: 'cust-1', total_amount: 10 },
    });
    const insert = h.calls.find((c) => c.table === 'estimates' && c.op === 'insert');
    expect(insert?.arg).toMatchObject({ company_id: 'c1', client_id: 'cust-1', client_name: 'Ann', title: 'Deck (Copy)' });
  });

  it('the closeout seed surfaces the RPC error', async () => {
    h.rpc.seed_project_closeout = boom;
    await expect(seedProjectCloseout('p1')).rejects.toMatchObject({ message: 'boom' });
  });
});

describe('keys and optimistic edits', () => {
  it('keys carry company_id', () => {
    expect(projectMaterialsKey('c1', 'p1')).toEqual(['materials', 'c1', 'project-usage', 'p1']);
    expect(projectCostCodesKey('c1', 'p1')).toEqual(['project-cost-codes', 'c1', 'p1']);
    expect(projectTabListKey('estimates', 'c1', 'p1')).toEqual(['estimates', 'c1', 'project-tab', 'p1']);
    expect(dailyReportCrewKey('c1', 'r1', 'p1', '2026-09-23')[1]).toBe('c1');
    expect(estimatesTableKey('c1', 'all')).toEqual(['estimates', 'c1', 'table', 'all']);
    // The project tab shares /punch-list's prefix, so a write on either refreshes both.
    expect(projectPunchListKey('c1', 'p1').slice(0, 2)).toEqual(punchListKey('c1'));
  });

  it('a crew hours edit that fails rolls back', async () => {
    const client = newClient();
    h.results.daily_report_crew_items = {
      data: [{ id: 'ci1', user_id: 'w1', crew_member_name: 'Sam', role: null, hours_worked: 8, overtime_hours: 0 }],
      error: null,
    };
    h.results.time_entries = none;
    const { result } = renderHook(() => useDailyReportCrew('r1', 'p1', '2026-09-23'), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    h.results['daily_report_crew_items:update'] = none;
    await act(async () => {
      await expect(result.current.setHours('ci1', 'hours_worked', 10)).rejects.toThrow(/not saved/);
    });
    expect(result.current.items[0].hours_worked).toBe(8);
  });

  it('closeout surfaces its read error instead of an empty checklist', async () => {
    const client = newClient();
    h.results.project_closeout_items = boom;
    const { result } = renderHook(() => useProjectCloseout('p1'), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.error).toMatchObject({ message: 'boom' }));
    expect(result.current.items).toEqual([]);
  });
});

describe('the converted components no longer call supabase.from() themselves', () => {
  it.each([
    'src/components/project/tabs/ProjectMaterials.tsx',
    'src/components/project/tabs/ProjectCostCodes.tsx',
    'src/components/project/tabs/ProjectPermits.tsx',
    'src/components/project/tabs/ProjectPunchList.tsx',
    'src/components/project/tabs/ProjectContacts.tsx',
    'src/components/project/tabs/ProjectDailyReports.tsx',
    'src/components/project/tabs/ProjectEstimates.tsx',
    'src/components/project/tabs/ProjectPhotos.tsx',
    'src/components/daily-reports/DailyReportCrewPanel.tsx',
    'src/components/schedule/ScheduleTaskAssignees.tsx',
    'src/components/estimates/EstimatesTable.tsx',
    'src/components/project/ProjectCloseoutTab.tsx',
    'src/components/financial/ProjectFinancialDashboard.tsx',
  ])('%s', (path) => {
    expect(readFileSync(path, 'utf8')).not.toMatch(/\bsupabase\s*\.\s*from\s*\(/);
  });
});
