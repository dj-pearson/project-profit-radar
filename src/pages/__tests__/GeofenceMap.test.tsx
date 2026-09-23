/**
 * US-367: the geofence map reads crew locations from time_entries using the
 * columns that table actually has, and shows an error state (not a blank map)
 * when a query fails.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

type Result = { data: unknown; error: { message: string } | null };
type Call = { table: string; method: string; args: unknown[] };

const calls: Call[] = [];
let results: Record<string, Result> = {};

// Chainable PostgREST stand-in: records every call and resolves with the
// result configured for the table when awaited.
function builder(table: string) {
  const b: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'in', 'gte', 'insert', 'update']) {
    b[method] = (...args: unknown[]) => {
      calls.push({ table, method, args });
      return b;
    };
  }
  b.then = (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(results[table] ?? { data: [], error: null }).then(resolve, reject);
  return b;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      calls.push({ table, method: 'from', args: [table] });
      return builder(table);
    },
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ userProfile: { id: 'u1', company_id: 'c1' } }),
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/accessibility/AccessiblePageWrapper', () => ({
  AccessiblePageWrapper: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

// Leaflet needs real layout; the page only needs the calls to not throw.
vi.mock('leaflet/dist/leaflet.css', () => ({}));
vi.mock('leaflet', () => {
  const layer = () => {
    const l: Record<string, unknown> = {};
    for (const m of ['addTo', 'bindTooltip', 'on', 'clearLayers', 'setView', 'fitBounds', 'remove', 'pad']) {
      l[m] = () => l;
    }
    return l;
  };
  const L = {
    map: layer,
    tileLayer: layer,
    layerGroup: layer,
    circle: layer,
    circleMarker: layer,
    latLngBounds: layer,
    control: { layers: layer },
  };
  return { default: L, ...L };
});

import GeofenceMap from '../GeofenceMap';

const timeEntryCalls = () => calls.filter((c) => c.table === 'time_entries');

describe('GeofenceMap (US-367)', () => {
  beforeEach(() => {
    calls.length = 0;
    results = {
      geofences: { data: [], error: null },
      user_profiles: { data: [{ id: 'u1', first_name: 'Jane', last_name: 'Doe' }], error: null },
      time_entries: { data: [], error: null },
    };
  });

  it('queries time_entries for the GPS columns it has, filtered by start_time', async () => {
    render(<GeofenceMap />);

    await waitFor(() => expect(timeEntryCalls().some((c) => c.method === 'gte')).toBe(true));

    const select = timeEntryCalls().find((c) => c.method === 'select');
    const columns = String(select?.args[0]).split(',').map((s) => s.trim());
    expect(columns).toEqual(['user_id', 'gps_latitude', 'gps_longitude', 'start_time', 'end_time']);
    expect(columns.some((c) => c.startsWith('clock_'))).toBe(false);

    expect(timeEntryCalls().find((c) => c.method === 'in')?.args).toEqual(['user_id', ['u1']]);
    expect(timeEntryCalls().find((c) => c.method === 'gte')?.args[0]).toBe('start_time');
    expect(calls.some((c) => c.table === 'gps_time_entries')).toBe(false);
    expect(screen.queryByText(/could not load geofences/i)).not.toBeInTheDocument();
  });

  it('shows an error state over the map when the time_entries query fails', async () => {
    results.time_entries = { data: null, error: { message: 'column does not exist' } };
    render(<GeofenceMap />);

    expect(await screen.findByText('Could not load geofences and crew locations.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows the error state when the geofences query fails', async () => {
    results.geofences = { data: null, error: { message: 'permission denied' } };
    render(<GeofenceMap />);

    expect(await screen.findByText('Could not load geofences and crew locations.')).toBeInTheDocument();
    expect(timeEntryCalls()).toHaveLength(0);
  });
});
