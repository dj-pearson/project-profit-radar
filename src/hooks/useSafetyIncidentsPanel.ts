/**
 * Incident list and project names for the safety incidents panel (US-266).
 *
 * This used to live inline in SafetyIncidentsPanel, where a failed read left
 * the panel on "no incidents" with a days-since counter computed from nothing.
 * It reads through the hook now and the panel shows the error instead. A
 * failed project lookup is an error too: the list would otherwise lose every
 * project filter option and label while looking complete.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface IncidentRow {
  id: string;
  incident_date: string;
  incident_time: string | null;
  severity: string;
  incident_type: string;
  status: string | null;
  location: string | null;
  description: string;
  project_id: string | null;
  injured_person_name: string | null;
  immediate_actions: string | null;
  corrective_actions: string | null;
  root_cause_analysis: string | null;
  witnesses: string[] | null;
  osha_recordable: boolean | null;
  lost_time: boolean | null;
  days_away_from_work: number | null;
}

export interface SafetyIncidentsPanelData {
  incidents: IncidentRow[];
  projectNames: Map<string, string>;
}

export const safetyIncidentsPanelKey = (companyId: string | undefined) =>
  ['safety-incidents-panel', companyId] as const;

export async function fetchSafetyIncidentsPanel(companyId: string): Promise<SafetyIncidentsPanelData> {
  const [incidentsRes, projectsRes] = await Promise.all([
    supabase
      .from('safety_incidents')
      .select(
        'id, incident_date, incident_time, severity, incident_type, status, location, description, project_id, injured_person_name, immediate_actions, corrective_actions, root_cause_analysis, witnesses, osha_recordable, lost_time, days_away_from_work'
      )
      .eq('company_id', companyId)
      .order('incident_date', { ascending: false }),
    supabase.from('projects').select('id, name').eq('company_id', companyId),
  ]);
  if (incidentsRes.error) throw incidentsRes.error;
  if (projectsRes.error) throw projectsRes.error;
  return {
    incidents: (incidentsRes.data ?? []) as IncidentRow[],
    projectNames: new Map(
      ((projectsRes.data ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name])
    ),
  };
}

export function useSafetyIncidentsPanel() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  return useQuery({
    queryKey: safetyIncidentsPanelKey(companyId),
    queryFn: () => fetchSafetyIncidentsPanel(companyId as string),
    enabled: !!companyId,
  });
}
