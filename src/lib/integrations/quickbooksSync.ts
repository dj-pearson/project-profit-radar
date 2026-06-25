/**
 * QuickBooks sync-log summarization logic (US-070).
 *
 * Pure, framework-free normalization of quickbooks_sync_logs rows so the sync
 * status dashboard and history table are unit testable. The `records_processed`
 * column is loosely typed JSON (object keyed by entity, a bare number, or an
 * array), and `error_details` is freeform JSON — both are normalized here.
 */

export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

export type SyncStatus = 'success' | 'error' | 'pending' | 'other';

export interface SyncLogRow {
  id: string;
  sync_type: string;
  status: string;
  started_at: string;
  completed_at?: string | null;
  duration_seconds?: number | null;
  errors_count?: number | null;
  records_processed?: Json;
  error_details?: Json;
}

export interface NormalizedSyncLog {
  id: string;
  syncType: string;
  status: SyncStatus;
  rawStatus: string;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  /** Total records across all entities. */
  totalRecords: number;
  /** Per-entity record counts (e.g. { invoices: 12, customers: 3 }). */
  recordsByEntity: Record<string, number>;
  errorsCount: number;
  /** Human-readable error message, or null when the sync had no error. */
  errorMessage: string | null;
  /** True when the sync failed and can be retried. */
  canRetry: boolean;
}

/** Normalize the `status` string into a small known set. */
export function normalizeStatus(status: string | null | undefined): SyncStatus {
  switch ((status ?? '').toLowerCase()) {
    case 'success':
    case 'completed':
    case 'complete':
    case 'ok':
      return 'success';
    case 'error':
    case 'failed':
    case 'failure':
      return 'error';
    case 'pending':
    case 'in_progress':
    case 'running':
    case 'started':
      return 'pending';
    default:
      return 'other';
  }
}

/** Parse the `records_processed` JSON into a total and per-entity breakdown. */
export function parseRecordsProcessed(value: Json | undefined): {
  total: number;
  byEntity: Record<string, number>;
} {
  if (value == null) return { total: 0, byEntity: {} };
  if (typeof value === 'number') return { total: Math.max(0, value), byEntity: {} };
  if (Array.isArray(value)) {
    const total = value.reduce<number>((s, v) => s + (typeof v === 'number' ? v : 0), 0);
    return { total: Math.max(0, total), byEntity: {} };
  }
  if (typeof value === 'object') {
    const byEntity: Record<string, number> = {};
    let total = 0;
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === 'number' && Number.isFinite(v)) {
        byEntity[k] = v;
        total += v;
      }
    }
    return { total: Math.max(0, total), byEntity };
  }
  return { total: 0, byEntity: {} };
}

/** Extract a readable error message from the freeform `error_details` JSON. */
export function extractErrorMessage(value: Json | undefined): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const parts = value.map((v) => extractErrorMessage(v)).filter(Boolean) as string[];
    return parts.length ? parts.join('; ') : null;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, Json>;
    for (const key of ['message', 'error', 'detail', 'description', 'reason']) {
      const v = obj[key];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    // Fall back to the first string-valued field.
    for (const v of Object.values(obj)) {
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
  }
  return null;
}

/** Normalize a single sync-log row. */
export function normalizeSyncLog(log: SyncLogRow): NormalizedSyncLog {
  const status = normalizeStatus(log.status);
  const { total, byEntity } = parseRecordsProcessed(log.records_processed);
  const errorMessage = extractErrorMessage(log.error_details);
  return {
    id: log.id,
    syncType: log.sync_type,
    status,
    rawStatus: log.status,
    startedAt: log.started_at,
    completedAt: log.completed_at ?? null,
    durationSeconds: log.duration_seconds ?? null,
    totalRecords: total,
    recordsByEntity: byEntity,
    errorsCount: log.errors_count ?? 0,
    errorMessage,
    canRetry: status === 'error',
  };
}

export interface SyncHistorySummary {
  entries: NormalizedSyncLog[];
  lastSync: NormalizedSyncLog | null;
  totalSyncs: number;
  successCount: number;
  errorCount: number;
  /** Fraction of syncs that succeeded, 0–1. */
  successRate: number;
  /** Records processed across the summarized syncs. */
  totalRecordsProcessed: number;
  /** Most recent failed sync, if any (for surfacing a retry prompt). */
  lastError: NormalizedSyncLog | null;
}

/**
 * Summarize sync-log rows (assumed newest-first as returned by the query, but
 * sorted defensively) into history entries and headline stats.
 */
export function summarizeSyncHistory(logs: SyncLogRow[]): SyncHistorySummary {
  const entries = logs
    .map(normalizeSyncLog)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const successCount = entries.filter((e) => e.status === 'success').length;
  const errorCount = entries.filter((e) => e.status === 'error').length;
  const totalRecordsProcessed = entries.reduce((s, e) => s + e.totalRecords, 0);

  return {
    entries,
    lastSync: entries[0] ?? null,
    totalSyncs: entries.length,
    successCount,
    errorCount,
    successRate: entries.length > 0 ? Math.round((successCount / entries.length) * 100) / 100 : 0,
    totalRecordsProcessed,
    lastError: entries.find((e) => e.status === 'error') ?? null,
  };
}
