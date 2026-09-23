import { useState, useEffect, useCallback, useRef } from 'react';
import { Preferences } from '@capacitor/preferences';
import { Device } from '@capacitor/device';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';
import { useToast } from './use-toast';
import { logger } from '@/lib/logger';
import {
  listQueue,
  putQueueItem,
  deleteQueueItem,
  subscribeQueue,
  type OfflineData,
} from '@/lib/offline-queue';

// The queue item shape lives with the store now; re-exported so existing
// imports from this hook keep working.
export type { OfflineData } from '@/lib/offline-queue';

// Constants for exponential backoff
const MAX_RETRY_COUNT = 5;
const INITIAL_BACKOFF_MS = 1000; // 1 second
const MAX_BACKOFF_MS = 60000; // 60 seconds
const BACKOFF_MULTIPLIER = 2;

/**
 * Calculate the next retry delay using exponential backoff
 */
function calculateBackoff(retryCount: number): number {
  const backoff = INITIAL_BACKOFF_MS * Math.pow(BACKOFF_MULTIPLIER, retryCount);
  return Math.min(backoff, MAX_BACKOFF_MS);
}

/**
 * One replay at a time, across every mounted instance of this hook.
 *
 * The guard used to be `offlineState.syncInProgress`, which is per-instance.
 * Five capture screens use this hook and SyncQueueIndicator is mounted on every
 * page, so two instances could read the same queued item and insert it twice -
 * two safety incidents, two time entries - with nothing to tell them apart
 * afterwards. A module-level flag is the right scope because the queue it
 * protects is also module-level: one device, one store.
 */
let replayInFlight = false;

/** Exposed for tests; nothing in the app calls it. */
export function __resetReplayLock(): void {
  replayInFlight = false;
}

/**
 * Check if an item is ready for retry based on backoff timing
 */
function isReadyForRetry(item: OfflineData): boolean {
  if (item.synced) return false;
  if (item.retryCount >= MAX_RETRY_COUNT) return false;
  if (!item.nextRetryAt) return true;
  return new Date().getTime() >= new Date(item.nextRetryAt).getTime();
}

/**
 * Insert one queued capture. The row was built by the capture screen for this
 * table, so the cast states what the screen already promised. Photo and
 * voice-note items have no table and fail into the dead-letter path.
 */
async function syncSingleItem(item: OfflineData): Promise<void> {
  let result: { error: unknown };
  switch (item.type) {
    case 'time_entry':
      result = await supabase.from('time_entries').insert(item.data as TablesInsert<'time_entries'>);
      break;
    case 'daily_report':
      result = await supabase.from('daily_reports').insert(item.data as TablesInsert<'daily_reports'>);
      break;
    case 'expense':
      result = await supabase.from('expenses').insert(item.data as TablesInsert<'expenses'>);
      break;
    case 'safety_incident':
      result = await supabase.from('safety_incidents').insert(item.data as TablesInsert<'safety_incidents'>);
      break;
    default:
      throw new Error(`Unknown sync type: ${item.type}`);
  }
  if (result.error) throw result.error;
}

export interface ReplayResult {
  synced: number;
  failed: number;
  /** Items at MAX_RETRY_COUNT that the replay no longer attempts. */
  deadLettered: number;
}

/**
 * Replay every queued item that is due, reading the queue from the store
 * rather than from React state: a handler registered on mount (the `online`
 * listener, the 30s interval) would otherwise see the queue as it was at mount,
 * which is usually empty, and replay nothing.
 *
 * Returns null when another replay holds the lock or the device is offline.
 */
export async function replayOfflineQueue(): Promise<ReplayResult | null> {
  if (replayInFlight || !navigator.onLine) return null;
  replayInFlight = true;
  try {
    const items = await listQueue();
    const result: ReplayResult = { synced: 0, failed: 0, deadLettered: 0 };

    for (const item of items.filter(isReadyForRetry)) {
      try {
        await syncSingleItem(item);
        // On the server now; nothing left to keep.
        await deleteQueueItem(item.id);
        result.synced++;
      } catch (error) {
        logger.error(`Failed to sync item ${item.id}:`, error);
        result.failed++;

        const backoffMs = calculateBackoff(item.retryCount);
        const updatedItem: OfflineData = {
          ...item,
          retryCount: item.retryCount + 1,
          lastAttempt: new Date().toISOString(),
          nextRetryAt: new Date(Date.now() + backoffMs).toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        logger.debug(
          `Item ${item.id} failed. Retry ${updatedItem.retryCount}/${MAX_RETRY_COUNT}. ` +
            `Next retry in ${backoffMs / 1000}s`,
        );
        await putQueueItem(updatedItem);
      }
    }

    // Counted after the loop so an item that just hit the cap is included.
    result.deadLettered = (await listQueue()).filter(
      (item) => !item.synced && item.retryCount >= MAX_RETRY_COUNT,
    ).length;
    return result;
  } finally {
    // Released here rather than on each exit path: a lock that leaks on a
    // throw would wedge every future replay for the life of the page.
    replayInFlight = false;
  }
}

interface OfflineState {
  isOnline: boolean;
  pendingSync: OfflineData[];
  syncInProgress: boolean;
  lastSyncTime?: string;
}

export const useOfflineSync = () => {
  const [offlineState, setOfflineState] = useState<OfflineState>({
    isOnline: navigator.onLine,
    pendingSync: [],
    syncInProgress: false
  });

  const { toast } = useToast();

  const loadPendingSyncData = useCallback(async () => {
    try {
      const items = await listQueue();
      setOfflineState(prev => ({
        ...prev,
        pendingSync: items.filter(item => !item.synced)
      }));

      const { value: lastSync } = await Preferences.get({ key: 'last_sync_time' });
      if (lastSync) {
        setOfflineState(prev => ({ ...prev, lastSyncTime: lastSync }));
      }
    } catch (error) {
      logger.error('Error loading pending sync data:', error);
    }
  }, []);

  const saveOfflineData = useCallback(async (
    type: OfflineData['type'],
    data: Record<string, unknown>
  ): Promise<string> => {
    try {
      const offlineItem: OfflineData = {
        id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        type,
        data,
        timestamp: new Date().toISOString(),
        synced: false,
        retryCount: 0
      };

      await putQueueItem(offlineItem);

      // The store notifies every mounted instance, including this one; the
      // optimistic update just saves this screen a round trip.
      setOfflineState(prev => ({
        ...prev,
        pendingSync: prev.pendingSync.some(p => p.id === offlineItem.id)
          ? prev.pendingSync
          : [...prev.pendingSync, offlineItem]
      }));

      toast({
        title: "Data Saved Offline",
        description: `${type.replace('_', ' ')} will be synced when connection is available`,
      });

      return offlineItem.id;

    } catch (error) {
      logger.error('Error saving offline data:', error);
      throw error;
    }
  }, [toast]);

  const syncPendingData = useCallback(async () => {
    if (replayInFlight || !navigator.onLine) return;

    // The 30s interval lands here on every mounted instance. With nothing due,
    // skip the spinner and the last-sync write rather than flicker both.
    try {
      if (!(await listQueue()).some(isReadyForRetry)) return;
    } catch (error) {
      logger.error('Error reading offline queue:', error);
      return;
    }

    setOfflineState(prev => ({ ...prev, syncInProgress: true }));
    try {
      const result = await replayOfflineQueue();
      if (!result) return;

      const lastSyncTime = new Date().toISOString();
      await Preferences.set({ key: 'last_sync_time', value: lastSyncTime });
      setOfflineState(prev => ({ ...prev, lastSyncTime }));

      if (result.synced > 0) {
        toast({
          title: "Sync Complete",
          description: `${result.synced} items synced successfully${result.failed ? `, ${result.failed} failed` : ''}`,
        });
      }

      if (result.failed > 0) {
        toast({
          title: "Sync Issues",
          description: result.deadLettered > 0
            ? `${result.failed} items failed. ${result.deadLettered} exceeded max retries.`
            : `${result.failed} items failed and will be retried with backoff`,
          variant: "destructive"
        });
      }
    } catch (error) {
      logger.error('Error during sync:', error);
      toast({
        title: "Sync Error",
        description: "Failed to sync offline data",
        variant: "destructive"
      });
    } finally {
      setOfflineState(prev => ({ ...prev, syncInProgress: false }));
    }
  }, [toast]);

  // Handlers registered once on mount call the latest syncPendingData and
  // toast. Listing them as effect deps instead would re-register (and reload
  // the queue) on every render wherever toast is not referentially stable.
  const syncRef = useRef(syncPendingData);
  syncRef.current = syncPendingData;
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    void loadPendingSyncData();
    const unsubscribe = subscribeQueue(() => {
      void loadPendingSyncData();
    });

    const handleOnline = () => {
      setOfflineState(prev => ({ ...prev, isOnline: true }));
      toastRef.current({
        title: "Connection Restored",
        description: "Syncing offline data...",
      });
      void syncRef.current();
    };

    const handleOffline = () => {
      setOfflineState(prev => ({ ...prev, isOnline: false }));
      toastRef.current({
        title: "Connection Lost",
        description: "Data will be saved offline and synced when connection is restored",
        variant: "destructive"
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic attempt while online. replayOfflineQueue reads the store, so an
    // empty queue costs one IndexedDB read.
    const syncInterval = setInterval(() => {
      if (navigator.onLine) void syncRef.current();
    }, 30000);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
    };
  }, [loadPendingSyncData]);

  const clearSyncedData = useCallback(async () => {
    try {
      // A successful replay deletes its item, so only items written as synced
      // by the pre-US-412 engine can be here.
      const syncedItems = (await listQueue()).filter(item => item.synced);
      await Promise.all(syncedItems.map(item => deleteQueueItem(item.id)));

      toast({
        title: "Cleanup Complete",
        description: `Removed ${syncedItems.length} synced items`,
      });

    } catch (error) {
      logger.error('Error clearing synced data:', error);
    }
  }, [toast]);

  const retryFailedSync = useCallback(async () => {
    const failedItems = (await listQueue()).filter(item =>
      !item.synced && item.error
    );

    // Reset retry count for failed items
    for (const item of failedItems) {
      await putQueueItem({
        ...item,
        retryCount: 0,
        nextRetryAt: undefined,
        error: undefined
      });
    }

    if (navigator.onLine) {
      await syncPendingData();
    }
  }, [syncPendingData]);

  const getStorageInfo = useCallback(async () => {
    try {
      const deviceInfo = await Device.getInfo();
      const items = await listQueue();
      const totalSize = items.reduce((sum, item) => sum + JSON.stringify(item).length, 0);

      const pendingItems = items.filter(item => !item.synced);
      const failedItems = pendingItems.filter(item => item.error);
      const awaitingRetry = pendingItems.filter(item =>
        item.nextRetryAt && new Date(item.nextRetryAt) > new Date()
      );
      const permanentlyFailed = pendingItems.filter(
        item => item.retryCount >= MAX_RETRY_COUNT
      );

      return {
        platform: deviceInfo.platform,
        pendingItems: pendingItems.length,
        estimatedSize: `${Math.round(totalSize / 1024)}KB`,
        lastSync: offlineState.lastSyncTime,
        failedItems: failedItems.length,
        awaitingRetry: awaitingRetry.length,
        permanentlyFailed: permanentlyFailed.length,
        readyForRetry: pendingItems.filter(isReadyForRetry).length
      };

    } catch (error) {
      logger.error('Error getting storage info:', error);
      return null;
    }
  }, [offlineState.lastSyncTime]);

  return {
    // State
    isOnline: offlineState.isOnline,
    pendingSync: offlineState.pendingSync,
    syncInProgress: offlineState.syncInProgress,
    lastSyncTime: offlineState.lastSyncTime,
    
    // Actions
    saveOfflineData,
    syncPendingData,
    clearSyncedData,
    retryFailedSync,
    getStorageInfo
  };
};
