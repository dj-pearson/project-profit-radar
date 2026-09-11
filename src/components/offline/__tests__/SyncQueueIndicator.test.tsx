import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const syncPendingData = vi.fn();
let hookState = {
  isOnline: true,
  pendingSync: [] as unknown[],
  syncInProgress: false,
  syncPendingData,
};

vi.mock('@/hooks/useOfflineSync', () => ({
  useOfflineSync: () => hookState,
}));
vi.mock('@/lib/realtime/connectionStore', () => ({ useRealtimeReconnecting: () => false }));

import { SyncQueueIndicator } from '../OfflineIndicator';

const queued = (over: Record<string, unknown> = {}) => ({
  id: 'offline_1',
  type: 'safety_incident',
  data: {},
  timestamp: new Date().toISOString(),
  synced: false,
  retryCount: 0,
  ...over,
});

beforeEach(() => {
  syncPendingData.mockReset();
  hookState = { isOnline: true, pendingSync: [], syncInProgress: false, syncPendingData };
});

describe('SyncQueueIndicator (US-412)', () => {
  it('shows nothing when the real queue is empty', () => {
    const { container } = render(<SyncQueueIndicator />);
    expect(container).toBeEmptyDOMElement();
  });

  it('surfaces a capture that is waiting to sync', () => {
    hookState.pendingSync = [queued()];
    render(<SyncQueueIndicator />);
    expect(
      screen.getByRole('button', { name: /1 pending offline action/i })
    ).toBeInTheDocument();
  });

  it('does not count items that already synced', () => {
    hookState.pendingSync = [queued({ synced: true })];
    const { container } = render(<SyncQueueIndicator />);
    expect(container).toBeEmptyDOMElement();
  });

  it('Sync Now replays the real queue rather than clearing it', async () => {
    const user = userEvent.setup();
    hookState.pendingSync = [queued()];
    render(<SyncQueueIndicator />);

    await user.click(screen.getByRole('button', { name: /1 pending offline action/i }));
    await user.click(screen.getByRole('button', { name: /sync all pending actions now/i }));

    expect(syncPendingData).toHaveBeenCalledTimes(1);
  });

  it('names the failure on an item that could not be sent', async () => {
    const user = userEvent.setup();
    hookState.pendingSync = [queued({ error: 'permission denied', retryCount: 2 })];
    render(<SyncQueueIndicator />);

    await user.click(screen.getByRole('button', { name: /1 pending offline action/i }));
    expect(screen.getByText(/permission denied \(attempt 2\)/i)).toBeInTheDocument();
  });

  it('offers no Sync Now while offline, because there is nowhere to send it', async () => {
    const user = userEvent.setup();
    hookState.isOnline = false;
    hookState.pendingSync = [queued()];
    render(<SyncQueueIndicator />);

    await user.click(screen.getByRole('button', { name: /1 pending offline action/i }));
    expect(screen.queryByRole('button', { name: /sync all pending actions now/i })).toBeNull();
  });
});
