/**
 * Reads and writes behind /gdpr-compliance (US-266).
 *
 * The page ran seven queries and read the error of none of them: a failed read
 * of data_subject_requests showed "0 active requests" and an empty list, which
 * on a page whose job is meeting statutory response deadlines reads as "nothing
 * is due". The counts fetched every id to take .length, which PostgREST caps at
 * 1000 rows. Counts are now head counts, every read throws, and the updates
 * select the id back so a write RLS filtered to nothing is reported.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface GDPRStats {
  activeRequests: number;
  overdueSoon: number;
  consentRecords: number;
  retentionPolicies: number;
  processingActivities: number;
}

export interface DataSubjectRequest {
  id: string;
  request_type: string;
  requester_email: string;
  requester_name: string | null;
  status: string;
  priority: string;
  verification_status: string;
  due_date: string | null;
  created_at: string;
  assigned_to: string | null;
  user_profiles?: { first_name: string; last_name: string } | null;
}

export interface ConsentRecord {
  id: string;
  user_id: string | null;
  email: string | null;
  consent_type: string;
  purpose: string;
  consent_given: boolean;
  lawful_basis: string;
  created_at: string;
  withdrawal_date: string | null;
}

export interface NewDataSubjectRequest {
  request_type: string;
  requester_email: string;
  requester_name: string;
  request_details: string;
}

export const gdprComplianceKey = (companyId: string | undefined) => ['gdpr-compliance', companyId] as const;

const OPEN = '(completed,rejected,cancelled)';
const isoDate = (d: Date) => d.toISOString().split('T')[0];

async function headCount(query: PromiseLike<{ count: number | null; error: unknown }>): Promise<number> {
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function fetchGDPRCompliance(now = new Date()) {
  const [activeRequests, overdueSoon, consentRecords, retentionPolicies, processingActivities] = await Promise.all([
    headCount(supabase.from('data_subject_requests').select('id', { count: 'exact', head: true }).not('status', 'in', OPEN)),
    headCount(
      supabase
        .from('data_subject_requests')
        .select('id', { count: 'exact', head: true })
        .not('status', 'in', OPEN)
        .gte('due_date', isoDate(now))
        .lte('due_date', isoDate(addDays(now, 7))),
    ),
    headCount(supabase.from('consent_records').select('id', { count: 'exact', head: true })),
    headCount(supabase.from('data_retention_policies').select('id', { count: 'exact', head: true }).eq('is_active', true)),
    headCount(supabase.from('processing_activities').select('id', { count: 'exact', head: true }).eq('is_active', true)),
  ]);

  const { data: requests, error: requestsError } = await supabase
    .from('data_subject_requests')
    .select(`
      *,
      user_profiles:assigned_to (
        first_name,
        last_name
      )
    `)
    .order('created_at', { ascending: false })
    .limit(20);
  if (requestsError) throw requestsError;

  const { data: consents, error: consentsError } = await supabase
    .from('consent_records')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (consentsError) throw consentsError;

  const stats: GDPRStats = { activeRequests, overdueSoon, consentRecords, retentionPolicies, processingActivities };
  return {
    stats,
    requests: (requests ?? []).map((r) => ({
      id: r.id,
      request_type: r.request_type,
      requester_email: r.requester_email,
      requester_name: r.requester_name,
      status: r.status,
      priority: r.priority,
      verification_status: r.verification_status,
      due_date: r.due_date,
      created_at: r.created_at,
      assigned_to: r.assigned_to,
      user_profiles: r.user_profiles && !('error' in r.user_profiles) ? r.user_profiles : null,
    })) as DataSubjectRequest[],
    consents: (consents ?? []) as unknown as ConsentRecord[],
  };
}

export async function createDataSubjectRequest(companyId: string | undefined, req: NewDataSubjectRequest): Promise<void> {
  if (!companyId) throw new Error('Company not found');
  const { data, error } = await supabase
    .from('data_subject_requests')
    .insert([{
      company_id: companyId,
      request_type: req.request_type,
      requester_email: req.requester_email,
      requester_name: req.requester_name || null,
      request_details: req.request_details ? { details: req.request_details } : null,
    }])
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('The request was not created. You may not have permission to add one.');
}

export async function updateDataSubjectRequest(r: DataSubjectRequest): Promise<void> {
  const { data, error } = await supabase
    .from('data_subject_requests')
    .update({
      request_type: r.request_type,
      requester_email: r.requester_email,
      requester_name: r.requester_name,
      status: r.status,
      priority: r.priority,
      verification_status: r.verification_status,
    })
    .eq('id', r.id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('The request was not updated. You may not have permission to edit it.');
}

export async function updateConsentRecord(c: ConsentRecord): Promise<void> {
  const { data, error } = await supabase
    .from('consent_records')
    .update({
      consent_type: c.consent_type,
      purpose: c.purpose,
      consent_given: c.consent_given,
      lawful_basis: c.lawful_basis,
    })
    .eq('id', c.id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('The consent record was not updated. You may not have permission to edit it.');
}

export function useGDPRCompliance() {
  const { user, userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = gdprComplianceKey(companyId);

  const query = useQuery({ queryKey: key, queryFn: () => fetchGDPRCompliance(), enabled: !!user });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const create = useMutation({
    mutationFn: (req: NewDataSubjectRequest) => createDataSubjectRequest(companyId, req),
    onSettled: invalidate,
  });
  const updateRequest = useMutation({ mutationFn: updateDataSubjectRequest, onSettled: invalidate });
  const updateConsent = useMutation({ mutationFn: updateConsentRecord, onSettled: invalidate });

  return {
    data: query.data,
    isLoading: query.isLoading || !user,
    error: query.error as Error | null,
    refetch: query.refetch,
    createRequest: (req: NewDataSubjectRequest) => create.mutateAsync(req),
    updateRequest: (r: DataSubjectRequest) => updateRequest.mutateAsync(r),
    updateConsent: (c: ConsentRecord) => updateConsent.mutateAsync(c),
  };
}
