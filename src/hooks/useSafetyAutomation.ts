/**
 * Reads and writes behind the Safety Automation admin page (US-266).
 *
 * The page looked up the user's tenant_id four separate times, ran each read in
 * its own useEffect, and caught every error into console.error: a failed read
 * of the OSHA 300 log rendered "No incidents reported for this project", which
 * on a safety log is the one thing it must not say by accident. The stats read
 * ignored the error on all four of its queries, and `.single()` on the most
 * recent incident errored whenever there was none.
 *
 * Reads now throw. The incident insert selects its id back.
 *
 * These tables are scoped by tenant_id (not company_id), looked up once from
 * user_profiles. The key still carries company_id and the user id so one
 * account's cache is never served to another.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTenantId, NO_TENANT_MESSAGE } from './tenantScope';

export interface OSHA300Log {
  id: string;
  employee_name: string;
  job_title: string;
  incident_date: string;
  incident_description: string;
  severity: string;
  days_away_from_work: number;
  status: string;
}

export interface SafetyInspection {
  id: string;
  inspection_date: string;
  inspection_type: string;
  pass_fail_status: string;
  overall_score: number;
  hazards_identified: number;
  violations_found: number;
}

export interface ToolboxTalk {
  id: string;
  talk_date: string;
  topic: string;
  attendee_count: number;
}

export interface SafetyTraining {
  id: string;
  training_name: string;
  training_type: string;
  training_date: string;
  expiry_date: string;
  status: string;
  user_id: string;
}

export interface SafetyAutomationOverview {
  tenantId: string | null;
  projects: { id: string; name: string }[];
  trainingRecords: SafetyTraining[];
  expiringTraining: SafetyTraining[];
  stats: {
    total_incidents: number;
    /** null when no incident has been logged, so the card does not claim "0 days". */
    days_since_incident: number | null;
    inspections_this_month: number;
    expiring_certifications: number;
  };
}

export interface SafetyAutomationProjectData {
  oshaLogs: OSHA300Log[];
  inspections: SafetyInspection[];
  toolboxTalks: ToolboxTalk[];
}

export interface NewIncident {
  employee_name: string;
  job_title: string;
  incident_date: string;
  incident_description: string;
  severity: string;
}

export const safetyAutomationKey = (companyId: string | undefined, userId: string | undefined) =>
  ['safety-automation', companyId, userId] as const;

const isoDate = (d: Date) => d.toISOString().split('T')[0];

export async function fetchSafetyAutomationOverview(userId: string, now = new Date()): Promise<SafetyAutomationOverview> {
  const tenantId = await fetchTenantId(userId);
  const empty: SafetyAutomationOverview = {
    tenantId,
    projects: [],
    trainingRecords: [],
    expiringTraining: [],
    stats: { total_incidents: 0, days_since_incident: null, inspections_this_month: 0, expiring_certifications: 0 },
  };
  // A profile with no tenant has nothing to read; the page says so rather than guessing one.
  if (!tenantId) return empty;

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .in('status', ['planning', 'active'])
    .order('name');
  if (projectsError) throw projectsError;

  const { count: incidentCount, error: countError } = await supabase
    .from('osha_300_log')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);
  if (countError) throw countError;

  const { data: recentIncident, error: recentError } = await supabase
    .from('osha_300_log')
    .select('incident_date')
    .eq('tenant_id', tenantId)
    .order('incident_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recentError) throw recentError;

  const firstOfMonth = new Date(now);
  firstOfMonth.setDate(1);
  const { count: inspectionCount, error: inspectionError } = await supabase
    .from('safety_inspections')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('inspection_date', isoDate(firstOfMonth));
  if (inspectionError) throw inspectionError;

  const thirtyDaysOut = new Date(now);
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
  const { data: expiring, error: expiringError } = await supabase
    .from('safety_training')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .lte('expiry_date', isoDate(thirtyDaysOut));
  if (expiringError) throw expiringError;

  const { data: training, error: trainingError } = await supabase
    .from('safety_training')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('training_date', { ascending: false })
    .limit(20);
  if (trainingError) throw trainingError;

  const days = recentIncident?.incident_date
    ? Math.floor((now.getTime() - new Date(recentIncident.incident_date).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    tenantId,
    projects: (projects ?? []) as { id: string; name: string }[],
    trainingRecords: (training ?? []) as unknown as SafetyTraining[],
    expiringTraining: (expiring ?? []) as unknown as SafetyTraining[],
    stats: {
      total_incidents: incidentCount ?? 0,
      days_since_incident: days,
      inspections_this_month: inspectionCount ?? 0,
      expiring_certifications: expiring?.length ?? 0,
    },
  };
}

export async function fetchSafetyAutomationProject(projectId: string): Promise<SafetyAutomationProjectData> {
  const { data: logs, error: logsError } = await supabase
    .from('osha_300_log')
    .select('*')
    .eq('project_id', projectId)
    .order('incident_date', { ascending: false });
  if (logsError) throw logsError;

  const { data: inspections, error: inspectionsError } = await supabase
    .from('safety_inspections')
    .select('*')
    .eq('project_id', projectId)
    .order('inspection_date', { ascending: false })
    .limit(10);
  if (inspectionsError) throw inspectionsError;

  const { data: talks, error: talksError } = await supabase
    .from('toolbox_talks')
    .select('*')
    .eq('project_id', projectId)
    .order('talk_date', { ascending: false })
    .limit(10);
  if (talksError) throw talksError;

  return {
    oshaLogs: (logs ?? []) as unknown as OSHA300Log[],
    inspections: (inspections ?? []) as unknown as SafetyInspection[],
    toolboxTalks: (talks ?? []) as unknown as ToolboxTalk[],
  };
}

export async function insertOshaIncident(tenantId: string | null, projectId: string, incident: NewIncident): Promise<void> {
  if (!tenantId) throw new Error(NO_TENANT_MESSAGE);
  if (!projectId) throw new Error('Select a project before reporting an incident.');
  const { data, error } = await supabase
    .from('osha_300_log')
    .insert({
      tenant_id: tenantId,
      project_id: projectId,
      employee_name: incident.employee_name,
      job_title: incident.job_title,
      incident_date: incident.incident_date,
      incident_description: incident.incident_description,
      incident_location: 'Project Site',
      injury_type: 'injury',
      severity: incident.severity,
    })
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The incident was not recorded. You may not have permission to add to the OSHA 300 log.');
  }
}

export function useSafetyAutomation(projectId: string) {
  const { user, userProfile } = useAuth();
  const userId = user?.id;
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = safetyAutomationKey(companyId, userId);

  const overview = useQuery({
    queryKey: key,
    queryFn: () => fetchSafetyAutomationOverview(userId as string),
    enabled: !!userId,
  });
  const project = useQuery({
    queryKey: [...key, 'project', projectId] as const,
    queryFn: () => fetchSafetyAutomationProject(projectId),
    enabled: !!userId && !!projectId,
  });

  const addIncident = useMutation({
    mutationFn: (incident: NewIncident) => insertOshaIncident(overview.data?.tenantId ?? null, projectId, incident),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return {
    overview: overview.data,
    projectData: project.data,
    isLoading: overview.isLoading,
    error: (overview.error ?? project.error) as Error | null,
    refetch: () => Promise.all([overview.refetch(), project.refetch()]),
    addIncident: (incident: NewIncident) => addIncident.mutateAsync(incident),
  };
}
