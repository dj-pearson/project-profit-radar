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

/** The daily_reports insert. Same shape the useState form built. */
export function buildDailyReportInsert(
  values: DailyReportFormValues,
  extra: { date: string; photoPaths: string[] },
) {
  return {
    ...values,
    crew_count: Number(values.crew_count),
    date: extra.date,
    photos: extra.photoPaths.length > 0 ? extra.photoPaths : null,
    signature: values.signature || null,
  };
}
