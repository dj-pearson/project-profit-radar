/**
 * Daily report quick-fill logic (US-074).
 *
 * Pure mappers that turn a saved template or a previous day's report into the
 * editable fields of the "new daily report" form. No React / Supabase so the
 * field mapping is unit testable.
 */

export interface DailyReportFormFields {
  work_performed: string;
  crew_count: number;
  weather_conditions: string;
  materials_delivered: string;
  equipment_used: string;
  delays_issues: string;
  safety_incidents: string;
}

export interface PreviousReport {
  work_performed?: string | null;
  crew_count?: number | null;
  weather_conditions?: string | null;
  materials_delivered?: string | null;
  equipment_used?: string | null;
  delays_issues?: string | null;
  safety_incidents?: string | null;
}

export interface DailyReportTemplateDefaults {
  default_crew_count?: number | null;
  default_weather_conditions?: string | null;
  default_safety_notes?: string | null;
}

/**
 * Pre-fill form fields from the previous day's report. Copies the recurring
 * context (crew, weather, materials, equipment) and the prior work description
 * as a starting point; the user edits from there. `delays_issues` and
 * `safety_incidents` are intentionally NOT carried over — those are day-specific
 * and should not silently repeat.
 */
export function buildReportFromPrevious(prev: PreviousReport): Partial<DailyReportFormFields> {
  return {
    work_performed: prev.work_performed ?? '',
    crew_count: prev.crew_count ?? 0,
    weather_conditions: prev.weather_conditions ?? '',
    materials_delivered: prev.materials_delivered ?? '',
    equipment_used: prev.equipment_used ?? '',
    delays_issues: '',
    safety_incidents: '',
  };
}

/**
 * Apply a template's defaults to the form. Only fields the template actually
 * specifies are returned, so existing form values are preserved for the rest.
 */
export function applyTemplateDefaults(
  template: DailyReportTemplateDefaults
): Partial<DailyReportFormFields> {
  const out: Partial<DailyReportFormFields> = {};
  if (template.default_crew_count != null) out.crew_count = template.default_crew_count;
  if (template.default_weather_conditions) out.weather_conditions = template.default_weather_conditions;
  if (template.default_safety_notes) out.safety_incidents = template.default_safety_notes;
  return out;
}
