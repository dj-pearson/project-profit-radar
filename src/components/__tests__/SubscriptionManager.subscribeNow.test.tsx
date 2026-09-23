import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

/**
 * "Subscribe Now" on the Change Plan tab was a Button with no handler, so a
 * user with no subscription clicked it and nothing happened. It links to
 * /upgrade, the page that starts checkout.
 */

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('../SubscriptionChange', () => ({ default: () => null }));
vi.mock('../PaymentFailureAlert', () => ({ default: () => null }));
vi.mock('@/integrations/supabase/client', () => {
  const single = vi.fn(async () => ({ data: null, error: { code: 'PGRST116' } }));
  const chain = { select: () => chain, eq: () => chain, single };
  return { supabase: { from: () => chain, functions: { invoke: vi.fn() } } };
});

import SubscriptionManager from '../SubscriptionManager';

describe('SubscriptionManager Subscribe Now', () => {
  it('takes a user with no subscription to /upgrade', async () => {
    render(
      <MemoryRouter initialEntries={['/subscription-settings']}>
        <Routes>
          <Route path="/subscription-settings" element={<SubscriptionManager />} />
          <Route path="/upgrade" element={<div>UPGRADE PAGE</div>} />
        </Routes>
      </MemoryRouter>,
    );
    const tab = await screen.findByRole('tab', { name: 'Change Plan' });
    fireEvent.mouseDown(tab);
    const cta = await screen.findByRole('link', { name: 'Subscribe Now' });
    expect(cta.getAttribute('href')).toBe('/upgrade');
    fireEvent.click(cta);
    expect(await screen.findByText('UPGRADE PAGE')).toBeTruthy();
  });
});
