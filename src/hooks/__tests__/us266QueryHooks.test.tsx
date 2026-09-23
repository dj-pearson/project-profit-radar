/**
 * US-266: the hooks that components moved onto from raw supabase.from().
 *
 * What each one has to get right, and what the inline versions got wrong:
 * every read's error is thrown (several checked one of three tables and
 * rendered the rest as empty), writes that RLS filtered to zero rows fail
 * instead of reporting success, query keys carry company_id, and a write
 * invalidates the list it changed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

type Res = { data: unknown; error: unknown; count?: number };

const h = vi.hoisted(() => ({
  results: {} as Record<string, Res>,
  calls: [] as { table: string; op: string; arg?: unknown }[],
  profile: { company_id: 'c1', id: 'u1', role: 'admin' } as Record<string, unknown> | null,
}));

vi.mock('@/integrations/supabase/client', () => {
  const from = (table: string) => {
    const res = () => h.results[table] ?? { data: [], error: null };
    const q: Record<string, unknown> = {};
    const chain = (op: string) => (...args: unknown[]) => {
      h.calls.push({ table, op, arg: args.length > 1 ? args : args[0] });
      return q;
    };
    for (const op of ['select', 'insert', 'update', 'delete', 'eq', 'in', 'gte', 'lte', 'lt', 'order', 'limit']) {
      q[op] = chain(op);
    }
    q.single = () => Promise.resolve(res());
    q.maybeSingle = () => Promise.resolve(res());
    q.then = (resolve: (r: Res) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(res()).then(resolve, reject);
    return q;
  };
  return { supabase: { from } };
});
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ userProfile: h.profile, user: h.profile ? { id: 'u1' } : null }),
}));

import { fetchVendors, updateVendor, deleteVendor, useVendors, vendorDirectoryKey } from '../useVendors';
import { bulkSetInvoiceStatus, bulkDeleteInvoices, invoiceListKey } from '../useInvoiceList';
import { bulkUpdateExpenses } from '../useExpenseBulkActions';
import { fetchSafetyIncidentsPanel } from '../useSafetyIncidentsPanel';
import { fetchCrewBoard, moveCrewAssignment } from '../useCrewScheduleBoard';
import { fetchEquipmentAssignments, returnEquipment } from '../useEquipmentAssignmentsTab';
import { setRecurringInvoiceStatus, deleteRecurringInvoice } from '../useRecurringInvoices';
import { fetchProjectProcurement } from '../useProjectProcurement';
import { fetchFinancialOverview } from '../useFinancialOverview';
import { fetchDailyReportsPage, countTimeEntriesOnDay } from '../useDailyReportsPage';
import { updatePunchListItem, fetchPunchListPage } from '../usePunchListPage';
import { fetchProjectTabRecords } from '../useProjectTabRecords';

const boom = { data: null, error: { message: 'boom' } };

beforeEach(() => {
  h.results = {};
  h.calls = [];
  h.profile = { company_id: 'c1', id: 'u1', role: 'admin' };
});

describe('reads throw instead of rendering a failed read as empty', () => {
  it('vendors are scoped to the company and a read error is thrown', async () => {
    h.results.vendors = { data: [{ id: 'v1', name: 'Acme' }], error: null };
    await expect(fetchVendors('c1')).resolves.toHaveLength(1);
    expect(h.calls).toContainEqual({ table: 'vendors', op: 'eq', arg: ['company_id', 'c1'] });
    h.results.vendors = boom;
    await expect(fetchVendors('c1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('the safety panel fails when the project names cannot be read', async () => {
    h.results.projects = boom;
    await expect(fetchSafetyIncidentsPanel('c1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('the crew board fails when assignments cannot be read, not "everyone unassigned"', async () => {
    h.results.crew_assignments = boom;
    await expect(fetchCrewBoard('c1', '2026-09-21', '2026-09-27')).rejects.toMatchObject({ message: 'boom' });
  });

  it('the equipment tab fails when the fleet cannot be read, not "0% utilization"', async () => {
    h.results.equipment = boom;
    await expect(fetchEquipmentAssignments('c1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('procurement fails when budgets cannot be read, not "$0 budget"', async () => {
    h.results.purchase_orders = { data: [], error: null };
    h.results.project_budgets = boom;
    await expect(fetchProjectProcurement('c1', 'p1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('the financial overview names every table that failed', async () => {
    h.results.expenses = boom;
    await expect(fetchFinancialOverview('c1', '2026-01-01')).rejects.toThrow(/expenses: boom/);
  });

  it('daily reports and punch list pages throw on a failed list read', async () => {
    h.results.daily_reports = boom;
    await expect(fetchDailyReportsPage('c1')).rejects.toMatchObject({ message: 'boom' });
    h.results.punch_list_items = boom;
    await expect(fetchPunchListPage('c1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('a failed time-entry count is an error, not "nobody clocked in"', async () => {
    h.results.time_entries = boom;
    await expect(countTimeEntriesOnDay('p1', '2026-09-23')).rejects.toMatchObject({ message: 'boom' });
  });

  it('project tabs keep their original scoping', async () => {
    await fetchProjectTabRecords('rfis', 'p1', 'c1');
    expect(h.calls).toContainEqual({ table: 'rfis', op: 'eq', arg: ['company_id', 'c1'] });
    h.calls = [];
    await fetchProjectTabRecords('change_orders', 'p1', 'c1');
    expect(h.calls).toContainEqual({ table: 'change_orders', op: 'eq', arg: ['project_id', 'p1'] });
    expect(h.calls.some((c) => c.op === 'eq' && Array.isArray(c.arg) && c.arg[0] === 'company_id')).toBe(false);
  });
});

describe('writes that RLS filtered to zero rows fail', () => {
  it('single-row updates and deletes', async () => {
    h.results.vendors = { data: [], error: null };
    await expect(updateVendor('v1', { is_active: false })).rejects.toThrow(/not saved/);
    await expect(deleteVendor('v1')).rejects.toThrow(/not deleted/);
    h.results.crew_assignments = { data: [], error: null };
    await expect(moveCrewAssignment({ id: 'a1', crew_member_id: 'm1', assigned_date: '2026-09-23' })).rejects.toThrow(/not moved/);
    h.results.recurring_invoices = { data: [], error: null };
    await expect(setRecurringInvoiceStatus('r1', 'paused', null)).rejects.toThrow(/not updated/);
    await expect(deleteRecurringInvoice('r1')).rejects.toThrow(/not deleted/);
    h.results.punch_list_items = { data: [], error: null };
    await expect(updatePunchListItem('i1', { status: 'completed' })).rejects.toThrow(/not changed/);
  });

  it('returning equipment does not free it when the assignment did not close', async () => {
    h.results.equipment_assignments = { data: [], error: null };
    await expect(returnEquipment({ id: 'a1', equipment_id: 'e1' })).rejects.toThrow(/not closed/);
    expect(h.calls.some((c) => c.table === 'equipment' && c.op === 'update')).toBe(false);
  });

  it('bulk updates report how many rows were refused', async () => {
    h.results.invoices = { data: [{ id: 'i1' }], error: null };
    await expect(bulkSetInvoiceStatus(['i1', 'i2'], 'paid')).rejects.toThrow(/1 of 2 invoice/);
    await expect(bulkDeleteInvoices(['i1', 'i2'])).rejects.toThrow(/1 of 2 invoice/);
    h.results.expenses = { data: [{ id: 'e1' }, { id: 'e2' }], error: null };
    await expect(bulkUpdateExpenses(['e1', 'e2'], { payment_status: 'approved' })).resolves.toBe(2);
  });

  it('a successful single-row update resolves', async () => {
    h.results.vendors = { data: [{ id: 'v1' }], error: null };
    await expect(updateVendor('v1', { is_active: true })).resolves.toBeUndefined();
  });
});

describe('keys and invalidation', () => {
  const wrapperFor = (client: QueryClient) => ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  it('keys carry company_id', () => {
    expect(vendorDirectoryKey('c1')).toEqual(['vendors', 'c1', 'directory']);
    expect(invoiceListKey('c1')).toEqual(['invoices', 'c1', 'list']);
  });

  it('useVendors loads under the company key and refetches after a write', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    h.results.vendors = { data: [{ id: 'v1', name: 'Acme', is_active: true }], error: null };
    const { result } = renderHook(() => useVendors(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.vendors).toHaveLength(1));
    expect(client.getQueryData(['vendors', 'c1', 'directory'])).toHaveLength(1);

    const reads = () => h.calls.filter((c) => c.table === 'vendors' && c.op === 'order').length;
    const before = reads();
    await act(async () => {
      await result.current.update.mutateAsync({ id: 'v1', patch: { is_active: false } });
    });
    await waitFor(() => expect(reads()).toBeGreaterThan(before));
  });

  it('useVendors surfaces the read error instead of an empty list', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    h.results.vendors = boom;
    const { result } = renderHook(() => useVendors(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.error).toMatchObject({ message: 'boom' }));
    expect(result.current.vendors).toEqual([]);
  });

  it('nothing is fetched without a company', async () => {
    h.profile = { id: 'u1', role: 'admin', company_id: null };
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useVendors(), { wrapper: wrapperFor(client) });
    expect(result.current.isLoading).toBe(false);
    expect(h.calls).toHaveLength(0);
  });
});

describe('the ratchet on raw supabase.from() in components', () => {
  const GUARD = 'scripts/check-raw-supabase-in-components.mjs';

  it('runs in the pre-commit hook and in CI', () => {
    expect(readFileSync('.husky/pre-commit', 'utf8')).toContain(GUARD);
    expect(readFileSync('.github/workflows/ci.yml', 'utf8')).toContain(GUARD);
  });

  it('matches its baseline exactly', () => {
    const result = spawnSync('node', [GUARD], { encoding: 'utf8' });
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  it('none of the converted screens calls supabase.from() itself again', () => {
    const converted = [
      'src/pages/Vendors.tsx',
      'src/pages/Invoices.tsx',
      'src/pages/FinancialOverview.tsx',
      'src/pages/PunchList.tsx',
      'src/components/invoices/InvoiceList.tsx',
      'src/components/invoices/RecurringInvoicesTab.tsx',
      'src/components/expenses/ExpenseTracker.tsx',
      'src/components/safety/SafetyIncidentsPanel.tsx',
      'src/components/scheduling/CrewScheduleBoard.tsx',
      'src/components/equipment/EquipmentAssignmentsTab.tsx',
      'src/components/project/tabs/ProjectProcurement.tsx',
      'src/components/project/tabs/ProjectRFIs.tsx',
      'src/components/project/tabs/ProjectSubmittals.tsx',
      'src/components/project/tabs/ProjectChangeOrders.tsx',
    ];
    for (const path of converted) {
      expect(readFileSync(path, 'utf8'), path).not.toMatch(/\bsupabase\s*\.\s*from\s*\(/);
    }
    // DailyReports keeps its storage upload and the crew RPC; no table reads.
    expect(readFileSync('src/pages/DailyReports.tsx', 'utf8')).not.toMatch(/\bsupabase\s*\.\s*from\s*\(/);
  });
});
