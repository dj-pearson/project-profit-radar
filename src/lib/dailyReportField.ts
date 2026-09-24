/**
 * The daily report as a field record (US-330).
 *
 * Crew was an integer typed by hand, while the same people had already clocked
 * in against the same project on the same day. Two numbers, no way to say which
 * was right, and the superintendent entering the crew twice.
 *
 * These are the pure parts: turning time entries into crew rows, and saying
 * plainly where the report and the timesheets disagree. Kept out of the
 * component so the arithmetic can be tested without a database, and so the
 * daily report page and the reconciliation view cannot drift.
 */

/** Hours past this in a day are overtime. Federal default; not per-company yet. */
export const OVERTIME_THRESHOLD_HOURS = 8;

export interface TimeEntryLike {
  user_id: string;
  total_hours: number | null;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
}

export interface CrewRow {
  user_id: string;
  crew_member_name: string;
  role: string | null;
  hours_worked: number;
  overtime_hours: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const crewMemberName = (e: TimeEntryLike): string =>
  [e.first_name, e.last_name].filter(Boolean).join(' ').trim() || 'Crew member';

/**
 * One crew row per person, hours summed across their entries for the day.
 *
 * Summing before splitting matters: somebody who clocks 5 hours in the morning
 * and 4 after lunch worked a 9-hour day with 1 of overtime, not two short
 * shifts with none. Splitting each entry separately would lose every hour of
 * overtime on any job where the crew clocks out for lunch.
 */
export function crewFromTimeEntries(entries: TimeEntryLike[]): CrewRow[] {
  const byUser = new Map<string, { entry: TimeEntryLike; hours: number }>();

  for (const entry of entries) {
    if (!entry.user_id) continue;
    const hours = Number(entry.total_hours) || 0;
    const existing = byUser.get(entry.user_id);
    if (existing) existing.hours += hours;
    else byUser.set(entry.user_id, { entry, hours });
  }

  return [...byUser.entries()]
    .map(([user_id, { entry, hours }]) => ({
      user_id,
      crew_member_name: crewMemberName(entry),
      role: entry.role ?? null,
      hours_worked: round2(Math.min(hours, OVERTIME_THRESHOLD_HOURS)),
      overtime_hours: round2(Math.max(hours - OVERTIME_THRESHOLD_HOURS, 0)),
    }))
    .filter((row) => row.hours_worked > 0 || row.overtime_hours > 0)
    .sort((a, b) => a.crew_member_name.localeCompare(b.crew_member_name));
}

export const totalCrewHours = (rows: CrewRow[]): number =>
  round2(rows.reduce((sum, r) => sum + r.hours_worked + r.overtime_hours, 0));

export interface Reconciliation {
  reportedCrew: number;
  timesheetCrew: number;
  reportedHours: number;
  timesheetHours: number;
  hoursVariance: number;
  agrees: boolean;
  /** What to show a person. Empty when the two agree. */
  message: string;
}

/**
 * Where the report and the timesheets disagree.
 *
 * A quarter-hour of tolerance, because a superintendent rounding a half-day to
 * 4 hours against a clock that recorded 3.98 is not a discrepancy worth a
 * warning; an hour is.
 */
export function reconcileDailyReport(params: {
  reportedCrew: number;
  timesheetCrew: number;
  reportedHours: number;
  timesheetHours: number;
  toleranceHours?: number;
}): Reconciliation {
  const tolerance = params.toleranceHours ?? 0.25;
  const reportedCrew = Number(params.reportedCrew) || 0;
  const timesheetCrew = Number(params.timesheetCrew) || 0;
  const reportedHours = round2(Number(params.reportedHours) || 0);
  const timesheetHours = round2(Number(params.timesheetHours) || 0);
  const hoursVariance = round2(reportedHours - timesheetHours);

  const crewAgrees = reportedCrew === timesheetCrew;
  const hoursAgree = Math.abs(hoursVariance) <= tolerance;

  // No timesheets at all is not a discrepancy on the day the report is filed -
  // the crew may not have clocked out yet. Saying "0 hours on the timesheets"
  // to a superintendent at 4pm trains them to ignore the warning.
  if (timesheetCrew === 0 && timesheetHours === 0) {
    return {
      reportedCrew, timesheetCrew, reportedHours, timesheetHours, hoursVariance,
      agrees: true,
      message: '',
    };
  }

  if (crewAgrees && hoursAgree) {
    return {
      reportedCrew, timesheetCrew, reportedHours, timesheetHours, hoursVariance,
      agrees: true, message: '',
    };
  }

  const parts: string[] = [];
  if (!crewAgrees) {
    parts.push(`${reportedCrew} on the report, ${timesheetCrew} on the timesheets`);
  }
  if (!hoursAgree) {
    parts.push(
      `${reportedHours}h reported against ${timesheetHours}h clocked ` +
      `(${hoursVariance > 0 ? '+' : ''}${hoursVariance}h)`
    );
  }

  return {
    reportedCrew, timesheetCrew, reportedHours, timesheetHours, hoursVariance,
    agrees: false,
    message: parts.join('; '),
  };
}

/**
 * Where a daily-report photo lives.
 *
 * The project id has to be the first path segment: the project-documents
 * SELECT policy matches on it (US-289), so a file stored anywhere else is
 * either unreadable or readable by the wrong people once that bucket is
 * private.
 */
export function photoStoragePath(params: {
  projectId: string;
  fileName: string;
}): string {
  return `${params.projectId}/daily-reports/${params.fileName}`;
}

/**
 * The project id a stored photo belongs to, read back off its path.
 *
 * Used to check a path before trusting it, since the bucket policy depends on
 * this segment being right.
 */
export function projectIdFromPhotoPath(path: string): string | null {
  const first = path.split('/')[0];
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(first)
    ? first
    : null;
}

/**
 * Materials and equipment as rows (US-330).
 *
 * The web form collects both as free text, and iOS at MIN_SUPPORTED_IOS_VERSION
 * reads those text columns, so they stay. What changes is that each line also
 * becomes a daily_report_material_items or daily_report_equipment_items row, so
 * "how much concrete went into this job" is a query rather than a read of every
 * report. The text stays the source a person typed; the rows are the best
 * reading of it, and a line that does not parse still becomes a row with just a
 * name rather than being dropped.
 */

/** Lines past this are not a daily report; they are a paste accident. */
export const MAX_REPORT_ITEMS = 50;
const MAX_ITEM_NAME = 200;

export interface MaterialItemRow {
  material_name: string;
  quantity: number | null;
  unit: string | null;
}

export interface EquipmentItemRow {
  equipment_name: string;
  hours_used: number | null;
}

/** Units a superintendent actually writes. Anything else is part of the name. */
const MATERIAL_UNITS = new Set([
  'bag', 'bags', 'box', 'boxes', 'bundle', 'bundles', 'cy', 'yd', 'yds', 'yard', 'yards',
  'ton', 'tons', 'lf', 'sf', 'sq', 'ea', 'each', 'pc', 'pcs', 'piece', 'pieces',
  'sheet', 'sheets', 'gal', 'gallon', 'gallons', 'lb', 'lbs', 'ft', 'pallet', 'pallets',
  'load', 'loads', 'roll', 'rolls', 'tube', 'tubes', 'bucket', 'buckets', 'case', 'cases',
]);

/** One item per line or semicolon, with list bullets and numbering removed. */
export function splitReportLines(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/[\r\n;]+/)
    .map((line) => line
      .replace(/^\s*(?:[-*]|\d+[.)])\s+/, '')
      .replace(/\s+/g, ' ')
      .trim())
    .filter((line) => line.length > 0 && !/^(none|n\/a|na|-+)$/i.test(line))
    .slice(0, MAX_REPORT_ITEMS);
}

const clip = (s: string) => s.slice(0, MAX_ITEM_NAME);

/**
 * "20 bags concrete" -> 20, bags, concrete. "12 2x4 studs" -> 12, no unit,
 * "2x4 studs". "Rebar delivered" -> a name and nothing else.
 */
export function materialItemsFromText(text: string | null | undefined): MaterialItemRow[] {
  return splitReportLines(text).map((line) => {
    const m = line.match(/^(\d+(?:\.\d+)?)\s*x?\s+(.+)$/i);
    if (!m) return { material_name: clip(line), quantity: null, unit: null };

    const quantity = Number(m[1]);
    let rest = m[2];
    let unit: string | null = null;
    const unitMatch = rest.match(/^([a-z]+)\.?(?:\s+of)?\s+(.+)$/i);
    if (unitMatch && MATERIAL_UNITS.has(unitMatch[1].toLowerCase())) {
      unit = unitMatch[1].toLowerCase();
      rest = unitMatch[2];
    }
    return { material_name: clip(rest.trim()), quantity, unit };
  });
}

/**
 * "Excavator 6h", "Excavator - 6 hrs", "Excavator (6 hours)" -> Excavator, 6.
 * No hours on the line means unknown, not zero: a machine on site that nobody
 * timed was still on site.
 */
export function equipmentItemsFromText(text: string | null | undefined): EquipmentItemRow[] {
  return splitReportLines(text).map((line) => {
    const hours = line.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b\.?/i);
    if (!hours) return { equipment_name: clip(line), hours_used: null };
    const name = line
      .replace(hours[0], '')
      .replace(/\(\s*\)/g, '')
      .replace(/[\s\-:,@]+$/, '')
      .replace(/^[\s\-:,@]+/, '')
      .trim();
    return { equipment_name: clip(name || line), hours_used: Number(hours[1]) };
  });
}
