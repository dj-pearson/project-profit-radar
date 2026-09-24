/**
 * The two mobile daily-report forms, mapped onto the row the desktop form
 * writes.
 *
 * Both forms spread their own state into the daily_reports insert:
 * crew_members, material_usage, task_progress, voice_notes, location,
 * report_date and a dozen others that are not columns. PostgREST rejects the
 * whole row when one field is unknown, so neither form could save a report at
 * all. These mappers produce DailyReportFormValues plus the closed set of
 * extra columns buildDailyReportInsert accepts, and the item rows the desktop
 * path writes after the report exists. Kept pure so the mapping is tested
 * without React or a database.
 */
import type { DailyReportData } from '@/components/mobile/daily-report/types';
import type { DailyReportExtraColumns, DailyReportFormValues } from '@/lib/validations/daily-reports';
import type { EquipmentItemRow, MaterialItemRow } from '@/lib/dailyReportField';
import { materialItemsFromText } from '@/lib/dailyReportField';
import type { CrewItemRow, TaskItemRow } from '@/hooks/useDailyReportsPage';

export interface MobileGps {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}

const blankToNull = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);

const numberOrNull = (v: string | number | null | undefined): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function gpsColumns(gps: MobileGps | null | undefined): DailyReportExtraColumns {
  if (!gps || (!gps.latitude && !gps.longitude)) return {};
  return {
    gps_latitude: gps.latitude,
    gps_longitude: gps.longitude,
    gps_accuracy: gps.accuracy ?? null,
  };
}

/** A base64 camera capture as a File, so it goes through the same upload as a picked one. */
export function photoFileFromBase64(base64: string, index: number, mimeType = 'image/jpeg'): File {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  return new File([bytes], `daily-report-photo-${index + 1}.${ext}`, { type: mimeType });
}

/** daily_report_task_items.status allows not_started, in_progress, completed, blocked. */
function taskStatus(task: DailyReportData['task_progress'][number]): TaskItemRow['status'] {
  if (task.status === 'blocked') return 'blocked';
  if (task.actual_completion >= 100) return 'completed';
  if (task.actual_completion <= 0) return 'not_started';
  return 'in_progress';
}

/** daily_report_equipment_items.condition allows excellent, good, fair, poor, needs_repair. */
function equipmentCondition(c: DailyReportData['equipment_usage'][number]['condition']): string {
  return c === 'down' ? 'needs_repair' : c;
}

export interface MappedMobileReport {
  values: DailyReportFormValues;
  date: string;
  columns: DailyReportExtraColumns;
  materials: MaterialItemRow[];
  equipment: EquipmentItemRow[];
  crew: CrewItemRow[];
  tasks: TaskItemRow[];
}

/** MobileDailyReportManager's five-step wizard. */
export function mapWizardReport(
  data: DailyReportData,
  ctx: { userId?: string | null; gps?: MobileGps | null; now?: Date },
): MappedMobileReport {
  const materialLines = data.material_usage.map((m) =>
    [m.quantity_used || null, m.unit || null, m.material_name].filter(Boolean).join(' '));
  const equipmentLines = data.equipment_usage.map((e) =>
    e.hours_used ? `${e.equipment_name} ${e.hours_used}h` : e.equipment_name);
  const deliveries = blankToNull(data.deliveries_received);

  // The text columns stay the thing iOS at MIN_SUPPORTED_IOS_VERSION reads;
  // the item rows below are the same lines as records.
  const materialsText = [...materialLines, ...(deliveries ? [deliveries] : [])].join('\n');
  const equipmentText = equipmentLines.join('\n');

  const taskLines = data.task_progress.map((t) => `${t.task_name}: ${t.actual_completion}%`);
  const work = [data.work_performed.trim(), ...(taskLines.length ? ['', 'Task progress:', ...taskLines] : [])]
    .join('\n');

  return {
    date: data.report_date,
    values: {
      project_id: data.project_id,
      work_performed: work,
      crew_count: data.crew_members.length,
      weather_conditions: data.weather_conditions,
      materials_delivered: materialsText,
      equipment_used: equipmentText,
      delays_issues: data.delays_challenges,
      safety_incidents: data.safety_observations,
      signature: '',
    },
    columns: {
      temperature: numberOrNull(data.temperature),
      completion_percentage: Math.min(Math.max(Math.round(data.work_completion_percentage || 0), 0), 100),
      quality_issues: blankToNull(data.quality_issues),
      next_day_plan: blankToNull(data.next_day_plan),
      client_visitors: blankToNull(data.client_visitors),
      submitted_by: ctx.userId ?? null,
      submission_timestamp: (ctx.now ?? new Date()).toISOString(),
      ...gpsColumns(ctx.gps),
    },
    materials: [
      ...data.material_usage.map((m) => ({
        material_name: m.material_name,
        quantity: m.quantity_used || null,
        unit: blankToNull(m.unit),
        waste_percentage: m.waste_percentage ?? null,
      })),
      ...materialItemsFromText(deliveries),
    ],
    equipment: data.equipment_usage.map((e) => ({
      equipment_name: e.equipment_name,
      hours_used: e.hours_used || null,
      condition: equipmentCondition(e.condition),
      notes: blankToNull(e.notes) ?? (e.condition === 'down' ? 'Down' : null),
    })),
    crew: data.crew_members.map((c) => ({
      crew_member_name: c.name,
      role: blankToNull(c.role),
      hours_worked: c.hours_worked,
      overtime_hours: c.overtime_hours,
    })),
    tasks: data.task_progress.map((t) => ({
      task_name: t.task_name,
      status: taskStatus(t),
      completion_percentage: Math.min(Math.max(Math.round(t.actual_completion || 0), 0), 100),
      notes: [
        `Planned ${t.planned_completion}%`,
        t.status === 'behind' || t.status === 'ahead' ? `${t.status} schedule` : null,
        blankToNull(t.notes),
      ].filter(Boolean).join('; '),
    })),
  };
}

/** The fields MobileDailyReport (the quick form on /daily-reports) collects. */
export interface QuickReportFields {
  project_id: string;
  weather_conditions: string;
  work_performed: string;
  issues_encountered: string;
  safety_notes: string;
  crew_count: number;
  visitor_count: number;
}

export function mapQuickReport(
  data: QuickReportFields,
  ctx: { userId?: string | null; gps?: MobileGps | null; now?: Date },
): MappedMobileReport {
  const now = ctx.now ?? new Date();
  return {
    date: now.toISOString().split('T')[0],
    values: {
      project_id: data.project_id,
      work_performed: data.work_performed,
      crew_count: Math.max(0, Math.round(data.crew_count || 0)),
      weather_conditions: data.weather_conditions,
      materials_delivered: '',
      equipment_used: '',
      delays_issues: data.issues_encountered,
      safety_incidents: data.safety_notes,
      signature: '',
    },
    columns: {
      client_visitors: data.visitor_count > 0 ? `${data.visitor_count} visitor(s)` : null,
      submitted_by: ctx.userId ?? null,
      submission_timestamp: now.toISOString(),
      ...gpsColumns(ctx.gps),
    },
    materials: [],
    equipment: [],
    crew: [],
    tasks: [],
  };
}
