/**
 * Read-only lists for the project Contacts, Daily Reports and Estimates tabs (US-266).
 *
 * Each tab loaded its list in a useEffect and, on a failed read, toasted over
 * an empty state ("No contacts", "No daily reports yet"). They read through
 * these queries now and show the error in place of the list.
 *
 * Filters are the ones each tab used: contacts and daily reports by project
 * only (RLS scopes them), estimates by project and company.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export async function fetchProjectContacts<Row>(projectId: string): Promise<Row[]> {
  const { data, error } = await supabase
    .from('project_contacts')
    .select(`
      *,
      contacts!project_contacts_contact_id_fkey (
        id,
        first_name,
        last_name,
        company_name,
        email,
        phone,
        contact_type
      )
    `)
    .eq('project_id', projectId);
  if (error) throw error;
  return (data ?? []) as unknown as Row[];
}

/** The five most recent reports, each with the number of photo_attachments rows behind it. */
export async function fetchRecentProjectDailyReports<Row>(projectId: string): Promise<(Row & { photo_count: number })[]> {
  const { data, error } = await supabase
    .from('daily_reports')
    // photo_attachments rather than the photos array: the count has to
    // match what the timeline and the handover bundle will show, and those
    // read the rows (US-330).
    .select('*, photo_attachments(count)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) throw error;
  return ((data ?? []) as unknown as Array<Row & { photo_attachments?: Array<{ count: number }> }>).map((r) => ({
    ...r,
    photo_count: r.photo_attachments?.[0]?.count ?? 0,
  }));
}

export async function fetchProjectEstimates<Row>(projectId: string, companyId: string): Promise<Row[]> {
  const { data, error } = await supabase
    .from('estimates')
    .select('*')
    .eq('project_id', projectId)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Row[];
}

type TabList = 'contacts' | 'daily-reports' | 'estimates';

export const projectTabListKey = (list: TabList, companyId: string | undefined, projectId: string) =>
  [list, companyId, 'project-tab', projectId] as const;

function useProjectTabList<Row>(list: TabList, projectId: string, fetch: (companyId: string) => Promise<Row[]>) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  // Every tab waited for a company before its first read; so do these.
  const ready = !!projectId && !!companyId;
  const query = useQuery({
    queryKey: projectTabListKey(list, companyId, projectId),
    queryFn: () => fetch(companyId as string),
    enabled: ready,
  });
  return {
    rows: query.data ?? [],
    isLoading: query.isLoading || !ready,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

export const useProjectContacts = <Row>(projectId: string) =>
  useProjectTabList<Row>('contacts', projectId, () => fetchProjectContacts<Row>(projectId));

export const useRecentProjectDailyReports = <Row>(projectId: string) =>
  useProjectTabList<Row & { photo_count: number }>('daily-reports', projectId, () =>
    fetchRecentProjectDailyReports<Row>(projectId),
  );

export const useProjectEstimates = <Row>(projectId: string) =>
  useProjectTabList<Row>('estimates', projectId, (companyId) => fetchProjectEstimates<Row>(projectId, companyId));
