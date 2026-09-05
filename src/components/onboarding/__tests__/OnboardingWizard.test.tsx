/**
 * US-317: completing setup has to create a company.
 *
 * The bug these tests exist to keep out was invisible for exactly the reason
 * that makes it worth a test: the old code ran
 * `companies.update(...).eq('id', undefined)`, PostgREST matched zero rows and
 * returned `{ error: null }`, and the wizard reported success. Nothing threw,
 * nothing logged, and the user landed on an empty dashboard.
 *
 * So these assert the write itself, not the toast. A mutation that swaps the
 * RPC back for an update has to fail here.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// vi.mock factories are hoisted above these declarations, so the spies have to
// be created in a hoisted block or the factory closes over a TDZ binding.
const { rpc, insert, from, toast } = vi.hoisted(() => {
  const rpcFn = vi.fn();
  const insertFn = vi.fn();
  return {
    rpc: rpcFn,
    insert: insertFn,
    from: vi.fn(() => ({ insert: insertFn, update: vi.fn(), select: vi.fn() })),
    toast: vi.fn(),
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc,
    from,
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast }),
  toast,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'owner@example.com' },
    // The users this page exists for have no company yet. That is the whole
    // point: Setup.tsx redirects anyone who does.
    userProfile: { id: 'user-1', company_id: null },
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

const NEW_COMPANY_ID = '11111111-2222-3333-4444-555555555555';

async function fillCompanyStepAndFinish(
  user: ReturnType<typeof userEvent.setup>,
  opts: { withProject?: boolean } = {}
) {
  // Step 1 -> 2
  await user.click(screen.getByRole('button', { name: /next/i }));

  await user.type(await screen.findByLabelText(/company name/i), 'Ridgeline Builders');

  // Step 2 -> 3
  await user.click(screen.getByRole('button', { name: /next/i }));

  if (!opts.withProject) {
    await user.click(await screen.findByRole('button', { name: /skip for now/i }));
  } else {
    await user.type(await screen.findByLabelText(/project name/i), 'Maple St Remodel');
  }

  // Step 3 -> 4
  await user.click(screen.getByRole('button', { name: /next/i }));
  await user.click(await screen.findByRole('button', { name: /complete setup/i }));
}

describe('OnboardingWizard tenant creation (US-317)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    rpc.mockResolvedValue({ data: NEW_COMPANY_ID, error: null });
    insert.mockResolvedValue({ error: null });
  });

  it('creates the company through create_company_for_current_user', async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard />);

    await fillCompanyStepAndFinish(user);

    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
    const [fn, args] = rpc.mock.calls[0];
    expect(fn).toBe('create_company_for_current_user');
    expect(args).toMatchObject({ p_name: 'Ridgeline Builders' });
  });

  it('never completes setup with a bare companies update', async () => {
    // The regression guard. `.from('companies').update(...)` is what shipped,
    // and it silently wrote nothing.
    const user = userEvent.setup();
    render(<OnboardingWizard />);

    await fillCompanyStepAndFinish(user);

    await waitFor(() => expect(rpc).toHaveBeenCalled());
    expect(from).not.toHaveBeenCalledWith('companies');
  });

  it('creates the first project against the company the RPC returned', async () => {
    // Not userProfile.company_id, which is still null on this render: the
    // client has not refetched the profile yet.
    const user = userEvent.setup();
    render(<OnboardingWizard />);

    await fillCompanyStepAndFinish(user, { withProject: true });

    await waitFor(() => expect(insert).toHaveBeenCalledTimes(1));
    expect(from).toHaveBeenCalledWith('projects');
    expect(insert.mock.calls[0][0]).toMatchObject({
      company_id: NEW_COMPANY_ID,
      name: 'Maple St Remodel',
    });
  });

  it('reports a failed provision instead of calling onComplete', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Company name is required' } });
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(<OnboardingWizard onComplete={onComplete} />);

    await fillCompanyStepAndFinish(user);

    await waitFor(() => expect(rpc).toHaveBeenCalled());
    expect(onComplete).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' })
    );
  });

  it('still completes setup when only the first project fails', async () => {
    // The company exists by then. Failing the whole wizard would strand a user
    // who already has a tenant on a page that refuses to let them leave.
    insert.mockResolvedValue({ error: { message: 'permission denied' } });
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(<OnboardingWizard onComplete={onComplete} />);

    await fillCompanyStepAndFinish(user, { withProject: true });

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' })
    );
  });

  it('has no Skip on the company step, because the company is the tenant', async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard />);

    await user.click(screen.getByRole('button', { name: /next/i }));
    await screen.findByLabelText(/company name/i);

    expect(screen.queryByRole('button', { name: /^skip$/i })).toBeNull();
  });
});
