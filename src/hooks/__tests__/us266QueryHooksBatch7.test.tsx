/**
 * US-266, sixth pass: the estimate form, billing settings, client portal,
 * geofence map, document templates, fiscal periods, real-time job costing,
 * environmental permitting, submittals, RFIs, conversation participants, the
 * bond/permit/warranty dialogs, offline sync, the custom report builder,
 * filter presets, the smart import session and the reporting engine's
 * Generate button.
 *
 * Same contract as the earlier batches: a failed read throws rather than
 * rendering as an empty list or zeros, a write reads its row back and a write
 * that touched no row (or fewer than it sent) throws, and nothing comes back
 * as an invented value.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

type Res = { data?: unknown; error: unknown; count?: number | null };

const h = vi.hoisted(() => ({
  // Keyed by table, or by `table:verb` (select/insert/update/upsert/delete).
  // A queue under the same key is consumed first, one result per awaited query.
  results: {} as Record<string, Res>,
  queue: {} as Record<string, Res[]>,
  invoke: { data: null as unknown, error: null as unknown },
  rpc: { data: null as unknown, error: null as unknown },
  invoked: [] as { name: string; body: unknown }[],
  calls: [] as { table: string; op: string; arg?: unknown }[],
  realtime: [] as Array<() => void>,
  profile: { company_id: 'c1', id: 'u1', role: 'admin' } as Record<string, unknown> | null,
}));

vi.mock('@/integrations/supabase/client', () => {
  const from = (table: string) => {
    let verb = 'select';
    const res = () => {
      const k = `${table}:${verb}`;
      const q = h.queue[k] ?? h.queue[table];
      if (q && q.length) return q.shift() as Res;
      return h.results[k] ?? h.results[table] ?? { data: [], error: null };
    };
    const q: Record<string, unknown> = {};
    const chain = (op: string) => (...args: unknown[]) => {
      if (['insert', 'update', 'upsert', 'delete'].includes(op)) verb = op;
      h.calls.push({ table, op, arg: args.length > 1 ? args : args[0] });
      return q;
    };
    for (const op of [
      'select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq', 'in', 'is', 'not', 'or', 'ilike', 'like',
      'gt', 'gte', 'lt', 'lte', 'order', 'limit', 'range',
    ]) {
      q[op] = chain(op);
    }
    q.single = () => Promise.resolve(res());
    q.maybeSingle = () => Promise.resolve(res());
    q.then = (resolve: (r: Res) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(res()).then(resolve, reject);
    return q;
  };
  const channel = () => {
    const c = {
      on: (_e: string, _f: unknown, cb: () => void) => { h.realtime.push(cb); return c; },
      subscribe: () => c,
    };
    return c;
  };
  return {
    supabase: {
      from,
      functions: {
        invoke: (name: string, opts?: { body?: unknown }) => {
          h.invoked.push({ name, body: opts?.body });
          return Promise.resolve(h.invoke);
        },
      },
      rpc: () => Promise.resolve(h.rpc),
      channel,
      removeChannel: () => Promise.resolve(),
      storage: {
        from: () => ({
          upload: () => Promise.resolve({ data: {}, error: null }),
          remove: () => Promise.resolve({ data: [], error: null }),
          download: () => Promise.resolve({ data: new Blob(['x']), error: null }),
        }),
      },
    },
  };
});
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ userProfile: h.profile, user: h.profile ? { id: 'u1' } : null }),
}));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { fetchEstimateProjects, fetchEstimateForEdit, saveEstimate, estimateFormKey } from '../useEstimateForm';
import {
  fetchCompanyBillingSettings, saveCompanyBillingSettings, updateTaxRate, removeTaxRate, writeNumberSetting,
  companyBillingSettingsKey,
} from '../useCompanyBillingSettings';
import {
  fetchClientPortalProjects, fetchClientProjectDetails, toClientPortalProject, clientPortalProjectsKey,
} from '../useClientPortalProjects';
import { fetchGeofenceMap, updateGeofence, createGeofenceAt, geofenceMapKey } from '../useGeofenceMap';
import { fetchDocumentTemplates, fetchTemplateProjects, updateTemplate, deleteTemplate, documentTemplatesKey } from '../useDocumentTemplates';
import { fetchFiscalYears, createFiscalYear, setFiscalPeriodClosed, fiscalYearsKey } from '../useFiscalYears';
import {
  fetchJobCostingPickers, fetchProjectJobCosts, updateJobCost, summarizeJobCosts, useRealTimeJobCosting,
  jobCostingPickersKey, projectJobCostsKey,
} from '../useRealTimeJobCosting';
import { fetchEnvironmentalPermits, updateEnvironmentalRecord, environmentalPermitsKey } from '../useEnvironmentalPermitting';
import { fetchSubmittalsPage, nextSubmittalNumber, updateSubmittal, reviewSubmittal, submittalsKey } from '../useSubmittals';
import { fetchRFIsPage, addRFIResponse, updateRFI, rfisPageKey } from '../useRFIsPage';
import { fetchConversationParticipants, fetchConversationTeam, setParticipantUploads, removeConversationParticipant } from '../useConversationParticipants';
import { fetchProjectOptions, fetchActiveWarranties, fetchWarrantyFormOptions, saveCompanyRecord } from '../useRecordForms';
import { fetchOfflineEssentials, uploadOfflineQueue } from '../useOfflineDataSync';
import { fetchCustomReportRows, applyReportFilters, REPORT_ROW_LIMIT } from '../useCustomReportData';
import { fetchFilterPresets, deleteFilterPreset, setFilterPresetDefault } from '../useFilterPresets';
import { analyzeImportSession, fetchFieldSuggestions, updateImportSession } from '../useImportSession';
import { generateCustomReport } from '../useReportingEngine';

const boom = { data: null, error: { message: 'boom' } };
const none = { data: [], error: null };
const one = { data: [{ id: 'x' }], error: null };

const wrapperFor = (client: QueryClient) => ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);
const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

const scopedTo = (table: string, companyId = 'c1') =>
  h.calls.some((c) => c.table === table && c.op === 'eq' && JSON.stringify(c.arg) === JSON.stringify(['company_id', companyId]));

beforeEach(() => {
  h.results = {};
  h.queue = {};
  h.invoke = { data: null, error: null };
  h.rpc = { data: null, error: null };
  h.invoked = [];
  h.calls = [];
  h.realtime = [];
  h.profile = { company_id: 'c1', id: 'u1', role: 'admin' };
});

describe('reads throw instead of rendering a failed read as empty', () => {
  it('estimate form, billing settings, client portal, geofences, templates, fiscal years', async () => {
    h.results.projects = boom;
    await expect(fetchEstimateProjects('c1')).rejects.toMatchObject({ message: 'boom' });
    await expect(fetchTemplateProjects('c1')).rejects.toMatchObject({ message: 'boom' });
    await expect(fetchProjectOptions('c1')).rejects.toMatchObject({ message: 'boom' });
    h.results = {};

    h.results.estimates = { data: null, error: null };
    await expect(fetchEstimateForEdit('c1', 'e1')).rejects.toThrow(/not found/);

    h.results.tax_rates = boom;
    await expect(fetchCompanyBillingSettings('c1')).rejects.toMatchObject({ message: 'boom' });

    h.results.client_portal_access = boom;
    await expect(fetchClientPortalProjects()).rejects.toMatchObject({ message: 'boom' });

    h.results.user_profiles = { data: [{ id: 'u1', first_name: 'A', last_name: 'B' }], error: null };
    h.results.time_entries = boom;
    await expect(fetchGeofenceMap('c1')).rejects.toMatchObject({ message: 'boom' });

    h.results.documents = boom;
    await expect(fetchDocumentTemplates('c1')).rejects.toMatchObject({ message: 'boom' });

    h.results.fiscal_years = boom;
    await expect(fetchFiscalYears('c1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('job costing, environmental, submittals, RFIs, participants, pickers, presets, import suggestions', async () => {
    h.results.cost_codes = boom;
    await expect(fetchJobCostingPickers('c1')).rejects.toMatchObject({ message: 'boom' });
    h.results.job_costs = boom;
    await expect(fetchProjectJobCosts('p1')).rejects.toMatchObject({ message: 'boom' });
    h.results.environmental_permits = boom;
    await expect(fetchEnvironmentalPermits('c1')).rejects.toMatchObject({ message: 'boom' });
    h.results.submittals = boom;
    await expect(fetchSubmittalsPage('c1')).rejects.toMatchObject({ message: 'boom' });
    h.results.project_communication_participants = boom;
    await expect(fetchConversationParticipants('p1')).rejects.toMatchObject({ message: 'boom' });
    h.results.user_profiles = boom;
    await expect(fetchConversationTeam('c1')).rejects.toMatchObject({ message: 'boom' });
    h.results.vendors = boom;
    await expect(fetchWarrantyFormOptions('c1')).rejects.toMatchObject({ message: 'boom' });
    h.results.warranties = boom;
    await expect(fetchActiveWarranties('c1')).rejects.toMatchObject({ message: 'boom' });
    h.results.saved_filter_presets = boom;
    await expect(fetchFilterPresets('u1', 'c1', 'projects')).rejects.toMatchObject({ message: 'boom' });
    h.results.import_field_suggestions = boom;
    await expect(fetchFieldSuggestions('s1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('RFIs: a failed responses read throws instead of showing every RFI unanswered', async () => {
    h.results.rfis = { data: [{ id: 'r1', created_by: 'u1', subject: 'S' }], error: null };
    h.results.rfi_responses = boom;
    await expect(fetchRFIsPage('c1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('client portal details name the sections that failed and keep the ones that loaded', async () => {
    h.results.invoices = boom;
    h.results.tasks = { data: [{ id: 't1', name: 'Rough-in', status: 'in_progress', due_date: '2026-10-01', completion_percentage: 40 }], error: null };
    const d = await fetchClientProjectDetails('p1');
    expect(d.failed).toEqual(['invoices']);
    expect(d.milestones).toHaveLength(1);
    expect(d.invoices).toEqual([]);
  });

  it('offline download: any failed read throws, and the reads use real columns', async () => {
    await fetchOfflineEssentials('c1', 'u1', new Date('2026-09-24T00:00:00Z'));
    const selectOf = (t: string) => String(h.calls.find((c) => c.table === t && c.op === 'select')?.arg);
    expect(selectOf('time_entries')).toContain('start_time');
    expect(selectOf('time_entries')).not.toMatch(/\bdate\b|\bhours\b|\bnotes\b/);
    expect(selectOf('expenses')).toContain('expense_date');
    expect(selectOf('expenses')).not.toMatch(/receipt_url|\bcategory\b/);
    h.results.expenses = boom;
    await expect(fetchOfflineEssentials('c1', 'u1')).rejects.toMatchObject({ message: 'boom' });
  });
});

describe('writes read back and throw on zero or partial rows', () => {
  it('estimate: an update that matched nothing throws, and a short line insert throws', async () => {
    h.results['estimates:update'] = { data: null, error: null };
    await expect(saveEstimate({ companyId: 'c1', estimateId: 'e1', estimate: {}, lines: [] })).rejects.toThrow(/not updated/);
    expect(scopedTo('estimates')).toBe(true);

    h.results['estimates:update'] = { data: { id: 'e1', company_id: 'c1' }, error: null };
    h.results['estimate_line_items:delete'] = none;
    h.results['estimate_line_items:insert'] = one;
    const lines = [{ item_name: 'a', quantity: 1, unit: 'ea', unit_cost: 1 }, { item_name: 'b', quantity: 1, unit: 'ea', unit_cost: 1 }];
    await expect(saveEstimate({ companyId: 'c1', estimateId: 'e1', estimate: {}, lines })).rejects.toThrow(/Only 1 of 2/);
  });

  it('estimate: a failed line delete stops the save before duplicating every line', async () => {
    h.results['estimates:update'] = { data: { id: 'e1' }, error: null };
    h.results['estimate_line_items:delete'] = boom;
    await expect(saveEstimate({ companyId: 'c1', estimateId: 'e1', estimate: {}, lines: [] })).rejects.toThrow(/duplicate every line/);
    expect(h.calls.some((c) => c.table === 'estimate_line_items' && c.op === 'insert')).toBe(false);
  });

  it('billing settings, tax rates, numbering', async () => {
    h.results['company_settings:upsert'] = none;
    await expect(saveCompanyBillingSettings('c1', {} as never)).rejects.toThrow(/not saved/);
    h.results['tax_rates:update'] = none;
    await expect(updateTaxRate('c1', 't1', { rate: 5 })).rejects.toThrow(/not saved/);
    expect(scopedTo('tax_rates')).toBe(true);
    h.results['tax_rates:delete'] = none;
    await expect(removeTaxRate('c1', 't1')).rejects.toThrow(/not removed/);
    h.results['document_number_settings:update'] = { data: null, error: { message: 'rewind', code: '23514' } };
    await expect(writeNumberSetting('c1', 'invoice', true, { next_number: 1 })).rejects.toMatchObject({ code: '23514' });
  });

  it('geofences, templates, fiscal periods, job costs, environmental records', async () => {
    h.results['geofences:update'] = none;
    await expect(updateGeofence('c1', 'g1', { radius_meters: 50 })).rejects.toThrow(/No geofence was changed/);
    h.results['geofences:insert'] = none;
    await expect(createGeofenceAt('c1', { name: 'A', center_lat: 1, center_lng: 2, radius_meters: 50 })).rejects.toThrow(/not saved/);
    h.results['documents:update'] = none;
    await expect(updateTemplate('c1', 'd1', { name: 'n', description: null })).rejects.toThrow(/not updated/);
    h.results['fiscal_periods:update'] = none;
    await expect(setFiscalPeriodClosed('c1', 'fp1', true, 'u1')).rejects.toThrow(/No period was changed/);
    h.results['job_costs:update'] = none;
    await expect(updateJobCost('c1', 'j1', {} as never)).rejects.toThrow(/not updated/);
    h.results['environmental_monitoring:update'] = none;
    await expect(updateEnvironmentalRecord('c1', 'environmental_monitoring', 'm1', {})).rejects.toThrow(/Nothing was updated/);
    expect(scopedTo('environmental_monitoring')).toBe(true);
  });

  it('template delete: the row goes first, so a refused delete keeps the file', async () => {
    h.results['documents:delete'] = none;
    await expect(deleteTemplate('c1', { id: 'd1', name: 'T', description: null, file_path: 'c1/templates/a.pdf', file_type: null, file_size: null }))
      .rejects.toThrow(/not deleted/);
  });

  it('fiscal year: periods that do not all land take the year back out', async () => {
    h.results['fiscal_years:insert'] = { data: { id: 'fy1' }, error: null };
    h.results['fiscal_periods:insert'] = { data: [{ id: 'p1' }], error: null };
    h.results['fiscal_periods:delete'] = none;
    h.results['fiscal_years:delete'] = none;
    await expect(createFiscalYear('c1', { yearNumber: 2026, startDate: '2026-01-01', endDate: '2026-12-31' }))
      .rejects.toThrow(/only 1 of 12 periods were saved\)\. Nothing was saved/);
    expect(h.calls.some((c) => c.table === 'fiscal_years' && c.op === 'delete')).toBe(true);
  });

  it('submittals and RFIs', async () => {
    h.results['submittals:update'] = none;
    await expect(updateSubmittal('c1', 's1', { title: 't', description: 'd', spec_section: '', due_date: null, priority: 'low' }))
      .rejects.toThrow(/not changed/);
    h.results['submittals:update'] = one;
    h.results['submittal_reviews:insert'] = boom;
    await expect(reviewSubmittal('c1', 'u1', { id: 's1', status: 'approved', comments: '' }))
      .rejects.toThrow(/status was saved, but the review record was not/);

    h.results['rfis:update'] = none;
    await expect(updateRFI('c1', 'r1', { project_id: 'p', title: 't', description: 'd', priority: 'low', assigned_to: '', due_date: '', status: 'open' }))
      .rejects.toThrow(/not changed/);
    h.results['rfi_responses:insert'] = one;
    await expect(addRFIResponse('c1', 'u1', { rfiId: 'r1', text: 'ok', isFinal: true })).rejects.toThrow(/could not be closed/);
  });

  it('participants, record dialogs, offline queue, presets, import session', async () => {
    h.results['project_communication_participants:update'] = none;
    await expect(setParticipantUploads('p1', 'x', false)).rejects.toThrow(/Nothing changed/);
    h.results['project_communication_participants:delete'] = none;
    await expect(removeConversationParticipant('p1', 'x')).rejects.toThrow(/Nothing changed/);

    h.results['bonds:update'] = none;
    await expect(saveCompanyRecord('c1', 'bonds', 'b1', {})).rejects.toThrow(/Nothing was updated/);
    expect(scopedTo('bonds')).toBe(true);
    // warranty_claims has no company_id column; RLS scopes it through the warranty.
    h.calls = [];
    h.results['warranty_claims:update'] = one;
    await saveCompanyRecord('c1', 'warranty_claims', 'w1', { status: 'open' });
    expect(scopedTo('warranty_claims')).toBe(false);
    h.results['permits:insert'] = none;
    await expect(saveCompanyRecord('c1', 'permits', undefined, {})).rejects.toThrow(/not saved/);

    h.results['expenses:insert'] = one;
    await expect(uploadOfflineQueue('expenses', [{ a: 1 }, { a: 2 }])).rejects.toThrow(/only 1 of 2/);

    h.results['saved_filter_presets:delete'] = none;
    await expect(deleteFilterPreset('u1', 'f1')).rejects.toThrow(/Only the person who saved/);
    h.results['saved_filter_presets:update'] = none;
    await expect(setFilterPresetDefault('u1', 'f1', true)).rejects.toThrow(/Only the person who saved/);

    h.results['import_sessions:update'] = none;
    await expect(updateImportSession('c1', 's1', { status: 'completed' })).rejects.toThrow(/not updated/);
  });
});

describe('no invented values', () => {
  it('client portal project: budget and contract from real columns, spend unknown', () => {
    const p = toClientPortalProject({ id: 'p1', name: 'A', status: 'active', total_budget: 5000, budget: 10, current_contract_value: null, original_contract_value: 7000 });
    expect(p.budget_total).toBe(5000);
    expect(p.contract_value).toBe(7000);
    expect(p.actual_cost).toBeNull();
    expect(toClientPortalProject({ id: 'p2', name: 'B' }).budget_total).toBeUndefined();
  });

  it('RFIs: requester and responder names come from user_profiles; unknown is --', async () => {
    h.results.rfis = { data: [{ id: 'r1', created_by: 'u1', subject: 'S' }, { id: 'r2', created_by: 'gone', subject: 'T' }], error: null };
    h.results.rfi_responses = { data: [{ id: 'x1', rfi_id: 'r1', responded_by: 'u2', response_text: 'ok' }], error: null };
    h.results.user_profiles = { data: [{ id: 'u1', first_name: 'Ada', last_name: 'L' }, { id: 'u2', first_name: 'Sam', last_name: 'O' }], error: null };
    const { rfis } = await fetchRFIsPage('c1');
    expect(rfis[0].requester).toEqual({ first_name: 'Ada', last_name: 'L' });
    expect(rfis[0].responses[0].responder).toEqual({ first_name: 'Sam', last_name: 'O' });
    expect(rfis[1].requester.first_name).toBe('--');
    expect(JSON.stringify(rfis)).not.toContain('"User"');
  });

  it('submittal numbers continue from the company highest for the year, not the filtered list length', async () => {
    h.results.submittals = { data: [{ submittal_number: 'SUB-2026-007' }, { submittal_number: 'SUB-2026-002' }], error: null };
    expect(await nextSubmittalNumber('c1', 2026)).toBe('SUB-2026-008');
    expect(scopedTo('submittals')).toBe(true);
  });

  it('job cost summary is the sum of the rows against the budget', () => {
    const rows = [
      { total_cost: 60, labor_cost: 40, material_cost: 20, equipment_cost: 0, other_cost: 0 },
      { total_cost: 60, labor_cost: 0, material_cost: 60, equipment_cost: 0, other_cost: 0 },
    ] as never;
    expect(summarizeJobCosts(rows, 100)).toMatchObject({ totalCost: 120, laborCost: 40, materialCost: 80, budgetVariance: -20, budgetVariancePercentage: -20 });
    expect(summarizeJobCosts([], null).budgetVariancePercentage).toBe(0);
  });
});

describe('custom report builder', () => {
  it('applies the filters it offers, escapes contains, refuses unknown columns', async () => {
    await fetchCustomReportRows('c1', {
      dataSource: 'projects',
      filters: [
        { field: 'status', operator: 'equals', value: 'active' },
        { field: 'name', operator: 'contains', value: '50%_off' },
        { field: 'budget', operator: 'greater_than', value: '' },
      ],
      sortOrder: 'asc',
      dateRange: { start: '', end: '' },
    });
    expect(scopedTo('projects')).toBe(true);
    expect(h.calls).toContainEqual({ table: 'projects', op: 'eq', arg: ['status', 'active'] });
    expect(h.calls).toContainEqual({ table: 'projects', op: 'ilike', arg: ['name', '%50\\%\\_off%'] });
    expect(h.calls.some((c) => c.op === 'gt')).toBe(false);
    const q = { eq: () => q } as never;
    expect(() => applyReportFilters(q, 'projects', [{ field: 'password', operator: 'equals', value: 'x' }])).toThrow(/not a column/);
  });

  it('a failed query throws and a full page says it was capped', async () => {
    h.results.invoices = boom;
    await expect(fetchCustomReportRows('c1', { dataSource: 'invoices', filters: [], sortOrder: 'asc', dateRange: { start: '', end: '' } }))
      .rejects.toMatchObject({ message: 'boom' });
    h.results.invoices = { data: Array.from({ length: REPORT_ROW_LIMIT }, (_, i) => ({ id: i })), error: null };
    const r = await fetchCustomReportRows('c1', { dataSource: 'invoices', filters: [], sortOrder: 'asc', dateRange: { start: '', end: '' } });
    expect(r.truncated).toBe(true);
  });
});

describe('filter presets', () => {
  it('without a company asks only for the user own presets', async () => {
    await fetchFilterPresets('u1', undefined, 'projects');
    const or = h.calls.find((c) => c.table === 'saved_filter_presets' && c.op === 'or');
    expect(or?.arg).toBe('user_id.eq.u1');
  });
});

describe('import session and reporting engine', () => {
  it('the analyzer error stops the flow; the session is read back scoped to the company', async () => {
    h.invoke = { data: null, error: { message: 'analyzer down' } };
    await expect(analyzeImportSession('c1', 's1', 'a,b', 'f.csv')).rejects.toMatchObject({ message: 'analyzer down' });
    h.invoke = { data: {}, error: null };
    h.results.import_sessions = { data: null, error: null };
    await expect(analyzeImportSession('c1', 's1', 'a,b', 'f.csv')).rejects.toThrow(/could not be read back/);
    expect(scopedTo('import_sessions')).toBe(true);
  });

  it('Generate calls generate-custom-report and returns the CSV; an envelope is an error', async () => {
    h.invoke = { data: 'a,b\n1,2', error: null };
    await expect(generateCustomReport('r1')).resolves.toBe('a,b\n1,2');
    expect(h.invoked).toContainEqual({ name: 'generate-custom-report', body: { report_id: 'r1', output_format: 'csv' } });
    h.invoke = { data: { success: false, error: 'Report not found' }, error: null };
    await expect(generateCustomReport('r1')).rejects.toThrow('Report not found');
  });
});

describe('keys carry the company', () => {
  it('every new key includes company_id', () => {
    for (const key of [
      estimateFormKey('c1', 'e1'), companyBillingSettingsKey('c1'), clientPortalProjectsKey('c1', 'u1'), geofenceMapKey('c1'),
      documentTemplatesKey('c1'), fiscalYearsKey('c1'), jobCostingPickersKey('c1'), projectJobCostsKey('c1', 'p1'),
      environmentalPermitsKey('c1'), submittalsKey('c1'), rfisPageKey('c1'),
    ]) {
      expect(key).toContain('c1');
    }
  });
});

describe('real-time job costing', () => {
  it('a realtime event invalidates the job cost query instead of patching a copy', async () => {
    h.results.projects = { data: [{ id: 'p1', name: 'A', budget: 100, status: 'active' }], error: null };
    h.queue.job_costs = [{ data: [{ id: 'j1', total_cost: 10 }], error: null }, { data: [{ id: 'j1', total_cost: 10 }, { id: 'j2', total_cost: 5 }], error: null }];
    const client = newClient();
    const { result } = renderHook(() => useRealTimeJobCosting(undefined), { wrapper: wrapperFor(client) });
    // With no project picked, the newest one is shown.
    await waitFor(() => expect(result.current.costs.data).toHaveLength(1));
    expect(result.current.projectId).toBe('p1');
    expect(h.realtime.length).toBeGreaterThan(0);
    act(() => h.realtime[h.realtime.length - 1]());
    await waitFor(() => expect(result.current.costs.data).toHaveLength(2));
  });

  it('a failed job cost read is an error, not $0 spent', async () => {
    h.results.projects = { data: [{ id: 'p1', name: 'A', budget: 100, status: 'active' }], error: null };
    h.results.job_costs = boom;
    const { result } = renderHook(() => useRealTimeJobCosting('p1'), { wrapper: wrapperFor(newClient()) });
    await waitFor(() => expect(result.current.costs.error).toMatchObject({ message: 'boom' }));
    expect(result.current.costs.data).toBeUndefined();
  });
});
