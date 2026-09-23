/**
 * US-405: /subcontractors renders what the database holds and nothing else,
 * and its controls write through the hook rather than into page state.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { Subcontractor } from '@/lib/subcontractors';

vi.mock('@/components/layout/DashboardLayout', () => ({
  // The page's header buttons ride in on headerActions (US-377), so the stub
  // renders them the way the real layout's PageHeader does.
  DashboardLayout: ({
    children,
    headerActions,
  }: {
    children: React.ReactNode;
    headerActions?: React.ReactNode;
  }) => (
    <div>
      {headerActions}
      {children}
    </div>
  ),
}));
vi.mock('@/components/accessibility/AccessiblePageWrapper', () => ({
  AccessiblePageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: { success: (...a: unknown[]) => toastSuccess(...a), error: (...a: unknown[]) => toastError(...a) } }));

const mutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false });
let hookState: Record<string, unknown>;

vi.mock('@/hooks/useSubcontractors', async (importActual) => ({
  ...(await importActual<typeof import('@/hooks/useSubcontractors')>()),
  useSubcontractors: () => hookState,
}));

import Subcontractors from '../Subcontractors';

const REYES: Subcontractor = {
  id: 's1', name: 'Reyes Electric', trade: 'Electrical', contactName: 'Ana Reyes',
  phone: '503-555-0100', email: 'office@reyes.test', licenseNumber: 'EL-1', rating: 2, notes: '',
  prequalification: { business_license: true }, insuranceCertificates: [], createdAt: '2026-09-01',
};

function state(overrides: Record<string, unknown> = {}) {
  return {
    subcontractors: [REYES],
    available: true,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    hasCompany: true,
    canManage: true,
    create: mutation(),
    update: mutation(),
    remove: mutation(),
    addCertificate: mutation(),
    removeCertificate: mutation(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  hookState = state();
});

describe('Subcontractors page', () => {
  it('says the list is unavailable when the tables are missing, and offers no form', () => {
    hookState = state({ subcontractors: [], available: false });
    render(<Subcontractors />);
    expect(screen.getByText(/not available on this server yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add a new subcontractor/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/no subcontractors yet/i)).not.toBeInTheDocument();
  });

  it('shows no invented vendors when the company has none', () => {
    hookState = state({ subcontractors: [] });
    render(<Subcontractors />);
    expect(screen.getByText(/no subcontractors yet/i)).toBeInTheDocument();
    for (const fake of ['Apex Electrical', 'Precision Concrete', 'TopCoat Painting', 'Mike Johnson']) {
      expect(screen.queryByText(new RegExp(fake, 'i'))).not.toBeInTheDocument();
    }
  });

  it('shows a load failure as an error with a retry, not as an empty list', async () => {
    const refetch = vi.fn();
    hookState = state({ subcontractors: [], error: new Error('permission denied'), refetch });
    render(<Subcontractors />);
    expect(screen.getByText(/could not load your subcontractors/i)).toBeInTheDocument();
    expect(screen.queryByText(/no subcontractors yet/i)).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: /try again/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it('writes a rating change through the hook', async () => {
    render(<Subcontractors />);
    const card = screen.getByRole('listitem', { name: /reyes electric/i });
    await userEvent.setup().click(within(card).getByRole('button', { name: '4 stars' }));
    const update = hookState.update as ReturnType<typeof mutation>;
    expect(update.mutate).toHaveBeenCalledWith({ id: 's1', patch: { kind: 'rating', rating: 4 } }, expect.anything());
  });

  it('writes a checklist tick through the hook, keeping the ones already ticked', async () => {
    render(<Subcontractors />);
    await userEvent.setup().click(screen.getByRole('checkbox', { name: /references checked/i }));
    const update = hookState.update as ReturnType<typeof mutation>;
    expect(update.mutate).toHaveBeenCalledWith(
      { id: 's1', patch: { kind: 'prequalification', prequalification: { business_license: true, references: true } } },
      expect.anything(),
    );
  });

  it('blocks the add until the form is valid', async () => {
    const user = userEvent.setup();
    render(<Subcontractors />);
    await user.click(screen.getByRole('button', { name: /add a new subcontractor/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/company name/i), 'Summit Roofing');
    await user.click(within(dialog).getByRole('button', { name: /add subcontractor/i }));
    expect(await within(dialog).findByText(/trade type is required/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/invalid email address|email is required/i)).toBeInTheDocument();
    const create = hookState.create as ReturnType<typeof mutation>;
    expect(create.mutateAsync).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('adds a subcontractor through the hook and only then says it was added', async () => {
    const user = userEvent.setup();
    render(<Subcontractors />);
    await user.click(screen.getByRole('button', { name: /add a new subcontractor/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/company name/i), 'Summit Roofing');
    await user.type(within(dialog).getByLabelText(/contact name/i), 'Lee Park');
    await user.type(within(dialog).getByLabelText(/^phone/i), '503-555-0199');
    await user.type(within(dialog).getByLabelText(/^email/i), 'lee@summit.test');
    // Radix Select mirrors itself into a hidden native <select> inside a form;
    // jsdom cannot open the popover, so set the value there.
    const native = dialog.querySelector('select') as HTMLSelectElement;
    fireEvent.change(native, { target: { value: 'Roofing' } });
    await user.click(within(dialog).getByRole('button', { name: /add subcontractor/i }));
    const create = hookState.create as ReturnType<typeof mutation>;
    await waitFor(() => expect(create.mutateAsync).toHaveBeenCalledWith({
      name: 'Summit Roofing', trade: 'Roofing', contactName: 'Lee Park', phone: '503-555-0199',
      email: 'lee@summit.test', licenseNumber: '', notes: '',
    }));
    expect(toastSuccess).toHaveBeenCalledWith('Summit Roofing added to your subcontractors');
  });

  it('keeps the form open and says why when the insert fails', async () => {
    const create = mutation();
    create.mutateAsync.mockRejectedValue(new Error('new row violates row-level security policy'));
    hookState = state({ create });
    const user = userEvent.setup();
    render(<Subcontractors />);
    await user.click(screen.getByRole('button', { name: /add a new subcontractor/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/company name/i), 'Summit Roofing');
    await user.type(within(dialog).getByLabelText(/contact name/i), 'Lee Park');
    await user.type(within(dialog).getByLabelText(/^phone/i), '503-555-0199');
    await user.type(within(dialog).getByLabelText(/^email/i), 'lee@summit.test');
    fireEvent.change(dialog.querySelector('select') as HTMLSelectElement, { target: { value: 'Roofing' } });
    await user.click(within(dialog).getByRole('button', { name: /add subcontractor/i }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Could not add subcontractor', {
      description: 'new row violates row-level security policy',
    }));
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('asks before deleting, then deletes through the hook', async () => {
    const user = userEvent.setup();
    render(<Subcontractors />);
    await user.click(screen.getByRole('button', { name: /delete reyes electric/i }));
    const confirm = await screen.findByRole('alertdialog');
    await user.click(within(confirm).getByRole('button', { name: /^delete$/i }));
    const remove = hookState.remove as ReturnType<typeof mutation>;
    await waitFor(() => expect(remove.mutateAsync).toHaveBeenCalledWith(REYES));
    expect(toastSuccess).toHaveBeenCalledWith('Reyes Electric deleted');
  });

  it('gives a read-only role no write controls', () => {
    hookState = state({ canManage: false });
    render(<Subcontractors />);
    expect(screen.queryByRole('button', { name: /add a new subcontractor/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /upload insurance certificate/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete reyes electric/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '4 stars' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /references checked/i })).toBeDisabled();
  });
});
