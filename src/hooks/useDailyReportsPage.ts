/**
 * Reads and the report insert behind /daily-reports (US-266).
 *
 * DailyReports.tsx loaded projects, reports and templates in one useEffect and
 * reloaded all three by hand after a save. Projects and reports are one query
 * because the page is meaningless without either. Templates are a separate
 * query: they only pre-fill the create form, so a failed template read should
 * not blank the report list. Its error is still returned, and the form says
 * templates could not be loaded rather than "no templates".
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import type { EquipmentItemRow, MaterialItemRow } from '@/lib/dailyReportField';

export interface DailyReportsProject {
  id: string;
  name: string;
  status: string;
}

export interface DailyReportTemplateOption {
  id: string;
  name: string;
  default_crew_count: number | null;
  default_weather_conditions: string | null;
  default_safety_notes: string | null;
}

export interface DailyReportListRow {
  id: string;
  project_id: string;
  date: string;
  work_performed: string;
  crew_count: number;
  weather_conditions: string;
  materials_delivered: string;
  equipment_used: string;
  delays_issues: string;
  safety_incidents: string;
  photos: string[];
  created_at: string;
  projects: { name: string };
}

export const dailyReportsKey = (companyId: string | undefined) => ['daily-reports', companyId] as const;
export const dailyReportsPageKey = (companyId: string | undefined) => [...dailyReportsKey(companyId), 'page'] as const;
export const dailyReportTemplateOptionsKey = (companyId: string | undefined) =>
  ['daily-report-templates', companyId, 'options'] as const;

export async function fetchDailyReportsPage(
  companyId: string,
): Promise<{ projects: DailyReportsProject[]; reports: DailyReportListRow[] }> {
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, status')
    .eq('company_id', companyId)
    .order('name');
  if (projectsError) throw projectsError;

  const { data: reports, error: reportsError } = await supabase
    .from('daily_reports')
    .select(`
      id,
      project_id,
      date,
      work_performed,
      crew_count,
      weather_conditions,
      materials_delivered,
      equipment_used,
      delays_issues,
      safety_incidents,
      photos,
      created_at,
      projects!inner(name, company_id)
    `)
    .eq('projects.company_id', companyId)
    .order('created_at', { ascending: false });
  if (reportsError) throw reportsError;

  return {
    projects: (projects ?? []) as DailyReportsProject[],
    reports: (reports ?? []) as unknown as DailyReportListRow[],
  };
}

export async function fetchDailyReportTemplateOptions(companyId: string): Promise<DailyReportTemplateOption[]> {
  const { data, error } = await supabase
    .from('daily_report_templates')
    .select('id, name, default_crew_count, default_weather_conditions, default_safety_notes')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return (data ?? []) as DailyReportTemplateOption[];
}

/** The most recent report for a project before `beforeDate`, or null if there is none. */
export async function fetchPreviousDailyReport(projectId: string, beforeDate: string) {
  const { data, error } = await supabase
    .from('daily_reports')
    .select('work_performed, crew_count, weather_conditions, materials_delivered, equipment_used, delays_issues, safety_incidents, date')
    .eq('project_id', projectId)
    .lt('date', beforeDate)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface NewDailyReportRow {
  project_id: string;
  work_performed: string;
  crew_count: number;
  weather_conditions: string;
  materials_delivered: string;
  equipment_used: string;
  delays_issues: string;
  safety_incidents: string;
  signature: string | null;
  date: string;
  photos: string[] | null;
}

export async function insertDailyReport(row: NewDailyReportRow): Promise<{ id: string }> {
  const { data, error } = await supabase.from('daily_reports').insert(row).select('id').single();
  if (error) throw error;
  return data;
}

export interface PhotoAttachmentRow {
  project_id: string;
  daily_report_id: string;
  company_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  storage_bucket: string;
  source: string;
  taken_at: string;
}

/** Matches the classify-photo function's own ceiling per call. */
export const CLASSIFY_BATCH_LIMIT = 10;

/**
 * Returns the error rather than throwing: the report is already saved when this
 * runs (US-330). On success the new rows are handed to the classifier.
 */
export async function insertPhotoAttachments(rows: PhotoAttachmentRow[]) {
  const { data, error } = await supabase.from('photo_attachments').insert(rows as never).select('id');
  if (!error) classifyPhotosInBackground(((data ?? []) as Array<{ id: string }>).map((r) => r.id));
  return error;
}

/**
 * Tag new photos (US-046, via US-330) without holding up the person filing.
 *
 * Not awaited: classification is a model call per photo, and a superintendent
 * at the end of a shift should not wait on it. A failure is logged and the
 * rows keep ai_classified_at NULL, which is what the classifier's backlog
 * index (idx_photo_attachments_unclassified) selects on, so nothing is lost.
 */
export function classifyPhotosInBackground(photoIds: string[]): void {
  for (let i = 0; i < photoIds.length; i += CLASSIFY_BATCH_LIMIT) {
    const batch = photoIds.slice(i, i + CLASSIFY_BATCH_LIMIT);
    void supabase.functions
      .invoke('classify-photo', { body: { photo_ids: batch } })
      .then(({ error }) => {
        if (error) logger.warn('Photo classification did not run; the photos stay untagged for now', { error: error.message });
      })
      .catch((error: unknown) => {
        logger.warn('Photo classification did not run; the photos stay untagged for now', {
          error: error instanceof Error ? error.message : String(error),
        });
      });
  }
}

/**
 * Materials and equipment as rows, alongside the text columns iOS reads
 * (US-330, AC3). Returns a sentence per failure rather than throwing, for the
 * same reason as the photo rows: the report is saved by now.
 */
export async function insertDailyReportItems(
  dailyReportId: string,
  materials: MaterialItemRow[],
  equipment: EquipmentItemRow[],
): Promise<string[]> {
  const failures: string[] = [];
  if (materials.length > 0) {
    const { error } = await supabase
      .from('daily_report_material_items')
      .insert(materials.map((m) => ({ ...m, daily_report_id: dailyReportId })))
      .select('id');
    if (error) {
      logger.error('Daily report saved but its material rows were not', error);
      failures.push(`Materials were saved as text but not as line items (${error.message})`);
    }
  }
  if (equipment.length > 0) {
    const { error } = await supabase
      .from('daily_report_equipment_items')
      .insert(equipment.map((e) => ({ ...e, daily_report_id: dailyReportId })))
      .select('id');
    if (error) {
      logger.error('Daily report saved but its equipment rows were not', error);
      failures.push(`Equipment was saved as text but not as line items (${error.message})`);
    }
  }
  return failures;
}

/** How many time entries were clocked on a project on one day. */
export async function countTimeEntriesOnDay(projectId: string, day: string): Promise<number> {
  const { count, error } = await supabase
    .from('time_entries')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .gte('start_time', `${day}T00:00:00`)
    .lte('start_time', `${day}T23:59:59`);
  if (error) throw error;
  return count ?? 0;
}

export function useDailyReportsPage({ enabled = true }: { enabled?: boolean } = {}) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();

  const page = useQuery({
    queryKey: dailyReportsPageKey(companyId),
    queryFn: () => fetchDailyReportsPage(companyId as string),
    enabled: enabled && !!companyId,
  });

  const templates = useQuery({
    queryKey: dailyReportTemplateOptionsKey(companyId),
    queryFn: () => fetchDailyReportTemplateOptions(companyId as string),
    enabled: enabled && !!companyId,
  });

  const createReport = useMutation({
    mutationFn: insertDailyReport,
    onSettled: () => queryClient.invalidateQueries({ queryKey: dailyReportsKey(companyId) }),
  });

  return {
    projects: page.data?.projects ?? [],
    reports: page.data?.reports ?? [],
    isLoading: page.isLoading,
    error: page.error as Error | null,
    refetch: page.refetch,
    templates: templates.data ?? [],
    templatesError: templates.error as Error | null,
    createReport,
  };
}
