/**
 * US-322: one definition of what a job made.
 *
 * Two screens answered this differently and neither said which basis it used,
 * so the same job showed two profits. These lock the single definition and,
 * just as importantly, the labelling: profit against a contract you have not
 * invoiced is a forecast, and a contractor deciding whether to take another
 * job needs to know which number they are reading.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { computeJobProfit } from '@/lib/jobProfit';

const costs = [
  { labor_cost: 4000, material_cost: 2500, equipment_cost: 300, subcontractor_cost: 1200, other_cost: 0, total_cost: 8000 },
  { labor_cost: 1000, material_cost: 500, equipment_cost: 0, subcontractor_cost: 0, other_cost: 250, total_cost: 1750 },
];

describe('job profit (US-322)', () => {
  it('sums every cost discipline, including the ones that never reached the ledger', () => {
    const result = computeJobProfit({ jobCosts: costs, invoicedToDate: 20000 });

    expect(result.cost).toBe(9750);
    expect(result.costBreakdown).toEqual({
      labor: 5000, material: 3000, equipment: 300, subcontractor: 1200, other: 250,
    });
    expect(result.profit).toBe(10250);
  });

  it('prefers invoiced revenue and says so', () => {
    const result = computeJobProfit({
      jobCosts: costs, invoicedToDate: 20000, collectedToDate: 12000, currentContractValue: 30000,
    });
    expect(result.revenue).toBe(20000);
    expect(result.revenueBasis).toBe('invoiced');
    expect(result.revenueLabel).toBe('invoiced to date');
  });

  it('falls back to collected, then to contract value, labelling each', () => {
    const collected = computeJobProfit({
      jobCosts: costs, invoicedToDate: 0, collectedToDate: 12000, currentContractValue: 30000,
    });
    expect(collected.revenueBasis).toBe('collected');

    const contract = computeJobProfit({ jobCosts: costs, currentContractValue: 30000 });
    expect(contract.revenueBasis).toBe('contract');
    expect(contract.revenueLabel).toBe('current contract value');
    expect(contract.revenue).toBe(30000);
  });

  it('keeps committed cost out of incurred cost', () => {
    // Mixing the two is how a job looks over budget the day it orders lumber
    // and under budget the day it arrives.
    const result = computeJobProfit({
      jobCosts: costs, invoicedToDate: 20000, committedCost: 5000,
    });
    expect(result.cost).toBe(9750);
    expect(result.committedCost).toBe(5000);
    expect(result.projectedCost).toBe(14750);
    expect(result.profit).toBe(10250);
  });

  it('falls back to total_cost only for a row with no split', () => {
    const mixed = [
      { labor_cost: 1000, total_cost: 1000 },
      { total_cost: 400 }, // hand-entered, or from before the posting path
    ];
    const result = computeJobProfit({ jobCosts: mixed, invoicedToDate: 2000 });
    expect(result.cost).toBe(1400);
    expect(result.costBreakdown.other).toBe(400);
  });

  it('reports a zero margin rather than dividing by zero', () => {
    const result = computeJobProfit({ jobCosts: costs });
    expect(result.revenue).toBe(0);
    expect(result.marginPercent).toBe(0);
    expect(result.profit).toBe(-9750);
  });
});

describe('the cost sources now post (US-322)', () => {
  const migration = readFileSync(
    'supabase/migrations/20260903050000_cost_posting_all_sources.sql', 'utf8'
  );

  it('posts an approved expense as material cost on its cost code', () => {
    // The story's worked example: a $500 expense on cost code X becomes $500
    // of material cost on X. The arithmetic is the trigger's; what is checked
    // here is that the expense posts at all, to the right bucket, on approval.
    expect(migration).toMatch(/post_expense_to_job_costs/);
    expect(migration).toMatch(/'expense', NEW\.id, NEW\.project_id, NEW\.cost_code_id/);
    expect(migration).toMatch(/NULL, NEW\.amount, NULL, NULL, NULL/);
    expect(migration).toMatch(/ON public\.expenses/);
  });

  it('posts received purchase order lines, vendor bills and sub payments', () => {
    expect(migration).toMatch(/'purchase_order_line'/);
    expect(migration).toMatch(/'bill_line'/);
    expect(migration).toMatch(/'subcontractor_payment'/);
  });

  it('withdraws a posting when its source is un-approved or deleted', () => {
    // A cost that stays on the job after the receipt is voided is worse than
    // one that never arrived.
    expect(migration).toMatch(/IF NEW\.approved_at IS NULL THEN\s*\n\s*DELETE FROM public\.job_costs/);
    expect(migration).toMatch(/TG_OP = 'DELETE'/);
  });

  it('keeps open purchase orders out of the ledger', () => {
    expect(migration).toMatch(/CREATE OR REPLACE VIEW public\.project_committed_costs/);
    expect(migration).toMatch(/po\.received_at IS NULL/);
  });

  it('leaves one posting path, not five', () => {
    // Every trigger calls post_job_cost, so "what does posting a cost mean"
    // has one answer.
    const calls = migration.match(/PERFORM public\.post_job_cost\(/g) || [];
    expect(calls.length).toBeGreaterThanOrEqual(4);
  });

  it('leaves one ExpenseTracker component', () => {
    const financial = existsSync('src/components/financial/ExpenseTracker.tsx');
    const expenses = existsSync('src/components/expenses/ExpenseTracker.tsx');
    expect(financial && expenses).toBe(false);
  });
});
