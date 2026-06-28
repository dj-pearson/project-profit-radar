/**
 * US-226: client selections financial helpers
 */
import { describe, it, expect } from 'vitest';
import {
  computeOverAllowanceDelta,
  isOverAllowance,
  summarizeSelections,
  type SelectionBoardRow,
  type SelectionCategory,
  type SelectionOption,
  type ClientSelection,
} from '@/lib/client-selections';

const category = (over: Partial<SelectionCategory> & { id: string; allowance: number }): SelectionCategory => ({
  company_id: 'c1',
  project_id: 'p1',
  name: 'Category',
  description: null,
  created_at: '',
  updated_at: '',
  ...over,
});

const option = (over: Partial<SelectionOption> & { id: string; category_id: string; price: number }): SelectionOption => ({
  company_id: 'c1',
  name: 'Option',
  description: null,
  supplier: null,
  image_url: null,
  created_at: '',
  updated_at: '',
  ...over,
});

const selection = (
  over: Partial<ClientSelection> & { id: string; category_id: string; option_id: string }
): ClientSelection => ({
  company_id: 'c1',
  project_id: 'p1',
  status: 'pending',
  delta_amount: 0,
  change_order_id: null,
  notes: null,
  selected_by: null,
  approved_by: null,
  approved_at: null,
  created_at: '',
  updated_at: '',
  ...over,
});

describe('over-allowance delta (US-226)', () => {
  it('is the amount above the allowance', () => {
    expect(computeOverAllowanceDelta(1000, 1500)).toBe(500);
  });

  it('floors at zero for under-allowance picks', () => {
    expect(computeOverAllowanceDelta(1000, 800)).toBe(0);
    expect(computeOverAllowanceDelta(1000, 1000)).toBe(0);
  });

  it('treats nullish inputs as zero', () => {
    expect(computeOverAllowanceDelta(undefined as unknown as number, 500)).toBe(500);
    expect(computeOverAllowanceDelta(500, undefined as unknown as number)).toBe(0);
  });

  it('isOverAllowance is strict (equal is not over)', () => {
    expect(isOverAllowance(1000, 1001)).toBe(true);
    expect(isOverAllowance(1000, 1000)).toBe(false);
  });
});

describe('summarizeSelections (US-226)', () => {
  it('aggregates allowances, selected prices, overage, and status counts', () => {
    const rows: SelectionBoardRow[] = [
      {
        category: category({ id: 'cat1', allowance: 1000 }),
        options: [option({ id: 'o1', category_id: 'cat1', price: 1500 })],
        selection: selection({ id: 's1', category_id: 'cat1', option_id: 'o1', status: 'approved' }),
      },
      {
        category: category({ id: 'cat2', allowance: 2000 }),
        options: [option({ id: 'o2', category_id: 'cat2', price: 1800 })],
        selection: selection({ id: 's2', category_id: 'cat2', option_id: 'o2', status: 'pending' }),
      },
      {
        // No selection yet — counts toward allowance + categories only.
        category: category({ id: 'cat3', allowance: 500 }),
        options: [option({ id: 'o3', category_id: 'cat3', price: 900 })],
        selection: null,
      },
    ];

    expect(summarizeSelections(rows)).toEqual({
      totalAllowance: 3500,
      totalSelectedPrice: 3300, // 1500 + 1800
      totalOverage: 500, // cat1 over by 500; cat2 under (0)
      categories: 3,
      selected: 2,
      pending: 1,
      approved: 1,
    });
  });

  it('handles an empty board', () => {
    expect(summarizeSelections([])).toEqual({
      totalAllowance: 0,
      totalSelectedPrice: 0,
      totalOverage: 0,
      categories: 0,
      selected: 0,
      pending: 0,
      approved: 0,
    });
  });

  it('ignores a selection whose option is missing', () => {
    const rows: SelectionBoardRow[] = [
      {
        category: category({ id: 'cat1', allowance: 1000 }),
        options: [option({ id: 'o1', category_id: 'cat1', price: 1500 })],
        selection: selection({ id: 's1', category_id: 'cat1', option_id: 'missing' }),
      },
    ];
    const s = summarizeSelections(rows);
    expect(s.totalSelectedPrice).toBe(0);
    expect(s.totalOverage).toBe(0);
    expect(s.selected).toBe(1);
  });
});
