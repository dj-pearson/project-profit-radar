/**
 * US-368: scheduling a demo wrote demo_requests.scheduled_date, scheduled_time
 * and notes. The table has one scheduled_at timestamptz and no notes column.
 * A failed load also rendered as an empty calendar.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { format } from 'date-fns';

type Result = { data: unknown; error: { message: string } | null };
type Call = { table: string; method: string; args: unknown[] };

const calls: Call[] = [];
let results: Record<string, Result> = {};
const toast = vi.fn();

function builder(table: string) {
  const b: Record<string, unknown> = {};
  const used: string[] = [];
  for (const method of ['select', 'or', 'eq', 'order', 'update']) {
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

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => builder(table) },
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

import { DemoCalendar } from '../DemoCalendar';

const today = format(new Date(), 'yyyy-MM-dd');

describe('DemoCalendar (US-368)', () => {
  beforeEach(() => {
    calls.length = 0;
    toast.mockReset();
    results = {};
  });

  it('filters on scheduled_at, not scheduled_date', async () => {
    render(<DemoCalendar />);
    await waitFor(() => expect(calls.some((c) => c.method === 'or')).toBe(true));
    const filter = calls.find((c) => c.method === 'or')!.args[0] as string;
    expect(filter).toContain('scheduled_at.gte.');
    expect(filter).not.toContain('scheduled_date');
  });

  it('shows the error instead of an empty calendar when the load fails', async () => {
    results['demo_requests.select'] = { data: null, error: { message: 'permission denied for table demo_requests' } };
    render(<DemoCalendar />);
    expect(await screen.findByText('permission denied for table demo_requests')).toBeTruthy();
  });

  it('schedules by writing scheduled_at and status only', async () => {
    results['demo_requests.select'] = {
      data: [{
        id: 'd1', lead_id: 'l1', email: 'a@b.co', first_name: 'Ana', company_name: 'Acme Build',
        demo_type: 'standard', preferred_date: today, preferred_time: 'morning', status: 'requested',
        message: 'We run 12 crews', created_at: today,
      }],
      error: null,
    };
    results['demo_requests.update'] = { data: null, error: null };

    render(<DemoCalendar />);
    fireEvent.click((await screen.findByText(/Acme Build/)).closest('button')!);

    expect(await screen.findByText('We run 12 crews')).toBeTruthy();
    expect(screen.queryByLabelText(/notes/i)).toBeNull();

    fireEvent.change(screen.getByLabelText('Scheduled Date'), { target: { value: '2026-10-05' } });
    fireEvent.change(screen.getByLabelText('Scheduled Time'), { target: { value: '14:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Schedule Demo' }));

    await waitFor(() => expect(calls.some((c) => c.method === 'update')).toBe(true));
    const payload = calls.find((c) => c.method === 'update')!.args[0] as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(['scheduled_at', 'status']);
    expect(payload.scheduled_at).toBe(new Date('2026-10-05T14:30').toISOString());
    expect(payload.status).toBe('scheduled');
  });

  it('reports a failed schedule write', async () => {
    results['demo_requests.select'] = {
      data: [{
        id: 'd1', lead_id: 'l1', email: 'a@b.co', company_name: 'Acme Build', demo_type: 'standard',
        preferred_date: today, status: 'requested', created_at: today,
      }],
      error: null,
    };
    results['demo_requests.update'] = { data: null, error: { message: 'boom' } };

    render(<DemoCalendar />);
    fireEvent.click((await screen.findByText(/Acme Build/)).closest('button')!);
    fireEvent.change(await screen.findByLabelText('Scheduled Date'), { target: { value: '2026-10-05' } });
    fireEvent.change(screen.getByLabelText('Scheduled Time'), { target: { value: '14:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Schedule Demo' }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }))
    );
    expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Success' }));
  });
});
