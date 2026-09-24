/**
 * US-313: the Communication Hub's RFIs tab lists real rfis rows for the picked
 * project and raising one goes through the same mutation /rfis uses. The old
 * tab's Create RFI button had no onClick and did not even close the dialog.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const create = vi.fn();
const update = vi.fn();
const respond = vi.fn();

const rfis = [
  {
    id: 'r1', project_id: 'p1', rfi_number: 'RFI-1', subject: 'Beam size at grid C', title: 'Beam size at grid C',
    description: 'Drawings disagree', priority: 'high', status: 'submitted', submitted_to: 'Dana Ruiz', due_date: null,
    projects: { name: 'Riverside', client_name: '' }, requester: { first_name: 'Pat', last_name: 'Lee' }, responses: [],
  },
  {
    id: 'r2', project_id: 'p2', rfi_number: 'RFI-2', subject: 'Door hardware', title: 'Door hardware',
    description: '', priority: 'low', status: 'submitted', submitted_to: '', due_date: null,
    projects: { name: 'Hilltop', client_name: '' }, requester: { first_name: 'Pat', last_name: 'Lee' }, responses: [],
  },
];

vi.mock('@/hooks/useRFIsPage', () => ({
  useRFIsPage: () => ({
    companyId: 'c1',
    query: {
      data: { projects: [{ id: 'p1', name: 'Riverside' }, { id: 'p2', name: 'Hilltop' }], rfis },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    },
    create: { mutateAsync: create, isPending: false },
    update: { mutateAsync: update, isPending: false },
    respond: { mutateAsync: respond, isPending: false },
  }),
}));

vi.mock('@/hooks/useCompanyTeamMembers', () => ({
  useCompanyTeamMembers: () => ({ data: [{ id: 'u1', first_name: 'Dana', last_name: 'Ruiz' }] }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { HubRFIPanel } from '../HubRFIPanel';

const renderPanel = (projectId: string) =>
  render(
    <MemoryRouter>
      <HubRFIPanel projectId={projectId} />
    </MemoryRouter>,
  );

describe('HubRFIPanel (US-313)', () => {
  beforeEach(() => {
    create.mockReset().mockResolvedValue(undefined);
    update.mockReset().mockResolvedValue(undefined);
    respond.mockReset().mockResolvedValue(undefined);
  });

  it('shows only the selected project\'s RFIs', () => {
    renderPanel('p1');
    expect(screen.getByText('Beam size at grid C')).toBeTruthy();
    expect(screen.queryByText('Door hardware')).toBeNull();
  });

  it('shows every project when none is selected', () => {
    renderPanel('');
    expect(screen.getByText('Beam size at grid C')).toBeTruthy();
    expect(screen.getByText('Door hardware')).toBeTruthy();
  });

  it('raises an RFI through the shared create mutation and closes the dialog', async () => {
    renderPanel('p1');
    fireEvent.click(screen.getByRole('button', { name: /Raise RFI/ }));
    fireEvent.change(await screen.findByLabelText('Subject'), { target: { value: 'Slab thickness' } });
    fireEvent.change(screen.getByLabelText('Question'), { target: { value: 'Plan says 6in, section says 8in' } });
    fireEvent.change(screen.getByLabelText('Or an outside party'), { target: { value: 'Acme Architects' } });
    fireEvent.submit(screen.getByRole('form', { name: 'RFI form' }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0][0]).toMatchObject({
      project_id: 'p1',
      title: 'Slab thickness',
      assigned_to: 'Acme Architects',
    });
    await waitFor(() => expect(screen.queryByRole('form', { name: 'RFI form' })).toBeNull());
  });

  it('refuses an empty RFI instead of saving it', async () => {
    renderPanel('p1');
    fireEvent.click(screen.getByRole('button', { name: /Raise RFI/ }));
    fireEvent.submit(await screen.findByRole('form', { name: 'RFI form' }));
    expect(await screen.findByText('Subject is required')).toBeTruthy();
    expect(create).not.toHaveBeenCalled();
  });

  it('closes an RFI with only its status changed', async () => {
    renderPanel('p1');
    fireEvent.click(screen.getByRole('button', { name: /^Close$/ }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0][0]).toMatchObject({ id: 'r1', draft: { status: 'closed', title: 'Beam size at grid C' } });
  });

  it('answers an RFI through the shared respond mutation', async () => {
    renderPanel('p1');
    fireEvent.click(screen.getByRole('button', { name: /Answer/ }));
    fireEvent.change(await screen.findByLabelText('Answer'), { target: { value: 'Use W12x26' } });
    fireEvent.submit(screen.getByRole('form', { name: 'RFI answer form' }));
    await waitFor(() => expect(respond).toHaveBeenCalledWith({ rfiId: 'r1', text: 'Use W12x26', isFinal: false }));
  });
});
