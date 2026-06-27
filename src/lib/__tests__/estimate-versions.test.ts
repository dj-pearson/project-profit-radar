/**
 * US-096: estimate line-item diffing
 */
import { describe, it, expect } from 'vitest';
import { diffLineItems, summarizeDiff, type SnapshotLineItem } from '@/lib/estimate-versions';

const item = (over: Partial<SnapshotLineItem> & { item_name: string }): SnapshotLineItem => ({
  description: null,
  quantity: 1,
  unit: 'ea',
  unit_cost: 100,
  category: null,
  ...over,
});

describe('diffLineItems (US-096)', () => {
  it('classifies added, removed, changed, and unchanged items', () => {
    const before = [item({ item_name: 'Framing', unit_cost: 100 }), item({ item_name: 'Drywall' })];
    const after = [
      item({ item_name: 'Framing', unit_cost: 150 }), // changed (unit_cost)
      item({ item_name: 'Paint' }), // added
      // Drywall removed
    ];
    const diffs = diffLineItems(before, after);
    const byKey = Object.fromEntries(diffs.map((d) => [d.key, d]));

    expect(byKey['framing'].kind).toBe('changed');
    expect(byKey['framing'].changedFields).toContain('unit_cost');
    expect(byKey['paint'].kind).toBe('added');
    expect(byKey['drywall'].kind).toBe('removed');
  });

  it('treats identical items as unchanged', () => {
    const a = [item({ item_name: 'Framing' })];
    const diffs = diffLineItems(a, [item({ item_name: 'Framing' })]);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].kind).toBe('unchanged');
  });

  it('matches items by name case-insensitively', () => {
    const diffs = diffLineItems([item({ item_name: 'Framing' })], [item({ item_name: 'framing', unit_cost: 100 })]);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].kind).toBe('unchanged');
  });

  it('summarizes diff counts', () => {
    const before = [item({ item_name: 'A' }), item({ item_name: 'B' })];
    const after = [item({ item_name: 'A', quantity: 5 }), item({ item_name: 'C' })];
    expect(summarizeDiff(diffLineItems(before, after))).toEqual({
      added: 1,
      removed: 1,
      changed: 1,
      unchanged: 0,
    });
  });
});
