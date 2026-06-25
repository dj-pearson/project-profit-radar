import { describe, it, expect } from 'vitest';
import { summarizePunchList } from '../punchListProgress';

describe('summarizePunchList', () => {
  const items = [
    { status: 'open', priority: 'critical' },
    { status: 'in_progress', priority: 'high' },
    { status: 'completed', priority: 'medium' },
    { status: 'verified', priority: 'low' },
    { status: 'verified', priority: 'critical' },
    { status: 'closed', priority: 'low' },
  ];
  const s = summarizePunchList(items);

  it('counts items by status', () => {
    expect(s.total).toBe(6);
    expect(s.open).toBe(1);
    expect(s.inProgress).toBe(1);
    expect(s.completed).toBe(1);
    expect(s.verified).toBe(2);
    expect(s.closed).toBe(1);
  });

  it('counts critical items', () => {
    expect(s.critical).toBe(2);
  });

  it('computes verified percentage of all items', () => {
    // 2 verified of 6 = 33%
    expect(s.verifiedPercent).toBe(33);
  });

  it('computes completion percentage (completed/verified/closed)', () => {
    // completed(1) + verified(2) + closed(1) = 4 of 6 = 67%
    expect(s.completionPercent).toBe(67);
  });

  it('handles an empty list without dividing by zero', () => {
    const empty = summarizePunchList([]);
    expect(empty.total).toBe(0);
    expect(empty.verifiedPercent).toBe(0);
    expect(empty.completionPercent).toBe(0);
  });

  it('ignores unknown/null statuses', () => {
    const r = summarizePunchList([{ status: null }, { status: 'weird' }, { status: 'verified' }]);
    expect(r.total).toBe(3);
    expect(r.verified).toBe(1);
    expect(r.verifiedPercent).toBe(33);
  });
});
