/**
 * US-266, fifth pass (second half): executive dashboard, WIP, budgets,
 * security monitoring, QC inspections, client updates, approval workflows,
 * client portal, SSO, webhooks, crew scheduling, knowledge base, materials,
 * the disposable-email blocklist, GPS tracking, support tickets, API keys,
 * billing automation and the SOC 2 audit page.
 *
 * Same contract as the earlier batches, plus the fabricated values this pass
 * removed: nothing here may come back as an invented number.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
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
  profile: { company_id: 'c1', id: 'u1', role: 'root_admin' } as Record<string, unknown> | null,
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
      'select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq', 'in', 'is', 'not', 'or', 'ilike',
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
      channel: () => ({ on() { return this; }, subscribe() { return this; } }),
      removeChannel: () => Promise.resolve(),
      auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
    },
    getEdgeFunctionUrl: (name: string) => `https://edge.test/${name}`,
  };
});
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ userProfile: h.profile, user: h.profile ? { id: 'u1' } : null }),
}));

import { fetchExecutiveDashboard, projectHealthOf, executiveDashboardKey } from '../useExecutiveDashboard';
import { fetchWipReport, wipReportKey } from '../useWipReport';
import { fetchBudgetManager, saveBudgetItem, deleteBudgetItem, budgetManagerKey } from '../useBudgetManager';
import { fetchSecurityMonitoring as fetchSecurityDashboard, setSecurityAlertStatus, securityMonitoringKey } from '../useSecurityMonitoringDashboard';
import { fetchSecurityMonitoring, countSuspiciousIps, securityLogsKey } from '../useSecurityMonitoring';
import { fetchQualityControl, editInspection, setInspectionStatus, qualityControlKey } from '../useQualityControl';
import { fetchSmartClientUpdates, createAutomationRule, setAutomationRuleActive, smartClientUpdatesKey } from '../useSmartClientUpdates';
import { fetchApprovalWorkflows, saveApprovalWorkflow, deleteApprovalWorkflow, approvalWorkflowsKey } from '../useApprovalWorkflows';
import { fetchClientPortalPro, setClientAccessActive, clientPortalProKey } from '../useClientPortalPro';
import { fetchSSOManagement, revokeUserSession, ssoManagementKey } from '../useSSOManagement';
import { fetchWebhookManagement, setWebhookEndpointActive, deleteWebhookEndpoint, webhookManagementKey } from '../useWebhookManagement';
import { fetchCrewAssignments, fetchCrewRoster, setCrewAssignmentStatus, crewSchedulingKey } from '../useCrewScheduling';
import { fetchKnowledgeBaseAdmin, updateKbArticle, createKbArticle, knowledgeBaseAdminKey } from '../useKnowledgeBaseAdmin';
import { fetchMaterialTracking, recordMaterialUsage, materialTrackingKey } from '../useMaterialTracking';
import { fetchDisposableDomains, addDisposableDomains, DOMAIN_READ_PAGE, disposableDomainsKey } from '../useDisposableEmailDomains';
import { fetchGPSTracking, createGeofence, geofenceProblem, gpsTrackingKey } from '../useGPSTimeTracking';
import { fetchSupportTickets, fetchTicketMessages, sendSupportResponse, supportTicketsKey } from '../useSupportTickets';
import { fetchAPIKeys, createAPIKey, toAPIKey, toRequestLog, apiKeysKey } from '../useAPIKeyManagement';
import { fetchBillingAutomation, setBillingRuleActive, billingAutomationKey } from '../useBillingAutomation';
import { fetchComplianceAudit, useComplianceAudit, complianceAuditKey } from '../useComplianceAudit';
import { fetchPOPickers, fetchPurchaseOrder, savePurchaseOrder, poTotals, purchaseOrderFormKey } from '../usePurchaseOrderForm';
import { fetchAffiliates, updateAffiliateProgram, affiliateKey } from '../useAffiliateManagement';
import { fetchAdvancedDashboards, advancedDashboardsKey } from '../useAdvancedDashboards';
import { fetchReportingEngine, reportingEngineKey } from '../useReportingEngine';
import { fetchAdminCompanies, fetchAdminCompanySettings, companiesAdminKey } from '../useCompaniesAdmin';
import { fetchMaterialsInventory, inventorySummary, materialsInventoryKey } from '../useMaterialsInventory';
import { fetchLaborTracking, insertLaborEntry, laborTrackingKey } from '../useLaborTracking';
import { fetchSystemAdminSettings, saveSystemAdminSettings, systemAdminSettingsKey } from '../useSystemAdminSettings';
import { fetchActiveProjects, insertSafetyIncident } from '../useSafetyPage';

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
  h.invoke = { data: null, error: null };
  h.rpc = { data: null, error: null };
  h.invoked = [];
  h.calls = [];
  h.profile = { company_id: 'c1', id: 'u1', role: 'root_admin' };
});

describe('reads throw instead of rendering a failed read as zeros or empty', () => {
  it('executive dashboard: a failed expenses read throws', async () => {
    h.results.expenses = boom;
    await expect(fetchExecutiveDashboard('c1', 'ytd')).rejects.toMatchObject({ message: 'boom' });
  });

  it('executive dashboard: figures come from the rows, and what they cannot answer is null', async () => {
    const now = new Date('2026-09-23T12:00:00Z');
    h.results.projects = {
      data: [
        { id: 'p1', name: 'A', budget: 100, status: 'active', completion_percentage: 50, start_date: '2026-01-01', end_date: '2026-12-31', created_at: '2026-03-01T00:00:00Z', job_costs: [{ total_cost: 120 }] },
        { id: 'p2', name: 'B', budget: 100, status: 'completed', completion_percentage: 100, start_date: '2026-01-01', end_date: '2026-01-11', created_at: '2025-01-01T00:00:00Z', job_costs: [] },
      ],
      error: null,
    };
    h.results.invoices = { data: [{ total_amount: 300, status: 'paid', issue_date: '2026-02-01' }, { total_amount: 100, status: 'pending', issue_date: '2026-02-05' }], error: null };
    h.results.expenses = { data: [{ amount: 50, expense_date: '2026-02-10' }], error: null };
    const d = await fetchExecutiveDashboard('c1', 'ytd', now);
    expect(d.metrics.totalRevenue).toBe(300);
    expect(d.metrics.collectionRate).toBe(75);
    expect(d.metrics.avgInvoice).toBe(200);
    expect(d.metrics.avgProjectDurationDays).toBe(10);
    expect(d.riskCounts).toEqual({ healthy: 0, warning: 0, critical: 1 });
    expect(d.trend.map((t) => t.revenue)).toEqual([300, 0]);

    h.results.invoices = none;
    h.results.projects = none;
    const empty = await fetchExecutiveDashboard('c1', 'ytd', now);
    expect(empty.metrics.collectionRate).toBeNull();
    expect(empty.metrics.avgInvoice).toBeNull();
    expect(empty.metrics.avgProjectDurationDays).toBeNull();
  });

  it('executive dashboard: health thresholds', () => {
    const now = new Date('2026-09-23T00:00:00Z');
    const base = { id: 'p', name: 'P', budget: 100, status: 'active', completion_percentage: 0, start_date: null, created_at: '', job_costs: [] };
    expect(projectHealthOf({ ...base, end_date: '2026-09-01', job_costs: [] }, now).status).toBe('critical');
    expect(projectHealthOf({ ...base, end_date: null, job_costs: [{ total_cost: 107 }] }, now).status).toBe('warning');
    expect(projectHealthOf({ ...base, end_date: null, job_costs: [{ total_cost: 90 }] }, now).status).toBe('healthy');
  });

  it('WIP: a failed job-cost read throws instead of reporting zero cost', async () => {
    h.results.job_costs = boom;
    await expect(fetchWipReport('c1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('budget, security, QC, client updates, approvals', async () => {
    h.results.cost_codes = boom;
    await expect(fetchBudgetManager('c1', 'p1')).rejects.toMatchObject({ message: 'boom' });

    h.rpc = { data: null, error: { message: 'rpc down' } };
    await expect(fetchSecurityDashboard('c1')).rejects.toMatchObject({ message: 'rpc down' });

    h.results.user_profiles = boom;
    await expect(fetchQualityControl('c1')).rejects.toMatchObject({ message: 'boom' });
    await expect(fetchApprovalWorkflows('c1')).rejects.toMatchObject({ message: 'boom' });

    h.results.communication_templates = boom;
    await expect(fetchSmartClientUpdates('c1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('client updates: a rule carries its real template, not "Template Name"', async () => {
    h.results.automation_rules = { data: [{ id: 'r1', template_id: 't1' }, { id: 'r2', template_id: 'gone' }], error: null };
    h.results.communication_templates = { data: [{ id: 't1', name: 'Weekly', subject_template: 'S', content_template: 'C' }], error: null };
    const { rules } = await fetchSmartClientUpdates('c1');
    expect(rules[0].template?.name).toBe('Weekly');
    expect(rules[1].template).toBeNull();
  });

  it('security logs: counts are head requests; a failed suspicious-IP read throws', async () => {
    const heads = () => h.calls.filter((c) => c.table === 'security_logs' && c.op === 'select' && Array.isArray(c.arg));
    await fetchSecurityMonitoring();
    expect(heads().length).toBe(3);
    expect(countSuspiciousIps([{ ip_address: '1' }, { ip_address: '1' }, { ip_address: '1' }, { ip_address: '2' }])).toBe(1);
    h.queue.security_logs = [none, none, none, none, boom];
    await expect(fetchSecurityMonitoring()).rejects.toMatchObject({ message: 'boom' });
  });

  it('tenant-scoped pages: no tenant reads nothing; a failed read throws', async () => {
    h.results.user_profiles = { data: { tenant_id: null }, error: null };
    await expect(fetchClientPortalPro('u1')).resolves.toMatchObject({ tenantId: null, clients: [] });
    await expect(fetchBillingAutomation('u1')).resolves.toMatchObject({ tenantId: null, rules: [] });
    h.results.user_profiles = { data: { tenant_id: 't1' }, error: null };
    h.results.client_messages = boom;
    await expect(fetchClientPortalPro('u1')).rejects.toMatchObject({ message: 'boom' });
    h.results.payment_reminders = boom;
    await expect(fetchBillingAutomation('u1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('client portal and billing: counts are over every row, not the 20 listed', async () => {
    h.results.user_profiles = { data: { tenant_id: 't1' }, error: null };
    h.queue.client_messages = [{ data: [{ id: 'm1' }], error: null }, { data: null, error: null, count: 57 }];
    expect((await fetchClientPortalPro('u1')).unreadCount).toBe(57);
    h.queue.payment_reminders = [none, { data: null, error: null, count: 40 }, { data: null, error: null, count: 3 }];
    const billing = await fetchBillingAutomation('u1');
    expect([billing.sentCount, billing.pendingCount]).toEqual([40, 3]);
  });

  it('SSO: no session is an error, not an empty connection list', async () => {
    await expect(fetchSSOManagement('u1')).rejects.toThrow('Not authenticated');
  });

  it('webhooks, crew, knowledge base, materials, GPS, support, API keys, audit', async () => {
    h.results.webhook_events = boom;
    await expect(fetchWebhookManagement('u1')).rejects.toMatchObject({ message: 'boom' });
    h.results.crew_assignments = boom;
    await expect(fetchCrewAssignments('c1', '2026-09-23')).rejects.toMatchObject({ message: 'boom' });
    h.results.user_profiles = boom;
    await expect(fetchCrewRoster('c1')).rejects.toMatchObject({ message: 'boom' });
    h.results.knowledge_base_categories = boom;
    await expect(fetchKnowledgeBaseAdmin()).rejects.toMatchObject({ message: 'boom' });
    h.results.material_usage = boom;
    await expect(fetchMaterialTracking('c1')).rejects.toMatchObject({ message: 'boom' });
    h.results.travel_logs = boom;
    await expect(fetchGPSTracking('c1')).rejects.toMatchObject({ message: 'boom' });
    h.results.support_tickets = boom;
    await expect(fetchSupportTickets()).rejects.toMatchObject({ message: 'boom' });
    h.results.support_messages = boom;
    await expect(fetchTicketMessages('t1')).rejects.toMatchObject({ message: 'boom' });
    h.results.system_config_changes = boom;
    await expect(fetchComplianceAudit()).rejects.toMatchObject({ message: 'boom' });
  });

  it('materials: usage is scoped through the material to the company', async () => {
    await fetchMaterialTracking('c1');
    expect(h.calls).toContainEqual({ table: 'material_usage', op: 'eq', arg: ['materials.company_id', 'c1'] });
  });

  it('blocklist: reads past the 1000-row cap', async () => {
    const page = (n: number) => ({ data: Array.from({ length: n }, (_, i) => ({ id: String(i) })), error: null });
    h.queue.disposable_email_domains = [page(DOMAIN_READ_PAGE), page(DOMAIN_READ_PAGE), page(5)];
    expect(await fetchDisposableDomains()).toHaveLength(2 * DOMAIN_READ_PAGE + 5);
  });

  it('API keys: rows are mapped from the real columns; totals come from the logs', async () => {
    expect(toAPIKey({ id: 'k1', key_name: 'Zapier', api_key_prefix: 'bk_abc', permissions: ['projects:read'], usage_count: 9, rate_limit_per_hour: 100, is_active: true, created_at: 'x' }))
      .toMatchObject({ name: 'Zapier', key_prefix: 'bk_abc', scopes: ['projects:read'], usage_count: 9 });
    expect(toRequestLog({ id: 'l1', response_status: 500, processing_time_ms: 12, created_at: 'x' })).toMatchObject({ success: false, status_code: 500 });
    expect(toRequestLog({ id: 'l2', response_status: null, created_at: 'x' })).toMatchObject({ success: false, status_code: null });

    h.results.api_keys = { data: [{ id: 'k1' }], error: null };
    h.queue.api_request_logs = [none, { data: null, error: null, count: 120 }, { data: null, error: null, count: 6 }];
    const d = await fetchAPIKeys('c1');
    expect([d.totalRequests, d.totalErrors]).toEqual([120, 6]);
    h.results.api_request_logs = boom;
    await expect(fetchAPIKeys('c1')).rejects.toMatchObject({ message: 'boom' });
  });
});

describe('writes', () => {
  it('fail when RLS filters them to zero rows', async () => {
    h.results['budget_line_items:update'] = none;
    await expect(saveBudgetItem('b1', {} as never)).rejects.toThrow('was not saved');
    h.results['budget_line_items:delete'] = none;
    await expect(deleteBudgetItem('b1')).rejects.toThrow('was not deleted');
    h.results['security_alerts:update'] = none;
    await expect(setSecurityAlertStatus('a1', 'resolved', 'u1')).rejects.toThrow('was not updated');
    h.results['quality_inspections:update'] = none;
    await expect(setInspectionStatus('i1', 'passed')).rejects.toThrow('was not updated');
    h.results['automation_rules:update'] = none;
    await expect(setAutomationRuleActive('r1', true)).rejects.toThrow('was not changed');
    h.results['approval_workflows:delete'] = none;
    await expect(deleteApprovalWorkflow('c1', 'w1')).rejects.toThrow('was not deleted');
    h.results['approval_workflows:insert'] = none;
    await expect(saveApprovalWorkflow('c1', null, {} as never)).rejects.toThrow('was not saved');
    h.results['client_portal_access:update'] = none;
    await expect(setClientAccessActive('x', false)).rejects.toThrow('was not changed');
    h.results['user_sessions:update'] = none;
    await expect(revokeUserSession('s1')).rejects.toThrow('was not revoked');
    h.results['webhook_endpoints:update'] = none;
    await expect(setWebhookEndpointActive('e1', true)).rejects.toThrow('was not changed');
    h.results['webhook_endpoints:delete'] = none;
    await expect(deleteWebhookEndpoint('e1')).rejects.toThrow('was not deleted');
    h.results['crew_assignments:update'] = none;
    await expect(setCrewAssignmentStatus('a1', 'dispatched')).rejects.toThrow('was not changed');
    h.results['knowledge_base_articles:update'] = none;
    await expect(updateKbArticle('k1', { is_featured: true })).rejects.toThrow('was not changed');
    h.results['billing_automation_rules:update'] = none;
    await expect(setBillingRuleActive('r1', true)).rejects.toThrow('was not changed');
  });

  it('QC: editing sends only the form fields and passes/fails set passed', async () => {
    h.results['quality_inspections:update'] = one;
    await editInspection('i1', { project_id: 'p1', inspection_type: 'framing', inspection_date: '2026-09-30', inspector_id: '', notes: 'n' });
    const edit = h.calls.find((c) => c.table === 'quality_inspections' && c.op === 'update');
    expect(edit?.arg).toEqual({ project_id: 'p1', inspection_type: 'framing', inspection_date: '2026-09-30', inspector_id: null, notes: 'n' });
    await setInspectionStatus('i1', 'failed');
    expect(h.calls.filter((c) => c.op === 'update').at(-1)?.arg).toEqual({ status: 'failed', passed: false });
  });

  it('client updates: "all projects" is null, not an empty uuid', async () => {
    h.results['automation_rules:insert'] = one;
    await createAutomationRule('c1', 'u1', { trigger_type: 'x', project_id: '', template_id: 't1', is_active: true, trigger_conditions: {} });
    const insert = h.calls.find((c) => c.table === 'automation_rules' && c.op === 'insert');
    expect(insert?.arg).toMatchObject({ project_id: null, company_id: 'c1' });
  });

  it('knowledge base: no category is null, not an empty uuid', async () => {
    h.results['knowledge_base_articles:insert'] = one;
    await createKbArticle('u1', { title: 't', slug: 's', excerpt: '', content: 'c', article_type: 'article', category_id: '', difficulty_level: 'beginner', estimated_read_time: 5, tags: [], is_published: false, is_featured: false });
    expect(h.calls.find((c) => c.op === 'insert')?.arg).toMatchObject({ category_id: null, author_id: 'u1', published_at: null });
  });

  it('materials: usage saved without its stock update says so', async () => {
    h.results['material_usage:insert'] = one;
    h.results['materials:update'] = none;
    await expect(recordMaterialUsage({ id: 'm1', unit_cost: 2, quantity_available: 10 }, 'u1', { material_id: 'm1', project_id: 'p1', quantity_used: 3, unit_cost: 0, notes: '' }))
      .rejects.toThrow('stock count was not updated');
    expect(h.calls.find((c) => c.table === 'material_usage' && c.op === 'insert')?.arg).toEqual([
      { material_id: 'm1', project_id: 'p1', quantity_used: 3, unit_cost: 2, notes: '', total_cost: 6, used_by: 'u1' },
    ]);
    expect(h.calls.find((c) => c.table === 'materials' && c.op === 'update')?.arg).toEqual({ quantity_available: 7 });
  });

  it('blocklist: bulk add reports rows inserted, not entries sent', async () => {
    h.results['disposable_email_domains:upsert'] = one;
    await expect(addDisposableDomains('u1', ['a.com', 'b.com', 'c.com'])).resolves.toBe(1);
  });

  it('GPS: a geofence needs real coordinates and carries the company', async () => {
    expect(geofenceProblem({ name: 'Site', address: '', center_lat: NaN, center_lng: 1, radius_meters: 100 })).toMatch(/Latitude/);
    expect(geofenceProblem({ name: 'Site', address: '', center_lat: 40, center_lng: 200, radius_meters: 100 })).toMatch(/Longitude/);
    await expect(createGeofence('c1', { name: 'Site', address: '', center_lat: NaN, center_lng: 1, radius_meters: 100 })).rejects.toThrow(/Latitude/);
    expect(h.calls.some((c) => c.op === 'insert')).toBe(false);
    h.results['geofences:insert'] = one;
    await createGeofence('c1', { name: ' Site ', address: 'x', center_lat: 39.7, center_lng: -104.9, radius_meters: 150 });
    expect(h.calls.find((c) => c.op === 'insert')?.arg).toMatchObject({ name: 'Site', center_lat: 39.7, center_lng: -104.9, company_id: 'c1' });
  });

  it('support: a reply to an open ticket moves it to in progress; a lost reply fails', async () => {
    h.results['support_messages:insert'] = one;
    h.results['support_tickets:update'] = one;
    await sendSupportResponse({ id: 't1', status: 'open' }, 'hi');
    expect(h.calls.find((c) => c.table === 'support_tickets' && c.op === 'update')?.arg).toMatchObject({ status: 'in_progress' });
    h.results['support_messages:insert'] = none;
    await expect(sendSupportResponse({ id: 't1', status: 'resolved' }, 'hi')).rejects.toThrow('was not sent');
  });

  it('API keys are minted by api-management, never in the browser', async () => {
    h.invoke = { data: { success: true, api_key: 'bk_live_secret' }, error: null };
    await expect(createAPIKey('Zapier', ['projects:read'])).resolves.toBe('bk_live_secret');
    expect(h.invoked).toEqual([{ name: 'api-management/create-key', body: { key_name: 'Zapier', permissions: ['projects:read'] } }]);
    expect(h.calls.some((c) => c.table === 'api_keys' && c.op === 'insert')).toBe(false);
    h.invoke = { data: { success: false, error: 'Unknown permission(s): read' }, error: null };
    await expect(createAPIKey('Zapier', ['read'])).rejects.toThrow('Unknown permission');
  });
});

describe('keys carry company_id', () => {
  it('every new key names the company', () => {
    for (const key of [
      executiveDashboardKey('c1', 'ytd'), wipReportKey('c1'), budgetManagerKey('c1', 'p1'), securityMonitoringKey('c1'),
      securityLogsKey('c1', 'u1'), qualityControlKey('c1'), smartClientUpdatesKey('c1'), approvalWorkflowsKey('c1'),
      clientPortalProKey('c1', 'u1'), ssoManagementKey('c1', 'u1'), webhookManagementKey('c1', 'u1'), crewSchedulingKey('c1'),
      knowledgeBaseAdminKey('c1', 'u1'), materialTrackingKey('c1'), disposableDomainsKey('c1', 'u1'), gpsTrackingKey('c1'),
      supportTicketsKey('c1', 'u1'), apiKeysKey('c1'), billingAutomationKey('c1', 'u1'), complianceAuditKey('c1', 'u1'),
    ]) {
      expect(key).toContain('c1');
    }
  });
});

describe('hooks', () => {
  it('useComplianceAudit surfaces a failed read as an error, not as zero events', async () => {
    h.results.audit_logs = boom;
    const client = newClient();
    const { result } = renderHook(() => useComplianceAudit(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.error).toMatchObject({ message: 'boom' }));
    expect(result.current.data).toBeUndefined();
  });
});

describe('purchase orders, affiliates, dashboards, companies, materials, labor, system settings', () => {
  const form = {
    vendor_id: 'v1', project_id: '', po_date: '2026-09-23', delivery_date: '', delivery_address: '',
    notes: '', terms: '', tax_rate: 10, shipping_cost: 5,
  };
  const lines = [{ line_number: 1, description: 'Rebar', quantity: 2, unit_price: 50, unit_of_measure: 'each' }];

  it('reads throw', async () => {
    h.results.vendors = boom;
    await expect(fetchPOPickers('c1')).rejects.toMatchObject({ message: 'boom' });
    h.results.purchase_order_line_items = boom;
    await expect(fetchPurchaseOrder('po1')).rejects.toMatchObject({ message: 'boom' });
    h.results.affiliate_codes = boom;
    await expect(fetchAffiliates()).rejects.toMatchObject({ message: 'boom' });
    h.results.companies = boom;
    await expect(fetchAdminCompanies()).rejects.toMatchObject({ message: 'boom' });
    h.results.company_settings = boom;
    await expect(fetchAdminCompanySettings('c2')).rejects.toMatchObject({ message: 'boom' });
    h.results.purchase_orders = boom;
    await expect(fetchMaterialsInventory('c1')).rejects.toMatchObject({ message: 'boom' });
    h.results.labor_costs = boom;
    await expect(fetchLaborTracking('c1', 'p1')).rejects.toMatchObject({ message: 'boom' });
    h.results.system_admin_settings = boom;
    await expect(fetchSystemAdminSettings()).rejects.toMatchObject({ message: 'boom' });
    h.results.projects = boom;
    await expect(fetchActiveProjects('c1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('PO: an edit keeps the PO number, and a lost update touches no lines', async () => {
    h.results['purchase_orders:update'] = none;
    await expect(savePurchaseOrder({ id: 'po1', companyId: 'c1', userId: 'u1', form, lines, status: 'draft' }))
      .rejects.toThrow('was not updated');
    expect(h.calls.some((c) => c.table === 'purchase_order_line_items')).toBe(false);

    h.results['purchase_orders:update'] = one;
    h.results['purchase_order_line_items:insert'] = one;
    await savePurchaseOrder({ id: 'po1', companyId: 'c1', userId: 'u1', form, lines, status: 'sent' });
    const update = h.calls.filter((c) => c.table === 'purchase_orders' && c.op === 'update').at(-1)?.arg as Record<string, unknown>;
    expect(update).not.toHaveProperty('po_number');
    expect(update).not.toHaveProperty('created_by');
    expect(update).toMatchObject({ subtotal: 100, tax_amount: 10, total_amount: 115, status: 'sent' });
    expect(poTotals(lines, 10, 5)).toEqual({ subtotal: 100, taxAmount: 10, total: 115 });
  });

  it('PO: lines that did not all save are an error', async () => {
    h.results['purchase_orders:insert'] = { data: { id: 'po9' }, error: null };
    h.results['purchase_order_line_items:insert'] = none;
    await expect(savePurchaseOrder({ id: null, companyId: 'c1', userId: 'u1', form, lines, status: 'draft' }))
      .rejects.toThrow('only 0 of 1 line items');
    expect(h.calls.find((c) => c.table === 'purchase_orders' && c.op === 'insert')?.arg).toMatchObject({ company_id: 'c1', po_number: '' });
  });

  it('dashboards and reports: no snapshot is null, history is scoped to the tenant', async () => {
    h.results.user_profiles = { data: { tenant_id: 't1' }, error: null };
    h.results.financial_snapshots = { data: null, error: null };
    expect((await fetchAdvancedDashboards('u1')).snapshot).toBeNull();
    h.results.kpi_metrics = boom;
    await expect(fetchAdvancedDashboards('u1')).rejects.toMatchObject({ message: 'boom' });

    h.queue.report_history = [none, { data: null, error: null, count: 33 }];
    const engine = await fetchReportingEngine('u1');
    expect(engine.generatedCount).toBe(33);
    expect(h.calls).toContainEqual({ table: 'report_history', op: 'eq', arg: ['custom_reports.tenant_id', 't1'] });
  });

  it('companies: every company is listed with its embedded counts', async () => {
    h.results.companies = { data: [{ id: 'c9', name: 'New Co', user_profiles: [], projects: [{ count: 3 }] }], error: null };
    const [co] = await fetchAdminCompanies();
    expect(co._count).toEqual({ users: 0, projects: 3 });
    const select = h.calls.find((c) => c.table === 'companies' && c.op === 'select')?.arg as string;
    expect(select).not.toMatch(/!inner/);
  });

  it('materials: the report cards come from the rows', () => {
    expect(inventorySummary(
      [{ id: 'm', name: 'a', quantity_available: 2, unit_cost: 10, minimum_stock_level: 5 } as never],
      [{ status: 'sent' } as never, { status: 'received' } as never],
    )).toEqual({ totalValue: 20, lowStock: 1, pendingOrders: 1 });
  });

  it('writes select back', async () => {
    h.results['affiliate_programs:update'] = none;
    await expect(updateAffiliateProgram('a1', { is_active: true })).rejects.toThrow('was not updated');
    h.results['labor_costs:insert'] = none;
    await expect(insertLaborEntry({} as never)).rejects.toThrow('was not saved');
    h.results['system_admin_settings:update'] = none;
    await expect(saveSystemAdminSettings('s1', {} as never, 'u1')).rejects.toThrow('were not saved');
    h.results['safety_incidents:insert'] = none;
    await expect(insertSafetyIncident({} as never)).rejects.toThrow('was not recorded');
  });

  it('keys carry company_id', () => {
    for (const key of [
      purchaseOrderFormKey('c1'), affiliateKey('c1', 'u1'), advancedDashboardsKey('c1', 'u1'), reportingEngineKey('c1', 'u1'),
      companiesAdminKey('c1', 'u1'), materialsInventoryKey('c1'), laborTrackingKey('c1', 'p1'), systemAdminSettingsKey('c1', 'u1'),
    ]) {
      expect(key).toContain('c1');
    }
  });
});
