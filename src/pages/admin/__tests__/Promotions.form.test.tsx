import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

// US-268: the admin Promotions dialog validates with react-hook-form +
// promotionFormSchema. A bad discount or reversed dates stop the insert.

const h = vi.hoisted(() => ({ insert: vi.fn(), toast: vi.fn() }));

vi.mock('@/components/auth/RoleGuard', () => ({
  RoleGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
  ROLE_GROUPS: { ADMINS: ['admin'] },
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: h.toast }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
      insert: (rows: unknown) => {
        h.insert(rows);
        return Promise.resolve({ error: null });
      },
    }),
  },
}));

import Promotions from '../Promotions';

const open = async (user: ReturnType<typeof userEvent.setup>) => {
  render(
    <MemoryRouter>
      <Promotions />
    </MemoryRouter>,
  );
  await screen.findByText('No promotions yet');
  await user.click(screen.getAllByRole('button', { name: 'Create Promotion' })[0]);
};

const submitButton = () =>
  screen.getByRole('form', { name: 'Promotion form' }).querySelector('button[type="submit"]') as HTMLButtonElement;

beforeEach(() => vi.clearAllMocks());

describe('Promotions dialog (US-268)', () => {
  it('rejects a discount over 100 and an end before the start, inline', async () => {
    const user = userEvent.setup();
    await open(user);
    await user.type(screen.getByLabelText('Campaign Name *'), 'Fall sale');
    await user.type(screen.getByLabelText('Discount Percentage *'), '150');
    await user.type(screen.getByLabelText('Start Date & Time *'), '2026-10-10T09:00');
    await user.type(screen.getByLabelText('End Date & Time *'), '2026-10-01T09:00');
    await user.click(submitButton());

    expect(await screen.findByText('Enter a discount from 1 to 100')).toBeInTheDocument();
    expect(screen.getByText('End must be after the start')).toBeInTheDocument();
    expect(h.insert).not.toHaveBeenCalled();
  });

  it('inserts the same promotion row', async () => {
    const user = userEvent.setup();
    await open(user);
    await user.type(screen.getByLabelText('Campaign Name *'), 'Fall sale');
    await user.type(screen.getByLabelText('Discount Percentage *'), '25');
    await user.type(screen.getByLabelText('Start Date & Time *'), '2026-10-01T09:00');
    await user.type(screen.getByLabelText('End Date & Time *'), '2026-10-10T09:00');
    await user.click(screen.getByRole('checkbox', { name: 'enterprise' }));
    await user.click(submitButton());

    await waitFor(() =>
      expect(h.insert).toHaveBeenCalledWith([
        {
          name: 'Fall sale',
          description: null,
          discount_percentage: 25,
          start_date: '2026-10-01T09:00',
          end_date: '2026-10-10T09:00',
          is_active: true,
          applies_to: ['starter', 'professional'],
          display_on: ['homepage', 'upgrade'],
        },
      ]),
    );
  });
});
