/**
 * Environmental permits, NEPA assessments and monitoring records (US-266,
 * US-309).
 *
 * The page read these inline and destructured only `data`, so a failed read
 * rendered as "No environmental permits recorded" on a compliance screen, and
 * the assessments and monitoring tabs as simply empty. The reads throw into
 * the query's error now and the page says so. The three edits are scoped to
 * the company and read back; an edit RLS filtered to zero rows used to toast
 * "Permit Updated".
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EnvironmentalPermit {
  id: string;
  permit_number: string;
  permit_name: string;
  permit_type: string;
  issuing_agency: string;
  status: string;
  nepa_category: string;
  application_date: string;
  expiration_date?: string;
  target_decision_date?: string;
  compliance_status: string;
  priority: string;
  assigned_to: string;
}

export interface NEPAAssessment {
  id: string;
  permit_id: string;
  assessment_type: string;
  lead_agency: string;
  nepa_process_stage: string;
  finding?: string;
  decision_date?: string;
  scoping_period_start?: string;
  scoping_period_end?: string;
  prepared_by: string;
}

export interface MonitoringRecord {
  id: string;
  permit_id: string;
  monitoring_type: string;
  parameter_measured: string;
  measured_value: number;
  permit_limit: number;
  measurement_unit: string;
  measurement_date: string;
  within_limits: boolean;
  exceedance_level?: number;
  monitoring_location: string;
}

export const environmentalPermitsKey = (companyId: string | undefined) => ['environmental-permits', companyId] as const;
export const environmentalAssessmentsKey = (companyId: string | undefined) =>
  ['environmental-assessments', companyId] as const;
export const environmentalMonitoringKey = (companyId: string | undefined) =>
  ['environmental-monitoring', companyId] as const;

export async function fetchEnvironmentalPermits(companyId: string): Promise<EnvironmentalPermit[]> {
  const { data, error } = await supabase
    .from('environmental_permits')
    .select('id, permit_number, permit_name, permit_type, issuing_agency, status, nepa_category, application_date, expiration_date, target_decision_date, compliance_status, priority, assigned_to')
    .eq('company_id', companyId)
    .order('application_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as EnvironmentalPermit[];
}

export async function fetchEnvironmentalAssessments(companyId: string): Promise<NEPAAssessment[]> {
  const { data, error } = await supabase
    .from('environmental_assessments')
    .select('id, permit_id, assessment_type, lead_agency, nepa_process_stage, finding, decision_date, scoping_period_start, scoping_period_end, prepared_by')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as NEPAAssessment[];
}

export async function fetchEnvironmentalMonitoring(companyId: string): Promise<MonitoringRecord[]> {
  const { data, error } = await supabase
    .from('environmental_monitoring')
    .select('id, permit_id, monitoring_type, parameter_measured, measured_value, permit_limit, measurement_unit, measurement_date, within_limits, exceedance_level, monitoring_location')
    .eq('company_id', companyId)
    .order('measurement_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MonitoringRecord[];
}

type EnvTable = 'environmental_permits' | 'environmental_assessments' | 'environmental_monitoring';

/** Update one row in the company and throw unless exactly that row came back. */
export async function updateEnvironmentalRecord(
  companyId: string,
  table: EnvTable,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { data, error } = await supabase
    .from(table)
    .update(patch as never)
    .eq('id', id)
    .eq('company_id', companyId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Nothing was updated. The record may have been removed, or you may not have permission.');
  }
}

export function useEnvironmentalPermitting() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();

  const permits = useQuery({
    queryKey: environmentalPermitsKey(companyId),
    queryFn: () => fetchEnvironmentalPermits(companyId as string),
    enabled: !!companyId,
  });
  const assessments = useQuery({
    queryKey: environmentalAssessmentsKey(companyId),
    queryFn: () => fetchEnvironmentalAssessments(companyId as string),
    enabled: !!companyId,
  });
  const monitoring = useQuery({
    queryKey: environmentalMonitoringKey(companyId),
    queryFn: () => fetchEnvironmentalMonitoring(companyId as string),
    enabled: !!companyId,
  });

  const keyFor: Record<EnvTable, readonly unknown[]> = {
    environmental_permits: environmentalPermitsKey(companyId),
    environmental_assessments: environmentalAssessmentsKey(companyId),
    environmental_monitoring: environmentalMonitoringKey(companyId),
  };
  const update = useMutation({
    mutationFn: (v: { table: EnvTable; id: string; patch: Record<string, unknown> }) => {
      if (!companyId) throw new Error('Your profile is not linked to a company.');
      return updateEnvironmentalRecord(companyId, v.table, v.id, v.patch);
    },
    onSettled: (_d, _e, v) => queryClient.invalidateQueries({ queryKey: keyFor[v.table] }),
  });

  return { companyId, permits, assessments, monitoring, update };
}
