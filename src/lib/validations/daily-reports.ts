import { z } from 'zod';
import { requiredText } from './common';

/**
 * The Daily Reports "Create Daily Report" dialog (US-268). Field names match
 * the daily_reports columns the insert writes.
 */
export const dailyReportFormSchema = z.object({
  project_id: z.string().min(1, 'Select a project'),
  work_performed: requiredText('Describe the work performed today'),
  crew_count: z
    .number({ invalid_type_error: 'Enter a crew count' })
    .int('Crew count must be a whole number')
    .min(0, 'Crew count cannot be negative'),
  weather_conditions: z.string(),
  materials_delivered: z.string(),
  equipment_used: z.string(),
  delays_issues: z.string(),
  safety_incidents: z.string(),
  signature: z.string(),
});

export type DailyReportFormValues = z.infer<typeof dailyReportFormSchema>;

export const EMPTY_DAILY_REPORT: DailyReportFormValues = {
  project_id: '',
  work_performed: '',
  crew_count: 0,
  weather_conditions: '',
  materials_delivered: '',
  equipment_used: '',
  delays_issues: '',
  safety_incidents: '',
  signature: '',
};

/**
 * Real daily_reports columns that the desktop form does not collect but the
 * mobile forms do (all added in 20251110000003 and present in the generated Insert type).
 * Typed as a closed set so a form field that is not a column cannot ride along
 * into the insert; PostgREST rejects the whole row when one does.
 */
export interface DailyReportExtraColumns {
  temperature?: number | null;
  completion_percentage?: number | null;
  quality_issues?: string | null;
  next_day_plan?: string | null;
  client_visitors?: string | null;
  gps_latitude?: number | null;
  gps_longitude?: number | null;
  gps_accuracy?: number | null;
  submitted_by?: string | null;
  submission_timestamp?: string | null;
}

/** The daily_reports insert. Same shape the useState form built. */
export function buildDailyReportInsert(
  values: DailyReportFormValues,
  extra: { date: string; photoPaths: string[]; columns?: DailyReportExtraColumns },
) {
  return {
    ...(extra.columns ?? {}),
    project_id: values.project_id,
    work_performed: values.work_performed,
    crew_count: Number(values.crew_count),
    weather_conditions: values.weather_conditions,
    materials_delivered: values.materials_delivered,
    equipment_used: values.equipment_used,
    delays_issues: values.delays_issues,
    safety_incidents: values.safety_incidents,
    date: extra.date,
    photos: extra.photoPaths.length > 0 ? extra.photoPaths : null,
    signature: values.signature || null,
  };
}
