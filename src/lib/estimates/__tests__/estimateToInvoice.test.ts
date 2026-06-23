import { describe, it, expect } from 'vitest';
import {
  lineBaseTotal, buildInvoiceLineItems, conversionSubtotal, summarizeBilled,
} from '../estimateToInvoice';

const lines = [
  { id: 'a', item_name: 'Framing', quantity: 2, unit_cost: 1000, total_cost: 2000, cost_code_id: 'cc1' },
  { id: 'b', item_name: 'Electrical', quantity: 1, unit_cost: 5000, total_cost: 5000, cost_code_id: null },
  { id: 'c', item_name: 'Permits', quantity: 1, unit_cost: 500 }, // no total_cost
];

describe('lineBaseTotal', () => {
  it('uses total_cost when present, else qty x unit_cost', () => {
    expect(lineBaseTotal(lines[0])).toBe(2000);
    expect(lineBaseTotal(lines[2])).toBe(500);
  });
});

describe('buildInvoiceLineItems', () => {
  it('includes all lines at 100% by default, preserving quantity', () => {
    const drafts = buildInvoiceLineItems(lines);
    expect(drafts).toHaveLength(3);
    expect(drafts[0]).toMatchObject({ description: 'Framing', quantity: 2, unit_price: 1000, line_total: 2000, cost_code_id: 'cc1' });
    expect(conversionSubtotal(drafts)).toBe(7500);
  });

  it('filters to selected ids', () => {
    const drafts = buildInvoiceLineItems(lines, { selectedIds: ['b'] });
    expect(drafts).toHaveLength(1);
    expect(drafts[0].description).toBe('Electrical');
  });

  it('applies a progress-billing percentage to line totals', () => {
    const drafts = buildInvoiceLineItems(lines, { selectedIds: ['a'], percentage: 30 });
    // base 2000 * 30% = 600 over qty 2 -> unit 300
    expect(drafts[0].line_total).toBe(600);
    expect(drafts[0].unit_price).toBe(300);
  });

  it('honors per-line amount overrides over the percentage', () => {
    const drafts = buildInvoiceLineItems(lines, { selectedIds: ['b'], percentage: 50, amountOverrides: { b: 1234 } });
    expect(drafts[0].line_total).toBe(1234);
    expect(drafts[0].unit_price).toBe(1234); // qty 1
  });

  it('defaults quantity to 1 when missing/zero', () => {
    const drafts = buildInvoiceLineItems([{ id: 'x', item_name: 'Fee', quantity: 0, total_cost: 100 }]);
    expect(drafts[0].quantity).toBe(1);
    expect(drafts[0].unit_price).toBe(100);
  });
});

describe('summarizeBilled', () => {
  it('computes already-billed, remaining, and percent', () => {
    const s = summarizeBilled(10000, [3000, 2000]);
    expect(s.alreadyBilled).toBe(5000);
    expect(s.remaining).toBe(5000);
    expect(s.percentBilled).toBe(50);
  });
  it('never goes negative and handles zero total', () => {
    expect(summarizeBilled(1000, [2000]).remaining).toBe(0);
    expect(summarizeBilled(0, []).percentBilled).toBe(0);
  });
});
