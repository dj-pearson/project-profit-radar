/**
 * Leads and opportunities for /crm, /crm/leads and /crm/opportunities (US-266).
 *
 * The three pages loaded through useLoadingState and reloaded by hand after
 * each write, so an update on the leads page left the dashboard's numbers
 * stale until a full reload. They share the ['leads', companyId] and
 * ['opportunities', companyId] prefixes now and a write invalidates both.
 *
 * The opportunities page also read qualified leads for its "from lead" picker
 * and ignored a failure; the picker's read error is returned now.
 *
 * Updates select the id back so an edit RLS filtered to zero rows fails instead
 * of toasting "Lead updated" over an unchanged row.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export const leadsKey = (companyId: string | undefined) => ['leads', companyId] as const;
export const opportunitiesKey = (companyId: string | undefined) => ['opportunities', companyId] as const;
export const crmDashboardKey = (companyId: string | undefined) => [...leadsKey(companyId), 'crm-dashboard'] as const;
export const crmLeadsPageKey = (companyId: string | undefined) => [...leadsKey(companyId), 'page'] as const;
export const crmOpportunitiesPageKey = (companyId: string | undefined) =>
  [...opportunitiesKey(companyId), 'page'] as const;
export const qualifiedLeadOptionsKey = (companyId: string | undefined) =>
  [...leadsKey(companyId), 'qualified-options'] as const;

const NO_COMPANY = 'No company associated with user';

export interface CRMDashboardLead {
  status: string;
  created_at?: string | null;
}
export interface CRMDashboardOpportunity {
  estimated_value?: number | null;
}

export interface CRMDashboardData<L, O> {
  leads: L[];
  opportunities: O[];
  totalLeads: number;
  qualifiedLeads: number;
  totalOpportunities: number;
  totalPipelineValue: number;
  avgConversionRate: number;
  thisMonthNewLeads: number;
  followUpsDue: number;
}

export function summariseCRM<L extends CRMDashboardLead, O extends CRMDashboardOpportunity>(
  leads: L[],
  opportunities: O[],
  now: Date = new Date(),
): CRMDashboardData<L, O> {
  const monthStart = new Date(now);
  monthStart.setDate(1);
  const qualified = leads.filter((l) => ['qualified', 'proposal_sent', 'negotiating'].includes(l.status));
  const thisMonth = leads.filter((l) => l.created_at && new Date(l.created_at) >= monthStart);
  const won = leads.filter((l) => l.status === 'won');
  return {
    leads,
    opportunities,
    totalLeads: leads.length,
    qualifiedLeads: qualified.length,
    totalOpportunities: opportunities.length,
    totalPipelineValue: opportunities.reduce((sum, o) => sum + (o.estimated_value || 0), 0),
    avgConversionRate: leads.length > 0 ? (won.length / leads.length) * 100 : 0,
    thisMonthNewLeads: thisMonth.length,
    followUpsDue: 0,
  };
}

/** Leads are scoped by RLS here, as the dashboard always was; opportunities by company. */
export async function fetchCRMDashboard<L extends CRMDashboardLead, O extends CRMDashboardOpportunity>(
  companyId: string,
): Promise<CRMDashboardData<L, O>> {
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id, first_name, last_name, email, phone, company_name, status, lead_source, priority, assigned_to, created_at')
    .order('created_at', { ascending: false });
  if (leadsError) throw leadsError;

  const { data: opportunities, error: opportunitiesError } = await supabase
    .from('opportunities')
    .select('id, name, estimated_value, probability_percent, stage, expected_close_date, account_manager, project_type, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (opportunitiesError) throw opportunitiesError;

  return summariseCRM((leads ?? []) as unknown as L[], (opportunities ?? []) as unknown as O[]);
}

/** Scoped to the caller's company explicitly, as the rest of the CRM is (US-365). */
export async function fetchCRMLeads<Row>(companyId: string): Promise<Row[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Row[];
}

export async function fetchCRMOpportunities<Row>(companyId: string): Promise<Row[]> {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Row[];
}

export async function fetchQualifiedLeadOptions<Row>(): Promise<Row[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('id, first_name, last_name')
    .in('status', ['qualified', 'proposal_sent', 'negotiating'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Row[];
}

function requireRow(data: unknown[] | null, message: string) {
  if (!data || data.length === 0) throw new Error(message);
}

export async function insertLead(row: TablesInsert<'leads'>): Promise<void> {
  const { data, error } = await supabase.from('leads').insert([row]).select('id');
  if (error) throw error;
  requireRow(data, 'The lead was not created. You may not have permission to add leads.');
}

export async function updateLead(id: string, patch: TablesUpdate<'leads'>): Promise<void> {
  const { data, error } = await supabase.from('leads').update(patch).eq('id', id).select('id');
  if (error) throw error;
  requireRow(data, 'The lead was not changed. You may not have permission to edit it.');
}

export async function insertOpportunity(row: TablesInsert<'opportunities'>): Promise<void> {
  const { data, error } = await supabase.from('opportunities').insert([row]).select('id');
  if (error) throw error;
  requireRow(data, 'The opportunity was not created. You may not have permission to add opportunities.');
}

export async function updateOpportunity(id: string, patch: TablesUpdate<'opportunities'>): Promise<void> {
  const { data, error } = await supabase.from('opportunities').update(patch).eq('id', id).select('id');
  if (error) throw error;
  requireRow(data, 'The opportunity was not changed. You may not have permission to edit it.');
}

function useCRMWrites(companyId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: leadsKey(companyId) }),
      queryClient.invalidateQueries({ queryKey: opportunitiesKey(companyId) }),
    ]);
  return {
    invalidate,
    createLead: useMutation({ mutationFn: insertLead, onSettled: invalidate }),
    updateLead: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: TablesUpdate<'leads'> }) => updateLead(id, patch),
      onSettled: invalidate,
    }),
    createOpportunity: useMutation({ mutationFn: insertOpportunity, onSettled: invalidate }),
    updateOpportunity: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: TablesUpdate<'opportunities'> }) => updateOpportunity(id, patch),
      onSettled: invalidate,
    }),
  };
}

/** A profile with no company reads nothing; the pages said so rather than showing an empty CRM. */
function noCompanyError(enabled: boolean, hasProfile: boolean, companyId: string | undefined) {
  return enabled && hasProfile && !companyId ? new Error(NO_COMPANY) : null;
}

export function useCRMDashboard<L extends CRMDashboardLead, O extends CRMDashboardOpportunity>(
  { enabled = true }: { enabled?: boolean } = {},
) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const query = useQuery({
    queryKey: crmDashboardKey(companyId),
    queryFn: () => fetchCRMDashboard<L, O>(companyId as string),
    enabled: enabled && !!companyId,
  });
  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? noCompanyError(enabled, !!userProfile, companyId),
    refetch: query.refetch,
    ...useCRMWrites(companyId),
  };
}

export function useCRMLeads<Row>({ enabled = true }: { enabled?: boolean } = {}) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  // No company, no leads (US-365): the page shows an empty list, not an error.
  const query = useQuery({
    queryKey: crmLeadsPageKey(companyId),
    queryFn: () => fetchCRMLeads<Row>(companyId as string),
    enabled: enabled && !!companyId,
  });
  return {
    leads: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    ...useCRMWrites(companyId),
  };
}

export function useCRMOpportunities<Row, LeadOption>({ enabled = true }: { enabled?: boolean } = {}) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const opportunities = useQuery({
    queryKey: crmOpportunitiesPageKey(companyId),
    queryFn: () => fetchCRMOpportunities<Row>(companyId as string),
    enabled: enabled && !!companyId,
  });
  const leadOptions = useQuery({
    queryKey: qualifiedLeadOptionsKey(companyId),
    queryFn: () => fetchQualifiedLeadOptions<LeadOption>(),
    enabled: enabled && !!companyId,
  });
  return {
    opportunities: opportunities.data ?? [],
    isLoading: opportunities.isLoading,
    error: (opportunities.error as Error | null) ?? noCompanyError(enabled, !!userProfile, companyId),
    refetch: opportunities.refetch,
    leadOptions: leadOptions.data ?? [],
    leadOptionsError: leadOptions.error as Error | null,
    ...useCRMWrites(companyId),
  };
}
