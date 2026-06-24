/**
 * App-wide realtime connection state (US-210).
 *
 * Each reconnecting channel registers here and reports its lifecycle state. The
 * store aggregates them into a single `isReconnecting` flag (true when any
 * channel has dropped and is retrying) that the offline/sync indicator surfaces
 * so users know live data is temporarily stale. Initial connection is NOT
 * treated as a problem — only a reconnect after a prior drop sets the flag.
 */
import { useSyncExternalStore } from 'react';
import type { RealtimeConnState } from './reconnectingChannel';

const channelStates = new Map<number, RealtimeConnState>();
const listeners = new Set<() => void>();
let nextId = 1;
let isReconnecting = false;

function recompute(): void {
  const reconnecting = [...channelStates.values()].some((s) => s === 'reconnecting');
  if (reconnecting !== isReconnecting) {
    isReconnecting = reconnecting;
    listeners.forEach((l) => l());
  }
}

export function registerRealtimeChannel(): number {
  const id = nextId++;
  channelStates.set(id, 'connecting');
  recompute();
  return id;
}

export function reportRealtimeChannelState(id: number, state: RealtimeConnState): void {
  if (!channelStates.has(id)) return;
  channelStates.set(id, state);
  recompute();
}

export function unregisterRealtimeChannel(id: number): void {
  channelStates.delete(id);
  recompute();
}

export function getIsReconnecting(): boolean {
  return isReconnecting;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** React hook: true when any realtime channel has dropped and is retrying. */
export function useRealtimeReconnecting(): boolean {
  return useSyncExternalStore(subscribe, getIsReconnecting, getIsReconnecting);
}

// Test-only reset.
export function __resetRealtimeConnectionStore(): void {
  channelStates.clear();
  isReconnecting = false;
  nextId = 1;
}
