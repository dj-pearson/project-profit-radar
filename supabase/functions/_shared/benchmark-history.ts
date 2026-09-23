/**
 * Monthly history for generate-performance-benchmarks.
 *
 * historicalTrends was twelve points of `successRate + (Math.random() - 0.5)
 * * 20` next to an "industry" line of `89 + (Math.random() - 0.5) * 6`,
 * returned and charted as the company's past performance. This computes each
 * month from the projects themselves: of the projects that existed by the end
 * of that month, the percentage completed by then. A month before the first
 * project has no rate and says so with null.
 *
 * Pure on purpose, so vitest can load it.
 */

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface HistoryProject {
  status?: string | null;
  created_at?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  updated_at?: string | null;
}

export interface HistoryPoint {
  month: string;
  performance: number | null;
  industry: number | null;
}

function parse(d: string | null | undefined): number | null {
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * `industryRate` is the benchmark average completion rate (from the AI
 * comparison); it is repeated flat across the months because nothing reports
 * an industry history. null when absent.
 */
export function buildHistoricalTrends(
  projects: HistoryProject[],
  industryRate: unknown,
  now: Date,
): HistoryPoint[] {
  const industry = typeof industryRate === 'number' && Number.isFinite(industryRate) ? industryRate : null;
  const points: HistoryPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const monthEnd = Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1) - 1;
    let existing = 0;
    let completed = 0;
    for (const p of projects) {
      const began = parse(p.created_at) ?? parse(p.start_date);
      if (began === null || began > monthEnd) continue;
      existing++;
      if (p.status === 'completed') {
        const finished = parse(p.end_date) ?? parse(p.updated_at);
        if (finished !== null && finished <= monthEnd) completed++;
      }
    }
    points.push({
      month: MONTH_NAMES[monthStart.getUTCMonth()],
      performance: existing > 0 ? Math.round((completed / existing) * 1000) / 10 : null,
      industry,
    });
  }
  return points;
}
