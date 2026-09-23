import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// US-268: CRM, task, cost-code, client-access, equipment, funnel-step and
// invoice forms validate with react-hook-form. Each test checks one inline
// error and the payload the useState version sent.

const h = vi.hoisted(() => ({
  insert: vi.fn(),
  update: vi.fn(),
  invoke: vi.fn(),
  save: vi.fn(),
  insertCostCodes: vi.fn(),
  rows: {} as Record<string, unknown[]>,
  // Stable, as the real context is: CreateTaskDialog re-runs its load effect
  // whenever userProfile changes identity.
  auth: { userProfile: { id: 'u-1', company_id: 'co-1' }, user: { id: 'u-1' } },
}));

vi.mock('@/components/ui/select', () => import('@/test/selectMock'));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn(), useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => h.auth }));
vi.mock('@/integrations/supabase/client', () => {
  const chain = (table: string) => {
    const q: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'order', 'in']) q[m] = () => q;
    q.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: h.rows[table] ?? [], error: null }).then(res);
    q.single = () => Promise.resolve({ data: { id: `${table}-new` }, error: null });
    q.insert = (row: unknown) => {
      h.insert(table, row);
      return q;
    };
    q.update = (row: unknown) => {
      h.update(table, row);
      return q;
    };
    return q;
  };
  return {
    supabase: {
      from: chain,
      auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u-1' } } }) },
      functions: {
        invoke: (name: string, opts: unknown) => {
          h.invoke(name, opts);
          return Promise.resolve({
            data: { success: true, data: { emailSent: true }, invoice: { id: 'inv-1', invoice_number: 'INV-1' } },
            error: null,
          });
        },
      },
    },
  };
});
vi.mock('@/hooks/useEquipmentAssignmentForm', () => ({
  useEquipmentAssignmentForm: () => ({
    projects: [{ id: 'p-1', name: 'Main St' }],
    equipment: [{ id: 'e-1', name: 'Excavator', type: 'heavy' }],
    optionsLoading: false,
    optionsError: null,
    refetchOptions: vi.fn(),
    save: { mutateAsync: h.save, isPending: false },
  }),
}));
vi.mock('@/hooks/useProjectCostCodes', () => ({
  useProjectCostCodes: () => ({
    costCodes: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    companyCodes: [],
    companyCodesLoading: false,
    companyCodesError: null,
    insert: h.insertCostCodes,
  }),
}));
vi.mock('@/hooks/useBillingDefaults', async () => {
  const { FALLBACK_BILLING_DEFAULTS } = await import('@/lib/companyBilling');
  return { useBillingDefaults: () => ({ defaults: FALLBACK_BILLING_DEFAULTS, loaded: true, error: null }) };
});
vi.mock('@/components/customers/ContactPicker', () => ({ ContactPicker: () => null }));
vi.mock('@/components/billing/LineTaxSelect', () => ({ LineTaxSelect: () => null }));

import { LeadEditDialog } from '../crm/LeadEditDialog';
import { OpportunityEditDialog } from '../crm/OpportunityEditDialog';
import { BookingPageManager } from '../crm/BookingPageManager';
import EquipmentAssignmentForm from '../equipment/EquipmentAssignmentForm';
import { ProjectClientAccess } from '../project/ProjectClientAccess';
import { ProjectCostCodes } from '../project/tabs/ProjectCostCodes';
import { CreateTaskDialog } from '../tasks/CreateTaskDialog';
import { EditTaskDialog } from '../tasks/EditTaskDialog';
import { FunnelStepBuilder } from '../funnel/FunnelStepBuilder';
import InvoiceGenerator from '../InvoiceGenerator';

const wrap = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  h.rows = {
    projects: [{ id: 'p-1', name: 'Main St' }],
    user_profiles: [{ id: 'u-2', first_name: 'Sam', last_name: 'Lee' }],
    email_templates: [{ id: 't-1', name: 'Welcome', subject: 'Hi' }],
    booking_pages: [],
    funnel_steps: [],
  };
  h.save.mockResolvedValue({});
  h.insertCostCodes.mockResolvedValue(1);
});

const LEAD = {
  id: 'l-1',
  first_name: 'Dana',
  last_name: 'Whitfield',
  email: 'dana@example.com',
  phone: '555-0100',
  estimated_budget: 25000,
  status: 'new',
  lead_source: 'website',
  priority: 'medium',
  created_at: '2026-01-01',
};

describe('LeadEditDialog', () => {
  it('rejects an invalid email inline', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<LeadEditDialog lead={LEAD} onUpdate={onUpdate}><button>Edit</button></LeadEditDialog>);
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const email = screen.getByLabelText('Email');
    await user.clear(email);
    await user.type(email, 'not-an-email');
    await user.click(screen.getByRole('button', { name: /Save Changes/ }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('passes the same updates object', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<LeadEditDialog lead={LEAD} onUpdate={onUpdate}><button>Edit</button></LeadEditDialog>);
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: /Save Changes/ }));

    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith('l-1', {
        first_name: 'Dana',
        last_name: 'Whitfield',
        email: 'dana@example.com',
        phone: '555-0100',
        company_name: '',
        project_name: '',
        project_type: '',
        estimated_budget: 25000,
        status: 'new',
        priority: 'medium',
        lead_source: 'website',
        next_follow_up_date: '',
      }),
    );
  });
});

describe('OpportunityEditDialog', () => {
  it('rejects a probability over 100 and otherwise sends numbers', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const opp = { id: 'o-1', name: 'Clinic', estimated_value: 90000, probability_percent: 40, stage: 'proposal' };
    render(<OpportunityEditDialog opportunity={opp as never} onUpdate={onUpdate}><button>Edit</button></OpportunityEditDialog>);
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const prob = screen.getByLabelText('Probability (%)');
    await user.clear(prob);
    await user.type(prob, '140');
    await user.click(screen.getByRole('button', { name: /Save Changes/ }));
    expect(await screen.findByText('Enter a probability from 0 to 100')).toBeInTheDocument();
    expect(onUpdate).not.toHaveBeenCalled();

    await user.clear(prob);
    await user.type(prob, '60');
    await user.click(screen.getByRole('button', { name: /Save Changes/ }));
    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith('o-1', {
        name: 'Clinic',
        estimated_value: 90000,
        probability_percent: 60,
        stage: 'proposal',
        expected_close_date: '',
        account_manager: '',
        project_type: '',
      }),
    );
  });
});

describe('BookingPageManager', () => {
  it('rejects a slug with capitals inline, then inserts the page and rules', async () => {
    const user = userEvent.setup();
    wrap(<BookingPageManager />);
    await user.click(await screen.findByRole('button', { name: /New Booking Page/ }));
    await user.type(screen.getByLabelText('URL Slug'), 'Intro Call');
    await user.type(screen.getByLabelText('Page Title'), 'Intro call');
    await user.click(screen.getByRole('button', { name: 'Create Booking Page' }));
    expect(await screen.findByText('Use lowercase letters, numbers and hyphens')).toBeInTheDocument();
    expect(h.insert).not.toHaveBeenCalled();

    const slug = screen.getByLabelText('URL Slug');
    await user.clear(slug);
    await user.type(slug, 'intro-call');
    await user.click(screen.getByRole('button', { name: 'Create Booking Page' }));
    await waitFor(() =>
      expect(h.insert).toHaveBeenCalledWith('booking_pages', {
        title: 'Intro call',
        slug: 'intro-call',
        description: '',
        duration_minutes: 30,
        location_type: 'video_zoom',
        is_active: true,
        // No availability key: booking_pages has no such column. The rules
        // go to availability_rules.
        user_id: 'u-1',
      }),
    );
    const weekday = (day: number) => ({
      booking_page_id: 'booking_pages-new',
      day_of_week: day,
      start_time: '09:00',
      end_time: '17:00',
    });
    await waitFor(() =>
      expect(h.insert).toHaveBeenCalledWith('availability_rules', [1, 2, 3, 4, 5].map(weekday)),
    );
  });

  it('fills the slug from the whole title until the slug is edited', async () => {
    const user = userEvent.setup();
    wrap(<BookingPageManager />);
    await user.click(await screen.findByRole('button', { name: /New Booking Page/ }));
    const title = screen.getByLabelText('Page Title');
    const slug = screen.getByLabelText('URL Slug');
    await user.type(title, 'Site Walk 30');
    expect(slug).toHaveValue('site-walk-30');

    await user.clear(slug);
    await user.type(slug, 'walk');
    await user.type(title, ' min');
    expect(slug).toHaveValue('walk');

    // Clearing the slug hands it back to the title.
    await user.clear(slug);
    await user.type(title, 's');
    expect(slug).toHaveValue('site-walk-30-mins');
  });
});

describe('EquipmentAssignmentForm', () => {
  it('asks for dates inline and saves nothing', async () => {
    const user = userEvent.setup();
    render(<EquipmentAssignmentForm equipmentId="e-1" projectId="p-1" onSuccess={vi.fn()} onCancel={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Create Assignment' }));
    expect(await screen.findByText('Pick a start date')).toBeInTheDocument();
    expect(screen.getByText('Pick an end date')).toBeInTheDocument();
    expect(h.save).not.toHaveBeenCalled();
  });

  it('saves the same row for an existing assignment', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const assignment = {
      assignment_id: 'a-1',
      equipment_id: 'e-1',
      project_id: 'p-1',
      assigned_quantity: 2,
      start_date: '2026-03-01T12:00:00',
      end_date: '2026-03-10T12:00:00',
      assignment_status: 'active',
      notes: 'North lot',
    };
    render(<EquipmentAssignmentForm assignment={assignment} onSuccess={onSuccess} onCancel={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Update Assignment' }));
    await waitFor(() =>
      expect(h.save).toHaveBeenCalledWith({
        assignmentId: 'a-1',
        row: {
          company_id: 'co-1',
          equipment_id: 'e-1',
          project_id: 'p-1',
          assigned_quantity: 2,
          start_date: '2026-03-01',
          end_date: '2026-03-10',
          assignment_status: 'active',
          notes: 'North lot',
          assigned_by: 'u-1',
        },
      }),
    );
    expect(onSuccess).toHaveBeenCalled();
  });
});

describe('ProjectClientAccess', () => {
  it('requires a first name and a valid email inline, then invites with trimmed values', async () => {
    const user = userEvent.setup();
    render(<ProjectClientAccess projectId="p-1" />);
    await user.type(screen.getByLabelText('Email'), 'dana@');
    await user.click(screen.getByRole('button', { name: /Send invite/ }));
    expect(await screen.findByText('First name is required')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(h.invoke).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('First name'), ' Dana ');
    await user.type(screen.getByLabelText('Email'), 'example.com ');
    await user.click(screen.getByRole('button', { name: /Send invite/ }));
    await waitFor(() =>
      expect(h.invoke).toHaveBeenCalledWith('invite-client', {
        body: {
          project_id: 'p-1',
          email: 'dana@example.com',
          first_name: 'Dana',
          last_name: null,
          access_level: 'read_only',
        },
      }),
    );
  });
});

describe('ProjectCostCodes add dialog', () => {
  it('requires code and name inline, then inserts the same row', async () => {
    const user = userEvent.setup();
    render(<ProjectCostCodes projectId="p-1" />);
    await user.click(screen.getAllByRole('button', { name: /Add Cost Code/ })[0]);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Add Cost Code' }));
    expect(await within(dialog).findByText('Code is required')).toBeInTheDocument();
    expect(within(dialog).getByText('Name is required')).toBeInTheDocument();
    expect(h.insertCostCodes).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText(/^Code/), ' 01-100 ');
    await user.type(within(dialog).getByLabelText(/^Name/), 'General Conditions');
    await user.type(within(dialog).getByLabelText('Budget Amount ($)'), '1500');
    await user.click(within(dialog).getByRole('button', { name: 'Add Cost Code' }));
    await waitFor(() =>
      expect(h.insertCostCodes).toHaveBeenCalledWith([
        {
          project_id: 'p-1',
          company_id: 'co-1',
          code: '01-100',
          description: 'General Conditions',
          category: 'General',
          budget_amount: 1500,
        },
      ]),
    );
  });
});

describe('CreateTaskDialog', () => {
  // Real clicks and typing: AccessibleModal closed (and this dialog reset its
  // form) on every mousedown inside it, which these would have caught.
  it('requires a name inline and inserts the same task row', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onTaskCreated = vi.fn();
    render(<CreateTaskDialog isOpen onClose={onClose} onTaskCreated={onTaskCreated} projectId="p-1" />);
    const submit = () => user.click(screen.getByRole('button', { name: 'Create Task' }));
    await submit();
    expect(await screen.findByText('Task name is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Task Name *')).toHaveAttribute('aria-invalid', 'true');
    expect(h.insert).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Task Name *'), '  Order rebar ');
    await user.type(screen.getByLabelText('Estimated Hours'), '2.5');
    expect(onClose).not.toHaveBeenCalled();
    await submit();
    await waitFor(() =>
      expect(h.insert).toHaveBeenCalledWith('tasks', {
        name: 'Order rebar',
        description: null,
        category: 'general',
        priority: 'medium',
        project_id: 'p-1',
        assigned_to: 'u-1',
        created_by: 'u-1',
        due_date: null,
        estimated_hours: 2.5,
        status: 'todo',
        company_id: 'co-1',
      }),
    );
    expect(onTaskCreated).toHaveBeenCalled();
  });
});

describe('EditTaskDialog', () => {
  it('rejects negative hours inline and updates with the same shape', async () => {
    const user = userEvent.setup();
    const task = {
      id: 't-1',
      name: 'Pour slab',
      status: 'todo',
      category: 'labor',
      priority: 'high',
      project_id: 'p-1',
      company_id: 'co-1',
      due_date: '2026-04-01T00:00:00Z',
      estimated_hours: 8,
    };
    render(<EditTaskDialog task={task} isOpen onClose={vi.fn()} onTaskUpdated={vi.fn()} />);
    const hours = screen.getByLabelText('Estimated Hours');
    await user.clear(hours);
    await user.type(hours, '-1');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(await screen.findByText('Enter hours of 0 or more')).toBeInTheDocument();
    expect(h.update).not.toHaveBeenCalled();

    await user.clear(hours);
    await user.type(hours, '6');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() =>
      expect(h.update).toHaveBeenCalledWith('tasks', {
        name: 'Pour slab',
        description: null,
        category: 'labor',
        priority: 'high',
        status: 'todo',
        project_id: 'p-1',
        assigned_to: null,
        due_date: '2026-04-01',
        estimated_hours: 6,
      }),
    );
  });
});

describe('FunnelStepBuilder add step', () => {
  it('requires a template inline, then inserts the step', async () => {
    const user = userEvent.setup();
    wrap(<FunnelStepBuilder funnelId="f-1" />);
    await user.click(await screen.findByRole('button', { name: /Add Step/ }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Step Name'), 'Welcome');
    await user.click(within(dialog).getByRole('button', { name: 'Add Step' }));
    expect(await within(dialog).findByText('Select an email template')).toBeInTheDocument();
    expect(h.insert).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('option', { name: 'Welcome - Hi' }));
    const delay = within(dialog).getByLabelText('Delay Amount');
    await user.clear(delay);
    await user.type(delay, '3');
    await user.click(within(dialog).getByRole('button', { name: 'Add Step' }));
    await waitFor(() =>
      expect(h.insert).toHaveBeenCalledWith('funnel_steps', [
        { funnel_id: 'f-1', step_order: 1, name: 'Welcome', email_template_id: 't-1', delay_amount: 3, delay_unit: 'days' },
      ]),
    );
  });
});

describe('InvoiceGenerator', () => {
  it('flags a missing client and a zero-price line inline', async () => {
    const user = userEvent.setup();
    render(<InvoiceGenerator />);
    await user.type(screen.getByLabelText('Discount Amount ($)'), '0');
    const price = screen.getByLabelText('Unit Price');
    await user.clear(price);
    await user.type(price, '10');
    await user.clear(price);
    await user.click(screen.getByLabelText('Description'));
    // A zero total keeps the button disabled, as before; give it a price and
    // leave the description and client empty.
    await user.type(price, '10');
    await user.click(screen.getByRole('button', { name: /Generate Invoice/ }));

    expect(await screen.findByText('Client name is required')).toBeInTheDocument();
    expect(screen.getByText('Enter a description')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toHaveAttribute('aria-invalid', 'true');
    expect(h.invoke).not.toHaveBeenCalled();
  });

  it('sends the same generate-invoice body', async () => {
    const user = userEvent.setup();
    render(<InvoiceGenerator />);
    await user.type(screen.getByLabelText('Client Name'), 'Dana');
    await user.type(screen.getByLabelText('Client Email'), 'dana@example.com');
    await user.type(screen.getByLabelText('Description'), 'Framing');
    const qty = screen.getByLabelText('Quantity');
    await user.clear(qty);
    await user.type(qty, '2');
    const price = screen.getByLabelText('Unit Price');
    await user.clear(price);
    await user.type(price, '100');
    await user.click(screen.getByRole('button', { name: /Generate Invoice/ }));

    await waitFor(() => expect(h.invoke).toHaveBeenCalledTimes(1));
    const [name, { body }] = h.invoke.mock.calls[0];
    expect(name).toBe('generate-invoice');
    expect(body).toEqual({
      client_id: undefined,
      client_name: 'Dana',
      client_email: 'dana@example.com',
      project_id: '',
      due_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      tax_rate: 0,
      terms: 'Payment is due within 30 days of invoice date.',
      discount_amount: 0,
      notes: '',
      line_items: [{ description: 'Framing', quantity: 2, unit_price: 100 }],
    });
  });
});
