import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

const invoke = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

// Header and Footer drag in auth, tenancy and SEO. None of that is what this
// page is for, and a public form has to render for a signed-out visitor.
vi.mock('@/components/Header', () => ({ default: () => <header /> }));
vi.mock('@/components/Footer', () => ({ default: () => <footer /> }));
vi.mock('@/components/seo/PageSEO', () => ({ PageSEO: () => null }));

const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: { error: (...a: unknown[]) => toastError(...a) } }));

import DemoRequest from '../DemoRequest';

const renderPage = () =>
  render(
    <BrowserRouter>
      <DemoRequest />
    </BrowserRouter>,
  );

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('First name'), 'Dana');
  await user.type(screen.getByLabelText('Last name'), 'Reyes');
  await user.type(screen.getByLabelText('Work email'), 'dana@reyesbuild.com');
  await user.type(screen.getByLabelText('Company'), 'Reyes Build');
}

describe('DemoRequest (US-406)', () => {
  beforeEach(() => {
    invoke.mockReset();
    toastError.mockReset();
  });

  it('sends the request to handle-demo-request', async () => {
    const user = userEvent.setup();
    invoke.mockResolvedValue({ data: { success: true }, error: null });
    renderPage();

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Book my demo' }));

    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    const [fn, options] = invoke.mock.calls[0] as [string, { body: Record<string, unknown> }];
    expect(fn).toBe('handle-demo-request');
    expect(options.body).toMatchObject({
      firstName: 'Dana',
      lastName: 'Reyes',
      email: 'dana@reyesbuild.com',
      companyName: 'Reyes Build',
    });
  });

  it('confirms only after the request reached the sales queue', async () => {
    const user = userEvent.setup();
    invoke.mockResolvedValue({ data: { success: true }, error: null });
    renderPage();

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Book my demo' }));

    expect(await screen.findByText(/we will be in touch/i)).toBeInTheDocument();
  });

  it('does not claim success when the function fails', async () => {
    const user = userEvent.setup();
    invoke.mockResolvedValue({ data: null, error: new Error('boom') });
    renderPage();

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Book my demo' }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(screen.queryByText(/we will be in touch/i)).toBeNull();
    // The form is still there, still filled, so the visitor can retry.
    expect(screen.getByRole('button', { name: 'Book my demo' })).toBeInTheDocument();
  });

  it('does not submit without the fields the edge function requires', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Book my demo' }));

    await waitFor(() => expect(screen.getByText('First name is required')).toBeInTheDocument());
    expect(invoke).not.toHaveBeenCalled();
  });
});
