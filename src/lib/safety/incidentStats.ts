/**
 * Safety incident statistics (US-103).
 *
 * Pure, framework-free aggregation of safety_incidents rows into the figures the
 * safety dashboard needs — severity breakdown, days since last incident, OSHA /
 * lost-time counts, and a per-month trend — so it is unit testable.
 */

export type Severity = 'minor' | 'major' | 'critical' | 'other';

const OPEN_STATUSES = new Set(['open', 'investigating', 'in_progress', 'pending', 'reported']);

export interface IncidentInput {
  id?: string;
  incident_date: string;
  severity?: string | null;
  incident_type?: string | null;
  status?: string | null;
  osha_recordable?: boolean | null;
  lost_time?: boolean | null;
  days_away_from_work?: number | null;
  project_id?: string | null;
}

/** Normalize a freeform severity string into the known set. */
export function normalizeSeverity(severity: string | null | undefined): Severity {
  switch ((severity ?? '').toLowerCase()) {
    case 'minor':
    case 'low':
    case 'near_miss':
    case 'near miss':
      return 'minor';
    case 'major':
    case 'moderate':
    case 'serious':
    case 'high':
      return 'major';
    case 'critical':
    case 'fatal':
    case 'fatality':
    case 'severe':
      return 'critical';
    default:
      return 'other';
  }
}

export interface MonthlyTrendPoint {
  /** YYYY-MM key. */
  month: string;
  /** Short human label, e.g. "Jan". */
  label: string;
  count: number;
}

export interface IncidentStats {
  total: number;
  openCount: number;
  bySeverity: Record<Severity, number>;
  byType: Record<string, number>;
  /** Whole days since the most recent incident; null when there are none. */
  daysSinceLastIncident: number | null;
  lastIncidentDate: string | null;
  oshaRecordableCount: number;
  lostTimeCount: number;
  totalDaysAwayFromWork: number;
  /** One point per month for the trailing `months` window, oldest first. */
  monthlyTrend: MonthlyTrendPoint[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

export interface IncidentStatsOptions {
  /** "Now" for the days-since and trend window; defaults to current date. */
  asOf?: string | Date;
  /** Number of trailing months in the trend (default 12). */
  months?: number;
}

/** Summarize incidents into dashboard statistics. */
export function summarizeIncidents(
  incidents: IncidentInput[],
  options: IncidentStatsOptions = {}
): IncidentStats {
  const asOf = options.asOf ? new Date(options.asOf) : new Date();
  const asOfTime = asOf.getTime();
  const months = options.months ?? 12;

  const bySeverity: Record<Severity, number> = { minor: 0, major: 0, critical: 0, other: 0 };
  const byType: Record<string, number> = {};
  let openCount = 0;
  let oshaRecordableCount = 0;
  let lostTimeCount = 0;
  let totalDaysAwayFromWork = 0;
  let lastIncidentTime: number | null = null;
  let lastIncidentDate: string | null = null;

  // Seed the trend buckets for the trailing window so empty months show as 0.
  const trendBuckets = new Map<string, number>();
  const trend: MonthlyTrendPoint[] = [];
  const base = new Date(asOf.getFullYear(), asOf.getMonth(), 1);
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const key = monthKey(d.getFullYear(), d.getMonth());
    trendBuckets.set(key, 0);
    trend.push({ month: key, label: MONTH_LABELS[d.getMonth()], count: 0 });
  }

  for (const inc of incidents) {
    const sev = normalizeSeverity(inc.severity);
    bySeverity[sev] += 1;

    const type = (inc.incident_type ?? 'unspecified').toLowerCase();
    byType[type] = (byType[type] ?? 0) + 1;

    if (OPEN_STATUSES.has((inc.status ?? '').toLowerCase())) openCount += 1;
    if (inc.osha_recordable) oshaRecordableCount += 1;
    if (inc.lost_time) lostTimeCount += 1;
    totalDaysAwayFromWork += inc.days_away_from_work ?? 0;

    const t = new Date(inc.incident_date).getTime();
    if (Number.isFinite(t)) {
      if (t <= asOfTime && (lastIncidentTime == null || t > lastIncidentTime)) {
        lastIncidentTime = t;
        lastIncidentDate = inc.incident_date;
      }
      const d = new Date(inc.incident_date);
      const key = monthKey(d.getFullYear(), d.getMonth());
      if (trendBuckets.has(key)) trendBuckets.set(key, (trendBuckets.get(key) ?? 0) + 1);
    }
  }

  for (const point of trend) {
    point.count = trendBuckets.get(point.month) ?? 0;
  }

  const daysSinceLastIncident =
    lastIncidentTime == null ? null : Math.max(0, Math.floor((asOfTime - lastIncidentTime) / MS_PER_DAY));

  return {
    total: incidents.length,
    openCount,
    bySeverity,
    byType,
    daysSinceLastIncident,
    lastIncidentDate,
    oshaRecordableCount,
    lostTimeCount,
    totalDaysAwayFromWork,
    monthlyTrend: trend,
  };
}

export interface IncidentFilter {
  severity?: Severity | 'all';
  projectId?: string | 'all';
  /** Inclusive ISO date lower bound. */
  from?: string;
  /** Inclusive ISO date upper bound. */
  to?: string;
}

export type IncidentSortField = 'date' | 'severity';

const SEVERITY_RANK: Record<Severity, number> = { critical: 3, major: 2, minor: 1, other: 0 };

/** Filter and sort incidents for the list view (pure, so it is testable). */
export function filterAndSortIncidents<T extends IncidentInput>(
  incidents: T[],
  filter: IncidentFilter = {},
  sortBy: IncidentSortField = 'date',
  direction: 'asc' | 'desc' = 'desc'
): T[] {
  const fromTime = filter.from ? new Date(filter.from).getTime() : null;
  const toTime = filter.to ? new Date(filter.to).getTime() : null;

  const filtered = incidents.filter((inc) => {
    if (filter.severity && filter.severity !== 'all' && normalizeSeverity(inc.severity) !== filter.severity) {
      return false;
    }
    if (filter.projectId && filter.projectId !== 'all' && (inc.project_id ?? null) !== filter.projectId) {
      return false;
    }
    const t = new Date(inc.incident_date).getTime();
    if (fromTime != null && Number.isFinite(t) && t < fromTime) return false;
    if (toTime != null && Number.isFinite(t) && t > toTime) return false;
    return true;
  });

  const sign = direction === 'asc' ? 1 : -1;
  return filtered.sort((a, b) => {
    if (sortBy === 'severity') {
      return sign * (SEVERITY_RANK[normalizeSeverity(a.severity)] - SEVERITY_RANK[normalizeSeverity(b.severity)]);
    }
    return sign * (new Date(a.incident_date).getTime() - new Date(b.incident_date).getTime());
  });
}
