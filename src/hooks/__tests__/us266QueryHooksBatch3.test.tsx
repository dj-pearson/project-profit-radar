/**
 * US-266, third pass: documents, the three billing tabs, change orders, the
 * CRM pages, time tracking, the equipment assignment form and pipeline stages.
 *
 * Same contract as the first two batches: a failed read is thrown (several of
 * these rendered a failed read as an empty state, and four filled a picker
 * with invented rows), a write RLS filtered to zero rows fails, keys carry
 * company_id, optimistic edits roll back.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

type Res = { data: unknown; error: unknown };

const h = vi.hoisted(() => ({
  // Keyed by table, or by `table:verb` (select/insert/update/delete) when one
  // table is read and written in the same call. A queue under the same key is
  // consumed first, one result per awaited query.
  results: {} as Record<string, Res>,
  queue: {} as Record<string, Res[]>,
  rpc: {} as Record<string, Res>,
  invoke: { data: null as unknown, error: null as unknown },
  calls: [] as { table: string; op: string; arg?: unknown }[],
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
      if (['insert', 'update', 'delete'].includes(op)) verb = op;
      h.calls.push({ table, op, arg: args.length > 1 ? args : args[0] });
      return q;
    };
    for (const op of ['select', 'insert', 'update', 'delete', 'eq', 'in', 'is', 'gt', 'gte', 'lt', 'lte', 'order', 'limit']) {
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
      functions: { invoke: () => Promise.resolve(h.invoke) },
    },
  };
});
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ userProfile: h.profile, user: h.profile ? { id: 'u1' } : null }),
}));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import {
  fetchManagedDocuments, deleteDocumentRecords, tagDocuments, managedDocumentsKey, useDocumentManagement,
} from '../useDocumentManagement';
import { insertInvoiceWithLines } from '../invoiceWithLines';
import { fetchUnbilledWork, createTimeAndMaterialsInvoice, unbilledWorkKey } from '../useTimeAndMaterialsBilling';
import { fetchProjectSov, seedProjectSov, projectSovKey } from '../useProgressBilling';
import { fetchRetainage, retainageKey } from '../useRetainageRelease';
import { fetchChangeOrderManagement, updateChangeOrder, changeOrderManagementKey } from '../useChangeOrderManagement';
import { fetchChangeOrdersPage, recordChangeOrderApproval } from '../useChangeOrdersPage';
import { fetchCRMContacts, tagCRMContacts, deleteCRMContacts, useCRMContacts } from '../useCRMContacts';
import { fetchCRMLeads, fetchCRMDashboard, updateLead, summariseCRM, crmLeadsPageKey } from '../useCRMPipeline';
import { fetchTimeReportData, timeReportsKey } from '../useTimeReports';
import { fetchMyProjects, insertMyTimeEntry, myTimeEntriesKey } from '../useMyTimeTracking';
import { fetchAssignmentFormOptions, saveEquipmentAssignment } from '../useEquipmentAssignmentForm';
import { reorderPipelineStages, deletePipelineStage, usePipelineStages, pipelineStagesKey } from '../usePipelineStages';
import { fetchTrackerOptions, fetchTrackerProjectData, updateTimeEntry } from '../useMobileTimeTracker';

const boom = { data: null, error: { message: 'boom' } };
const none = { data: [], error: null };
const one = { data: [{ id: 'x' }], error: null };

const wrapperFor = (client: QueryClient) => ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);
const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

beforeEach(() => {
  h.results = {};
  h.queue = {};
  h.rpc = {};
  h.invoke = { data: null, error: null };
  h.calls = [];
  h.profile = { company_id: 'c1', id: 'u1', role: 'admin' };
});

describe('reads throw instead of rendering a failed read as empty', () => {
  it('documents: company scoped, project or company-level, failure throws', async () => {
    await fetchManagedDocuments('c1', 'p1');
    expect(h.calls).toContainEqual({ table: 'documents', op: 'eq', arg: ['company_id', 'c1'] });
    expect(h.calls).toContainEqual({ table: 'documents', op: 'eq', arg: ['project_id', 'p1'] });
    h.calls = [];
    await fetchManagedDocuments('c1');
    expect(h.calls).toContainEqual({ table: 'documents', op: 'is', arg: ['project_id', null] });
    h.results.documents = boom;
    await expect(fetchManagedDocuments('c1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('billing: unbilled work, the SOV and retainage (including its contacts) throw', async () => {
    h.results.project_unbilled_work = boom;
    await expect(fetchUnbilledWork('p1')).rejects.toMatchObject({ message: 'boom' });
    h.results.project_sov_status = boom;
    await expect(fetchProjectSov('p1')).rejects.toMatchObject({ message: 'boom' });
    h.results.project_retainage = { data: [{ project_id: 'p1' }], error: null };
    h.results.projects = boom;
    await expect(fetchRetainage('c1')).rejects.toMatchObject({ message: 'boom' });
    h.results.projects = { data: [{ id: 'p1', client_name: 'Acme' }], error: null };
    await expect(fetchRetainage('c1')).resolves.toMatchObject({ contacts: { p1: { client_name: 'Acme' } } });
  });

  it('seeding the SOV surfaces an RPC error instead of reporting 0 lines', async () => {
    h.rpc.seed_project_sov = boom;
    await expect(seedProjectSov('p1')).rejects.toMatchObject({ message: 'boom' });
    h.rpc.seed_project_sov = { data: 4, error: null };
    await expect(seedProjectSov('p1')).resolves.toBe(4);
  });

  it('change orders: the workflow tab and the page (edge function list) throw', async () => {
    h.results.projects = boom;
    await expect(fetchChangeOrderManagement('c1')).rejects.toMatchObject({ message: 'boom' });
    h.results.projects = none;
    h.invoke = { data: null, error: { message: 'fn down' } };
    await expect(fetchChangeOrdersPage('c1')).rejects.toMatchObject({ message: 'fn down' });
    h.invoke = { data: { changeOrders: [{ id: 'co1' }] }, error: null };
    await expect(fetchChangeOrdersPage('c1')).resolves.toMatchObject({ changeOrders: [{ id: 'co1' }] });
  });

  it('CRM: contacts and leads are company scoped; the dashboard throws on either read', async () => {
    await fetchCRMContacts('c1');
    expect(h.calls).toContainEqual({ table: 'contacts', op: 'eq', arg: ['company_id', 'c1'] });
    await fetchCRMLeads('c1');
    expect(h.calls).toContainEqual({ table: 'leads', op: 'eq', arg: ['company_id', 'c1'] });
    h.results.opportunities = boom;
    await expect(fetchCRMDashboard('c1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('time reports: a failed entry read throws, a failed name lookup only costs the names', async () => {
    h.results.projects = { data: [{ id: 'p1', name: 'Job' }], error: null };
    h.results.time_entries = { data: [{ id: 't1', user_id: 'u9' }], error: null };
    h.results.user_profiles = boom;
    await expect(fetchTimeReportData('c1')).resolves.toMatchObject({ entries: [{ id: 't1' }], employees: [] });
    h.results.time_entries = boom;
    await expect(fetchTimeReportData('c1')).rejects.toMatchObject({ message: 'boom' });
    h.results.projects = boom;
    await expect(fetchMyProjects('u1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('equipment and the mobile tracker no longer invent rows when the company has none', async () => {
    await expect(fetchAssignmentFormOptions('c1')).resolves.toEqual({ projects: [], equipment: [] });
    h.results.equipment = boom;
    await expect(fetchAssignmentFormOptions('c1')).rejects.toMatchObject({ message: 'boom' });

    await expect(fetchTrackerOptions('c1')).resolves.toEqual({ projects: [], costCodes: [] });
    h.results.cost_codes = boom;
    await expect(fetchTrackerOptions('c1')).rejects.toMatchObject({ message: 'boom' });

    h.results.user_profiles = boom;
    await expect(fetchTrackerProjectData('c1', 'p1')).rejects.toMatchObject({ message: 'boom' });
  });
});

describe('writes RLS filtered to zero rows fail', () => {
  it('documents: delete and tag count what came back', async () => {
    h.results['documents:delete'] = { data: [{ id: 'd1' }], error: null };
    await expect(deleteDocumentRecords(['d1', 'd2'])).rejects.toThrow('Only 1 of 2 documents were deleted');
    h.queue['documents:update'] = [one, none];
    await expect(tagDocuments([{ id: 'd1', tags: ['a'] }, { id: 'd2' }], 'b')).rejects.toThrow(
      'Only 1 of 2 documents were tagged',
    );
    expect(h.calls).toContainEqual({ table: 'documents', op: 'update', arg: { tags: ['a', 'b'] } });
  });

  it('CRM: contacts tag/delete, lead update', async () => {
    h.queue['contacts:update'] = [none];
    await expect(tagCRMContacts([{ id: 'k1' }], 'vip')).rejects.toThrow('No contacts were tagged');
    h.results['contacts:delete'] = none;
    await expect(deleteCRMContacts(['k1'])).rejects.toThrow('No contacts were deleted');
    h.results['leads:update'] = none;
    await expect(updateLead('l1', { status: 'won' })).rejects.toThrow('The lead was not changed');
  });

  it('change orders: a status update, and an approval whose signature did not save', async () => {
    h.results['change_orders:update'] = none;
    await expect(updateChangeOrder('co1', { status: 'approved' })).rejects.toThrow('was not changed');
    await expect(
      recordChangeOrderApproval('c1', { orderId: 'co1', approvalType: 'client', approved: true, signature: 'sig' }),
    ).rejects.toThrow('the signature could not be saved (no row was updated)');
    expect(h.calls).toContainEqual({ table: 'change_orders', op: 'eq', arg: ['company_id', 'c1'] });
    // A rejection writes no signature, so there is nothing to miss.
    await expect(
      recordChangeOrderApproval('c1', { orderId: 'co1', approvalType: 'client', approved: false, rejectionReason: 'no' }),
    ).resolves.toBeUndefined();
  });

  it('time entries, equipment assignments and pipeline stages', async () => {
    h.results['time_entries:insert'] = none;
    await expect(insertMyTimeEntry({ user_id: 'u1', start_time: 'now' } as never)).rejects.toThrow('was not saved');
    h.results['time_entries:update'] = none;
    await expect(updateTimeEntry('t1', { end_time: 'now' })).rejects.toThrow('was not updated');
    h.results['equipment_assignments:update'] = none;
    await expect(saveEquipmentAssignment('a1', { company_id: 'c1' } as never)).rejects.toThrow('was not saved');
    h.results['pipeline_stages:delete'] = none;
    await expect(deletePipelineStage('s1')).rejects.toThrow('was not deleted');
    h.queue['pipeline_stages:update'] = [one, none];
    await expect(
      reorderPipelineStages([{ id: 's1', stage_order: 1 }, { id: 's2', stage_order: 2 }]),
    ).rejects.toThrow('Failed to update some stages');
  });
});

describe('invoice header and lines are written together or not at all', () => {
  it('rolls the header back when the lines fail, and says so when that fails too', async () => {
    h.results['invoices:insert'] = { data: { id: 'i1', invoice_number: 'INV-1' }, error: null };
    h.results['invoice_line_items:insert'] = { data: null, error: { message: 'bad line' } };
    await expect(insertInvoiceWithLines({ invoice_type: 'progress' }, () => [{}])).rejects.toThrow(
      'Could not write the invoice lines: bad line',
    );
    expect(h.calls).toContainEqual({ table: 'invoices', op: 'delete', arg: undefined });

    h.results['invoices:delete'] = { data: null, error: { message: 'locked' } };
    await expect(insertInvoiceWithLines({}, () => [{}])).rejects.toThrow(
      'Invoice INV-1 was created without its lines and could not be removed. Void it manually. (locked)',
    );
  });

  it('T&M: reports sources that were not stamped billed, since they would bill again', async () => {
    h.results['invoices:insert'] = { data: { id: 'i1', invoice_number: 'INV-2' }, error: null };
    h.results['invoice_line_items:insert'] = one;
    h.results['time_entries:update'] = { data: [{ id: 't1' }], error: null };
    const billable = [
      { source_type: 'time', source_id: 't1', description: 'd', work_date: '2026-09-01', quantity: 1, unit_price: 10, cost_code_id: null, lineTotal: 10 },
      { source_type: 'time', source_id: 't2', description: 'd', work_date: '2026-09-01', quantity: 1, unit_price: 10, cost_code_id: null, lineTotal: 10 },
    ];
    const out = await createTimeAndMaterialsInvoice({
      companyId: 'c1',
      project: { id: 'p1', name: 'Job', client_id: null, client_name: null, client_email: null },
      billable: billable as never,
      total: 20,
      dueDate: '2026-10-01',
      terms: 'Net 30',
    });
    expect(out).toEqual({ invoiceNumber: 'INV-2', stampError: '1 of 2 time entries could not be updated' });
  });
});

describe('keys carry company_id', () => {
  it('every new key names the company', () => {
    expect(managedDocumentsKey('c1', undefined)).toEqual(['documents', 'c1', 'management', 'company']);
    expect(unbilledWorkKey('c1', 'p1')).toContain('c1');
    expect(projectSovKey('c1', 'p1')).toContain('c1');
    expect(retainageKey('c1')).toContain('c1');
    expect(changeOrderManagementKey('c1')).toEqual(['change-orders', 'c1', 'management']);
    expect(crmLeadsPageKey('c1')).toEqual(['leads', 'c1', 'page']);
    expect(timeReportsKey('c1')).toContain('c1');
    expect(myTimeEntriesKey('c1', 'u1')).toEqual(['time-entries', 'c1', 'mine', 'u1']);
    expect(pipelineStagesKey('c1')).toContain('c1');
  });
});

describe('hooks', () => {
  it('summariseCRM counts qualified, won and this month', () => {
    const now = new Date('2026-09-15T12:00:00Z');
    const s = summariseCRM(
      [
        { status: 'qualified', created_at: '2026-09-03T00:00:00Z' },
        { status: 'won', created_at: '2026-08-01T00:00:00Z' },
      ],
      [{ estimated_value: 100 }, { estimated_value: null }],
      now,
    );
    expect(s).toMatchObject({ totalLeads: 2, qualifiedLeads: 1, thisMonthNewLeads: 1, totalPipelineValue: 100, avgConversionRate: 50 });
  });

  it('useCRMContacts reports a profile with no company instead of an empty list', () => {
    h.profile = { id: 'u1', company_id: null, role: 'root_admin' };
    const { result } = renderHook(() => useCRMContacts(), { wrapper: wrapperFor(newClient()) });
    expect(result.current.error?.message).toBe('No company associated with user');
    expect(h.calls.some((c) => c.table === 'contacts')).toBe(false);
  });

  it('useDocumentManagement surfaces a failed folder read separately from the documents', async () => {
    h.results.document_categories = boom;
    const { result } = renderHook(() => useDocumentManagement(), { wrapper: wrapperFor(newClient()) });
    await waitFor(() => expect(result.current.optionsError).toMatchObject({ message: 'boom' }));
    expect(result.current.error).toBeNull();
  });

  it('usePipelineStages shows a reorder at once and rolls it back when it fails', async () => {
    h.results.pipeline_stages = { data: [{ id: 's1', stage_order: 1 }, { id: 's2', stage_order: 2 }], error: null };
    const client = newClient();
    const { result } = renderHook(() => usePipelineStages<{ id: string; stage_order: number }>(), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(result.current.stages).toHaveLength(2));
    h.results['pipeline_stages:update'] = boom;
    await act(async () => {
      await result.current.reorder
        .mutateAsync([{ id: 's2', stage_order: 1 }, { id: 's1', stage_order: 2 }])
        .catch(() => undefined);
    });
    // Rolled back to the saved order (the refetch after settling reads it again too).
    await waitFor(() => expect(client.getQueryData(pipelineStagesKey('c1'))).toEqual([
      { id: 's1', stage_order: 1 }, { id: 's2', stage_order: 2 },
    ]));
  });
});
