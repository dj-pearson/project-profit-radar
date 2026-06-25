import { describe, it, expect } from 'vitest';
import {
  normalizeStatus,
  parseRecordsProcessed,
  extractErrorMessage,
  normalizeSyncLog,
  summarizeSyncHistory,
  type SyncLogRow,
} from '../quickbooksSync';

describe('normalizeStatus', () => {
  it('maps known statuses', () => {
    expect(normalizeStatus('success')).toBe('success');
    expect(normalizeStatus('completed')).toBe('success');
    expect(normalizeStatus('failed')).toBe('error');
    expect(normalizeStatus('error')).toBe('error');
    expect(normalizeStatus('in_progress')).toBe('pending');
    expect(normalizeStatus('weird')).toBe('other');
    expect(normalizeStatus(null)).toBe('other');
  });
});

describe('parseRecordsProcessed', () => {
  it('sums an entity-keyed object and exposes the breakdown', () => {
    const r = parseRecordsProcessed({ invoices: 12, customers: 3, items: 5 });
    expect(r.total).toBe(20);
    expect(r.byEntity).toEqual({ invoices: 12, customers: 3, items: 5 });
  });
  it('handles a bare number', () => {
    expect(parseRecordsProcessed(42)).toEqual({ total: 42, byEntity: {} });
  });
  it('handles an array of numbers', () => {
    expect(parseRecordsProcessed([1, 2, 3]).total).toBe(6);
  });
  it('ignores non-numeric values in an object', () => {
    const r = parseRecordsProcessed({ invoices: 4, note: 'x' } as never);
    expect(r.total).toBe(4);
    expect(r.byEntity).toEqual({ invoices: 4 });
  });
  it('returns zero for null/undefined', () => {
    expect(parseRecordsProcessed(null).total).toBe(0);
    expect(parseRecordsProcessed(undefined).total).toBe(0);
  });
});

describe('extractErrorMessage', () => {
  it('reads a plain string', () => {
    expect(extractErrorMessage('Token expired')).toBe('Token expired');
  });
  it('prefers message/error/detail keys', () => {
    expect(extractErrorMessage({ code: 500, message: 'Server error' })).toBe('Server error');
    expect(extractErrorMessage({ error: 'Auth failed' })).toBe('Auth failed');
  });
  it('falls back to the first string field', () => {
    expect(extractErrorMessage({ foo: 'bar' })).toBe('bar');
  });
  it('joins an array of messages', () => {
    expect(extractErrorMessage(['a', 'b'])).toBe('a; b');
  });
  it('returns null for empty/absent details', () => {
    expect(extractErrorMessage(null)).toBeNull();
    expect(extractErrorMessage('')).toBeNull();
    expect(extractErrorMessage({})).toBeNull();
  });
});

describe('normalizeSyncLog', () => {
  it('normalizes a successful sync', () => {
    const log: SyncLogRow = {
      id: '1',
      sync_type: 'incremental',
      status: 'success',
      started_at: '2026-06-01T10:00:00Z',
      completed_at: '2026-06-01T10:02:00Z',
      duration_seconds: 120,
      errors_count: 0,
      records_processed: { invoices: 10, customers: 2 },
      error_details: null,
    };
    const n = normalizeSyncLog(log);
    expect(n.status).toBe('success');
    expect(n.totalRecords).toBe(12);
    expect(n.errorMessage).toBeNull();
    expect(n.canRetry).toBe(false);
  });

  it('marks a failed sync as retryable with an error message', () => {
    const log: SyncLogRow = {
      id: '2',
      sync_type: 'full',
      status: 'failed',
      started_at: '2026-06-02T10:00:00Z',
      errors_count: 3,
      records_processed: { invoices: 0 },
      error_details: { message: 'QuickBooks token expired' },
    };
    const n = normalizeSyncLog(log);
    expect(n.status).toBe('error');
    expect(n.canRetry).toBe(true);
    expect(n.errorMessage).toBe('QuickBooks token expired');
    expect(n.errorsCount).toBe(3);
  });
});

describe('summarizeSyncHistory', () => {
  const logs: SyncLogRow[] = [
    { id: 'a', sync_type: 'incremental', status: 'success', started_at: '2026-06-01T10:00:00Z', records_processed: { invoices: 5 } },
    { id: 'b', sync_type: 'incremental', status: 'failed', started_at: '2026-06-03T10:00:00Z', records_processed: {}, error_details: { message: 'boom' } },
    { id: 'c', sync_type: 'full', status: 'success', started_at: '2026-06-02T10:00:00Z', records_processed: { invoices: 10, items: 5 } },
  ];
  const s = summarizeSyncHistory(logs);

  it('sorts entries newest-first', () => {
    expect(s.entries.map((e) => e.id)).toEqual(['b', 'c', 'a']);
    expect(s.lastSync?.id).toBe('b');
  });

  it('computes success/error counts and rate', () => {
    expect(s.totalSyncs).toBe(3);
    expect(s.successCount).toBe(2);
    expect(s.errorCount).toBe(1);
    expect(s.successRate).toBe(0.67);
  });

  it('totals records processed and surfaces the last error', () => {
    expect(s.totalRecordsProcessed).toBe(20); // 5 + 0 + 15
    expect(s.lastError?.id).toBe('b');
    expect(s.lastError?.errorMessage).toBe('boom');
  });

  it('handles an empty history', () => {
    const empty = summarizeSyncHistory([]);
    expect(empty.totalSyncs).toBe(0);
    expect(empty.lastSync).toBeNull();
    expect(empty.successRate).toBe(0);
    expect(empty.lastError).toBeNull();
  });
});
