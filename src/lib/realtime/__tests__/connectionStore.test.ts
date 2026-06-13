import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerRealtimeChannel,
  reportRealtimeChannelState,
  unregisterRealtimeChannel,
  getIsReconnecting,
  __resetRealtimeConnectionStore,
} from '../connectionStore';

describe('realtime connectionStore', () => {
  beforeEach(() => __resetRealtimeConnectionStore());

  it('initial connecting is not treated as reconnecting', () => {
    registerRealtimeChannel();
    expect(getIsReconnecting()).toBe(false);
  });

  it('flags reconnecting when a channel drops, clears when it recovers', () => {
    const id = registerRealtimeChannel();
    reportRealtimeChannelState(id, 'connected');
    expect(getIsReconnecting()).toBe(false);

    reportRealtimeChannelState(id, 'reconnecting');
    expect(getIsReconnecting()).toBe(true);

    reportRealtimeChannelState(id, 'connected');
    expect(getIsReconnecting()).toBe(false);
  });

  it('aggregates across channels (any reconnecting => true)', () => {
    const a = registerRealtimeChannel();
    const b = registerRealtimeChannel();
    reportRealtimeChannelState(a, 'connected');
    reportRealtimeChannelState(b, 'reconnecting');
    expect(getIsReconnecting()).toBe(true);

    reportRealtimeChannelState(b, 'connected');
    expect(getIsReconnecting()).toBe(false);
  });

  it('unregistering a reconnecting channel clears the flag', () => {
    const id = registerRealtimeChannel();
    reportRealtimeChannelState(id, 'reconnecting');
    expect(getIsReconnecting()).toBe(true);
    unregisterRealtimeChannel(id);
    expect(getIsReconnecting()).toBe(false);
  });
});
