import { describe, it, expect } from 'vitest';
import {
  netApprovedChangeOrders,
  plannedPercentComplete,
  computeWipRow,
  buildWipSchedule,
  summarizeCostToComplete,
} from '../wipReport';

describe('netApprovedChangeOrders', () => {
  it('sums approved additions and deductions, ignores unapproved', () => {
    const total = netApprovedChangeOrders([
      { amount: 10000, status: 'approved' },
      { amount: -2500, client_approved: true },
      { amount: 5000, status: 'pending' },
      { amount: 8000, status: 'rejected' },
      { amount: 1000, status: 'completed' },
    ]);
    expect(total).toBe(8500); // 10000 - 2500 + 1000
  });

  it('returns 0 for empty input', () => {
    expect(netApprovedChangeOrders([])).toBe(0);
  });
});

describe('plannedPercentComplete', () => {
  it('is straight-line by elapsed time', () => {
    expect(plannedPercentComplete('2026-01-01', '2026-12-31', '2026-07-02')).toBeCloseTo(0.5, 1);
  });
  it('clamps to [0,1]', () => {
    expect(plannedPercentComplete('2026-01-01', '2026-06-30', '2025-01-01')).toBe(0);
    expect(plannedPercentComplete('2026-01-01', '2026-06-30', '2027-01-01')).toBe(1);
  });
  it('returns null when dates are missing or invalid', () => {
    expect(plannedPercentComplete(null, '2026-06-30', '2026-03-01')).toBeNull();
    expect(plannedPercentComplete('2026-06-30', '2026-01-01', '2026-03-01')).toBeNull();
  });
});

describe('computeWipRow', () => {
  // A project that is overbilled: 50% complete but billed more than earned.
  const overbilled = computeWipRow({
    projectId: 'p1',
    name: 'Overbilled Job',
    contractAmount: 100000,
    approvedChangeOrders: 0,
    estimatedTotalCost: 80000,
    actualCostToDate: 40000, // 50% of 80k
    billedToDate: 60000,
  });

  it('computes percent complete from cost / estimated cost', () => {
    expect(overbilled.percentComplete).toBe(0.5);
  });

  it('computes earned revenue and over/under billing', () => {
    expect(overbilled.earnedRevenue).toBe(50000); // 50% of 100k
    expect(overbilled.overbilling).toBe(10000); // billed 60k - earned 50k
    expect(overbilled.underbilling).toBe(0);
  });

  it('forecasts final cost, cost-to-complete, profit and margin', () => {
    // EAC = AC / pct = 40000 / 0.5 = 80000 (on budget)
    expect(overbilled.estimatedFinalCost).toBe(80000);
    expect(overbilled.costToComplete).toBe(40000);
    expect(overbilled.estimatedProfit).toBe(20000); // 100k - 80k
    expect(overbilled.marginPercent).toBe(20);
  });

  it('computes CPI = 1 when on budget', () => {
    expect(overbilled.cpi).toBe(1);
    expect(overbilled.costVariance).toBe(0);
  });

  it('flags an underbilled, over-cost project', () => {
    const r = computeWipRow({
      projectId: 'p2',
      name: 'Cost Overrun',
      contractAmount: 100000,
      estimatedTotalCost: 80000,
      actualCostToDate: 50000, // 62.5% complete
      billedToDate: 40000,
    });
    expect(r.percentComplete).toBe(0.625);
    expect(r.earnedRevenue).toBe(62500);
    expect(r.underbilling).toBe(22500); // earned 62.5k - billed 40k
    expect(r.overbilling).toBe(0);
    // EAC = 50000 / 0.625 = 80000; still on budget at this point
    expect(r.estimatedFinalCost).toBe(80000);
    expect(r.cpi).toBe(1); // EV(cost)=0.625*80k=50k == AC
  });

  it('detects cost overrun via CPI < 1 when ahead of cost curve', () => {
    const r = computeWipRow({
      projectId: 'p3',
      name: 'Behind on cost',
      contractAmount: 100000,
      estimatedTotalCost: 80000,
      actualCostToDate: 50000,
      billedToDate: 0,
      manualPercentComplete: 50, // only 50% done but spent 50k
    });
    // EV(cost) = 0.5 * 80k = 40k; CPI = 40k/50k = 0.8
    expect(r.cpi).toBe(0.8);
    expect(r.costVariance).toBe(-10000);
    // EAC = 50k / 0.5 = 100k -> projected loss
    expect(r.estimatedFinalCost).toBe(100000);
    expect(r.estimatedProfit).toBe(0);
  });

  it('computes SPI from schedule when dates are present', () => {
    const r = computeWipRow({
      projectId: 'p4',
      name: 'Ahead of schedule',
      contractAmount: 100000,
      estimatedTotalCost: 100000,
      actualCostToDate: 60000, // 60% complete
      billedToDate: 0,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      asOf: '2026-07-02', // ~50% time elapsed
    });
    // EV=60k, PV~50k -> SPI ~1.2
    expect(r.spi).not.toBeNull();
    expect(r.spi as number).toBeGreaterThan(1.1);
    expect(r.scheduleVariance as number).toBeGreaterThan(0);
  });

  it('leaves SPI null without a usable schedule', () => {
    expect(overbilled.spi).toBeNull();
    expect(overbilled.scheduleVariance).toBeNull();
  });

  it('handles a fresh project with no actuals', () => {
    const r = computeWipRow({
      projectId: 'p5',
      name: 'Not started',
      contractAmount: 50000,
      estimatedTotalCost: 40000,
      actualCostToDate: 0,
      billedToDate: 0,
    });
    expect(r.percentComplete).toBe(0);
    expect(r.earnedRevenue).toBe(0);
    expect(r.estimatedFinalCost).toBe(40000); // falls back to estimate
    expect(r.cpi).toBeNull();
    expect(r.marginPercent).toBe(20);
  });

  it('adds approved change orders to the contract amount', () => {
    const r = computeWipRow({
      projectId: 'p6',
      name: 'With COs',
      contractAmount: 100000,
      approvedChangeOrders: 20000,
      estimatedTotalCost: 90000,
      actualCostToDate: 45000,
      billedToDate: 0,
    });
    expect(r.contractAmount).toBe(120000);
    expect(r.percentComplete).toBe(0.5);
    expect(r.earnedRevenue).toBe(60000);
  });
});

describe('buildWipSchedule', () => {
  it('aggregates rows into reconciled totals and a blended margin', () => {
    const { rows, totals } = buildWipSchedule([
      {
        projectId: 'a',
        name: 'Beta',
        contractAmount: 100000,
        estimatedTotalCost: 80000,
        actualCostToDate: 40000,
        billedToDate: 60000,
      },
      {
        projectId: 'b',
        name: 'Alpha',
        contractAmount: 200000,
        estimatedTotalCost: 150000,
        actualCostToDate: 75000,
        billedToDate: 50000,
      },
    ]);
    expect(rows.map((r) => r.name)).toEqual(['Alpha', 'Beta']); // sorted
    expect(totals.contractAmount).toBe(300000);
    expect(totals.earnedRevenue).toBe(50000 + 100000); // 50% each
    expect(totals.overbilling).toBe(10000); // only Beta is overbilled
    expect(totals.underbilling).toBe(50000); // Alpha earned 100k billed 50k
    expect(totals.estimatedProfit).toBe(70000); // 20k + 50k
    expect(totals.marginPercent).toBeCloseTo(23.33, 1);
  });

  it('handles an empty portfolio', () => {
    const { rows, totals } = buildWipSchedule([]);
    expect(rows).toEqual([]);
    expect(totals.contractAmount).toBe(0);
    expect(totals.marginPercent).toBe(0);
  });
});

describe('summarizeCostToComplete', () => {
  const { rows, totals } = summarizeCostToComplete(
    [
      { costCodeId: '1', code: '02-100', name: 'Sitework', budgetedCost: 50000, actualCost: 30000 },
      { costCodeId: '2', code: '01-100', name: 'General', budgetedCost: 50000, actualCost: 60000 },
      { costCodeId: null, code: '—', name: 'Uncoded', budgetedCost: 0, actualCost: 5000 },
    ],
    150000
  );

  it('sorts by code and computes per-code forecast', () => {
    expect(rows.map((r) => r.code)).toEqual(['—', '01-100', '02-100']);
    const general = rows.find((r) => r.code === '01-100')!;
    // actual 60k > budget 50k -> 100% complete, EAC = 60k, over budget by 10k
    expect(general.percentComplete).toBe(1);
    expect(general.projectedFinalCost).toBe(60000);
    expect(general.variance).toBe(-10000);
  });

  it('allocates contract revenue pro-rata by budget for margin', () => {
    const sitework = rows.find((r) => r.code === '02-100')!;
    // 50k / 100k total budget * 150k contract = 75k allocated revenue
    expect(sitework.allocatedRevenue).toBe(75000);
    // EAC = 30k / 0.6 = 50k -> margin 25k
    expect(sitework.projectedFinalCost).toBe(50000);
    expect(sitework.projectedMargin).toBe(25000);
  });

  it('reconciles totals', () => {
    expect(totals.budgetedCost).toBe(100000);
    expect(totals.actualCost).toBe(95000);
    expect(totals.allocatedRevenue).toBe(150000);
  });
});
