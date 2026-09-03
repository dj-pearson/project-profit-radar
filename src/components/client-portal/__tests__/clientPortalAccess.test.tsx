/**
 * US-319: the client portal, and the one write a client makes.
 *
 * Two things this locks in.
 *
 * 1. The portal is routed and finds a client's projects by ENROLMENT. It used
 *    to use .eq('client_email', user.email), which is not an authorisation
 *    model: it grants access to any project in any company carrying the same
 *    address, and nothing at all if the address was typed differently.
 *
 * 2. Approving a change order goes through client_respond_to_change_order.
 *    The component used to update change_orders directly, writing
 *    client_approved_at (the live column is client_approved_date) and
 *    client_rejection_reason (no such column existed), through an RLS policy
 *    that admits no client. Three independent reasons it could never work, and
 *    all three were invisible because the page was never routed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';

const { rpc, toast } = vi.hoisted(() => ({ rpc: vi.fn(), toast: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc, from: vi.fn() },
}));
vi.mock('@/hooks/use-toast', () => ({ toast, useToast: () => ({ toast }) }));

import { ClientChangeOrderApproval } from '@/components/client-portal/ClientChangeOrderApproval';

const pendingChangeOrder = {
  id: 'co-1',
  change_order_number: 'CO-001',
  title: 'Move the kitchen window',
  description: 'Relocate the window 18 inches left.',
  amount: 2400,
  status: 'pending',
  client_approved: null,
  created_at: '2026-08-01T00:00:00.000Z',
};

describe('client change order response (US-319)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({ data: null, error: null });
  });

  it('approves through the RPC, not a direct table update', async () => {
    const user = userEvent.setup();
    render(<ClientChangeOrderApproval changeOrders={[pendingChangeOrder]} />);

    await user.click(screen.getByRole('button', { name: /^approve$/i }));
    await user.click(await screen.findByRole('button', { name: /confirm approval/i }));

    await waitFor(() => expect(rpc).toHaveBeenCalled());
    const [fn, args] = rpc.mock.calls[0];
    expect(fn).toBe('client_respond_to_change_order');
    expect(args).toMatchObject({ p_change_order_id: 'co-1', p_approved: true });
  });

  it('surfaces a refusal instead of reporting success', async () => {
    // RLS or enrolment can legitimately refuse. The client has to be told.
    rpc.mockResolvedValue({ data: null, error: { message: 'You do not have access to this project' } });
    const user = userEvent.setup();
    render(<ClientChangeOrderApproval changeOrders={[pendingChangeOrder]} />);

    await user.click(screen.getByRole('button', { name: /^approve$/i }));
    await user.click(await screen.findByRole('button', { name: /confirm approval/i }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }))
    );
  });
});

describe('the portal is reachable and enrolment-scoped (US-319)', () => {
  const read = (p: string) => readFileSync(p, 'utf8');

  it('is answered by a route', () => {
    // Both portal pages were imported by no route file, so the whole
    // customer-facing half of the product shipped as dead code.
    const routes = read('src/routes/appRoutes.tsx');
    expect(routes).toMatch(/path="\/client-portal"/);
    expect(routes).toMatch(/LazyClientPortal/);
    expect(read('src/utils/lazyRoutes.tsx')).toMatch(/ClientPortalEnhanced/);
  });

  it('finds projects by enrolment rather than by matching an email string', () => {
    // Comments stripped, so the note explaining the old query does not count as
    // the old query.
    const page = read('src/pages/ClientPortalEnhanced.tsx')
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');
    expect(page).toMatch(/from\('client_portal_access'\)/);
    expect(page).not.toMatch(/\.eq\('client_email'/);
  });

  it('has one portal page, not two', () => {
    // src/pages/ClientPortal.tsx duplicated this one and was equally unrouted.
    expect(() => read('src/pages/ClientPortal.tsx')).toThrow();
  });

  it('does not hand out a link to a path no route answers', () => {
    // ClientPortalAccess.tsx copied ${origin}/portal/${token} to the clipboard.
    // Nothing routes /portal/:token and nothing reads access_token.
    expect(() => read('src/components/crm/ClientPortalAccess.tsx')).toThrow();
  });

  it('offers the invite from the project hub', () => {
    const content = read('src/components/project/ProjectContent.tsx');
    expect(content).toMatch(/ProjectClientAccess/);
    const invite = read('src/components/project/ProjectClientAccess.tsx');
    expect(invite).toMatch(/invoke\('invite-client'/);
  });
});
