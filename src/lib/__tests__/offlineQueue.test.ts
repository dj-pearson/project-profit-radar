import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Legacy Filesystem (what useOfflineSync wrote to before US-412), in memory.
const files = new Map<string, string>();
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Data: 'DATA' },
  Encoding: { UTF8: 'utf8' },
  Filesystem: {
    readdir: vi.fn(async ({ path }: { path: string }) => {
      const names = [...files.keys()]
        .filter((k) => k.startsWith(`${path}/`))
        .map((k) => ({ name: k.slice(path.length + 1) }));
      if (names.length === 0) throw new Error('Directory does not exist');
      return { files: names };
    }),
    readFile: vi.fn(async ({ path }: { path: string }) => {
      if (!files.has(path)) throw new Error('File does not exist');
      return { data: files.get(path)! };
    }),
    deleteFile: vi.fn(async ({ path }: { path: string }) => {
      files.delete(path);
    }),
  },
}));

vi.mock('@capacitor/device', () => ({
  Device: { getInfo: vi.fn().mockResolvedValue({ platform: 'web' }) },
}));

const insert = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(() => ({ insert })) },
}));

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import {
  __setQueueStore,
  listQueue,
  putQueueItem,
  subscribeQueue,
  migrateLegacyFiles,
  type OfflineData,
  type QueueStore,
} from '../offline-queue';
import { replayOfflineQueue, __resetReplayLock, useOfflineSync } from '@/hooks/useOfflineSync';

/** Stands in for IndexedDB, which happy-dom does not have. Survives a "reload". */
function memoryStore(): QueueStore & { rows: Map<string, OfflineData> } {
  const rows = new Map<string, OfflineData>();
  return {
    rows,
    all: async () => [...rows.values()].map((r) => ({ ...r })),
    get: async (id) => (rows.has(id) ? { ...rows.get(id)! } : undefined),
    put: async (item) => {
      rows.set(item.id, { ...item });
    },
    delete: async (id) => {
      rows.delete(id);
    },
  };
}

const item = (over: Partial<OfflineData> = {}): OfflineData => ({
  id: 'offline_1',
  type: 'safety_incident',
  data: { description: 'Fall from ladder' },
  timestamp: '2026-09-20T10:00:00.000Z',
  synced: false,
  retryCount: 0,
  ...over,
});

let db: ReturnType<typeof memoryStore>;

beforeEach(() => {
  files.clear();
  db = memoryStore();
  __setQueueStore(db);
  __resetReplayLock();
  insert.mockReset().mockResolvedValue({ error: null });
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
});

describe('legacy Filesystem queue migration', () => {
  it('moves an unsynced item into the queue and removes the old file', async () => {
    files.set('offline-sync/offline_1.json', JSON.stringify(item()));

    const queue = await listQueue();

    expect(queue.map((q) => q.id)).toEqual(['offline_1']);
    expect(queue[0].data).toEqual({ description: 'Fall from ladder' });
    expect(files.size).toBe(0);
  });

  it('keeps retry state from the old engine', async () => {
    files.set(
      'offline-sync/offline_2.json',
      JSON.stringify(item({ id: 'offline_2', retryCount: 3, error: 'permission denied' })),
    );

    const [moved] = await listQueue();

    expect(moved.retryCount).toBe(3);
    expect(moved.error).toBe('permission denied');
  });

  it('drops items the old engine already synced', async () => {
    files.set('offline-sync/done.json', JSON.stringify(item({ id: 'done', synced: true })));

    expect(await listQueue()).toEqual([]);
    expect(files.size).toBe(0);
  });

  it('leaves a file it cannot parse where it is', async () => {
    files.set('offline-sync/broken.json', '{not json');
    files.set('offline-sync/other.json', JSON.stringify({ hello: 'world' }));

    expect(await listQueue()).toEqual([]);
    expect([...files.keys()].sort()).toEqual(['offline-sync/broken.json', 'offline-sync/other.json']);
  });

  it('does not duplicate an item copied before a crash removed the old file', async () => {
    await db.put(item({ retryCount: 2 }));
    files.set('offline-sync/offline_1.json', JSON.stringify(item()));

    expect(await migrateLegacyFiles(db)).toBe(0);
    expect(db.rows.size).toBe(1);
    // The copy already in the new queue wins; its retry state is newer.
    expect(db.rows.get('offline_1')!.retryCount).toBe(2);
    expect(files.size).toBe(0);
  });

  it('returns items oldest first', async () => {
    await putQueueItem(item({ id: 'b', timestamp: '2026-09-20T12:00:00.000Z' }));
    await putQueueItem(item({ id: 'a', timestamp: '2026-09-20T09:00:00.000Z' }));

    expect((await listQueue()).map((q) => q.id)).toEqual(['a', 'b']);
  });
});

describe('subscribeQueue', () => {
  it('tells every listener when the queue changes', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeQueue(listener);

    await putQueueItem(item());
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    await putQueueItem(item({ id: 'offline_2' }));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('replayOfflineQueue', () => {
  it('inserts a queued item and removes it from the queue', async () => {
    await putQueueItem(item());

    const result = await replayOfflineQueue();

    expect(result).toEqual({ synced: 1, failed: 0, deadLettered: 0 });
    expect(insert).toHaveBeenCalledWith({ description: 'Fall from ladder' });
    expect(db.rows.size).toBe(0);
  });

  it('keeps a failed item with its error, attempt count and a backoff time', async () => {
    insert.mockResolvedValue({ error: new Error('permission denied for table safety_incidents') });
    await putQueueItem(item());

    const result = await replayOfflineQueue();

    expect(result).toEqual({ synced: 0, failed: 1, deadLettered: 0 });
    const kept = db.rows.get('offline_1')!;
    expect(kept.retryCount).toBe(1);
    expect(kept.error).toBe('permission denied for table safety_incidents');
    expect(new Date(kept.nextRetryAt!).getTime()).toBeGreaterThan(Date.now());
  });

  it('stops attempting an item at the retry cap but keeps it', async () => {
    await putQueueItem(item({ retryCount: 5, error: 'boom' }));

    const result = await replayOfflineQueue();

    expect(insert).not.toHaveBeenCalled();
    expect(result).toEqual({ synced: 0, failed: 0, deadLettered: 1 });
    expect(db.rows.has('offline_1')).toBe(true);
  });

  it('does nothing offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    await putQueueItem(item());

    expect(await replayOfflineQueue()).toBeNull();
    expect(db.rows.size).toBe(1);
  });

  it('inserts each item once when two replays start together', async () => {
    await putQueueItem(item());

    const [a, b] = await Promise.all([replayOfflineQueue(), replayOfflineQueue()]);

    expect(insert).toHaveBeenCalledTimes(1);
    expect([a, b].filter(Boolean)).toHaveLength(1);
  });

  it('releases the lock after a throw', async () => {
    await putQueueItem(item());
    const broken: QueueStore = { ...db, all: () => Promise.reject(new Error('idb closed')) };
    __setQueueStore(broken);

    await expect(replayOfflineQueue()).rejects.toThrow('idb closed');

    __setQueueStore(db);
    expect(await replayOfflineQueue()).toEqual({ synced: 1, failed: 0, deadLettered: 0 });
  });
});

describe('useOfflineSync on the single queue (US-412 ACs)', () => {
  it('shows a capture saved on one screen in every other mounted instance', async () => {
    const capture = renderHook(() => useOfflineSync());
    const indicator = renderHook(() => useOfflineSync());
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await capture.result.current.saveOfflineData('safety_incident', { description: 'Trip hazard' });
    });

    await waitFor(() => {
      expect(indicator.result.current.pendingSync).toHaveLength(1);
    });
    expect(indicator.result.current.pendingSync[0].type).toBe('safety_incident');
  });

  it('keeps an offline capture across a reload and syncs it when the connection returns', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const before = renderHook(() => useOfflineSync());
    await act(async () => {
      await before.result.current.saveOfflineData('safety_incident', { description: 'Trip hazard' });
    });
    before.unmount();

    // "Reload": module state is reset, the persisted store is not.
    __setQueueStore(db);
    const after = renderHook(() => useOfflineSync());
    await waitFor(() => {
      expect(after.result.current.pendingSync).toHaveLength(1);
    });

    await act(async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(insert).toHaveBeenCalledWith({ description: 'Trip hazard' });
      expect(after.result.current.pendingSync).toHaveLength(0);
    });
    expect(db.rows.size).toBe(0);
  });

  it('picks up an item a pre-US-412 build left in the Filesystem', async () => {
    files.set('offline-sync/offline_old.json', JSON.stringify(item({ id: 'offline_old' })));

    const { result } = renderHook(() => useOfflineSync());

    await waitFor(() => {
      expect(result.current.pendingSync.map((q) => q.id)).toEqual(['offline_old']);
    });
    expect(files.size).toBe(0);
  });
});
