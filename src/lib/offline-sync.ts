// Offline Sync Engine for BuildDesk Mobile
// Handles local data storage and synchronization with Supabase

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

/** Table names that the offline sync engine operates on */
type SyncableTable = 'projects' | 'time_entries' | 'daily_reports' | 'documents';

/** Helper to call supabase.from() with a runtime table name from the sync queue */
function fromTable(table: string) {
  return supabase.from(table as keyof Database['public']['Tables']);
}

/** Record stored in offline IndexedDB, with sync metadata */
interface OfflineRecord {
  id: string;
  updated_at?: string;
  synced?: number;
  [key: string]: unknown;
}

interface BuildDeskDB extends DBSchema {
  projects: {
    key: string;
    value: OfflineRecord;
    indexes: { 'by-updated': string };
  };
  time_entries: {
    key: string;
    value: OfflineRecord;
    indexes: { 'by-updated': string; 'by-synced': number };
  };
  daily_reports: {
    key: string;
    value: OfflineRecord;
    indexes: { 'by-updated': string; 'by-synced': number };
  };
  documents: {
    key: string;
    value: OfflineRecord;
    indexes: { 'by-updated': string; 'by-synced': number };
  };
  photos: {
    key: string;
    value: OfflineRecord;
    indexes: { 'by-updated': string; 'by-synced': number };
  };
  sync_queue: {
    key: string;
    value: {
      id: string;
      table: string;
      action: 'insert' | 'update' | 'delete';
      data: OfflineRecord;
      created_at: string;
      attempts: number;
      last_error?: string;
    };
    indexes: { 'by-created': string };
  };
  sync_metadata: {
    key: string;
    value: {
      table: string;
      last_sync_at: string;
      last_sync_success: boolean;
    };
  };
}

class OfflineSyncEngine {
  private db: IDBPDatabase<BuildDeskDB> | null = null;
  private syncInterval: number | null = null;
  private isSyncing = false;

  // Initialize the IndexedDB database
  async initialize(): Promise<void> {
    this.db = await openDB<BuildDeskDB>('BuildDeskOffline', 1, {
      upgrade(db) {
        // Projects store
        if (!db.objectStoreNames.contains('projects')) {
          const projectsStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectsStore.createIndex('by-updated', 'updated_at');
        }

        // Time entries store
        if (!db.objectStoreNames.contains('time_entries')) {
          const timeEntriesStore = db.createObjectStore('time_entries', { keyPath: 'id' });
          timeEntriesStore.createIndex('by-updated', 'updated_at');
          timeEntriesStore.createIndex('by-synced', 'synced');
        }

        // Daily reports store
        if (!db.objectStoreNames.contains('daily_reports')) {
          const reportsStore = db.createObjectStore('daily_reports', { keyPath: 'id' });
          reportsStore.createIndex('by-updated', 'updated_at');
          reportsStore.createIndex('by-synced', 'synced');
        }

        // Documents store
        if (!db.objectStoreNames.contains('documents')) {
          const docsStore = db.createObjectStore('documents', { keyPath: 'id' });
          docsStore.createIndex('by-updated', 'updated_at');
          docsStore.createIndex('by-synced', 'synced');
        }

        // Photos store (base64 encoded)
        if (!db.objectStoreNames.contains('photos')) {
          const photosStore = db.createObjectStore('photos', { keyPath: 'id' });
          photosStore.createIndex('by-updated', 'updated_at');
          photosStore.createIndex('by-synced', 'synced');
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('sync_queue')) {
          const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
          queueStore.createIndex('by-created', 'created_at');
        }

        // Sync metadata store
        if (!db.objectStoreNames.contains('sync_metadata')) {
          db.createObjectStore('sync_metadata', { keyPath: 'table' });
        }
      },
    });

    // Start automatic sync if online
    this.startAutoSync();
  }

  // Start automatic synchronization
  startAutoSync(intervalMs: number = 60000): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = window.setInterval(async () => {
      if (navigator.onLine && !this.isSyncing) {
        await this.sync();
      }
    }, intervalMs);

    // Also sync when coming back online
    window.addEventListener('online', () => this.sync());
  }

  // Stop automatic synchronization
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Main synchronization function
  async sync(): Promise<{ success: boolean; errors: string[] }> {
    if (!this.db || this.isSyncing) {
      return { success: false, errors: ['Sync already in progress'] };
    }

    this.isSyncing = true;
    const errors: string[] = [];

    try {

      // Step 1: Push local changes to server
      await this.pushChanges();

      // Step 2: Pull remote changes from server
      await this.pullChanges();

      return { success: true, errors };

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[OfflineSync] Sync error:', error);
      errors.push(message);
      return { success: false, errors };

    } finally {
      this.isSyncing = false;
    }
  }

  // Push local changes to server
  private async pushChanges(): Promise<void> {
    if (!this.db) return;

    const tx = this.db.transaction('sync_queue', 'readwrite');
    const queue = await tx.store.getAll();

    for (const item of queue) {
      try {
        switch (item.action) {
          case 'insert':
            await fromTable(item.table).insert(item.data as Record<string, unknown>);
            break;
          case 'update':
            await fromTable(item.table).update(item.data as Record<string, unknown>).eq('id', item.data.id);
            break;
          case 'delete':
            await fromTable(item.table).delete().eq('id', item.data.id);
            break;
        }

        // Remove from queue on success
        await this.db.delete('sync_queue', item.id);

      } catch (error) {
        console.error(`[OfflineSync] Failed to push ${item.action}:`, error);

        // Update attempt count and error
        item.attempts += 1;
        item.last_error = error instanceof Error ? error.message : String(error);

        // Remove from queue if too many failures
        if (item.attempts >= 5) {
          await this.db.delete('sync_queue', item.id);
          console.error(`[OfflineSync] Removed ${item.id} after 5 failed attempts`);
        } else {
          await this.db.put('sync_queue', item);
        }
      }
    }
  }

  // Pull remote changes from server
  private async pullChanges(): Promise<void> {
    if (!this.db) return;

    const tables = ['projects', 'time_entries', 'daily_reports', 'documents'];

    for (const table of tables) {
      try {
        // Get last sync timestamp
        const metadata = await this.db.get('sync_metadata', table);
        const lastSyncAt = metadata?.last_sync_at || new Date(0).toISOString();

        // Fetch changes since last sync
        const { data, error } = await fromTable(table)
          .select('*')
          .gte('updated_at', lastSyncAt)
          .order('updated_at', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          // Update local store
          const tx = this.db.transaction(table as SyncableTable, 'readwrite');

          for (const record of data) {
            await tx.store.put({ ...record, synced: 1 });
          }

          await tx.done;

          // Update sync metadata
          await this.db.put('sync_metadata', {
            table,
            last_sync_at: new Date().toISOString(),
            last_sync_success: true
          });

        }

      } catch (error) {
        console.error(`[OfflineSync] Failed to pull from ${table}:`, error);

        // Update sync metadata with failure
        await this.db.put('sync_metadata', {
          table,
          last_sync_at: new Date().toISOString(),
          last_sync_success: false
        });
      }
    }
  }

  // Save data locally (with queue for sync)
  async saveLocal(
    table: string,
    data: OfflineRecord,
    action: 'insert' | 'update' | 'delete' = 'insert'
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const id = data.id || crypto.randomUUID();
    const now = new Date().toISOString();

    // Add to local store
    if (action !== 'delete') {
      await this.db.put(table as SyncableTable, {
        ...data,
        id,
        updated_at: now,
        synced: 0
      });
    } else {
      await this.db.delete(table as SyncableTable, id);
    }

    // Add to sync queue
    await this.db.put('sync_queue', {
      id: crypto.randomUUID(),
      table,
      action,
      data: { ...data, id },
      created_at: now,
      attempts: 0
    });

    // Trigger sync if online
    if (navigator.onLine) {
      setTimeout(() => this.sync(), 1000);
    }
  }

  // Get all local records from a table
  async getLocal(table: string): Promise<OfflineRecord[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAll(table as SyncableTable);
  }

  // Get single record by ID
  async getLocalById(table: string, id: string): Promise<OfflineRecord | undefined> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.get(table as SyncableTable, id);
  }

  // Get unsynced records count
  async getUnsyncedCount(): Promise<number> {
    if (!this.db) return 0;
    const queue = await this.db.getAll('sync_queue');
    return queue.length;
  }

  // Clear all local data (use with caution!)
  async clearAll(): Promise<void> {
    if (!this.db) return;

    const tables = ['projects', 'time_entries', 'daily_reports', 'documents', 'photos', 'sync_queue', 'sync_metadata'];

    for (const table of tables) {
      await this.db.clear(table as keyof BuildDeskDB);
    }

  }

  // Get sync status
  async getSyncStatus(): Promise<{
    isOnline: boolean;
    isSyncing: boolean;
    unsyncedCount: number;
    lastSyncTimes: Record<string, string>;
  }> {
    const unsyncedCount = await this.getUnsyncedCount();
    const lastSyncTimes: Record<string, string> = {};

    if (this.db) {
      const metadataList = await this.db.getAll('sync_metadata');
      for (const metadata of metadataList) {
        lastSyncTimes[metadata.table] = metadata.last_sync_at;
      }
    }

    return {
      isOnline: navigator.onLine,
      isSyncing: this.isSyncing,
      unsyncedCount,
      lastSyncTimes
    };
  }
}

// Export singleton instance
export const offlineSync = new OfflineSyncEngine();
