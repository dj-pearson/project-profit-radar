import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createReconnectingChannel } from '../reconnectingChannel';

interface FakeChannel {
  id: number;
  subscribe: (cb: (status: string) => void) => FakeChannel;
  emit: (status: string) => void;
}

function makeFactory() {
  const channels: FakeChannel[] = [];
  const createChannel = () => {
    let cb: (status: string) => void = () => {};
    const ch: FakeChannel = {
      id: channels.length,
      subscribe(c) {
        cb = c;
        return ch;
      },
      emit(status) {
        cb(status);
      },
    };
    channels.push(ch);
    return ch;
  };
  return { createChannel, channels };
}

describe('createReconnectingChannel', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('connects, and does NOT call onReconnect on the first SUBSCRIBED', () => {
    const { createChannel, channels } = makeFactory();
    const onReconnect = vi.fn();
    const onStateChange = vi.fn();
    const handle = createReconnectingChannel<FakeChannel>({
      createChannel,
      removeChannel: vi.fn(),
      onReconnect,
      onStateChange,
      randomFn: () => 0,
    });

    expect(handle.getState()).toBe('connecting');
    channels[0].emit('SUBSCRIBED');
    expect(handle.getState()).toBe('connected');
    expect(onReconnect).not.toHaveBeenCalled();
  });

  it('recovers from a dropped channel: backoff -> resubscribe -> onReconnect (refetch)', () => {
    const { createChannel, channels } = makeFactory();
    const removeChannel = vi.fn();
    const onReconnect = vi.fn();
    const handle = createReconnectingChannel<FakeChannel>({
      createChannel,
      removeChannel,
      onReconnect,
      reconnect: { baseDelayMs: 1000, jitterRatio: 0 },
      randomFn: () => 0,
    });

    channels[0].emit('SUBSCRIBED'); // connected
    channels[0].emit('CLOSED'); // dropped

    expect(handle.getState()).toBe('reconnecting');
    expect(removeChannel).toHaveBeenCalledWith(channels[0]);
    expect(channels).toHaveLength(1); // not retried yet (waiting on backoff)

    vi.advanceTimersByTime(1000); // first backoff = base * 2^0
    expect(channels).toHaveLength(2); // new channel created

    channels[1].emit('SUBSCRIBED'); // back online
    expect(handle.getState()).toBe('connected');
    expect(onReconnect).toHaveBeenCalledTimes(1); // refetch missed state
  });

  it('uses exponential backoff across repeated failures', () => {
    const { createChannel, channels } = makeFactory();
    const handle = createReconnectingChannel<FakeChannel>({
      createChannel,
      removeChannel: vi.fn(),
      reconnect: { baseDelayMs: 1000, maxDelayMs: 60000, jitterRatio: 0 },
      randomFn: () => 0,
    });

    channels[0].emit('CHANNEL_ERROR'); // attempt 0 -> delay 1000
    vi.advanceTimersByTime(999);
    expect(channels).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(channels).toHaveLength(2); // reconnected after 1000ms

    channels[1].emit('CHANNEL_ERROR'); // attempt 1 -> delay 2000
    vi.advanceTimersByTime(1999);
    expect(channels).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(channels).toHaveLength(3); // reconnected after 2000ms

    channels[2].emit('TIMED_OUT'); // attempt 2 -> delay 4000
    vi.advanceTimersByTime(4000);
    expect(channels).toHaveLength(4);
    expect(handle.getState()).toBe('connecting');
  });

  it('teardown cancels a pending reconnect and removes the channel', () => {
    const { createChannel, channels } = makeFactory();
    const removeChannel = vi.fn();
    const handle = createReconnectingChannel<FakeChannel>({
      createChannel,
      removeChannel,
      reconnect: { baseDelayMs: 1000, jitterRatio: 0 },
      randomFn: () => 0,
    });

    channels[0].emit('CLOSED'); // schedule a reconnect
    handle.teardown();
    expect(handle.getState()).toBe('closed');

    vi.advanceTimersByTime(10000); // pending timer must NOT fire
    expect(channels).toHaveLength(1); // no new channel created after teardown
  });

  it('gives up after maxAttempts and goes to closed', () => {
    const { createChannel, channels } = makeFactory();
    const handle = createReconnectingChannel<FakeChannel>({
      createChannel,
      removeChannel: vi.fn(),
      reconnect: { baseDelayMs: 1000, jitterRatio: 0, maxAttempts: 1 },
      randomFn: () => 0,
    });

    channels[0].emit('CLOSED'); // attempt 0 -> schedule (attempt becomes 1)
    vi.advanceTimersByTime(1000);
    expect(channels).toHaveLength(2);
    channels[1].emit('CLOSED'); // attempt 1 >= maxAttempts -> closed
    expect(handle.getState()).toBe('closed');
  });
});
