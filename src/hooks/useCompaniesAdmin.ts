/**
 * Companies and a company's settings for the root-admin /admin/companies page (US-266).
 *
 * The page embedded user_profiles!inner(count) and projects!inner(count), so
 * a company with no users or no projects yet (every new signup) was missing
 * from the list, and then ran two more count queries per company, turning any
 * failed count into 0. A failed settings read showed "No settings configured
 * for this company". The counts come from the one embed now (no !inner, so
 * every company is listed), and both reads throw.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AdminCompany {
  id: string;
  name: string;
  address: string | null;
  industry_type: string | null;
  company_size: string | null;
  subscription_tier: string | null;
  subscription_status: string | null;
  trial_end_date: string | null;
  created_at: string;
  _count: { users: number; projects: number };
}

export const companiesAdminKey = (companyId: string | undefined, userId: string | undefined) =>
  ['admin-companies', companyId, userId] as const;

const embeddedCount = (v: unknown) => (Array.isArray(v) && v[0] && typeof v[0].count === 'number' ? v[0].count : 0);

export async function fetchAdminCompanies(): Promise<AdminCompany[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*, user_profiles(count), projects(count)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const { user_profiles, projects, ...company } = row;
    return {
      ...(company as Omit<AdminCompany, '_count'>),
      _count: { users: embeddedCount(user_profiles), projects: embeddedCount(projects) },
    };
  });
}

/** null when the company has no settings row; a failed read throws. */
export async function fetchAdminCompanySettings(companyId: string) {
  const { data, error } = await supabase.from('company_settings').select('*').eq('company_id', companyId).maybeSingle();
  if (error) throw error;
  return data;
}

export function useCompaniesAdmin({ enabled, selectedCompanyId }: { enabled: boolean; selectedCompanyId: string | null }) {
  const { user, userProfile } = useAuth();
  const userId = user?.id;
  const companyId = userProfile?.company_id ?? undefined;
  const key = companiesAdminKey(companyId, userId);

  const companies = useQuery({ queryKey: key, queryFn: fetchAdminCompanies, enabled: enabled && !!userId });
  const settings = useQuery({
    queryKey: [...key, 'settings', selectedCompanyId],
    queryFn: () => fetchAdminCompanySettings(selectedCompanyId as string),
    enabled: enabled && !!userId && !!selectedCompanyId,
  });
  return { companies, settings };
}
