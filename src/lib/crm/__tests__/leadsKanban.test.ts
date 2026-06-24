import { describe, it, expect } from 'vitest';
import {
  LEAD_STAGES, normalizeStage, groupLeadsByStage, daysInStage, leadDisplayName, valueTier,
} from '../leadsKanban';

describe('normalizeStage', () => {
  it('keeps known stages', () => {
    expect(normalizeStage('won')).toBe('won');
    expect(normalizeStage('proposal_sent')).toBe('proposal_sent');
  });
  it('defaults unknown/empty to new', () => {
    expect(normalizeStage('on_hold')).toBe('new');
    expect(normalizeStage(null)).toBe('new');
    expect(normalizeStage(undefined)).toBe('new');
  });
});

describe('groupLeadsByStage', () => {
  const leads = [
    { id: '1', first_name: 'A', status: 'new', estimated_budget: 10000 },
    { id: '2', first_name: 'B', status: 'won', estimated_budget: 50000 },
    { id: '3', first_name: 'C', status: 'won', estimated_budget: 25000 },
    { id: '4', first_name: 'D', status: 'on_hold', estimated_budget: 1000 }, // -> new
  ];
  it('returns all stages in order', () => {
    const cols = groupLeadsByStage(leads);
    expect(cols.map((c) => c.key)).toEqual(LEAD_STAGES.map((s) => s.key));
  });
  it('counts and totals per column, bucketing unknown into new', () => {
    const cols = groupLeadsByStage(leads);
    const newCol = cols.find((c) => c.key === 'new')!;
    const wonCol = cols.find((c) => c.key === 'won')!;
    expect(newCol.count).toBe(2); // lead 1 + on_hold lead 4
    expect(newCol.totalValue).toBe(11000);
    expect(wonCol.count).toBe(2);
    expect(wonCol.totalValue).toBe(75000);
  });
});

describe('daysInStage', () => {
  const asOf = new Date('2026-06-23T00:00:00Z');
  it('uses updated_at', () => {
    expect(daysInStage({ id: '1', updated_at: '2026-06-13T00:00:00Z' }, asOf)).toBe(10);
  });
  it('falls back to created_at', () => {
    expect(daysInStage({ id: '1', created_at: '2026-06-20T00:00:00Z' }, asOf)).toBe(3);
  });
  it('returns 0 when no timestamp', () => {
    expect(daysInStage({ id: '1' }, asOf)).toBe(0);
  });
});

describe('leadDisplayName', () => {
  it('joins first + last', () => {
    expect(leadDisplayName({ id: '1', first_name: 'Jane', last_name: 'Doe' })).toBe('Jane Doe');
  });
  it('falls back to company then placeholder', () => {
    expect(leadDisplayName({ id: '1', company_name: 'Acme' })).toBe('Acme');
    expect(leadDisplayName({ id: '1' })).toBe('Unnamed lead');
  });
});

describe('valueTier', () => {
  it('tiers by budget thresholds', () => {
    expect(valueTier(150000)).toBe('high');
    expect(valueTier(100000)).toBe('high');
    expect(valueTier(30000)).toBe('medium');
    expect(valueTier(25000)).toBe('medium');
    expect(valueTier(5000)).toBe('low');
    expect(valueTier(null)).toBe('low');
  });
});
