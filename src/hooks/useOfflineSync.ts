import { useState, useEffect, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Device } from '@capacitor/device';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface OfflineData {
  id: string;
  type: 'time_entry' | 'daily_report' | 'expense' | 'photo' | 'voice_note' | 'safety_incident';
  data: any;
  timestamp: string;
  synced: boolean;
  retryCount: number;
  lastAttempt?: string;
  error?: string;
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
    useEffect(() => {
    // Load pending sync data on mount
    loadPendingSyncData();

    // Set up online/offline listeners
    const handleOnline = () => {
      setOfflineState(prev => ({ ...prev, isOnline: true }));
      toast({
        title: "Connection Restored",
        description: "Syncing offline data...",
      });
      syncPendingData();
    };

    const handleOffline = () => {
      setOfflineState(prev => ({ ...prev, isOnline: false }));
      toast({
        title: "Connection Lost",
        description: "Data will be saved offline and synced when connection is restored",
        variant: "destructive"
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic sync attempt (every 30 seconds when online)
    const syncInterval = setInterval(() => {
      if (navigator.onLine && offlineState.pendingSync.length > 0) {
        syncPendingData();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
    };
  }, []);

  const loadPendingSyncData = async () => {
    try {
      // Ensure offline directory exists
      try {
        await Filesystem.mkdir({
          path: 'offline-sync',
          directory: Directory.Data,
          recursive: true
        });
      } catch {
        // Directory might already exist
      }

      // Load pending sync items
      const { files } = await Filesystem.readdir({
        path: 'offline-sync',
        directory: Directory.Data
      });

      const pendingData = await Promise.all(
        files
          .filter(file => file.name.endsWith('.json'))
          .map(async (file) => {
            try {
              const { data } = await Filesystem.readFile({
                path: `offline-sync/${file.name}`,
                directory: Directory.Data,
                encoding: Encoding.UTF8
              });
              return JSON.parse(data as string) as OfflineData;
            } catch {
              return null;
            }
          })
      );

      const validPendingData = pendingData.filter(Boolean) as OfflineData[];
      
      setOfflineState(prev => ({
        ...prev,
        pendingSync: validPendingData.filter(item => !item.synced)
      }));

      // Get last sync time
      const { value: lastSync } = await Preferences.get({ key: 'last_sync_time' });
      if (lastSync) {
        setOfflineState(prev => ({ ...prev, lastSyncTime: lastSync }));
      }

    } catch (error) {
      console.error('Error loading pending sync data:', error);
    }
  };

  const saveOfflineData = useCallback(async (
    type: OfflineData['type'],
    data: any
  ): Promise<string> => {
    try {
      const offlineItem: OfflineData = {
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        timestamp: new Date().toISOString(),
        synced: false,
        retryCount: 0
      };

      // Save to filesystem
      await Filesystem.writeFile({
        path: `offline-sync/${offlineItem.id}.json`,
        data: JSON.stringify(offlineItem) as string,
        directory: Directory.Data,
        encoding: Encoding.UTF8
      });

      // Update state
      setOfflineState(prev => ({
        ...prev,
        pendingSync: [...prev.pendingSync, offlineItem]
      }));

      toast({
        title: "Data Saved Offline",
        description: `${type.replace('_', ' ')} will be synced when connection is available`,
      });

      return offlineItem.id;

    } catch (error) {
      console.error('Error saving offline data:', error);
      throw error;
    }
  }, [toast]);

  const syncPendingData = useCallback(async () => {
    if (offlineState.syncInProgress || !navigator.onLine) return;

    setOfflineState(prev => ({ ...prev, syncInProgress: true }));

    try {
      const itemsToSync = offlineState.pendingSync.filter(item => 
        !item.synced && item.retryCount < 3
      );

      if (itemsToSync.length === 0) {
        setOfflineState(prev => ({ ...prev, syncInProgress: false }));
        return;
      }

      let syncedCount = 0;
      let failedCount = 0;

      for (const item of itemsToSync) {
        try {
          await syncSingleItem(item);
          syncedCount++;
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);
          failedCount++;
          
          // Update retry count and error
          const updatedItem: OfflineData = {
            ...item,
            retryCount: item.retryCount + 1,
            lastAttempt: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error'
          };

          // Save updated item
          await Filesystem.writeFile({
            path: `offline-sync/${item.id}.json`,
            data: JSON.stringify(updatedItem),
            directory: Directory.Data,
            encoding: Encoding.UTF8
          });

          // Update state
          setOfflineState(prev => ({
            ...prev,
            pendingSync: prev.pendingSync.map(p => 
              p.id === item.id ? updatedItem : p
            )
          }));
        }
      }

      // Update last sync time
      const lastSyncTime = new Date().toISOString();
      await Preferences.set({ key: 'last_sync_time', value: lastSyncTime });
      
      setOfflineState(prev => ({ 
        ...prev, 
        lastSyncTime,
        syncInProgress: false 
      }));

      if (syncedCount > 0) {
        toast({
          title: "Sync Complete",
          description: `${syncedCount} items synced successfully${failedCount ? `, ${failedCount} failed` : ''}`,
        });
      }

      if (failedCount > 0) {
        toast({
          title: "Sync Issues",
          description: `${failedCount} items failed to sync and will be retried`,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Error during sync:', error);
      setOfflineState(prev => ({ ...prev, syncInProgress: false }));
      
      toast({
        title: "Sync Error",
        description: "Failed to sync offline data",
        variant: "destructive"
      });
    }
  }, [offlineState.pendingSync, offlineState.syncInProgress, toast]);

  const syncSingleItem = async (item: OfflineData) => {
    switch (item.type) {
      case 'time_entry':
        await syncTimeEntry(item);
        break;
      case 'daily_report':
        await syncDailyReport(item);
        break;
      case 'expense':
        await syncExpense(item);
        break;
      case 'safety_incident':
        await syncSafetyIncident(item);
        break;
      default:
        throw new Error(`Unknown sync type: ${item.type}`);
    }

    // Mark as synced
    const syncedItem: OfflineData = {
      ...item,
      synced: true,
      lastAttempt: new Date().toISOString()
    };

    // Update file
    await Filesystem.writeFile({
      path: `offline-sync/${item.id}.json`,
      data: JSON.stringify(syncedItem),
      directory: Directory.Data,
      encoding: Encoding.UTF8
    });

    // Update state
    setOfflineState(prev => ({
      ...prev,
      pendingSync: prev.pendingSync.map(p => 
        p.id === item.id ? syncedItem : p
      )
    }));
  };

  const syncTimeEntry = async (item: OfflineData) => {
    const { error } = await supabase
      .from('time_entries')
      .insert({
        ...item.data
      });

    if (error) throw error;
  };

  const syncDailyReport = async (item: OfflineData) => {
    const { error } = await supabase
      .from('daily_reports')
      .insert({
        ...item.data
      });

    if (error) throw error;
  };

  const syncExpense = async (item: OfflineData) => {
    const { error } = await supabase
      .from('expenses')
      .insert({
        ...item.data
      });

    if (error) throw error;
  };

  const syncSafetyIncident = async (item: OfflineData) => {
    const { error } = await supabase
      .from('safety_incidents')
      .insert({
        ...item.data
      });

    if (error) throw error;
  };

  const clearSyncedData = useCallback(async () => {
    try {
      const syncedItems = offlineState.pendingSync.filter(item => item.synced);
      
      // Delete synced files
      await Promise.all(
        syncedItems.map(item => 
          Filesystem.deleteFile({
            path: `offline-sync/${item.id}.json`,
            directory: Directory.Data
          })
        )
      );

      // Update state
      setOfflineState(prev => ({
        ...prev,
        pendingSync: prev.pendingSync.filter(item => !item.synced)
      }));

      toast({
        title: "Cleanup Complete",
        description: `Removed ${syncedItems.length} synced items`,
      });

    } catch (error) {
      console.error('Error clearing synced data:', error);
    }
  }, [offlineState.pendingSync, toast]);

  const retryFailedSync = useCallback(async () => {
    const failedItems = offlineState.pendingSync.filter(item => 
      !item.synced && item.error
    );

    // Reset retry count for failed items
    for (const item of failedItems) {
      const resetItem: OfflineData = {
        ...item,
        retryCount: 0,
        error: undefined
      };

      await Filesystem.writeFile({
        path: `offline-sync/${item.id}.json`,
        data: JSON.stringify(resetItem),
        directory: Directory.Data,
        encoding: Encoding.UTF8
      });
    }

    // Reload and sync
    await loadPendingSyncData();
    if (navigator.onLine) {
      await syncPendingData();
    }
  }, [offlineState.pendingSync, loadPendingSyncData, syncPendingData]);

  const getStorageInfo = useCallback(async () => {
    try {
      const deviceInfo = await Device.getInfo();
      
      // Get offline data size
      const { files } = await Filesystem.readdir({
        path: 'offline-sync',
        directory: Directory.Data
      });

      const totalSize = files.reduce((sum, file) => {
        // Estimate size (actual size would require reading each file)
        return sum + (file.name.length * 100); // Rough estimate
      }, 0);

      return {
        platform: deviceInfo.platform,
        pendingItems: offlineState.pendingSync.length,
        estimatedSize: `${Math.round(totalSize / 1024)}KB`,
        lastSync: offlineState.lastSyncTime,
        failedItems: offlineState.pendingSync.filter(item => item.error).length
      };

    } catch (error) {
      console.error('Error getting storage info:', error);
      return null;
    }
  }, [offlineState]);

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