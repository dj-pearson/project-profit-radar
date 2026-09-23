/**
 * US-370: /admin/analytics charted resourceUtilization, revenueByPeriod and
 * trendData built from Math.random(). These tests pin the replacement: series
 * come from queried rows, empty months are 0, and nothing random is involved.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  lastMonths,
  monthKeyOf,
  buildRevenueByPeriod,
  buildResourceUtilization,
  buildTrendData,
  buildStatusDistribution,
  isSeriesEmpty,
} from '../analyticsSeries';

const NOW = new Date(2026, 8, 15); // Sep 2026
const months = lastMonths(3, NOW); // Jul, Aug, Sep 2026

afterEach(() => vi.restoreAllMocks());

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('analyticsSeries (US-370)', () => {
  it('builds the last N calendar months oldest first', () => {
    expect(months.map((m) => m.key)).toEqual(['2026-07', '2026-08', '2026-09']);
  });

  it('reads the month from a date-only string without timezone slip', () => {
    expect(monthKeyOf('2026-08-01')).toBe('2026-08');
    expect(monthKeyOf(null)).toBeNull();
  });

  it('sums invoiced revenue and job costs per month, skipping drafts and cancelled', () => {
    const rows = buildRevenueByPeriod(
      months,
      [
        { issue_date: '2026-08-03', total_amount: 1000, status: 'sent' },
        { issue_date: '2026-08-20', total_amount: 500, status: 'paid' },
        { issue_date: '2026-08-21', total_amount: 9999, status: 'draft' },
        { issue_date: '2026-09-01', total_amount: 7777, status: 'cancelled' },
      ],
      [{ project_id: 'p1', date: '2026-08-10', total_cost: 400, material_cost: 100 }],
    );
    expect(rows[0]).toMatchObject({ revenue: 0, costs: 0, profit: 0 });
    expect(rows[1]).toMatchObject({ revenue: 1500, costs: 400, profit: 1100 });
    expect(rows[2]).toMatchObject({ revenue: 0, costs: 0 });
  });

  it('labor hours come from time_entries.total_hours, material from job_costs.material_cost', () => {
    const rows = buildResourceUtilization(
      months,
      [
        { start_time: '2026-07-02T08:00:00Z', total_hours: 8 },
        { start_time: '2026-07-03T08:00:00Z', total_hours: 7.5 },
      ],
      [{ project_id: 'p1', date: '2026-09-02', total_cost: 300, material_cost: 250 }],
    );
    expect(rows.map((r) => r.laborHours)).toEqual([15.5, 0, 0]);
    expect(rows.map((r) => r.materialCost)).toEqual([0, 0, 250]);
    expect(Object.keys(rows[0]).sort()).toEqual(['laborHours', 'materialCost', 'period']);
  });

  it('trend counts projects by start_date and completed_at; avg value is null when none started', () => {
    const rows = buildTrendData(months, [
      { id: 'a', status: 'active', budget: 100000, start_date: '2026-08-05', completed_at: null },
      { id: 'b', status: 'active', budget: 50000, start_date: '2026-08-25', completed_at: null },
      { id: 'c', status: 'completed', budget: null, start_date: '2025-01-01', completed_at: '2026-09-02T12:00:00Z' },
    ]);
    expect(rows.map((r) => r.projectsStarted)).toEqual([0, 2, 0]);
    expect(rows.map((r) => r.projectsCompleted)).toEqual([0, 0, 1]);
    expect(rows.map((r) => r.avgProjectValue)).toEqual([null, 75000, null]);
  });

  it('status distribution counts real project statuses and is empty for no projects', () => {
    expect(buildStatusDistribution([])).toEqual([]);
    const dist = buildStatusDistribution([
      { id: 'a', status: 'active', budget: 0, start_date: null, completed_at: null },
      { id: 'b', status: 'in_progress', budget: 0, start_date: null, completed_at: null },
      { id: 'c', status: 'completed', budget: 0, start_date: null, completed_at: null },
    ]);
    expect(dist.map(({ name, value }) => ({ name, value }))).toEqual([
      { name: 'In Progress', value: 2 },
      { name: 'Completed', value: 1 },
    ]);
  });

  it('no rows means an empty series, which the page shows as an empty state', () => {
    expect(isSeriesEmpty(buildRevenueByPeriod(months, [], []), ['revenue', 'costs'])).toBe(true);
    expect(isSeriesEmpty(buildTrendData(months, []), ['avgProjectValue'])).toBe(true);
  });

  it('never calls Math.random', () => {
    const spy = vi.spyOn(Math, 'random');
    buildRevenueByPeriod(months, [], []);
    buildResourceUtilization(months, [], []);
    buildTrendData(months, []);
    buildStatusDistribution([]);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('Analytics page source (US-370)', () => {
  const src = stripComments(readFileSync(resolve(__dirname, '../../pages/Analytics.tsx'), 'utf8'));

  it('has no Math.random and none of the hardcoded figures it used to chart', () => {
    expect(src).not.toMatch(/Math\.random/);
    for (const fake of ["change=\"+12.5%\"", 'value: 35', '+23%', 'value="89%"', '92% ']) {
      expect(src).not.toContain(fake);
    }
  });

  it('queries the real tables and columns the series are built from', () => {
    expect(src).toContain(".from('time_entries')");
    expect(src).toContain(".select('start_time, total_hours')");
    expect(src).toContain(".from('invoices')");
    expect(src).toContain(".select('issue_date, total_amount, status')");
    expect(src).toContain(".select('project_id, date, total_cost, material_cost')");
    // job_costs used to be fetched for every company and filtered client-side.
    expect(src).toMatch(/from\('job_costs'\)\s*\.select\([^)]*\)\s*\.in\('project_id', projectIds\)/);
  });

  it('says plainly that equipment usage and efficiency are not tracked', () => {
    expect(src).toContain("doesn't track equipment utilization");
    expect(src).not.toContain('dataKey="efficiency"');
  });
});
