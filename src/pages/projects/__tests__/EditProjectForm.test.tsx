import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditProjectForm } from '../EditProjectForm';

const project = {
  id: 'p1',
  name: 'Smith Kitchen',
  client_name: 'Jo Smith',
  site_address: '12 Elm St',
  status: 'active',
  completion_percentage: 40,
  budget: 125000.5,
  start_date: '2026-03-01',
  end_date: '2026-06-30',
  description: 'Gut and refit',
};

const submitForm = () => fireEvent.submit(screen.getByRole('form', { name: 'Edit project form' }));

describe('EditProjectForm (US-268)', () => {
  it('sends the same update the FormData version built', async () => {
    const onSubmit = vi.fn();
    render(<EditProjectForm project={project} onSubmit={onSubmit} />);

    submitForm();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    // Old handler: FormData strings, parseInt for completion, parseFloat for budget.
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Smith Kitchen',
      client_name: 'Jo Smith',
      site_address: '12 Elm St',
      status: 'active',
      completion_percentage: 40,
      budget: 125000.5,
      start_date: '2026-03-01',
      end_date: '2026-06-30',
      description: 'Gut and refit',
    });
  });

  it('sends null-column fields the way FormData did (empty string / NaN)', async () => {
    const onSubmit = vi.fn();
    render(
      <EditProjectForm
        project={{ ...project, site_address: null, completion_percentage: null, budget: null, description: null }}
        onSubmit={onSubmit}
      />,
    );

    submitForm();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const sent = onSubmit.mock.calls[0][0];
    expect(sent.site_address).toBe('');
    expect(sent.description).toBe('');
    expect(Number.isNaN(sent.completion_percentage)).toBe(true);
    expect(Number.isNaN(sent.budget)).toBe(true);
  });

  it('blocks a blank name and shows the error inline', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<EditProjectForm project={project} onSubmit={onSubmit} />);

    const name = screen.getByLabelText('Project Name');
    await user.clear(name);
    submitForm();

    const message = await screen.findByText('Project name is required');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name.getAttribute('aria-describedby')).toContain(message.id);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks an end date before the start and an out-of-range completion', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<EditProjectForm project={project} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2026-02-01' } });
    const completion = screen.getByLabelText('Completion %');
    await user.clear(completion);
    await user.type(completion, '150');
    submitForm();

    expect(await screen.findByText('End date must be on or after the start date')).toBeInTheDocument();
    expect(screen.getByText('Enter a whole number from 0 to 100')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
