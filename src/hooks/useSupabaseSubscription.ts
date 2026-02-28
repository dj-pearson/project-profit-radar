import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface SubscriptionConfig {
  /** Unique channel name for this subscription */
  channelName: string;
  /** Database table to subscribe to */
  table: string;
  /** Schema (defaults to 'public') */
  schema?: string;
  /** Event type to listen for */
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  /** Optional filter expression (e.g., 'user_id=eq.abc123') */
  filter?: string;
  /** Callback when a change is received */
  onPayload: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  /** Optional error handler */
  onError?: (error: Error) => void;
  /** Whether the subscription is enabled (defaults to true) */
  enabled?: boolean;
}

// Track active channels globally to prevent duplicates
const activeChannels = new Map<string, { refCount: number; channel: RealtimeChannel }>();

/**
 * Centralized hook for managing Supabase real-time subscriptions.
 * Handles channel creation, cleanup on unmount, error handling, and deduplication.
 */
export function useSupabaseSubscription(config: SubscriptionConfig): void {
  const {
    channelName,
    table,
    schema = 'public',
    event = '*',
    filter,
    onPayload,
    onError,
    enabled = true,
  } = config;

  const onPayloadRef = useRef(onPayload);
  const onErrorRef = useRef(onError);

  // Keep refs up-to-date without re-subscribing
  useEffect(() => {
    onPayloadRef.current = onPayload;
  }, [onPayload]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!enabled) return;

    const existing = activeChannels.get(channelName);
    if (existing) {
      existing.refCount++;
      return () => {
        existing.refCount--;
        if (existing.refCount <= 0) {
          supabase.removeChannel(existing.channel);
          activeChannels.delete(channelName);
        }
      };
    }

    const channelConfig: Record<string, string> = {
      event,
      schema,
      table,
    };
    if (filter) {
      channelConfig.filter = filter;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as const,
        channelConfig as any,
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          try {
            onPayloadRef.current(payload);
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            if (onErrorRef.current) {
              onErrorRef.current(error);
            } else {
              console.error(`[useSupabaseSubscription] Error in ${channelName}:`, error);
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          const error = new Error(`Subscription channel error: ${channelName}`);
          if (onErrorRef.current) {
            onErrorRef.current(error);
          } else {
            console.error(`[useSupabaseSubscription] Channel error:`, channelName);
          }
        }
      });

    activeChannels.set(channelName, { refCount: 1, channel });

    return () => {
      const entry = activeChannels.get(channelName);
      if (entry) {
        entry.refCount--;
        if (entry.refCount <= 0) {
          supabase.removeChannel(entry.channel);
          activeChannels.delete(channelName);
        }
      }
    };
  }, [channelName, table, schema, event, filter, enabled]);
}

export default useSupabaseSubscription;
