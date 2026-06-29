/**
 * US-232: bid leveling + variance helpers
 */
import { describe, it, expect } from 'vitest';
import {
  median,
  isScopeGap,
  levelBids,
  lowestBidId,
  type BidScopeItem,
  type BidInfo,
  type BidLineItem,
} from '@/lib/bid-leveling';

const scope = (over: Partial<BidScopeItem> & { id: string }): BidScopeItem => ({
  description: 'Item',
  quantity: 1,
  unit: 'ls',
  estimate_amount: 1000,
  sort_order: 0,
  ...over,
});

const bid = (over: Partial<BidInfo> & { id: string }): BidInfo => ({
  vendor_name: 'Vendor',
  is_awarded: false,
  ...over,
});

const li = (bid_id: string, scope_item_id: string, amount: number | null, included = true): BidLineItem => ({
  bid_id,
  scope_item_id,
  amount,
  included,
});

describe('median (US-232)', () => {
  it('handles odd and even counts and empty', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe('isScopeGap (US-232)', () => {
  it('treats missing, excluded, or null-amount items as gaps', () => {
    expect(isScopeGap(undefined)).toBe(true);
    expect(isScopeGap(li('b', 's', null))).toBe(true);
    expect(isScopeGap(li('b', 's', 100, false))).toBe(true);
    expect(isScopeGap(li('b', 's', 100))).toBe(false);
  });
});

describe('levelBids (US-232)', () => {
  const scopeItems = [
    scope({ id: 's1', estimate_amount: 1000, sort_order: 0 }),
    scope({ id: 's2', estimate_amount: 2000, sort_order: 1 }),
  ];
  const bids = [bid({ id: 'b1', vendor_name: 'Acme' }), bid({ id: 'b2', vendor_name: 'Beta' }), bid({ id: 'b3', vendor_name: 'Gamma' })];
  const lineItems = [
    li('b1', 's1', 1000), li('b1', 's2', 1900),
    li('b2', 's1', 1100), li('b2', 's2', 2100),
    li('b3', 's1', 5000), // outlier on s1
    // b3 has no s2 → scope gap
  ];

  const result = levelBids(scopeItems, bids, lineItems);

  it('totals each bid and computes variance vs estimate (3000)', () => {
    expect(result.estimateTotal).toBe(3000);
    const totals = Object.fromEntries(result.totals.map((t) => [t.bidId, t]));
    expect(totals['b1'].total).toBe(2900);
    expect(totals['b1'].variance).toBe(-100);
    expect(totals['b2'].total).toBe(3200);
    expect(totals['b2'].variance).toBe(200);
    expect(totals['b3'].total).toBe(5000);
    expect(totals['b3'].gaps).toBe(1);
  });

  it('flags scope gaps', () => {
    const s2 = result.rows.find((r) => r.scopeItem.id === 's2')!;
    const b3cell = s2.cells.find((c) => c.bidId === 'b3')!;
    expect(b3cell.isGap).toBe(true);
    expect(b3cell.amount).toBeNull();
  });

  it('flags outliers vs the line median', () => {
    const s1 = result.rows.find((r) => r.scopeItem.id === 's1')!;
    // s1 quotes: 1000, 1100, 5000 → median 1100; 5000 is >40% away.
    const b3cell = s1.cells.find((c) => c.bidId === 'b3')!;
    expect(b3cell.isOutlier).toBe(true);
    const b1cell = s1.cells.find((c) => c.bidId === 'b1')!;
    expect(b1cell.isOutlier).toBe(false);
  });

  it('marks the lowest quote per line', () => {
    const s1 = result.rows.find((r) => r.scopeItem.id === 's1')!;
    expect(s1.cells.find((c) => c.bidId === 'b1')!.isLowest).toBe(true);
    expect(s1.cells.find((c) => c.bidId === 'b2')!.isLowest).toBe(false);
  });

  it('orders rows by scope sort_order', () => {
    expect(result.rows.map((r) => r.scopeItem.id)).toEqual(['s1', 's2']);
  });
});

describe('zero-median outlier (US-232)', () => {
  it('flags a non-zero quote when the median is 0', () => {
    const scopeItems = [scope({ id: 's1', estimate_amount: 0 })];
    const bids = [bid({ id: 'b1' }), bid({ id: 'b2' }), bid({ id: 'b3' })];
    // quotes: 0, 0, 500 → median 0; 500 must still flag.
    const result = levelBids(scopeItems, bids, [li('b1', 's1', 0), li('b2', 's1', 0), li('b3', 's1', 500)]);
    const row = result.rows[0];
    expect(row.cells.find((c) => c.bidId === 'b3')!.isOutlier).toBe(true);
    expect(row.cells.find((c) => c.bidId === 'b1')!.isOutlier).toBe(false);
  });
});

describe('lowestBidId (US-232)', () => {
  it('returns the lowest-total bid, or null for none', () => {
    const scopeItems = [scope({ id: 's1', estimate_amount: 0 })];
    const bids = [bid({ id: 'b1' }), bid({ id: 'b2' })];
    const result = levelBids(scopeItems, bids, [li('b1', 's1', 500), li('b2', 's1', 400)]);
    expect(lowestBidId(result.totals)).toBe('b2');
    expect(lowestBidId([])).toBeNull();
  });
});
