import { describe, it, expect } from 'vitest';
import {
  isCommittedStatus, isReceivedStatus, summarizeMaterialCosts,
} from '../materialCostSummary';

describe('status classification', () => {
  it('classifies committed vs received', () => {
    expect(isCommittedStatus('approved')).toBe(true);
    expect(isCommittedStatus('sent')).toBe(true);
    expect(isCommittedStatus('ordered')).toBe(true);
    expect(isCommittedStatus('draft')).toBe(false);
    expect(isCommittedStatus('received')).toBe(false);
    expect(isReceivedStatus('received')).toBe(true);
    expect(isReceivedStatus('approved')).toBe(false);
  });
});

describe('summarizeMaterialCosts', () => {
  const costCodes = [
    { id: 'cc1', code: '01-100', name: 'Concrete' },
    { id: 'cc2', code: '02-200', name: 'Lumber' },
  ];
  const budgets = [
    { cost_code_id: 'cc1', material_budget: 10000 },
    { cost_code_id: 'cc2', budgeted_amount: 5000 }, // falls back to budgeted_amount
  ];
  const lineItems = [
    { cost_code_id: 'cc1', amount: 3000, status: 'approved' }, // committed
    { cost_code_id: 'cc1', amount: 2000, status: 'received' },  // spent
    { cost_code_id: 'cc2', amount: 1000, status: 'draft' },     // ignored (draft)
    { cost_code_id: null, amount: 500, status: 'received' },    // uncoded spent
  ];

  it('aggregates committed and spent per cost code', () => {
    const { rows } = summarizeMaterialCosts({ lineItems, budgets, costCodes });
    const cc1 = rows.find((r) => r.costCodeId === 'cc1')!;
    expect(cc1.budgeted).toBe(10000);
    expect(cc1.committed).toBe(3000);
    expect(cc1.spent).toBe(2000);
    expect(cc1.variance).toBe(5000); // 10000 - (3000 + 2000)
  });

  it('ignores draft POs and surfaces an Uncoded row', () => {
    const { rows } = summarizeMaterialCosts({ lineItems, budgets, costCodes });
    const cc2 = rows.find((r) => r.costCodeId === 'cc2')!;
    expect(cc2.committed).toBe(0);
    expect(cc2.spent).toBe(0);
    const uncoded = rows.find((r) => r.costCodeId === null)!;
    expect(uncoded.name).toBe('Uncoded');
    expect(uncoded.spent).toBe(500);
  });

  it('includes zero-PO budgeted cost codes', () => {
    const { rows } = summarizeMaterialCosts({ lineItems: [], budgets, costCodes });
    expect(rows.find((r) => r.costCodeId === 'cc1')!.budgeted).toBe(10000);
    expect(rows.find((r) => r.costCodeId === 'cc2')!.budgeted).toBe(5000);
  });

  it('computes totals across rows', () => {
    const { totals } = summarizeMaterialCosts({ lineItems, budgets, costCodes });
    expect(totals.budgeted).toBe(15000);
    expect(totals.committed).toBe(3000);
    expect(totals.spent).toBe(2500); // 2000 + 500 uncoded
  });
});
