/**
 * US-233: executive KPI + forecasting helpers
 */
import { describe, it, expect } from 'vitest';
import {
  monthKey,
  aggregateMonthly,
  linearRegression,
  forecastSeries,
  addMonths,
  profitMargin,
  profitMarginTrend,
  cashRunwayMonths,
  averageMonthlyBurn,
  winRate,
  average,
  sum,
  computeWinRate,
  computeAvgProjectSize,
  computeBacklog,
  projectValue,
  type SeriesPoint,
} from '@/lib/executive-kpis';

describe('date bucketing (US-233)', () => {
  it('derives the YYYY-MM key', () => {
    expect(monthKey('2026-03-14T10:00:00Z')).toBe('2026-03');
  });
  it('adds months across year boundaries', () => {
    expect(addMonths('2026-11', 3)).toBe('2027-02');
    expect(addMonths('2026-01', 0)).toBe('2026-01');
  });
  it('aggregates amounts into a sorted monthly series', () => {
    const series = aggregateMonthly([
      { date: '2026-02-10', amount: 100 },
      { date: '2026-01-05', amount: 50 },
      { date: '2026-02-20', amount: 25 },
    ]);
    expect(series).toEqual([
      { period: '2026-01', value: 50 },
      { period: '2026-02', value: 125 },
    ]);
  });
});

describe('linearRegression + forecast (US-233)', () => {
  it('fits a perfect upward line', () => {
    const fit = linearRegression([10, 20, 30, 40]);
    expect(fit.slope).toBeCloseTo(10);
    expect(fit.intercept).toBeCloseTo(10);
  });
  it('handles 0 and 1 point', () => {
    expect(linearRegression([])).toEqual({ slope: 0, intercept: 0 });
    expect(linearRegression([42])).toEqual({ slope: 0, intercept: 42 });
  });
  it('forecasts the continuation of a linear trend, floored at 0', () => {
    const history: SeriesPoint[] = [
      { period: '2026-01', value: 100 },
      { period: '2026-02', value: 200 },
      { period: '2026-03', value: 300 },
    ];
    const fc = forecastSeries(history, 2);
    expect(fc).toEqual([
      { period: '2026-04', value: 400 },
      { period: '2026-05', value: 500 },
    ]);
  });
  it('never projects negative values', () => {
    const history: SeriesPoint[] = [
      { period: '2026-01', value: 100 },
      { period: '2026-02', value: 40 },
      { period: '2026-03', value: 10 },
    ];
    const fc = forecastSeries(history, 3);
    expect(fc.every((p) => p.value >= 0)).toBe(true);
  });
});

describe('profit margin (US-233)', () => {
  it('computes the ratio and guards zero revenue', () => {
    expect(profitMargin(1000, 600)).toBeCloseTo(0.4);
    expect(profitMargin(0, 100)).toBe(0);
  });
  it('builds a monthly margin-% trend aligned by period', () => {
    const rev: SeriesPoint[] = [{ period: '2026-01', value: 1000 }, { period: '2026-02', value: 2000 }];
    const cost: SeriesPoint[] = [{ period: '2026-01', value: 500 }, { period: '2026-02', value: 1000 }];
    expect(profitMarginTrend(rev, cost)).toEqual([
      { period: '2026-01', value: 50 },
      { period: '2026-02', value: 50 },
    ]);
  });
});

describe('cash runway (US-233)', () => {
  it('is Infinity when not burning', () => {
    expect(cashRunwayMonths(10000, 0)).toBe(Infinity);
    expect(cashRunwayMonths(10000, -500)).toBe(Infinity);
  });
  it('is cash / burn when burning, 0 when out of cash', () => {
    expect(cashRunwayMonths(12000, 3000)).toBe(4);
    expect(cashRunwayMonths(0, 3000)).toBe(0);
  });
  it('averages monthly net burn (cost − revenue)', () => {
    const rev: SeriesPoint[] = [{ period: '2026-01', value: 1000 }, { period: '2026-02', value: 1000 }];
    const cost: SeriesPoint[] = [{ period: '2026-01', value: 1500 }, { period: '2026-02', value: 1500 }];
    expect(averageMonthlyBurn(rev, cost)).toBe(500); // (500 + 500) / 2 months
  });
});

describe('win rate + aggregates (US-233)', () => {
  it('computes win rate and guards no decisions', () => {
    expect(winRate(3, 1)).toBeCloseTo(0.75);
    expect(winRate(0, 0)).toBe(0);
  });
  it('averages and sums', () => {
    expect(average([10, 20, 30])).toBe(20);
    expect(average([])).toBe(0);
    expect(sum([1, 2, 3])).toBe(6);
  });
});

describe('KPI derivations (US-233)', () => {
  it('computes win rate over decided estimates', () => {
    // 2 accepted, 1 rejected, 1 sent (all decided), 1 draft (ignored) → 2/4
    expect(
      computeWinRate(['accepted', 'accepted', 'rejected', 'sent', 'draft', null])
    ).toBeCloseTo(0.5);
    expect(computeWinRate(['draft', 'draft'])).toBe(0);
  });

  it('prefers total_budget then budget for project value', () => {
    expect(projectValue({ total_budget: 200, budget: 100 })).toBe(200);
    expect(projectValue({ total_budget: null, budget: 100 })).toBe(100);
    expect(projectValue({})).toBe(0);
  });

  it('averages size over active/completed only', () => {
    const projects = [
      { budget: 100, status: 'active' },
      { budget: 300, status: 'completed' },
      { budget: 9999, status: 'cancelled' },
    ];
    expect(computeAvgProjectSize(projects)).toBe(200);
  });

  it('sums backlog over in-flight projects only', () => {
    const projects = [
      { budget: 100, status: 'active' },
      { budget: 200, status: 'planning' },
      { budget: 50, status: 'on_hold' },
      { budget: 9999, status: 'completed' },
    ];
    expect(computeBacklog(projects)).toBe(350);
  });
});
