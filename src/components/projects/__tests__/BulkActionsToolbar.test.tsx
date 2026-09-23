/**
 * US-368: bulk archive wrote projects.archived_at and status 'archived', which
 * neither the table nor projects_status_check allows, so it was removed. Bulk
 * status change goes through set_project_status() and a rejected project is
 * reported, not counted as updated.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

const rpc = vi.fn();
const from = vi.fn();
const toast = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    from: (...args: unknown[]) => from(...args),
  },
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/hooks/useAuditLog', () => ({
  useAuditLog: () => ({ logAuditEvent: vi.fn(), logDataAccess: vi.fn() }),
}));
vi.mock('@/components/ui/bulk-operation-progress', () => ({
  BulkOperationProgress: () => null,
}));
// Radix Select does not open in jsdom; a native select exercises the same value.
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: ReactNode }) => (
    <select aria-label="status" value={value} onChange={(e) => onValueChange(e.target.value)}>
      <option value="" />
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
}));

import { BulkActionsToolbar } from '../BulkActionsToolbar';

function renderToolbar() {
  return render(
    <BulkActionsToolbar
      selectedCount={2}
      totalCount={5}
      onSelectAll={vi.fn()}
      onClearSelection={vi.fn()}
      selectedProjectIds={['p1', 'p2']}
      onActionComplete={vi.fn()}
      allSelected={false}
    />
  );
}

describe('BulkActionsToolbar (US-368)', () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
    toast.mockReset();
  });

  it('offers no Archive action', () => {
    renderToolbar();
    expect(screen.queryByRole('button', { name: /archive/i })).toBeNull();
  });

  it('only offers statuses projects_status_check accepts', () => {
    renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: /change status/i }));
    const values = Array.from(screen.getByLabelText('status').querySelectorAll('option'))
      .map((o) => o.getAttribute('value'))
      .filter(Boolean);
    expect(values).toEqual(['planning', 'active', 'on_hold', 'completed', 'closed', 'cancelled']);
  });

  it('moves each project through set_project_status and never updates projects directly', async () => {
    rpc.mockResolvedValue({ data: 'on_hold', error: null });
    renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: /change status/i }));
    fireEvent.change(screen.getByLabelText('status'), { target: { value: 'on_hold' } });
    fireEvent.click(screen.getByRole('button', { name: /update status/i }));

    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(2));
    expect(rpc).toHaveBeenCalledWith('set_project_status', {
      p_project_id: 'p1',
      p_status: 'on_hold',
      p_override_reason: null,
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('reports projects the database refused', async () => {
    rpc
      .mockResolvedValueOnce({ data: 'completed', error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'Cannot complete: 2 punch list item(s) are still open' } });
    renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: /change status/i }));
    fireEvent.change(screen.getByLabelText('status'), { target: { value: 'completed' } });
    fireEvent.click(screen.getByRole('button', { name: /update status/i }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive', title: 'Status Not Changed' }))
    );
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Status Updated', description: '1 of 2 projects updated' }));
  });
});
