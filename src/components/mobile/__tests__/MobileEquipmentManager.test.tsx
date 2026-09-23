/**
 * US-368: an equipment check-out updated current_condition, assigned_to,
 * checked_out_by, checked_out_at, due_back_at, current_location and notes.
 * equipment has none of them, so every transaction 400'd. It also queued the
 * transaction as an offline 'safety_incident'.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

type Result = { data: unknown; error: { message: string } | null };
type Call = { table: string; method: string; args: unknown[] };

const calls: Call[] = [];
let results: Record<string, Result> = {};
const toast = vi.fn();
const saveOfflineData = vi.fn();
const offline = vi.hoisted(() => ({ isOnline: true }));

function builder(table: string) {
  const b: Record<string, unknown> = {};
  const used: string[] = [];
  for (const method of ['select', 'eq', 'order', 'update']) {
    b[method] = (...args: unknown[]) => {
      used.push(method);
      calls.push({ table, method, args });
      return b;
    };
  }
  b.then = (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) => {
    const kind = used.includes('update') ? 'update' : 'select';
    return Promise.resolve(results[`${table}.${kind}`] ?? { data: [], error: null }).then(resolve, reject);
  };
  return b;
}

const auth = vi.hoisted(() => ({
  user: { id: 'u1' },
  userProfile: { id: 'u1', company_id: 'c1' },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => builder(table) },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/hooks/useOfflineSync', () => ({
  useOfflineSync: () => ({ isOnline: offline.isOnline, saveOfflineData }),
}));
vi.mock('@/hooks/useGeolocation', () => ({
  useGeolocation: () => ({ position: null, getCurrentPosition: vi.fn() }),
}));
vi.mock('@/components/equipment/EquipmentQRScanner', () => ({ default: () => null }));

import MobileEquipmentManager from '../MobileEquipmentManager';

const excavator = {
  id: 'e1', name: 'Excavator 320', equipment_type: 'excavator', model: 'CAT 320',
  serial_number: 'SN-1', status: 'available', location: 'Yard',
};

async function checkOut() {
  render(<MobileEquipmentManager />);
  fireEvent.click(await screen.findByText('Excavator 320'));
  fireEvent.change(screen.getByPlaceholderText('Current location or destination'), {
    target: { value: 'Lot 14' },
  });
  fireEvent.click(screen.getByRole('button', { name: /check out/i }));
}

describe('MobileEquipmentManager (US-368)', () => {
  beforeEach(() => {
    calls.length = 0;
    toast.mockReset();
    saveOfflineData.mockReset();
    offline.isOnline = true;
    results = { 'equipment.select': { data: [excavator], error: null } };
  });

  it('selects only columns equipment has', async () => {
    render(<MobileEquipmentManager />);
    await screen.findByText('Excavator 320');
    const select = calls.find((c) => c.table === 'equipment' && c.method === 'select')!.args[0] as string;
    expect(select).not.toMatch(/current_condition|current_location|assigned_to|checked_out|due_back|notes|make/);
    expect(select).toContain('location');
  });

  it('writes status and location only, and queues nothing offline', async () => {
    results['equipment.update'] = { data: null, error: null };
    await checkOut();

    await waitFor(() => expect(calls.some((c) => c.method === 'update')).toBe(true));
    const payload = calls.find((c) => c.method === 'update')!.args[0] as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(['location', 'status', 'updated_at']);
    expect(payload).toMatchObject({ status: 'checked_out', location: 'Lot 14' });
    expect(saveOfflineData).not.toHaveBeenCalled();
  });

  it('reports the database error instead of success', async () => {
    results['equipment.update'] = { data: null, error: { message: 'new row violates row-level security policy' } };
    await checkOut();

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({
        variant: 'destructive',
        description: 'new row violates row-level security policy',
      }))
    );
    expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Transaction Complete' }));
  });

  it('refuses offline rather than filing a safety incident', async () => {
    offline.isOnline = false;
    await checkOut();

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive', title: "You're offline" }))
    );
    expect(saveOfflineData).not.toHaveBeenCalled();
    expect(calls.some((c) => c.method === 'update')).toBe(false);
  });

  it('shows an error state when the equipment list fails to load', async () => {
    results['equipment.select'] = { data: null, error: { message: 'permission denied for table equipment' } };
    render(<MobileEquipmentManager />);
    expect(await screen.findByText('permission denied for table equipment')).toBeTruthy();
    expect(screen.queryByText('No Equipment Found')).toBeNull();
  });
});
