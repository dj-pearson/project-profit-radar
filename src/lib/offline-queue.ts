/**
 * The offline capture queue. One store, one engine (US-412).
 *
 * Brikly used to have three offline queues: useOfflineSync wrote JSON files
 * through the Capacitor Filesystem, lib/offline-sync kept an IndexedDB
 * `sync_queue` that nothing ever called, and SyncQueueIndicator read a
 * localStorage key that nothing ever wrote. This module is the storage for the
 * one that is left. useOfflineSync owns the replay logic (backoff, retry cap,
 * dead-letter); this owns persistence, change notification, and moving data
 * out of the two older stores.
 *
 * IndexedDB directly, not the Filesystem shim: a queue item is a record with an
 * id, which is what an object store is. Going through a fake filesystem meant
 * serialising to a string, listing a directory and parsing every file back.
 *
 * When IndexedDB is absent, every call rejects. A memory-backed fallback would
 * tell the capture screen the report was saved and lose it on reload, which is
 * worse than an error the screen can show.
 */
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { logger } from '@/lib/logger';

export type OfflineDataType =
  | 'time_entry'
  | 'daily_report'
  | 'expense'
  | 'photo'
  | 'voice_note'
  | 'safety_incident';

export interface OfflineData {
  id: string;
  type: OfflineDataType;
  data: Record<string, unknown>;
  timestamp: string;
  synced: boolean;
  retryCount: number;
  lastAttempt?: string;
  nextRetryAt?: string;
  error?: string;
}

/** The persistence the queue sits on, injectable so tests need no IndexedDB. */
export interface QueueStore {
  all(): Promise<OfflineData[]>;
  get(id: string): Promise<OfflineData | undefined>;
  put(item: OfflineData): Promise<void>;
  delete(id: string): Promise<void>;
}

export const QUEUE_DB_NAME = 'brikly-offline';
const QUEUE_STORE = 'queue';

/** Where useOfflineSync wrote queue items before US-412 (Directory.Data). */
export const LEGACY_FS_DIR = 'offline-sync';
/** lib/offline-sync's database, removed in US-412. */
export const LEGACY_IDB_NAME = 'BriklyOffline';

const TYPES: ReadonlySet<string> = new Set<OfflineDataType>([
  'time_entry',
  'daily_report',
  'expense',
  'photo',
  'voice_note',
  'safety_incident',
]);

/** lib/offline-sync queued by table name; these are the ones the replay can insert. */
const LEGACY_TABLE_TYPE: Record<string, OfflineDataType> = {
  time_entries: 'time_entry',
  daily_reports: 'daily_report',
  expenses: 'expense',
  safety_incidents: 'safety_incident',
};

export function isOfflineData(value: unknown): value is OfflineData {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    v.id.length > 0 &&
    typeof v.type === 'string' &&
    TYPES.has(v.type) &&
    !!v.data &&
    typeof v.data === 'object' &&
    typeof v.timestamp === 'string'
  );
}

/** Fill the fields an older writer may have left out, without touching the rest. */
function normalise(item: OfflineData): OfflineData {
  return {
    ...item,
    synced: item.synced === true,
    retryCount: typeof item.retryCount === 'number' ? item.retryCount : 0,
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

let storePromise: Promise<QueueStore> | null = null;

async function indexedDbStore(): Promise<QueueStore> {
  if (typeof indexedDB === 'undefined') {
    throw new Error(
      'Offline queue is unavailable: this browser exposes no IndexedDB, so offline ' +
        'capture cannot be stored. Reconnect before saving.',
    );
  }
  const { openDB } = await import('idb');
  const db = await openDB(QUEUE_DB_NAME, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(QUEUE_STORE)) {
        database.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
      }
    },
  });
  return {
    all: () => db.getAll(QUEUE_STORE) as Promise<OfflineData[]>,
    get: (id) => db.get(QUEUE_STORE, id) as Promise<OfflineData | undefined>,
    put: (item) => db.put(QUEUE_STORE, item).then(() => undefined),
    delete: (id) => db.delete(QUEUE_STORE, id),
  };
}

function store(): Promise<QueueStore> {
  if (!storePromise) {
    storePromise = indexedDbStore().catch((error) => {
      // Do not cache a failure: a transient open error must not disable the
      // queue for the rest of the page's life.
      storePromise = null;
      throw error;
    });
  }
  return storePromise;
}

// ---------------------------------------------------------------------------
// Change notification
//
// Every capture screen and the global SyncQueueIndicator each mount their own
// useOfflineSync. Without this, a report saved on one screen would not appear
// in the indicator until the page reloaded.
// ---------------------------------------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeQueue(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(): void {
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch (error) {
      logger.error('Offline queue listener threw:', error);
    }
  }
}

// ---------------------------------------------------------------------------
// Queue API
// ---------------------------------------------------------------------------

/** Every item in the queue, oldest first. Runs the legacy migration first. */
export async function listQueue(): Promise<OfflineData[]> {
  await migrateLegacyQueues();
  const items = await (await store()).all();
  return items.map(normalise).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export async function putQueueItem(item: OfflineData): Promise<void> {
  await (await store()).put(item);
  notify();
}

export async function deleteQueueItem(id: string): Promise<void> {
  await (await store()).delete(id);
  notify();
}

// ---------------------------------------------------------------------------
// Legacy migration
//
// Two older stores may still hold queued captures on a device. Each item is
// written to the new queue BEFORE it is removed from the old one, and the new
// id is fixed per legacy item, so a crash between the two steps leaves a copy
// that the next run recognises instead of a loss or a duplicate. Anything that
// cannot be parsed or expressed in the new queue is left where it is.
// ---------------------------------------------------------------------------

/** Copy `item` into `s` unless an item with that id is already there. */
async function adopt(s: QueueStore, item: OfflineData): Promise<boolean> {
  if (await s.get(item.id)) return false;
  await s.put(normalise(item));
  return true;
}

/** useOfflineSync's pre-US-412 JSON files: web (IndexedDB shim) and native alike. */
export async function migrateLegacyFiles(s: QueueStore): Promise<number> {
  let files: { name: string }[];
  try {
    ({ files } = await Filesystem.readdir({ path: LEGACY_FS_DIR, directory: Directory.Data }));
  } catch {
    return 0; // No directory: nothing was ever queued here.
  }

  let moved = 0;
  for (const file of files) {
    if (!file.name.endsWith('.json')) continue;
    const path = `${LEGACY_FS_DIR}/${file.name}`;
    let parsed: unknown;
    try {
      const { data } = await Filesystem.readFile({
        path,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      parsed = JSON.parse(typeof data === 'string' ? data : '');
    } catch (error) {
      logger.error(`Offline queue: could not read legacy item ${path}; leaving it in place`, error);
      continue;
    }
    if (!isOfflineData(parsed)) {
      logger.error(`Offline queue: legacy item ${path} is not a queue item; leaving it in place`);
      continue;
    }
    // A synced item is already on the server; the old loader ignored them too.
    if (!parsed.synced && (await adopt(s, parsed))) moved++;
    await Filesystem.deleteFile({ path, directory: Directory.Data });
  }
  return moved;
}

interface LegacySyncRow {
  id: string;
  table: string;
  action: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  created_at: string;
  attempts?: number;
  last_error?: string;
}

/** lib/offline-sync's `sync_queue`, if that database exists on this device. */
export async function migrateLegacyDatabase(s: QueueStore): Promise<number> {
  if (typeof indexedDB === 'undefined') return 0;
  const { openDB, deleteDB } = await import('idb');

  // Opening a database that does not exist creates it. Detect that case and
  // undo it rather than leave an empty BriklyOffline behind on every device.
  let created = false;
  const db = await openDB(LEGACY_IDB_NAME, undefined, {
    upgrade(_db, oldVersion) {
      if (oldVersion === 0) created = true;
    },
  });
  try {
    if (created || !db.objectStoreNames.contains('sync_queue')) return 0;
    const rows = (await db.getAll('sync_queue')) as LegacySyncRow[];
    let moved = 0;
    for (const row of rows) {
      const type = LEGACY_TABLE_TYPE[row.table];
      if (row.action !== 'insert' || !type || !row.data || typeof row.data !== 'object') {
        logger.error(
          `Offline queue: legacy ${row.action} on ${row.table} (${row.id}) has no replay path; leaving it in place`,
        );
        continue;
      }
      const item: OfflineData = {
        id: `legacy_${row.id}`,
        type,
        data: row.data,
        timestamp: row.created_at || new Date().toISOString(),
        synced: false,
        retryCount: row.attempts ?? 0,
        ...(row.last_error ? { error: row.last_error } : {}),
      };
      if (await adopt(s, item)) moved++;
      await db.delete('sync_queue', row.id);
    }
    return moved;
  } finally {
    db.close();
    if (created) await deleteDB(LEGACY_IDB_NAME).catch(() => undefined);
  }
}

let migration: Promise<void> | null = null;

/**
 * Move anything the older queues still hold into this one. Runs once per page;
 * a failure is logged and retried on the next call rather than blocking the
 * queue, because the new store is usable either way.
 */
export function migrateLegacyQueues(): Promise<void> {
  if (!migration) {
    migration = (async () => {
      const s = await store();
      let moved = 0;
      let failed = false;
      for (const step of [migrateLegacyFiles, migrateLegacyDatabase]) {
        try {
          moved += await step(s);
        } catch (error) {
          failed = true;
          logger.error('Offline queue: legacy migration step failed; will retry', error);
        }
      }
      if (failed) migration = null;
      if (moved > 0) {
        logger.info(`Offline queue: moved ${moved} queued item(s) from the legacy stores`);
        notify();
      }
    })().catch((error) => {
      // store() itself failed; let listQueue surface that error.
      migration = null;
      logger.error('Offline queue: legacy migration could not open the queue', error);
    });
  }
  return migration;
}

/** Swap the persistence layer and reset the migration. Tests only. */
export function __setQueueStore(next: QueueStore | null): void {
  storePromise = next ? Promise.resolve(next) : null;
  migration = null;
  listeners.clear();
}
