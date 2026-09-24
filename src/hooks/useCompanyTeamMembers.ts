/**
 * The people in the signed-in user's company, for assignee pickers (US-313).
 *
 * The Communication Hub's RFI dialog used to offer hardcoded names ("David
 * Brown (Architect)"); this is the real list from user_profiles.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TeamMember } from '@/lib/validations/communication';

export const companyTeamMembersKey = (companyId: string | undefined) => ['company-team-members', companyId] as const;

export async function fetchCompanyTeamMembers(companyId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name')
    .eq('company_id', companyId)
    .order('first_name');
  if (error) throw error;
  return (data ?? []) as TeamMember[];
}

export function useCompanyTeamMembers() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  return useQuery({
    queryKey: companyTeamMembersKey(companyId),
    queryFn: () => fetchCompanyTeamMembers(companyId as string),
    enabled: !!companyId,
  });
}
