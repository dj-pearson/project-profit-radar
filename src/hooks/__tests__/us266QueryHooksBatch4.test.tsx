/**
 * US-266, fourth pass: pSEO admin, safety automation, risk prediction, GDPR,
 * rate limiting, RFIs/submittals, AI models, keyword research, admin
 * intelligence, auto scheduling, workflow automation and error logs.
 *
 * Same contract as the first three batches: a failed read is thrown (most of
 * these rendered a failed read as zeros or an empty list), a write RLS filtered
 * to zero rows fails, keys carry company_id.
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
      functions: { invoke: () => Promise.resolve(h.invoke) },
      auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
    },
    getEdgeFunctionUrl: (name: string) => `https://edge.test/${name}`,
  };
});
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ userProfile: h.profile, user: h.profile ? { id: 'u1' } : null }),
}));

import { fetchPSEOAdmin, updatePages, seedDimensions, addToQueue, deleteQueueItem, pseoAdminKey } from '../usePSEOAdmin';
import { fetchSafetyAutomationOverview, fetchSafetyAutomationProject, insertOshaIncident, safetyAutomationKey } from '../useSafetyAutomation';
import { fetchRiskProjectData, acknowledgeRiskAlert, generateRiskPrediction, riskPredictionKey } from '../useRiskPrediction';
import { fetchGDPRCompliance, updateDataSubjectRequest, createDataSubjectRequest, useGDPRCompliance, gdprComplianceKey } from '../useGDPRCompliance';
import { fetchRateLimiting, setRateLimitRuleActive, rateLimitingKey } from '../useRateLimiting';
import { saveRFI, saveSubmittal, setSubmittalStatus, fetchRFISubmittals, rfiSubmittalKey } from '../useRFISubmittalManagement';
import { saveAIModel, refreshAIModelAliases, fetchAIModels, aiModelsKey } from '../useAIModelManager';
import { importKeywords, setBlogSelection, deleteKeywords, fetchKeywordResearch, keywordResearchKey } from '../useKeywordResearch';
import { fetchRevenueMetrics, fetchAtRiskAccounts, fetchTrialStats, adminIntelligenceKey } from '../useAdminIntelligence';
import { fetchAutoScheduling, publishAutoSchedule, generateAutoSchedule, autoSchedulingKey } from '../useAutoScheduling';
import { fetchWorkflowAutomation, copyWorkflow, deleteWorkflow, summariseWorkflows, workflowAutomationKey } from '../useWorkflowAutomation';
import { fetchErrorLogStats, fetchErrorLogPage, setErrorLogResolved, dateThreshold, errorLogsKey } from '../useErrorLogs';
import { fetchTenantId } from '../tenantScope';

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
  h.calls = [];
  h.profile = { company_id: 'c1', id: 'u1', role: 'root_admin' };
});

describe('reads throw instead of rendering a failed read as zeros or empty', () => {
  it('pSEO: pages, the queue and each dimension table', async () => {
    await expect(fetchPSEOAdmin()).resolves.toMatchObject({ pages: [], queue: [] });
    h.results.pseo_pages = boom;
    await expect(fetchPSEOAdmin()).rejects.toMatchObject({ message: 'boom' });
    h.results.pseo_pages = none;
    h.results.pseo_geographies = boom;
    await expect(fetchPSEOAdmin()).rejects.toMatchObject({ message: 'boom' });
  });

  it('tenant lookup: a failed read throws rather than reading as "no tenant"', async () => {
    h.results.user_profiles = boom;
    await expect(fetchTenantId('u1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('safety automation: a failed count throws; no incident means null days, not 0', async () => {
    h.results.user_profiles = { data: { tenant_id: 't1' }, error: null };
    h.results.osha_300_log = { data: null, error: null, count: 0 };
    const overview = await fetchSafetyAutomationOverview('u1');
    expect(overview.stats.days_since_incident).toBeNull();
    expect(h.calls).toContainEqual({ table: 'projects', op: 'eq', arg: ['tenant_id', 't1'] });

    h.results.safety_inspections = { data: null, error: { message: 'count failed' } };
    await expect(fetchSafetyAutomationOverview('u1')).rejects.toMatchObject({ message: 'count failed' });

    h.results.safety_inspections = none;
    h.results.toolbox_talks = boom;
    await expect(fetchSafetyAutomationProject('p1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('risk prediction: the newest history row is the prediction; a failed factor read throws', async () => {
    h.results.risk_predictions = { data: [{ id: 'r2' }, { id: 'r1' }], error: null };
    await expect(fetchRiskProjectData('t1', 'p1')).resolves.toMatchObject({ prediction: { id: 'r2' }, history: [{ id: 'r2' }, { id: 'r1' }] });
    h.results.risk_factors = boom;
    await expect(fetchRiskProjectData('t1', 'p1')).rejects.toMatchObject({ message: 'boom' });
    h.results.risk_predictions = none;
    await expect(fetchRiskProjectData('t1', 'p1')).resolves.toMatchObject({ prediction: null, factors: [] });
  });

  it('GDPR: counts are head counts, and any failed count throws', async () => {
    h.results.data_subject_requests = { data: [], error: null, count: 4 };
    const data = await fetchGDPRCompliance();
    expect(data.stats.activeRequests).toBe(4);
    expect(h.calls).toContainEqual({ table: 'data_subject_requests', op: 'select', arg: ['id', { count: 'exact', head: true }] });
    h.results.processing_activities = boom;
    await expect(fetchGDPRCompliance()).rejects.toMatchObject({ message: 'boom' });
  });

  it('rate limiting: a failed violations read throws', async () => {
    h.results.rate_limit_violations = boom;
    await expect(fetchRateLimiting()).rejects.toMatchObject({ message: 'boom' });
  });

  it('RFIs: company scoped, and a failed team read throws', async () => {
    await fetchRFISubmittals('c1');
    expect(h.calls).toContainEqual({ table: 'rfis', op: 'eq', arg: ['company_id', 'c1'] });
    h.results.user_profiles = boom;
    await expect(fetchRFISubmittals('c1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('AI models and keywords', async () => {
    h.results.ai_model_configurations = boom;
    await expect(fetchAIModels()).rejects.toMatchObject({ message: 'boom' });
    h.results.keyword_research_data = {
      data: [
        { keyword: 'a', search_volume: 10, selected_for_blog_generation: true },
        { keyword: 'b', search_volume: 5, selected_for_blog_generation: false },
      ],
      error: null,
    };
    const rows = await fetchKeywordResearch('c1');
    expect(rows.keywords.map((k) => k.keyword)).toEqual(['a', 'b']);
    expect(rows.selected.map((k) => k.keyword)).toEqual(['a']);
    h.results.keyword_research_data = boom;
    await expect(fetchKeywordResearch('c1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('admin intelligence: revenue is estimated only when there is no metrics row', async () => {
    h.results.revenue_metrics = { data: null, error: null };
    h.results.companies = { data: [{ subscription_status: 'active', subscription_tier: 'starter' }], error: null };
    await expect(fetchRevenueMetrics()).resolves.toMatchObject({ mrr: 149, total_customers: 1 });

    h.results.revenue_metrics = boom;
    await expect(fetchRevenueMetrics()).rejects.toMatchObject({ message: 'boom' });

    h.results.companies = boom;
    await expect(fetchTrialStats()).rejects.toMatchObject({ message: 'boom' });
  });

  it('admin intelligence: no admin login is null, not 999 days; a failed lookup throws', async () => {
    h.results.account_health_scores = {
      data: [{ score: 20, trend: 'down', risk_level: 'high', companies: { id: 'k1', name: 'Acme', subscription_status: 'active', trial_end_date: null } }],
      error: null,
    };
    h.results.user_profiles = { data: null, error: null };
    h.results.projects = { data: null, error: null, count: 2 };
    await expect(fetchAtRiskAccounts()).resolves.toMatchObject([{ company_id: 'k1', last_login_days: null, total_projects: 2 }]);
    h.results.user_profiles = boom;
    await expect(fetchAtRiskAccounts()).rejects.toMatchObject({ message: 'boom' });
  });

  it('auto scheduling and workflows', async () => {
    h.results.user_profiles = { data: { tenant_id: 't1' }, error: null };
    h.results.auto_schedules = boom;
    await expect(fetchAutoScheduling('u1')).rejects.toMatchObject({ message: 'boom' });

    h.results.workflows = boom;
    await expect(fetchWorkflowAutomation('u1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('error logs: failed stats throw; filters map onto the query', async () => {
    h.results.error_logs = boom;
    await expect(fetchErrorLogStats()).rejects.toMatchObject({ message: 'boom' });

    h.results.error_logs = { data: [{ id: 'e1' }], error: null, count: 30 };
    const now = new Date('2026-09-23T12:00:00Z');
    const out = await fetchErrorLogPage(
      { dateRange: '7d', searchTerm: ' boom ', errorType: 'all', severity: 'critical', userEmail: '', resolved: 'unresolved' },
      1,
      now,
    );
    expect(out).toEqual({ rows: [{ id: 'e1' }], total: 30 });
    expect(h.calls).toContainEqual({ table: 'error_logs', op: 'gte', arg: ['created_at', dateThreshold('7d', now)] });
    expect(h.calls).toContainEqual({ table: 'error_logs', op: 'ilike', arg: ['error_message', '%boom%'] });
    expect(h.calls).toContainEqual({ table: 'error_logs', op: 'eq', arg: ['severity', 'critical'] });
    expect(h.calls).toContainEqual({ table: 'error_logs', op: 'eq', arg: ['resolved', false] });
    expect(h.calls).toContainEqual({ table: 'error_logs', op: 'range', arg: [25, 49] });
    expect(dateThreshold('all', now)).toBeNull();
  });
});

describe('writes RLS filtered to zero rows fail', () => {
  it('pSEO: a bulk publish that touched fewer pages than asked fails; seeding names the table', async () => {
    h.results['pseo_pages:update'] = one;
    await expect(updatePages(['a', 'b'], { is_published: true })).rejects.toThrow('Only 1 of 2 pages were changed');
    h.results['pseo_generation_queue:delete'] = none;
    await expect(deleteQueueItem('q1')).rejects.toThrow('was not removed');

    h.results['pseo_pain_points:upsert'] = boom;
    await expect(
      seedDimensions({ contractor_types: [{ id: 'a' }], pain_points: [{ id: 'b' }] } as never),
    ).rejects.toThrow('Seeding pseo_pain_points failed: boom');

    // ignoreDuplicates returns only what it inserted: that is a count, not a failure.
    h.results['pseo_generation_queue:upsert'] = one;
    await expect(addToQueue([{ combination_key: 'a' }, { combination_key: 'b' }])).resolves.toBe(1);
  });

  it('safety, risk, GDPR and rate limiting', async () => {
    await expect(insertOshaIncident(null, 'p1', {} as never)).rejects.toThrow('not linked to a tenant');
    h.results['osha_300_log:insert'] = none;
    await expect(insertOshaIncident('t1', 'p1', { employee_name: 'A' } as never)).rejects.toThrow('was not recorded');

    h.results['risk_alerts:update'] = none;
    await expect(acknowledgeRiskAlert('a1', 'u1')).rejects.toThrow('was not acknowledged');
    await expect(generateRiskPrediction(null, 'p1', 'u1')).rejects.toThrow('not linked to a tenant');

    h.results['data_subject_requests:update'] = none;
    await expect(updateDataSubjectRequest({ id: 'd1' } as never)).rejects.toThrow('was not updated');
    await expect(createDataSubjectRequest(undefined, {} as never)).rejects.toThrow('Company not found');

    h.results['rate_limit_rules:update'] = none;
    await expect(setRateLimitRuleActive('r1', false)).rejects.toThrow('was not saved');
  });

  it('RFIs: an edit sends only the form fields, not a new number and status', async () => {
    const form = { project_id: 'p1', subject: 'Q', description: '', priority: 'high', submitted_to: '', due_date: '' };
    h.results['rfis:update'] = one;
    await saveRFI('c1', 'u1', form, 'r1');
    const update = h.calls.find((c) => c.table === 'rfis' && c.op === 'update');
    expect(update?.arg).toEqual({ project_id: 'p1', subject: 'Q', description: null, priority: 'high', submitted_to: null, due_date: null });

    h.results['rfis:insert'] = one;
    await saveRFI('c1', 'u1', form, undefined, 1_700_000_012_345);
    const insert = h.calls.find((c) => c.table === 'rfis' && c.op === 'insert');
    expect(insert?.arg).toEqual([expect.objectContaining({ company_id: 'c1', rfi_number: 'RFI-00012345', status: 'open', created_by: 'u1' })]);

    h.results['submittals:update'] = none;
    await expect(saveSubmittal('c1', 'u1', { project_id: 'p1', title: 'T' } as never, 's1')).rejects.toThrow('was not saved');
    await expect(setSubmittalStatus('s1', 'approved')).rejects.toThrow('was not saved');
  });

  it('AI models: an update that touched nothing fails; the alias refresh reads its errors', async () => {
    h.results['ai_model_configurations:update'] = none;
    await expect(saveAIModel({ provider: 'claude', is_default: false } as never, 'm1')).rejects.toThrow('was not saved');

    h.queue.ai_model_configurations = [
      { data: [{ id: 'a1', model_family: 'sonnet', points_to_model: 'old', model_display_name: 'Sonnet' }], error: null },
      boom,
    ];
    await expect(refreshAIModelAliases()).rejects.toMatchObject({ message: 'boom' });

    h.queue.ai_model_configurations = [
      { data: [{ id: 'a1', model_family: 'sonnet', points_to_model: 'old', model_display_name: 'Sonnet' }], error: null },
      { data: { model_name: 'new' }, error: null },
    ];
    h.results['ai_model_configurations:update'] = one;
    await expect(refreshAIModelAliases()).resolves.toBe(1);
  });

  it('keywords: a replace import stops when the delete fails instead of inserting a second copy', async () => {
    h.results['keyword_research_data:delete'] = boom;
    await expect(importKeywords('c1', [{ keyword: 'a' } as never], false)).rejects.toMatchObject({ message: 'boom' });
    expect(h.calls.some((c) => c.table === 'keyword_research_data' && c.op === 'insert')).toBe(false);

    h.results['keyword_research_data:update'] = one;
    await expect(setBlogSelection('c1', ['a', 'b'])).rejects.toThrow('Only 1 of 2 keywords were selected');

    h.results['keyword_research_data:delete'] = one;
    await expect(deleteKeywords('c1', ['a', 'b'])).rejects.toThrow('Only 1 of 2 keywords were deleted');
    await expect(deleteKeywords('c1')).resolves.toBe(1);
  });

  it('auto scheduling and workflows', async () => {
    h.results['auto_schedules:update'] = none;
    await expect(publishAutoSchedule('s1')).rejects.toThrow('was not published');
    await expect(generateAutoSchedule(null, 'u1', {} as never)).rejects.toThrow('not linked to a tenant');
    await expect(generateAutoSchedule('t1', 'u1', {} as never)).rejects.toThrow('session has expired');

    h.results.workflows = { data: { description: 'd', category: 'c', execution_order: 3 }, error: null };
    h.results['workflows:insert'] = one;
    await copyWorkflow('u1', 'w1', 'From template', false);
    const insert = h.calls.find((c) => c.table === 'workflows' && c.op === 'insert');
    expect(insert?.arg).toEqual({ user_id: 'u1', name: 'From template', description: 'd', category: 'c', is_active: false });

    h.results['workflows:delete'] = none;
    await expect(deleteWorkflow('w1')).rejects.toThrow('was not deleted');
    expect(summariseWorkflows([
      { is_active: true, execution_count: 4, success_count: 3 },
      { is_active: false, execution_count: 0, success_count: 0 },
    ] as never)).toEqual({ total_workflows: 2, active_workflows: 1, total_executions: 4, success_rate: 75 });

    h.results['error_logs:update'] = none;
    await expect(setErrorLogResolved('e1', true, 'u1')).rejects.toThrow('was not updated');
  });
});

describe('keys carry company_id', () => {
  it('every new key names the company', () => {
    for (const key of [
      pseoAdminKey('c1'),
      safetyAutomationKey('c1', 'u1'),
      riskPredictionKey('c1', 'u1'),
      gdprComplianceKey('c1'),
      rateLimitingKey('c1'),
      rfiSubmittalKey('c1'),
      aiModelsKey('c1'),
      keywordResearchKey('c1'),
      adminIntelligenceKey('c1'),
      autoSchedulingKey('c1', 'u1'),
      workflowAutomationKey('c1', 'u1'),
      errorLogsKey('c1'),
    ]) {
      expect(key).toContain('c1');
    }
  });
});

describe('hooks', () => {
  it('useGDPRCompliance surfaces a failed read as an error, not as zero requests', async () => {
    h.results.consent_records = boom;
    const client = newClient();
    const { result } = renderHook(() => useGDPRCompliance(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.error).toMatchObject({ message: 'boom' }));
    expect(result.current.data).toBeUndefined();
  });
});
