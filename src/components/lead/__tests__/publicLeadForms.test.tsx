import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// US-268: the public lead forms validate with react-hook-form + the schemas in
// src/lib/validations/leads.ts. A bad field is reported inline and nothing is
// sent; a good submit sends exactly what the useState versions sent.

const h = vi.hoisted(() => ({
  invoke: vi.fn(),
  from: vi.fn(),
  toast: vi.fn(),
  sonner: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...a: unknown[]) => h.invoke(...a) },
    from: (...a: unknown[]) => h.from(...a),
  },
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: h.toast }), toast: h.toast }));
vi.mock('sonner', () => ({ toast: h.sonner }));
vi.mock('@/components/ui/smart-logo', () => ({ default: () => null }));
vi.mock('@/components/security/Turnstile', () => ({
  Turnstile: () => null,
  useTurnstileToken: () => ({ token: 'turnstile-tok', setToken: vi.fn(), enabled: true, ready: true }),
}));

import { ContactSalesModal } from '../ContactSalesModal';
import { EmailCaptureModal } from '@/components/calculator/EmailCaptureModal';
import Footer from '@/components/Footer';
import { PublicBookingForm } from '@/components/crm/PublicBookingForm';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ContactSalesModal', () => {
  const fill = async (user: ReturnType<typeof userEvent.setup>, email: string) => {
    await user.type(screen.getByLabelText('First Name *'), 'Dana');
    await user.type(screen.getByLabelText('Last Name *'), 'Reyes');
    await user.type(screen.getByLabelText('Work Email *'), email);
    await user.type(screen.getByLabelText('Company Name *'), 'Reyes Build');
    await user.type(screen.getByLabelText('Message *'), 'Pricing for 12 seats');
  };

  it('reports a bad email inline and sends nothing', async () => {
    const user = userEvent.setup();
    render(<ContactSalesModal isOpen onClose={vi.fn()} />);
    await fill(user, 'dana@');
    await user.click(screen.getByRole('button', { name: 'Send Message' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Work Email *')).toHaveAttribute('aria-invalid', 'true');
    expect(h.invoke).not.toHaveBeenCalled();
  });

  it('flags every missing required field', async () => {
    const user = userEvent.setup();
    render(<ContactSalesModal isOpen onClose={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Send Message' }));

    for (const msg of ['First name is required', 'Last name is required', 'Email is required', 'Company name is required', 'Tell us what you need']) {
      expect(await screen.findByText(msg)).toBeInTheDocument();
    }
    expect(h.invoke).not.toHaveBeenCalled();
  });

  it('sends the same body, Turnstile token included', async () => {
    h.invoke.mockResolvedValue({ data: { success: true }, error: null });
    const user = userEvent.setup();
    render(<ContactSalesModal isOpen onClose={vi.fn()} />);
    await fill(user, 'dana@reyesbuild.com');
    await user.click(screen.getByRole('button', { name: 'Send Message' }));

    await waitFor(() => expect(h.invoke).toHaveBeenCalledTimes(1));
    expect(h.invoke).toHaveBeenCalledWith('handle-sales-contact', {
      body: {
        firstName: 'Dana',
        lastName: 'Reyes',
        email: 'dana@reyesbuild.com',
        phone: '',
        companyName: 'Reyes Build',
        companySize: '',
        industry: '',
        inquiryType: 'general',
        message: 'Pricing for 12 seats',
        estimatedBudget: '',
        timeline: '',
        turnstileToken: 'turnstile-tok',
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
      },
    });
  });
});

describe('EmailCaptureModal', () => {
  it('reports a bad email inline and does not call onSubmit', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<EmailCaptureModal open onClose={vi.fn()} onSubmit={onSubmit} calculationCount={1} />);
    await user.type(screen.getByLabelText(/Email Address/), 'crew@site');
    await user.click(screen.getByRole('button', { name: /Get My Report/ }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('passes the same data, blanks as undefined', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<EmailCaptureModal open onClose={onClose} onSubmit={onSubmit} calculationCount={1} />);
    await user.type(screen.getByLabelText(/Email Address/), 'crew@example.com');
    await user.type(screen.getByLabelText('Company Name (Optional)'), 'Reyes Build');
    await user.click(screen.getByRole('button', { name: /Get My Report/ }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ email: 'crew@example.com', companyName: 'Reyes Build', phone: undefined }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

describe('Footer newsletter', () => {
  const renderFooter = () =>
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

  it('reports a bad address inline and sends nothing', async () => {
    renderFooter();
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'crew@' } });
    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your email')).toHaveAttribute('aria-invalid', 'true');
    expect(h.invoke).not.toHaveBeenCalled();
  });

  it('sends the address and the Turnstile token to capture-lead', async () => {
    h.invoke.mockResolvedValue({ data: { success: true }, error: null });
    renderFooter();
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'crew@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }));

    await waitFor(() => expect(h.sonner.success).toHaveBeenCalledWith('Thanks for subscribing!'));
    expect(h.invoke).toHaveBeenCalledWith('capture-lead', {
      body: {
        turnstileToken: 'turnstile-tok',
        email: 'crew@example.com',
        interestType: 'newsletter',
        leadSource: 'website',
        landingPage: window.location.pathname,
        referrer: document.referrer,
      },
    });
    expect(screen.getByPlaceholderText('Enter your email')).toHaveValue('');
  });
});

describe('PublicBookingForm', () => {
  const page = {
    id: 'bp-1', title: 'Site walk', description: null, duration_minutes: 30,
    location_type: 'phone', collect_phone: true, collect_notes: true,
  };
  const insert = vi.fn();

  /** A thenable query builder: every filter returns itself, awaiting resolves `result`. */
  const chain = (result: unknown) => {
    const q: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'gte', 'lt', 'in']) q[m] = () => q;
    q.single = () => Promise.resolve(result);
    q.then = (res: (v: unknown) => unknown) => Promise.resolve(result).then(res);
    return q;
  };

  beforeEach(() => {
    insert.mockImplementation(() => ({
      select: () => ({ single: () => Promise.resolve({ data: { id: 'bk-1' }, error: null }) }),
    }));
    h.from.mockImplementation((table: string) => {
      if (table === 'booking_pages') return chain({ data: page, error: null });
      if (table === 'availability_rules') {
        return chain({
          data: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ day_of_week: d, start_time: '09:00', end_time: '17:00' })),
          error: null,
        });
      }
      return { ...chain({ data: [], error: null }), insert };
    });
    h.invoke.mockResolvedValue({ data: {}, error: null });
  });

  const openDetails = async (user: ReturnType<typeof userEvent.setup>) => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <PublicBookingForm slug="site-walk" />
      </QueryClientProvider>,
    );
    const form = await screen.findByRole('form', { name: 'Book a meeting' });
    await user.click(within(form).getAllByRole('button')[0]);
    await user.click(await screen.findByRole('button', { name: '9:00 AM' }));
  };

  it('reports a missing name and bad email inline and books nothing', async () => {
    const user = userEvent.setup();
    await openDetails(user);
    await user.type(screen.getByLabelText('Email *'), 'dana');
    await user.click(screen.getByRole('button', { name: 'Confirm Booking' }));

    expect(await screen.findByText('Enter your name')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(insert).not.toHaveBeenCalled();
  });

  it('inserts the same booking row', async () => {
    const user = userEvent.setup();
    await openDetails(user);
    await user.type(screen.getByLabelText('Full Name *'), 'Dana Reyes');
    await user.type(screen.getByLabelText('Email *'), 'dana@reyesbuild.com');
    await user.type(screen.getByLabelText('Additional Notes'), 'Gate code 4411');
    await user.click(screen.getByRole('button', { name: 'Confirm Booking' }));

    await waitFor(() => expect(insert).toHaveBeenCalledTimes(1));
    const row = insert.mock.calls[0][0];
    expect(row).toMatchObject({
      booking_page_id: 'bp-1',
      attendee_name: 'Dana Reyes',
      attendee_email: 'dana@reyesbuild.com',
      attendee_phone: null,
      attendee_notes: 'Gate code 4411',
      status: 'confirmed',
    });
    expect(new Date(row.end_at).getTime() - new Date(row.scheduled_at).getTime()).toBe(30 * 60 * 1000);
    expect(await screen.findByText(/A confirmation email has been sent to dana@reyesbuild.com/)).toBeInTheDocument();
    expect(h.invoke).toHaveBeenCalledWith('send-booking-confirmation', { body: { bookingId: 'bk-1' } });
  });
});
