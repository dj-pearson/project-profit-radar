/**
 * Reads and writes behind the Auto Scheduling admin page (US-266).
 *
 * The page looked up tenant_id before each of its three reads and caught every
 * error into console.error, so a failed read of auto_schedules rendered as "no
 * schedules yet" and a failed crew read labelled every assignment "Unknown".
 * Publishing checked the error but not the row count.
 *
 * Reads throw; publish selects its id back. The tenant is looked up once.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, getEdgeFunctionUrl } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTenantId, NO_TENANT_MESSAGE } from './tenantScope';

export interface AutoSchedule {
  id: string;
  schedule_name: string;
  schedule_date: string;
  optimization_score: number;
  computation_time_ms: number;
  status: 'draft' | 'published' | 'active' | 'completed';
  minimize_travel: boolean;
  balance_workload: boolean;
  respect_skills: boolean;
  iterations_count: number;
  created_at: string;
}

export interface Assignment {
  user_id: string;
  project_id: string;
  date: string;
}

export interface SchedulingProject {
  id: string;
  name: string;
  status: string;
}

export interface CrewMember {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

export interface ScheduleRequest {
  schedule_name: string;
  schedule_date: string;
  project_ids: string[];
  minimize_travel: boolean;
  balance_workload: boolean;
  respect_skills: boolean;
  iterations: number;
}

export interface AutoSchedulingData {
  tenantId: string | null;
  projects: SchedulingProject[];
  crewMembers: CrewMember[];
  schedules: AutoSchedule[];
}

export const autoSchedulingKey = (companyId: string | undefined, userId: string | undefined) =>
  ['auto-scheduling', companyId, userId] as const;

export async function fetchAutoScheduling(userId: string): Promise<AutoSchedulingData> {
  const tenantId = await fetchTenantId(userId);
  if (!tenantId) return { tenantId, projects: [], crewMembers: [], schedules: [] };

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, status')
    .eq('tenant_id', tenantId)
    .in('status', ['planning', 'active', 'on_hold'])
    .order('name');
  if (projectsError) throw projectsError;

  const { data: crew, error: crewError } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name, role')
    .eq('tenant_id', tenantId)
    .in('role', ['field_supervisor', 'foreman'])
    .order('first_name');
  if (crewError) throw crewError;

  const { data: schedules, error: schedulesError } = await supabase
    .from('auto_schedules')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (schedulesError) throw schedulesError;

  return {
    tenantId,
    projects: (projects ?? []) as SchedulingProject[],
    crewMembers: (crew ?? []) as CrewMember[],
    schedules: (schedules ?? []) as unknown as AutoSchedule[],
  };
}

export async function generateAutoSchedule(
  tenantId: string | null,
  userId: string | undefined,
  request: ScheduleRequest,
): Promise<{ schedule: AutoSchedule; assignments: Assignment[] }> {
  if (!tenantId) throw new Error(NO_TENANT_MESSAGE);
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Your session has expired. Sign in again.');

  const response = await fetch(getEdgeFunctionUrl('auto-scheduling'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ tenant_id: tenantId, user_id: userId, ...request }),
  });
  if (!response.ok) throw new Error(`The scheduler returned ${response.status}.`);
  const result = await response.json();
  return { schedule: result.schedule, assignments: result.assignments ?? [] };
}

export async function publishAutoSchedule(scheduleId: string, now = new Date()): Promise<void> {
  const { data, error } = await supabase
    .from('auto_schedules')
    .update({ status: 'published', published_at: now.toISOString() })
    .eq('id', scheduleId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The schedule was not published. You may not have permission to change it.');
  }
}

export function useAutoScheduling() {
  const { user, userProfile } = useAuth();
  const userId = user?.id;
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = autoSchedulingKey(companyId, userId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchAutoScheduling(userId as string),
    enabled: !!userId,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const generate = useMutation({
    mutationFn: (request: ScheduleRequest) => generateAutoSchedule(query.data?.tenantId ?? null, userId, request),
    onSettled: invalidate,
  });
  const publish = useMutation({ mutationFn: (id: string) => publishAutoSchedule(id), onSettled: invalidate });

  return {
    projects: query.data?.projects ?? [],
    crewMembers: query.data?.crewMembers ?? [],
    schedules: query.data?.schedules ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    generating: generate.isPending,
    generate: (request: ScheduleRequest) => generate.mutateAsync(request),
    publish: (id: string) => publish.mutateAsync(id),
  };
}
