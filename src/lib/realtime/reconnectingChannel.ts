/**
 * Centralized realtime reconnection with exponential backoff + jitter (US-210).
 *
 * Supabase realtime channels are created once and, if the connection drops
 * (server restart, network blip), silently freeze — live features show stale
 * data with no recovery. This wraps channel creation/subscription so that on a
 * CLOSED / CHANNEL_ERROR / TIMED_OUT status the channel is torn down and
 * re-subscribed with capped exponential backoff + jitter, and a connection
 * state is reported so the UI can show a "reconnecting" hint and refetch missed
 * rows once back online.
 *
 * It is transport-agnostic and fully injectable (createChannel / removeChannel /
 * timers) so it can be unit-tested without a live Supabase connection.
 */

export type RealtimeConnState = 'connecting' | 'connected' | 'reconnecting' | 'closed';

// The subset of statuses Supabase's channel.subscribe() callback emits.
export type ChannelStatus = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED' | string;

export interface ReconnectOptions {
  baseDelayMs?: number; // first retry delay (default 1000)
  maxDelayMs?: number; // cap (default 30000)
  maxAttempts?: number; // give up after this many consecutive failures (default Infinity)
  jitterRatio?: number; // 0..1 fraction of the delay added as random jitter (default 0.3)
}

// Minimal shape of a Supabase RealtimeChannel we rely on.
export interface SubscribableChannel {
  subscribe(cb: (status: ChannelStatus, err?: unknown) => void): unknown;
}

export interface ReconnectingChannelDeps<C extends SubscribableChannel> {
  /** Build a fresh, fully-configured (.on(...)) but NOT-yet-subscribed channel. */
  createChannel: () => C;
  /** Tear down a channel (supabase.removeChannel). */
  removeChannel: (channel: C) => void;
  /** Reports lifecycle state transitions (connecting/connected/reconnecting/closed). */
  onStateChange?: (state: RealtimeConnState) => void;
  /** Called after a SUCCESSFUL re-subscribe that followed a drop — refetch here. */
  onReconnect?: () => void;
  reconnect?: ReconnectOptions;
  // Injectable timers for tests.
  setTimeoutFn?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimeoutFn?: (handle: ReturnType<typeof setTimeout>) => void;
  randomFn?: () => number;
}

export interface ReconnectingChannelHandle {
  /** Permanently stop the channel and cancel any pending reconnect. */
  teardown(): void;
  /** Current connection state (for tests/introspection). */
  getState(): RealtimeConnState;
}

export function createReconnectingChannel<C extends SubscribableChannel>(
  deps: ReconnectingChannelDeps<C>,
): ReconnectingChannelHandle {
  const {
    createChannel,
    removeChannel,
    onStateChange,
    onReconnect,
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
    randomFn = Math.random,
  } = deps;

  const baseDelayMs = deps.reconnect?.baseDelayMs ?? 1000;
  const maxDelayMs = deps.reconnect?.maxDelayMs ?? 30000;
  const maxAttempts = deps.reconnect?.maxAttempts ?? Infinity;
  const jitterRatio = deps.reconnect?.jitterRatio ?? 0.3;

  let current: C | null = null;
  let attempt = 0; // consecutive failed attempts since last success
  let hasConnected = false; // have we ever been SUBSCRIBED?
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let state: RealtimeConnState = 'connecting';

  const setState = (s: RealtimeConnState) => {
    if (state === s) return;
    state = s;
    onStateChange?.(s);
  };

  const backoffDelay = (): number => {
    const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
    return Math.round(exp + exp * jitterRatio * randomFn());
  };

  const connect = () => {
    if (stopped) return;
    setState(hasConnected ? 'reconnecting' : 'connecting');
    current = createChannel();
    current.subscribe((status) => {
      if (stopped) return;
      if (status === 'SUBSCRIBED') {
        const recovered = hasConnected; // a re-subscribe after a prior connection
        hasConnected = true;
        attempt = 0;
        setState('connected');
        if (recovered) onReconnect?.();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        scheduleReconnect();
      }
    });
  };

  const scheduleReconnect = () => {
    if (stopped) return;
    if (timer !== null) return; // a reconnect is already queued
    // Drop the dead channel before retrying.
    if (current) {
      try {
        removeChannel(current);
      } catch {
        /* ignore */
      }
      current = null;
    }
    if (attempt >= maxAttempts) {
      setState('closed');
      return;
    }
    setState('reconnecting');
    const delay = backoffDelay();
    attempt += 1;
    timer = setTimeoutFn(() => {
      timer = null;
      connect();
    }, delay);
  };

  connect();

  return {
    teardown() {
      stopped = true;
      if (timer !== null) {
        clearTimeoutFn(timer);
        timer = null;
      }
      if (current) {
        try {
          removeChannel(current);
        } catch {
          /* ignore */
        }
        current = null;
      }
      setState('closed');
    },
    getState() {
      return state;
    },
  };
}
