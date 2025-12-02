/**
 * Sync Clock Events Hook
 *
 * Syncs pending clock-in/out events from offline storage to the database.
 * Used to reconcile background geofencing events with Supabase.
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from './use-toast';
import {
  mobileBackgroundService,
  type PendingClockEvent,
} from '@/mobile/services/MobileBackgroundService';

export interface UseSyncClockEventsReturn {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
  error: string | null;
  syncNow: () => Promise<void>;
  getPendingEvents: () => Promise<PendingClockEvent[]>;
}

export const useSyncClockEvents = (): UseSyncClockEventsReturn => {
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get pending events
  const getPendingEvents = useCallback(async (): Promise<PendingClockEvent[]> => {
    try {
      return await mobileBackgroundService.getPendingClockEvents();
    } catch (err) {
      console.error('Error getting pending events:', err);
      return [];
    }
  }, []);

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    const events = await getPendingEvents();
    setPendingCount(events.length);
  }, [getPendingEvents]);

  // Sync a single clock-in event
  const syncClockInEvent = async (event: PendingClockEvent): Promise<boolean> => {
    try {
      const { error: insertError } = await supabase
        .from('gps_time_entries')
        .insert({
          user_id: event.userId,
          company_id: event.companyId,
          project_id: event.projectId,
          geofence_id: event.geofenceId,
          clock_in_time: event.timestamp,
          clock_in_latitude: event.latitude,
          clock_in_longitude: event.longitude,
          clock_in_accuracy: event.accuracy,
          clock_in_verified: true,
          device_type: 'mobile_background',
        });

      if (insertError) {
        console.error('Failed to sync clock-in:', insertError);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error syncing clock-in event:', err);
      return false;
    }
  };

  // Sync a single clock-out event
  const syncClockOutEvent = async (event: PendingClockEvent): Promise<boolean> => {
    try {
      // Find the active time entry for this geofence
      const { data: activeEntry, error: findError } = await supabase
        .from('gps_time_entries')
        .select('id, clock_in_time')
        .eq('user_id', event.userId)
        .eq('geofence_id', event.geofenceId)
        .is('clock_out_time', null)
        .order('clock_in_time', { ascending: false })
        .limit(1)
        .single();

      if (findError || !activeEntry) {
        console.warn('No active time entry found for clock-out:', event.geofenceId);
        return false;
      }

      // Calculate hours worked
      const clockInTime = new Date(activeEntry.clock_in_time);
      const clockOutTime = new Date(event.timestamp);
      const hoursWorked = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

      // Update the time entry
      const { error: updateError } = await supabase
        .from('gps_time_entries')
        .update({
          clock_out_time: event.timestamp,
          clock_out_latitude: event.latitude,
          clock_out_longitude: event.longitude,
          clock_out_accuracy: event.accuracy,
          clock_out_verified: true,
          total_hours: hoursWorked,
        })
        .eq('id', activeEntry.id);

      if (updateError) {
        console.error('Failed to sync clock-out:', updateError);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error syncing clock-out event:', err);
      return false;
    }
  };

  // Main sync function
  const syncNow = useCallback(async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    setError(null);

    try {
      const pendingEvents = await getPendingEvents();

      if (pendingEvents.length === 0) {
        setLastSyncAt(new Date());
        return;
      }


      const syncedTimestamps: string[] = [];
      let successCount = 0;
      let failCount = 0;

      // Sort events by timestamp to ensure clock-ins come before clock-outs
      const sortedEvents = [...pendingEvents].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      for (const event of sortedEvents) {
        let success = false;

        if (event.type === 'clock_in') {
          success = await syncClockInEvent(event);
        } else if (event.type === 'clock_out') {
          success = await syncClockOutEvent(event);
        }

        if (success) {
          syncedTimestamps.push(event.timestamp);
          successCount++;
        } else {
          failCount++;
        }
      }

      // Remove synced events from storage
      if (syncedTimestamps.length > 0) {
        await mobileBackgroundService.removeSyncedClockEvents(syncedTimestamps);
      }

      // Update pending count
      await updatePendingCount();

      // Update last sync time
      setLastSyncAt(new Date());

      // Show result toast
      if (successCount > 0) {
        toast({
          title: 'Time Entries Synced',
          description: `Successfully synced ${successCount} time ${successCount === 1 ? 'entry' : 'entries'}${failCount > 0 ? `, ${failCount} failed` : ''}`,
        });
      }

      if (failCount > 0) {
        setError(`${failCount} events failed to sync`);
      }

    } catch (err: any) {
      console.error('Error during sync:', err);
      setError(err.message || 'Sync failed');
      toast({
        variant: 'destructive',
        title: 'Sync Failed',
        description: err.message || 'Failed to sync time entries',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, getPendingEvents, updatePendingCount, toast]);

  // Initial load of pending count
  useEffect(() => {
    updatePendingCount();
  }, [updatePendingCount]);

  // Auto-sync when user profile is available and there are pending events
  useEffect(() => {
    if (userProfile?.id && pendingCount > 0) {
      syncNow();
    }
  }, [userProfile?.id, pendingCount]);

  return {
    isSyncing,
    pendingCount,
    lastSyncAt,
    error,
    syncNow,
    getPendingEvents,
  };
};
