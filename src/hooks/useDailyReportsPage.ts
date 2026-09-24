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
import { photoStoragePath, type EquipmentItemRow, type MaterialItemRow } from '@/lib/dailyReportField';
import { validateFileUpload, generateSecureFilename } from '@/lib/security/fileUploadValidation';
import {
  buildDailyReportInsert,
  type DailyReportExtraColumns,
  type DailyReportFormValues,
} from '@/lib/validations/daily-reports';

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

export async function insertDailyReport(
  row: NewDailyReportRow & DailyReportExtraColumns,
): Promise<{ id: string }> {
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

/** A crew member typed on the report rather than pulled from timesheets. */
export interface CrewItemRow {
  crew_member_name: string;
  role: string | null;
  hours_worked: number | null;
  overtime_hours: number | null;
}

export interface TaskItemRow {
  task_name: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  completion_percentage: number;
  notes: string | null;
}

/**
 * Crew and task rows the mobile wizard collects (daily_report_crew_items and
 * daily_report_task_items, both since 20251110000003). Non-fatal for the same
 * reason as the material rows: the report is saved by now.
 */
export async function insertDailyReportCrewAndTasks(
  dailyReportId: string,
  crew: CrewItemRow[],
  tasks: TaskItemRow[],
): Promise<string[]> {
  const failures: string[] = [];
  if (crew.length > 0) {
    const { error } = await supabase
      .from('daily_report_crew_items')
      .insert(crew.map((c) => ({ ...c, daily_report_id: dailyReportId })))
      .select('id');
    if (error) {
      logger.error('Daily report saved but its crew rows were not', error);
      failures.push(`The crew list was not saved (${error.message})`);
    }
  }
  if (tasks.length > 0) {
    const { error } = await supabase
      .from('daily_report_task_items')
      .insert(tasks.map((t) => ({ ...t, daily_report_id: dailyReportId })))
      .select('id');
    if (error) {
      logger.error('Daily report saved but its task rows were not', error);
      failures.push(`Task progress was not saved (${error.message})`);
    }
  }
  return failures;
}

export interface UploadedDailyReportPhoto {
  path: string;
  file: File;
}

/**
 * Put report photos in project-documents under a project-first path (US-289).
 *
 * Two records come out of a photo: the storage path, which still goes in
 * daily_reports.photos so iOS at MIN_SUPPORTED_IOS_VERSION keeps working, and
 * a photo_attachments row (recordDailyReportFieldDetail), which is the thing
 * anything else can find a photo by (US-330). A file that fails validation or
 * upload is skipped and named in `rejected`, not thrown: the report still saves.
 */
export async function uploadDailyReportPhotos(
  projectId: string,
  files: File[],
): Promise<{ uploaded: UploadedDailyReportPhoto[]; rejected: Array<{ name: string; reason: string }> }> {
  const uploaded: UploadedDailyReportPhoto[] = [];
  const rejected: Array<{ name: string; reason: string }> = [];
  for (const file of files) {
    const validation = validateFileUpload(file, {
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    });
    if (!validation.valid) {
      rejected.push({ name: file.name, reason: validation.error || `Photo "${file.name}" is not valid.` });
      continue;
    }
    // Persist the storage path, not a permanent public URL (US-289).
    const path = photoStoragePath({ projectId, fileName: generateSecureFilename(file.name) });
    const { error } = await supabase.storage.from('project-documents').upload(path, file);
    if (error) {
      logger.error('Daily report photo upload failed', error);
      rejected.push({ name: file.name, reason: error.message });
      continue;
    }
    uploaded.push({ path, file });
  }
  return { uploaded, rejected };
}

/**
 * Everything the report is a record OF, once the report row exists (US-330).
 *
 * A photo that is only a string in daily_reports.photos cannot be found by
 * project, by date or by who took it, and crew entered as an integer is the
 * same crew that already clocked in, typed a second time.
 *
 * Deliberately non-fatal, and deliberately not silent. The report itself is
 * saved by the time this runs; losing it because a photo row failed would be
 * the worse trade for somebody filing at the end of a shift. Every failure
 * comes back as a sentence for the toast.
 */
export async function recordDailyReportFieldDetail({
  reportId, projectId, reportDate, uploaded, materials, equipment, companyId, userId,
}: {
  reportId: string;
  projectId: string;
  reportDate: string;
  uploaded: UploadedDailyReportPhoto[];
  materials: MaterialItemRow[];
  equipment: EquipmentItemRow[];
  companyId: string | null | undefined;
  userId: string | null | undefined;
}): Promise<string[]> {
  // Materials and equipment as rows; the text columns stay for iOS.
  const notes: string[] = await insertDailyReportItems(reportId, materials, equipment);

  if (uploaded.length > 0 && companyId && userId) {
    const photoError = await insertPhotoAttachments(uploaded.map(({ path, file }) => ({
      project_id: projectId,
      daily_report_id: reportId,
      company_id: companyId,
      user_id: userId,
      file_name: file.name,
      file_path: path,
      file_size: file.size,
      mime_type: file.type,
      storage_bucket: 'project-documents',
      source: 'daily_report',
      taken_at: new Date(file.lastModified || Date.now()).toISOString(),
    })));

    if (photoError) {
      logger.error('Daily report saved but its photos were not recorded', photoError);
      notes.push(
        `The ${uploaded.length} photo(s) uploaded but were not indexed, so they ` +
        `will not appear on the project timeline (${photoError.message})`
      );
    }
  }

  // Crew from the hours already clocked. The RPC does not overwrite anyone
  // added by hand, so it is safe whether or not the crew was typed first.
  const { data: crewAdded, error: crewError } = await supabase
    .rpc('sync_daily_report_crew', { p_daily_report_id: reportId });

  if (crewError) {
    logger.error('Could not pull the crew from the timesheets', crewError);
    notes.push(`Crew could not be pulled from the timesheets (${crewError.message})`);
  } else if ((crewAdded ?? 0) > 0) {
    notes.push(`${crewAdded} crew member(s) pulled from the day's time entries`);
  } else {
    // Nothing clocked in on that project and day. Worth saying, because the
    // superintendent may have the wrong project selected.
    try {
      const count = await countTimeEntriesOnDay(projectId, reportDate);
      if (!count) notes.push('Nobody clocked in on this job today');
    } catch (countError) {
      logger.error('Could not check the day\'s time entries', countError instanceof Error ? countError : undefined);
      notes.push('Could not check whether anyone clocked in on this job today');
    }
  }

  return notes;
}

/** A whole report from a form that is not the desktop dialog (the mobile ones). */
export interface DailyReportSubmission {
  values: DailyReportFormValues;
  date: string;
  columns?: DailyReportExtraColumns;
  photos: File[];
  materials: MaterialItemRow[];
  equipment: EquipmentItemRow[];
  crew?: CrewItemRow[];
  tasks?: TaskItemRow[];
}

/**
 * The desktop create flow, in one call: photos, the row buildDailyReportInsert
 * builds, then the item/photo/crew records. Throws only when the report row
 * itself was not saved; everything after that comes back in `notes`.
 */
export async function saveDailyReport(
  submission: DailyReportSubmission,
  who: { companyId: string | null | undefined; userId: string | null | undefined },
): Promise<{ id: string; photoCount: number; notes: string[] }> {
  const { values, date } = submission;
  const { uploaded, rejected } = await uploadDailyReportPhotos(values.project_id, submission.photos);

  const report = await insertDailyReport(
    buildDailyReportInsert(values, { date, photoPaths: uploaded.map((u) => u.path), columns: submission.columns }),
  );

  const notes = rejected.map((r) => `Photo "${r.name}" was not saved (${r.reason})`);
  notes.push(...await insertDailyReportCrewAndTasks(report.id, submission.crew ?? [], submission.tasks ?? []));
  notes.push(...await recordDailyReportFieldDetail({
    reportId: report.id,
    projectId: values.project_id,
    reportDate: date,
    uploaded,
    materials: submission.materials,
    equipment: submission.equipment,
    companyId: who.companyId,
    userId: who.userId,
  }));
  return { id: report.id, photoCount: uploaded.length, notes };
}

/** saveDailyReport as a mutation, so the report list refreshes after it. */
export function useSaveDailyReport() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (submission: DailyReportSubmission) =>
      saveDailyReport(submission, { companyId, userId: userProfile?.id }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: dailyReportsKey(companyId) }),
  });
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
