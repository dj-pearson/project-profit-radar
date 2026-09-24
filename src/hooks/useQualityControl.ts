/**
 * Quality inspections for the workflow QualityControlManagement tab (US-266).
 *
 * The component reloaded by hand after every write and reported success on an
 * update RLS filtered to zero rows. Editing an inspection also sent the whole
 * "new inspection" row: a fresh QI- number, status back to 'scheduled', and
 * empty checklist, deficiency and photo lists, so saving a date change wiped
 * the inspection's record. An edit now sends only the fields the form edits.
 * An unassigned inspector is null rather than '' (not a uuid).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface QualityInspection {
  id: string;
  project_id: string;
  inspection_type: string;
  inspection_number: string;
  inspection_date: string;
  inspector_id: string | null;
  status: string;
  checklist_items: unknown;
  deficiencies: unknown;
  photos: unknown;
  notes: string | null;
  created_at: string;
  projects?: { name: string } | null;
}

export interface InspectionForm {
  project_id: string;
  inspection_type: string;
  inspection_date: string;
  inspector_id: string;
  notes: string;
}

export interface QualityControlData {
  inspections: QualityInspection[];
  projects: { id: string; name: string }[];
  teamMembers: { id: string; first_name: string | null; last_name: string | null }[];
}

export const qualityControlKey = (companyId: string | undefined) => ['quality-inspections', companyId] as const;

function requireRows(data: unknown[] | null, message: string) {
  if (!data || data.length === 0) throw new Error(message);
}

export async function fetchQualityControl(companyId: string): Promise<QualityControlData> {
  const [inspections, projects, team] = await Promise.all([
    supabase
      .from('quality_inspections')
      .select('*, projects:project_id(name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false }),
    supabase.from('projects').select('id, name').eq('company_id', companyId).order('name'),
    supabase.from('user_profiles').select('id, first_name, last_name').eq('company_id', companyId),
  ]);
  const failed = [inspections, projects, team].find((r) => r.error)?.error;
  if (failed) throw failed;
  return {
    inspections: (inspections.data ?? []) as unknown as QualityInspection[],
    projects: (projects.data ?? []) as QualityControlData['projects'],
    teamMembers: (team.data ?? []) as QualityControlData['teamMembers'],
  };
}

const formFields = (form: InspectionForm) => ({
  project_id: form.project_id,
  inspection_type: form.inspection_type,
  inspection_date: form.inspection_date,
  inspector_id: form.inspector_id || null,
  notes: form.notes,
});

export async function scheduleInspection(companyId: string, form: InspectionForm, now: number = Date.now()): Promise<void> {
  const { data, error } = await supabase
    .from('quality_inspections')
    .insert([{
      company_id: companyId,
      inspection_number: `QI-${now.toString().slice(-8)}`,
      status: 'scheduled',
      checklist_items: [],
      deficiencies: [],
      photos: [],
      ...formFields(form),
    }])
    .select('id');
  if (error) throw error;
  requireRows(data, 'The inspection was not scheduled. You may not have permission to add inspections.');
}

/** Only the fields the form edits; the number, status and inspection record stay as they are. */
export async function editInspection(id: string, form: InspectionForm): Promise<void> {
  const { data, error } = await supabase.from('quality_inspections').update(formFields(form)).eq('id', id).select('id');
  if (error) throw error;
  requireRows(data, 'The inspection was not updated. You may not have permission to edit it.');
}

/**
 * Pass or fail also sets the passed column. The old code set completed_at on
 * 'completed', a column quality_inspections does not have (nothing sent that
 * status, so it never ran).
 */
export async function setInspectionStatus(id: string, status: string): Promise<void> {
  const patch: { status: string; passed?: boolean } = { status };
  if (status === 'passed' || status === 'failed') patch.passed = status === 'passed';
  const { data, error } = await supabase.from('quality_inspections').update(patch).eq('id', id).select('id');
  if (error) throw error;
  requireRows(data, 'The inspection was not updated. You may not have permission to edit it.');
}

export function useQualityControl() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = qualityControlKey(companyId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchQualityControl(companyId as string),
    enabled: !!companyId,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const save = useMutation({
    mutationFn: ({ id, form }: { id: string | null; form: InspectionForm }) => {
      if (id) return editInspection(id, form);
      if (!companyId) throw new Error('Your account is not linked to a company.');
      return scheduleInspection(companyId, form);
    },
    onSettled: invalidate,
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => setInspectionStatus(id, status),
    onSettled: invalidate,
  });

  return {
    inspections: query.data?.inspections ?? [],
    projects: query.data?.projects ?? [],
    teamMembers: query.data?.teamMembers ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    save: (id: string | null, form: InspectionForm) => save.mutateAsync({ id, form }),
    setStatus: (id: string, status: string) => setStatus.mutateAsync({ id, status }),
  };
}
