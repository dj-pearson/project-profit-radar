import { describe, it, expect } from 'vitest';
import {
  isApproved, isPending, summarizeChangeOrders, buildContractTimeline,
} from '../changeOrderImpact';

const orders = [
  { id: '1', change_order_number: 'CO-1', amount: 10000, status: 'approved', client_approved_date: '2026-02-01' },
  { id: '2', change_order_number: 'CO-2', amount: -2500, client_approved: true, client_approved_date: '2026-03-01' },
  { id: '3', change_order_number: 'CO-3', amount: 5000, status: 'pending' },
  { id: '4', change_order_number: 'CO-4', amount: 8000, status: 'rejected' },
];

describe('isApproved / isPending', () => {
  it('classifies by status and client_approved', () => {
    expect(isApproved(orders[0])).toBe(true);
    expect(isApproved(orders[1])).toBe(true);
    expect(isApproved(orders[2])).toBe(false);
    expect(isPending(orders[2])).toBe(true);
    expect(isPending(orders[3])).toBe(false); // rejected
  });
});

describe('summarizeChangeOrders', () => {
  it('computes additions, deductions, current and pending contract', () => {
    const s = summarizeChangeOrders(orders, 100000);
    expect(s.originalContract).toBe(100000);
    expect(s.approvedAdditions).toBe(10000);
    expect(s.approvedDeductions).toBe(-2500);
    expect(s.approvedTotal).toBe(7500);
    expect(s.approvedCount).toBe(2);
    expect(s.currentContract).toBe(107500);
    expect(s.pendingTotal).toBe(5000);
    expect(s.pendingCount).toBe(1);
    expect(s.potentialContract).toBe(112500);
  });

  it('handles no change orders', () => {
    const s = summarizeChangeOrders([], 50000);
    expect(s.currentContract).toBe(50000);
    expect(s.approvedTotal).toBe(0);
    expect(s.pendingCount).toBe(0);
  });
});

describe('buildContractTimeline', () => {
  it('produces a cumulative running contract in approval-date order', () => {
    const points = buildContractTimeline(orders, 100000);
    expect(points.map((p) => p.amount)).toEqual([100000, 110000, 107500]);
    expect(points[0].label).toBe('Original');
    expect(points[1].label).toBe('CO-1');
    expect(points[2].label).toBe('CO-2');
  });

  it('returns only the original point when nothing approved', () => {
    const points = buildContractTimeline([orders[2], orders[3]], 80000);
    expect(points).toHaveLength(1);
    expect(points[0].amount).toBe(80000);
  });
});
