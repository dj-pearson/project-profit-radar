/**
 * US-266, fifth pass: safety overview, training and OSHA deadlines, smart
 * procurement, lead nurturing, audit/compliance and lead management.
 *
 * Same contract as the earlier batches: a failed read throws (these rendered
 * a failed read as zeros or "nothing here"), a write RLS filtered to zero
 * rows fails, keys carry company_id.
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

import {
  fetchSafetyOverview, fetchOsha300Incidents, fetchTrainingCertifications, setCertificationStatus,
  insertTrainingCertification, fetchComplianceDeadlines, completeComplianceDeadline, insertComplianceDeadline,
  safetyKey, useSafetyOverview,
} from '../useSafetyPage';
import { fetchSmartProcurement, approvePurchaseRecommendation, smartProcurementKey } from '../useSmartProcurement';
import {
  fetchNurturingCampaigns, fetchCampaignDetails, createNurturingCampaign, addCampaignStep, setCampaignActive,
  nurturingCampaignsKey,
} from '../useLeadNurturingCampaigns';
import {
  fetchAuditCompliance, queueComplianceReport, setGDPRRequestStatus, setRetentionPolicyActive, auditComplianceKey,
} from '../useAuditLoggingCompliance';
import { fetchLeads, fetchDemoRequests, fetchSalesContacts, fetchLeadActivities, setLeadRecordStatus, leadManagementKey } from '../useLeadManagement';

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
  it('safety overview: counts come from head requests, and any failed count throws', async () => {
    h.queue.safety_incidents = [{ data: null, error: null, count: 7 }, { data: null, error: null, count: 2 }];
    h.results.safety_checklist_responses = { data: null, error: null, count: 3 };
    h.results.training_certifications = { data: null, error: null, count: 1 };
    h.results.osha_compliance_deadlines = { data: null, error: null, count: 4 };
    h.results.safety_checklists = { data: [{ id: 'k1', name: 'Daily', checklist_type: 'daily', is_active: true }], error: null };
    const overview = await fetchSafetyOverview('c1', new Date(2026, 8, 23));
    expect(overview.stats).toEqual({
      totalIncidents: 7, openIncidents: 2, checklistsCompleted: 3, expiringCertifications: 1, upcomingDeadlines: 4,
    });
    expect(overview.checklists).toHaveLength(1);
    const heads = h.calls.filter((c) => c.op === 'select' && Array.isArray(c.arg));
    expect(heads.length).toBe(5);
    for (const c of heads) expect((c.arg as unknown[])[1]).toEqual({ count: 'exact', head: true });

    h.results.training_certifications = boom;
    await expect(fetchSafetyOverview('c1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('OSHA 300 export throws rather than reporting "no incidents"', async () => {
    h.results.safety_incidents = boom;
    await expect(fetchOsha300Incidents('c1', 2026)).rejects.toMatchObject({ message: 'boom' });
  });

  it('training: a failed people read throws, and names come from the user list', async () => {
    h.results.user_profiles = { data: [{ id: 'p1', first_name: 'Ana', last_name: 'Ruiz' }], error: null };
    h.results.training_certifications = {
      data: [{ id: 't1', user_id: 'p1' }, { id: 't2', user_id: 'gone' }], error: null,
    };
    const { certifications } = await fetchTrainingCertifications('c1');
    expect(certifications.map((c) => c.employee_name)).toEqual(['Ana Ruiz', undefined]);

    h.results.user_profiles = boom;
    await expect(fetchTrainingCertifications('c1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('compliance deadlines: a failed read throws; the assignee is the related user', async () => {
    h.results.user_profiles = { data: [{ id: 'p1', first_name: 'Ana', last_name: null }], error: null };
    h.results.osha_compliance_deadlines = {
      data: [
        { id: 'd1', related_entity_type: 'user', related_entity_id: 'p1' },
        { id: 'd2', related_entity_type: 'project', related_entity_id: 'p1' },
      ],
      error: null,
    };
    const { deadlines } = await fetchComplianceDeadlines('c1');
    expect(deadlines.map((d) => d.assigned_user_name)).toEqual(['Ana', undefined]);

    h.results.osha_compliance_deadlines = boom;
    await expect(fetchComplianceDeadlines('c1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('smart procurement: no tenant reads nothing; a failed read throws', async () => {
    h.results.user_profiles = { data: { tenant_id: null }, error: null };
    await expect(fetchSmartProcurement('u1')).resolves.toEqual({
      tenantId: null, forecasts: [], suppliers: [], recommendations: [],
    });
    expect(h.calls.some((c) => c.table === 'material_forecasts')).toBe(false);

    h.results.user_profiles = { data: { tenant_id: 't1' }, error: null };
    h.results.supplier_catalog = boom;
    await expect(fetchSmartProcurement('u1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('nurturing: campaigns are read by company, and a failed step read throws', async () => {
    await fetchNurturingCampaigns('c1');
    expect(h.calls).toContainEqual({ table: 'lead_nurturing_campaigns', op: 'eq', arg: ['company_id', 'c1'] });
    h.results.nurturing_campaign_steps = boom;
    await expect(fetchCampaignDetails('k1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('audit: the card count is the exact total, not the 100-row page', async () => {
    h.results.audit_logs = { data: [{ id: 'a1' }], error: null, count: 4321 };
    const data = await fetchAuditCompliance();
    expect(data.auditLogTotal).toBe(4321);
    h.results.data_retention_policies = boom;
    await expect(fetchAuditCompliance()).rejects.toMatchObject({ message: 'boom' });
  });

  it('lead management: each list and the activity read throw', async () => {
    h.results.leads = boom;
    await expect(fetchLeads()).rejects.toMatchObject({ message: 'boom' });
    h.results.demo_requests = boom;
    await expect(fetchDemoRequests()).rejects.toMatchObject({ message: 'boom' });
    h.results.sales_contact_requests = boom;
    await expect(fetchSalesContacts()).rejects.toMatchObject({ message: 'boom' });
    h.results.lead_activities = boom;
    await expect(fetchLeadActivities('l1')).rejects.toMatchObject({ message: 'boom' });
  });
});

describe('writes fail when RLS filters them to zero rows', () => {
  it('safety', async () => {
    h.results['training_certifications:update'] = none;
    await expect(setCertificationStatus('t1', 'expired')).rejects.toThrow('was not changed');
    h.results['training_certifications:insert'] = none;
    await expect(insertTrainingCertification({ company_id: 'c1' } as never)).rejects.toThrow('was not saved');
    h.results['osha_compliance_deadlines:insert'] = none;
    await expect(insertComplianceDeadline({ company_id: 'c1' } as never)).rejects.toThrow('was not saved');
    h.results['osha_compliance_deadlines:update'] = none;
    await expect(completeComplianceDeadline('d1', 'u1')).rejects.toThrow('was not marked complete');
  });

  it('procurement and nurturing', async () => {
    h.results['purchase_recommendations:update'] = none;
    await expect(approvePurchaseRecommendation('r1')).rejects.toThrow('was not approved');

    h.results['lead_nurturing_campaigns:insert'] = none;
    await expect(createNurturingCampaign('c1', {} as never)).rejects.toThrow('was not created');

    h.results['nurturing_campaign_steps:insert'] = one;
    h.results['lead_nurturing_campaigns:update'] = none;
    await expect(addCampaignStep('k1', 2, {} as never)).rejects.toThrow("step count was not updated");
    h.results['lead_nurturing_campaigns:update'] = boom;
    await expect(addCampaignStep('k1', 2, {} as never)).rejects.toThrow("step count was not: boom");
    await expect(setCampaignActive('k1', false)).rejects.toMatchObject({ message: 'boom' });
  });

  it('audit and leads', async () => {
    h.results['compliance_reports:insert'] = none;
    await expect(queueComplianceReport('u1')).rejects.toThrow('was not queued');
    h.results['gdpr_requests:update'] = none;
    await expect(setGDPRRequestStatus('g1', 'completed')).rejects.toThrow('was not updated');
    h.results['data_retention_policies:update'] = none;
    await expect(setRetentionPolicyActive('p1', true)).rejects.toThrow('was not changed');

    h.results['leads:update'] = none;
    await expect(setLeadRecordStatus('leads', 'l1', 'lost')).rejects.toThrow('was not changed');
    h.results['demo_requests:update'] = one;
    await setLeadRecordStatus('demo_requests', 'd1', 'scheduled');
    expect(h.calls).toContainEqual({ table: 'demo_requests', op: 'update', arg: { status: 'scheduled' } });
    h.results['leads:update'] = one;
    await setLeadRecordStatus('leads', 'l1', 'lost');
    expect(h.calls).toContainEqual({ table: 'leads', op: 'update', arg: { lead_status: 'lost' } });
  });
});

describe('keys carry company_id', () => {
  it('every new key names the company', () => {
    for (const key of [
      safetyKey('c1'),
      smartProcurementKey('c1', 'u1'),
      nurturingCampaignsKey('c1'),
      auditComplianceKey('c1', 'u1'),
      leadManagementKey('c1', 'u1'),
    ]) {
      expect(key).toContain('c1');
    }
  });
});

describe('hooks', () => {
  it('useSafetyOverview surfaces a failed read as an error, not as zero incidents', async () => {
    h.results.safety_incidents = boom;
    const client = newClient();
    const { result } = renderHook(() => useSafetyOverview(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.error).toMatchObject({ message: 'boom' }));
    expect(result.current.stats).toBeNull();
  });
});
