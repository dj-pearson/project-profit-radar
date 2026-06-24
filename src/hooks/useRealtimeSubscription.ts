import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createReconnectingChannel } from '@/lib/realtime/reconnectingChannel';
import {
  registerRealtimeChannel,
  reportRealtimeChannelState,
  unregisterRealtimeChannel,
} from '@/lib/realtime/connectionStore';

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

type RealtimePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;

interface UseRealtimeSubscriptionOptions {
  table: string;
  schema?: string;
  event?: RealtimeEvent;
  filter?: string;
  onInsert?: (payload: RealtimePayload) => void;
  onUpdate?: (payload: RealtimePayload) => void;
  onDelete?: (payload: RealtimePayload) => void;
  onChange?: (payload: RealtimePayload) => void;
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

    // Each effect run gets a fresh channel name so a reconnect doesn't collide
    // with the dying channel.
    const buildChannel = (): RealtimeChannel =>
      supabase
        .channel(`realtime-${table}-${filter || 'all'}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
        .on(
          'postgres_changes',
          { event, schema, table, filter },
          (payload: RealtimePayload) => {
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
            onChange?.(payload);
          },
        );

    // Centralized auto-reconnect with backoff + jitter (US-210). On recovery
    // after a drop, refetch missed rows via onChange (a no-payload signal).
    const channelId = registerRealtimeChannel();
    const handle = createReconnectingChannel<RealtimeChannel>({
      createChannel: buildChannel,
      removeChannel: (ch) => supabase.removeChannel(ch),
      onStateChange: (state) => reportRealtimeChannelState(channelId, state),
      onReconnect: () => {
        // We can't replay individual missed events, so signal a full refetch.
        onChange?.({ eventType: 'UPDATE' } as unknown as RealtimePayload);
      },
    });

    return () => {
      handle.teardown();
      unregisterRealtimeChannel(channelId);
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
          'postgres_changes',
          {
            event: sub.event || '*',
            schema: sub.schema || 'public',
            table: sub.table,
            filter: sub.filter,
          },
          (payload: RealtimePayload) => {

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
