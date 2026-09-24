/**
 * Reads and writes behind /admin/leads (US-266).
 *
 * The page loaded only the active tab, so the other two tab counts read 0
 * until clicked, and reloaded everything by hand after each write. A failed
 * activity read was swallowed into console.error and the detail dialog said
 * "No activity recorded". The open lead was a snapshot, so changing its
 * status left the dialog's select on the old value.
 *
 * Each list is its own query (so the tab counts are real) and throws on
 * error. Status writes select the row back so an update RLS filtered to zero
 * rows fails instead of toasting success. These are platform admin tables with
 * no company filter; RLS decides what an admin sees. The key carries the
 * company and user so one account's cache is never served to another.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Lead {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  phone?: string;
  lead_score: number;
  lead_status: 'new' | 'contacted' | 'qualified' | 'demo_scheduled' | 'converted' | 'lost';
  lead_source?: string;
  created_at: string;
  last_activity_at?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export interface DemoRequest {
  id: string;
  lead_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  demo_type: string;
  preferred_date?: string;
  preferred_time?: string;
  status: 'requested' | 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  leads?: Lead;
}

export interface SalesContact {
  id: string;
  lead_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  inquiry_type: string;
  budget_range?: string;
  timeline?: string;
  status: 'new' | 'in_progress' | 'resolved';
  created_at: string;
  leads?: Lead;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  activity_type: string;
  activity_metadata?: Record<string, unknown>;
  created_at: string;
}

export const LEAD_PAGE = 100;

export const leadManagementKey = (companyId: string | undefined, userId: string | undefined) =>
  ['lead-management', companyId, userId] as const;

export async function fetchLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(LEAD_PAGE);
  if (error) throw error;
  return (data ?? []) as unknown as Lead[];
}

export async function fetchDemoRequests(): Promise<DemoRequest[]> {
  const { data, error } = await supabase
    .from('demo_requests')
    .select('*, leads (*)')
    .order('created_at', { ascending: false })
    .limit(LEAD_PAGE);
  if (error) throw error;
  return (data ?? []) as unknown as DemoRequest[];
}

export async function fetchSalesContacts(): Promise<SalesContact[]> {
  const { data, error } = await supabase
    .from('sales_contact_requests')
    .select('*, leads (*)')
    .order('created_at', { ascending: false })
    .limit(LEAD_PAGE);
  if (error) throw error;
  return (data ?? []) as unknown as SalesContact[];
}

export async function fetchLeadActivities(leadId: string): Promise<LeadActivity[]> {
  const { data, error } = await supabase
    .from('lead_activities')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as LeadActivity[];
}

type StatusTable = 'leads' | 'demo_requests' | 'sales_contact_requests';

/** One status write for the three tables; `column` is lead_status on leads, status elsewhere. */
export async function setLeadRecordStatus(table: StatusTable, id: string, status: string): Promise<void> {
  const patch = table === 'leads' ? { lead_status: status } : { status };
  const { data, error } = await supabase
    .from(table as 'leads')
    .update(patch as { lead_status: string })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The status was not changed. You may not have permission to edit this record.');
  }
}

export function useLeadManagement(selectedLeadId: string | null) {
  const { user, userProfile } = useAuth();
  const userId = user?.id;
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = leadManagementKey(companyId, userId);
  const enabled = !!userId;

  const leads = useQuery({ queryKey: [...key, 'leads'], queryFn: fetchLeads, enabled });
  const demos = useQuery({ queryKey: [...key, 'demos'], queryFn: fetchDemoRequests, enabled });
  const sales = useQuery({ queryKey: [...key, 'sales'], queryFn: fetchSalesContacts, enabled });
  const activities = useQuery({
    queryKey: [...key, 'activities', selectedLeadId],
    queryFn: () => fetchLeadActivities(selectedLeadId as string),
    enabled: enabled && !!selectedLeadId,
  });

  const setStatus = useMutation({
    mutationFn: ({ table, id, status }: { table: StatusTable; id: string; status: string }) =>
      setLeadRecordStatus(table, id, status),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return {
    leads,
    demos,
    sales,
    activities,
    setStatus: (table: StatusTable, id: string, status: string) => setStatus.mutateAsync({ table, id, status }),
  };
}
