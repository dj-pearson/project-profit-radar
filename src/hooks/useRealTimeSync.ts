import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface SyncEvent {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: any;
  old: any;
  timestamp: string;
}

export interface SyncSubscription {
  id: string;
  tables: string[];
  onSync: (event: SyncEvent) => void;
  filters?: Record<string, any>;
}

export interface UseRealTimeSyncOptions {
  subscriptions: SyncSubscription[];
  enableCrossModuleSync?: boolean;
  enableNotifications?: boolean;
  onError?: (error: any) => void;
}

export const useRealTimeSync = (options: UseRealTimeSyncOptions) => {
  const { userProfile } = useAuth();
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());
  const { subscriptions, enableCrossModuleSync = true, enableNotifications = true, onError } = options;

  const handleSyncEvent = useCallback((event: SyncEvent, onSync: (event: SyncEvent) => void) => {
    try {
      onSync(event);

      if (enableCrossModuleSync) {
        handleCrossModuleSync(event);
      }

      if (enableNotifications) {
        showSyncNotification(event);
      }

    } catch (error) {
      console.error('Error handling sync event:', error);
      if (onError) onError(error);
    }
  }, [enableCrossModuleSync, enableNotifications, onError]);

  const handleCrossModuleSync = useCallback(async (event: SyncEvent) => {
    try {
      switch (event.table) {
        case 'opportunities':
          await handleOpportunitySync(event);
          break;
        case 'projects':
          await handleProjectSync(event);
          break;
        default:
          // Handle other tables as needed
          break;
      }
    } catch (error) {
      console.error('Error in cross-module sync:', error);
    }
  }, []);

  const handleOpportunitySync = async (event: SyncEvent) => {
    if (event.eventType === 'UPDATE' && event.new.status === 'won' && event.old.status !== 'won') {
      toast({
        title: "Opportunity Won! 🎉",
        description: `${event.new.name} - Ready to create a project?`,
      });
    }
  };

  const handleProjectSync = async (event: SyncEvent) => {
    if (event.eventType === 'UPDATE' && event.new.status !== event.old.status) {
      toast({
        title: "Project Status Updated",
        description: `${event.new.name} is now ${event.new.status}`,
      });
    }
  };

  const showSyncNotification = (event: SyncEvent) => {
    const importantEvents = ['opportunities', 'projects', 'tasks'];
    const importantActions = ['INSERT', 'UPDATE'];

    if (importantEvents.includes(event.table) && importantActions.includes(event.eventType)) {
      // Notifications are handled in specific sync handlers
      return;
    }
  };

  const subscribe = useCallback(() => {
    if (!userProfile?.company_id) return;

    channelsRef.current.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    channelsRef.current.clear();

    subscriptions.forEach((subscription) => {
      subscription.tables.forEach((table) => {
        const channelName = `${subscription.id}-${table}`;
        const channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: table,
              filter: `company_id=eq.${userProfile.company_id}`
            },
            (payload) => {
              const syncEvent: SyncEvent = {
                table,
                eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
                new: payload.new,
                old: payload.old,
                timestamp: new Date().toISOString()
              };

              handleSyncEvent(syncEvent, subscription.onSync);
            }
          )
          .subscribe();

        channelsRef.current.set(channelName, channel);
      });
    });
  }, [userProfile?.company_id, subscriptions, handleSyncEvent]);

  const unsubscribe = useCallback(() => {
    channelsRef.current.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    channelsRef.current.clear();
  }, []);

  useEffect(() => {
    subscribe();
    return unsubscribe;
  }, [subscribe, unsubscribe]);

  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  return {
    subscribe,
    unsubscribe,
    activeChannels: channelsRef.current.size
  };
};

export default useRealTimeSync;