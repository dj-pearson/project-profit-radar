/**
 * Reads and writes behind /safety and its training and compliance tabs (US-266).
 *
 * Safety.tsx, TrainingCertificationManager and OSHAComplianceManager each
 * looked the company up again with an unchecked read and then ran their
 * queries without checking any error. A failed read showed zero incidents,
 * zero expiring certifications and "No Training Records", which on a safety
 * screen reads as "all clear". The reads throw now and the screens show the
 * error.
 *
 * The stat cards count with head requests instead of fetching every id, and
 * the training list shows the employee's name instead of the literal
 * "Employee" it printed on every row. Writes select the row back so an update
 * RLS filtered to zero rows fails instead of toasting success.
 *
 * Everything shares the ['safety', companyId] prefix, so a write in one tab
 * refreshes the stat cards above it.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TablesInsert } from '@/integrations/supabase/types';
import { safetyIncidentsPanelKey } from '@/hooks/useSafetyIncidentsPanel';

export const safetyKey = (companyId: string | undefined) => ['safety', companyId] as const;

const isoDate = (d: Date) => d.toISOString().split('T')[0];
const inThirtyDays = () => isoDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

const NO_COMPANY = 'Your account is not linked to a company, so there is nowhere to save this.';

function requireRows(data: unknown[] | null, message: string) {
  if (!data || data.length === 0) throw new Error(message);
}

// --- Overview ---------------------------------------------------------------

export interface SafetyStats {
  totalIncidents: number;
  openIncidents: number;
  checklistsCompleted: number;
  expiringCertifications: number;
  upcomingDeadlines: number;
}

export interface SafetyChecklistSummary {
  id: string;
  name: string;
  checklist_type: string;
  is_active: boolean;
}

export async function fetchSafetyOverview(
  companyId: string,
  now: Date = new Date()
): Promise<{ stats: SafetyStats; checklists: SafetyChecklistSummary[] }> {
  const monthStart = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const horizon = inThirtyDays();

  const [total, open, completed, expiring, deadlines, checklists] = await Promise.all([
    supabase.from('safety_incidents').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase
      .from('safety_incidents')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'open'),
    supabase
      .from('safety_checklist_responses')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('response_date', monthStart),
    supabase
      .from('training_certifications')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .lte('expiration_date', horizon)
      .eq('status', 'active'),
    supabase
      .from('osha_compliance_deadlines')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .lte('due_date', horizon)
      .eq('status', 'pending'),
    supabase
      .from('safety_checklists')
      .select('id, name, checklist_type, is_active')
      .eq('company_id', companyId)
      .eq('is_active', true),
  ]);

  const failed = [total, open, completed, expiring, deadlines, checklists].find((r) => r.error)?.error;
  if (failed) throw failed;

  return {
    stats: {
      totalIncidents: total.count ?? 0,
      openIncidents: open.count ?? 0,
      checklistsCompleted: completed.count ?? 0,
      expiringCertifications: expiring.count ?? 0,
      upcomingDeadlines: deadlines.count ?? 0,
    },
    checklists: (checklists.data ?? []) as SafetyChecklistSummary[],
  };
}

/** This year's incidents for the OSHA 300 log export. Throws rather than reporting "no incidents". */
export async function fetchOsha300Incidents(companyId: string, year: number) {
  const { data, error } = await supabase
    .from('safety_incidents')
    .select('*')
    .eq('company_id', companyId)
    .gte('incident_date', `${year}-01-01`)
    .lte('incident_date', `${year}-12-31`)
    .order('incident_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export function useSafetyOverview() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...safetyKey(companyId), 'overview'],
    queryFn: () => fetchSafetyOverview(companyId as string),
    enabled: !!companyId,
  });

  return {
    companyId,
    stats: query.data?.stats ?? null,
    checklists: query.data?.checklists ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    /** After an incident or checklist is added elsewhere on the page. */
    invalidate: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: safetyKey(companyId) }),
        queryClient.invalidateQueries({ queryKey: safetyIncidentsPanelKey(companyId) }),
      ]),
  };
}

// --- People picker ------------------------------------------------------------

export interface CompanyPerson {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

export async function fetchCompanyPeople(companyId: string): Promise<CompanyPerson[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name')
    .eq('company_id', companyId);
  if (error) throw error;
  return (data ?? []) as CompanyPerson[];
}

export const personName = (p: CompanyPerson | undefined) =>
  p ? [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || 'Unnamed user' : undefined;

// --- Training certifications -------------------------------------------------

export interface Certification {
  id: string;
  user_id: string;
  /** From the company's user list; undefined when the person is not in it. */
  employee_name?: string;
  certification_name: string;
  certification_type: string;
  issuing_organization?: string | null;
  issue_date: string;
  expiration_date?: string | null;
  document_url?: string | null;
  status: string;
  created_at: string;
}

export async function fetchTrainingCertifications(
  companyId: string
): Promise<{ employees: CompanyPerson[]; certifications: Certification[] }> {
  const [employees, certsRes] = await Promise.all([
    fetchCompanyPeople(companyId),
    supabase
      .from('training_certifications')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false }),
  ]);
  if (certsRes.error) throw certsRes.error;
  const byId = new Map(employees.map((e) => [e.id, e]));
  return {
    employees,
    certifications: ((certsRes.data ?? []) as Certification[]).map((c) => ({
      ...c,
      employee_name: personName(byId.get(c.user_id)),
    })),
  };
}

export async function insertTrainingCertification(row: TablesInsert<'training_certifications'>): Promise<void> {
  const { data, error } = await supabase.from('training_certifications').insert(row).select('id');
  if (error) throw error;
  requireRows(data, 'The certification was not saved. You may not have permission to add training records.');
}

export async function setCertificationStatus(id: string, status: string): Promise<void> {
  const { data, error } = await supabase
    .from('training_certifications')
    .update({ status })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  requireRows(data, 'The certification was not changed. You may not have permission to edit it.');
}

export function useTrainingCertifications() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...safetyKey(companyId), 'training'],
    queryFn: () => fetchTrainingCertifications(companyId as string),
    enabled: !!companyId,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: safetyKey(companyId) });

  const add = useMutation({
    mutationFn: (row: Omit<TablesInsert<'training_certifications'>, 'company_id' | 'created_by'>) => {
      if (!companyId) throw new Error(NO_COMPANY);
      return insertTrainingCertification({ ...row, company_id: companyId, created_by: userProfile?.id ?? null });
    },
    onSettled: invalidate,
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => setCertificationStatus(id, status),
    onSettled: invalidate,
  });

  return {
    employees: query.data?.employees ?? [],
    certifications: query.data?.certifications ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    add: add.mutateAsync,
    setStatus: (id: string, status: string) => setStatus.mutateAsync({ id, status }),
  };
}

// --- OSHA compliance deadlines ------------------------------------------------

export interface ComplianceDeadline {
  id: string;
  title: string;
  description?: string | null;
  due_date: string;
  deadline_type: string;
  priority: string;
  status: string;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  /** The related user's name when the deadline is tied to a person. */
  assigned_user_name?: string;
  completed_date?: string | null;
  completed_by?: string | null;
  notes?: string | null;
  created_at: string;
}

export async function fetchComplianceDeadlines(
  companyId: string
): Promise<{ employees: CompanyPerson[]; deadlines: ComplianceDeadline[] }> {
  const [employees, res] = await Promise.all([
    fetchCompanyPeople(companyId),
    supabase
      .from('osha_compliance_deadlines')
      .select('*')
      .eq('company_id', companyId)
      .order('due_date', { ascending: true }),
  ]);
  if (res.error) throw res.error;
  const byId = new Map(employees.map((e) => [e.id, e]));
  return {
    employees,
    deadlines: ((res.data ?? []) as ComplianceDeadline[]).map((d) => ({
      ...d,
      assigned_user_name:
        d.related_entity_type === 'user' && d.related_entity_id ? personName(byId.get(d.related_entity_id)) : undefined,
    })),
  };
}

export async function insertComplianceDeadline(row: TablesInsert<'osha_compliance_deadlines'>): Promise<void> {
  const { data, error } = await supabase.from('osha_compliance_deadlines').insert(row).select('id');
  if (error) throw error;
  requireRows(data, 'The deadline was not saved. You may not have permission to add compliance deadlines.');
}

export async function completeComplianceDeadline(
  id: string,
  userId: string | undefined,
  notes?: string,
  today: Date = new Date()
): Promise<void> {
  const { data, error } = await supabase
    .from('osha_compliance_deadlines')
    .update({
      status: 'completed',
      completed_date: isoDate(today),
      completed_by: userId ?? null,
      notes: notes || null,
    })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  requireRows(data, 'The deadline was not marked complete. You may not have permission to edit it.');
}

export function useOshaCompliance() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...safetyKey(companyId), 'compliance'],
    queryFn: () => fetchComplianceDeadlines(companyId as string),
    enabled: !!companyId,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: safetyKey(companyId) });

  const add = useMutation({
    mutationFn: (row: Omit<TablesInsert<'osha_compliance_deadlines'>, 'company_id' | 'created_by'>) => {
      if (!companyId) throw new Error(NO_COMPANY);
      return insertComplianceDeadline({ ...row, company_id: companyId, created_by: userProfile?.id ?? null });
    },
    onSettled: invalidate,
  });
  const complete = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      completeComplianceDeadline(id, userProfile?.id, notes),
    onSettled: invalidate,
  });

  return {
    employees: query.data?.employees ?? [],
    deadlines: query.data?.deadlines ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    add: add.mutateAsync,
    complete: (id: string, notes?: string) => complete.mutateAsync({ id, notes }),
  };
}

// --- Incident report form ------------------------------------------------------

export async function fetchActiveProjects(companyId: string): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name')
    .eq('company_id', companyId)
    .eq('status', 'active');
  if (error) throw error;
  return (data ?? []) as { id: string; name: string }[];
}

export async function insertSafetyIncident(row: TablesInsert<'safety_incidents'>): Promise<void> {
  const { data, error } = await supabase.from('safety_incidents').insert(row).select('id');
  if (error) throw error;
  requireRows(data, 'The incident was not recorded. You may not have permission to report incidents.');
}

/**
 * SafetyIncidentForm loaded its project picker from a useState initializer
 * (so it ran once per mount, outside React's effect rules), looked the company
 * up again with an unchecked read, and left the picker empty on any failure.
 * The picker is a query now and the report refreshes the safety cards and the
 * incident list.
 */
export function useSafetyIncidentForm() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();

  const projects = useQuery({
    queryKey: [...safetyKey(companyId), 'active-projects'],
    queryFn: () => fetchActiveProjects(companyId as string),
    enabled: !!companyId,
  });

  const report = useMutation({
    mutationFn: (row: Omit<TablesInsert<'safety_incidents'>, 'company_id' | 'reported_by' | 'created_by'>) => {
      if (!companyId) throw new Error(NO_COMPANY);
      const userId = userProfile?.id ?? null;
      return insertSafetyIncident({ ...row, company_id: companyId, reported_by: userId, created_by: userId });
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: safetyKey(companyId) }),
        queryClient.invalidateQueries({ queryKey: safetyIncidentsPanelKey(companyId) }),
      ]),
  });

  return {
    projects: projects.data ?? [],
    projectsError: projects.error as Error | null,
    report: report.mutateAsync,
  };
}
