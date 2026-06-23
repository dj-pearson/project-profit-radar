import { describe, it, expect } from 'vitest';
import {
  advanceByFrequency, remainingOccurrences, computeNextRunDate, remainingLabel, templateTotal,
} from '../recurringInvoices';

describe('advanceByFrequency', () => {
  const base = new Date('2026-01-15T00:00:00Z');
  it('advances weekly/biweekly/monthly', () => {
    expect(advanceByFrequency(base, 'weekly').toISOString().slice(0, 10)).toBe('2026-01-22');
    expect(advanceByFrequency(base, 'biweekly').toISOString().slice(0, 10)).toBe('2026-01-29');
    expect(advanceByFrequency(base, 'monthly').toISOString().slice(0, 10)).toBe('2026-02-15');
  });
});

describe('remainingOccurrences', () => {
  it('returns null for uncapped', () => {
    expect(remainingOccurrences({ frequency: 'monthly', start_date: '2026-01-01' })).toBeNull();
  });
  it('returns the difference, floored at 0', () => {
    expect(remainingOccurrences({ frequency: 'monthly', start_date: '2026-01-01', occurrence_limit: 12, occurrences_generated: 5 })).toBe(7);
    expect(remainingOccurrences({ frequency: 'monthly', start_date: '2026-01-01', occurrence_limit: 3, occurrences_generated: 5 })).toBe(0);
  });
});

describe('computeNextRunDate', () => {
  it('returns the start date when it is in the future', () => {
    const next = computeNextRunDate({ frequency: 'monthly', start_date: '2026-07-01' }, new Date('2026-06-23'));
    expect(next).toBe('2026-07-01');
  });
  it('walks forward to the next occurrence on/after today', () => {
    const next = computeNextRunDate({ frequency: 'monthly', start_date: '2026-01-10' }, new Date('2026-06-23'));
    expect(next).toBe('2026-07-10');
  });
  it('returns null when paused', () => {
    expect(computeNextRunDate({ frequency: 'monthly', start_date: '2026-01-10', status: 'paused' }, new Date('2026-06-23'))).toBeNull();
  });
  it('returns null when occurrence cap reached', () => {
    expect(computeNextRunDate({ frequency: 'monthly', start_date: '2026-01-10', occurrence_limit: 2, occurrences_generated: 2 }, new Date('2026-06-23'))).toBeNull();
  });
  it('returns null past the end date', () => {
    expect(computeNextRunDate({ frequency: 'weekly', start_date: '2026-01-01', end_date: '2026-02-01' }, new Date('2026-06-23'))).toBeNull();
  });
});

describe('remainingLabel', () => {
  it('formats unlimited and counts', () => {
    expect(remainingLabel({ frequency: 'monthly', start_date: '2026-01-01' })).toBe('Unlimited');
    expect(remainingLabel({ frequency: 'monthly', start_date: '2026-01-01', occurrence_limit: 6, occurrences_generated: 2 })).toBe('4 remaining');
  });
});

describe('templateTotal', () => {
  it('sums quantity x unit price', () => {
    expect(templateTotal([
      { description: 'Retainer', quantity: 1, unit_price: 5000 },
      { description: 'Support', quantity: 2, unit_price: 250 },
    ])).toBe(5500);
  });
});
