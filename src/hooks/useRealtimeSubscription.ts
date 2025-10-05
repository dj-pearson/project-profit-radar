import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, REALTIME_POSTGRES_CHANGES_LISTEN_EVENT } from '@supabase/supabase-js';

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseRealtimeSubscriptionOptions {
  table: string;
  schema?: string;
  event?: RealtimeEvent;
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  onChange?: (payload: any) => void;
  enabled?: boolean;
}

/**
 * Hook for subscribing to real-time database changes
 * Automatically handles cleanup on unmount
 * 
 * @example
 * useRealtimeSubscription({
 *   table: 'time_entries',
 *   filter: `user_id=eq.${userId}`,
 *   onChange: () => refetch(),
 * });
 */
export const useRealtimeSubscription = ({
  table,
  schema = 'public',
  event = '*',
  filter,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
  enabled = true,
}: UseRealtimeSubscriptionOptions): void => {
  useEffect(() => {
    if (!enabled) return;

    const channelName = `realtime-${table}-${filter || 'all'}-${Date.now()}`;
    let channel: RealtimeChannel;

    const setupChannel = () => {
      channel = supabase
        .channel(channelName)
        .on(
          REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL as any,
          {
            event: event as any,
            schema,
            table,
            filter,
          },
          (payload: any) => {
            console.log(`[Realtime] ${table} change:`, payload);

            // Call specific event handlers
            switch (payload.eventType) {
              case 'INSERT':
                onInsert?.(payload);
                break;
              case 'UPDATE':
                onUpdate?.(payload);
                break;
              case 'DELETE':
                onDelete?.(payload);
                break;
            }

            // Call general change handler
            onChange?.(payload);
          }
        )
        .subscribe((status) => {
          console.log(`[Realtime] ${table} subscription status:`, status);
        });
    };

    setupChannel();

    // Cleanup
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [table, schema, event, filter, enabled, onInsert, onUpdate, onDelete, onChange]);
};

/**
 * Hook for subscribing to multiple real-time subscriptions
 * Useful when you need to listen to multiple tables or filters
 */
export const useRealtimeSubscriptions = (
  subscriptions: UseRealtimeSubscriptionOptions[],
  enabled = true
): void => {
  useEffect(() => {
    if (!enabled) return;

    const channels: RealtimeChannel[] = [];

    subscriptions.forEach((sub, index) => {
      const channelName = `realtime-${sub.table}-${sub.filter || 'all'}-${index}-${Date.now()}`;
      const channel = supabase
        .channel(channelName)
        .on(
          REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL as any,
          {
            event: (sub.event || '*') as any,
            schema: sub.schema || 'public',
            table: sub.table,
            filter: sub.filter,
          },
          (payload: any) => {
            console.log(`[Realtime] ${sub.table} change:`, payload);

            switch (payload.eventType) {
              case 'INSERT':
                sub.onInsert?.(payload);
                break;
              case 'UPDATE':
                sub.onUpdate?.(payload);
                break;
              case 'DELETE':
                sub.onDelete?.(payload);
                break;
            }

            sub.onChange?.(payload);
          }
        )
        .subscribe();

      channels.push(channel);
    });

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [subscriptions, enabled]);
};
