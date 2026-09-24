import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import userEvent from '@testing-library/user-event';
import { buildBondData, bondFormDefaults, buildInsuranceData, insuranceFormDefaults } from '@/lib/validations/bonds';
import { buildPermitData, permitFormDefaults } from '@/lib/validations/permits';
import {
  buildWarrantyClaimInsert,
  buildWarrantyData,
  warrantyClaimFormDefaults,
  warrantyFormDefaults,
} from '@/lib/validations/warranty';

// US-268: the bond, insurance, permit, warranty and warranty-claim forms
// validate with react-hook-form. The builders are pinned to the rows the
// useState versions wrote.

const h = vi.hoisted(() => ({ insert: vi.fn(), update: vi.fn(), rows: {} as Record<string, unknown[]> }));

vi.mock('@/components/ui/select', () => import('@/test/selectMock'));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn(), useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ userProfile: { id: 'u-1', company_id: 'co-1' }, user: { id: 'u-1' } }),
}));
vi.mock('@/integrations/supabase/client', () => {
  const chain = (table: string) => {
    const q: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'order', 'in']) q[m] = () => q;
    q.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: h.rows[table] ?? [], error: null }).then(res);
    // A write is read back (.select('id')), so it resolves to the row it
    // wrote rather than to the table's rows.
    const written = (row: unknown) => {
      const w: Record<string, unknown> = {};
      for (const m of ['select', 'eq']) w[m] = () => w;
      w.then = (res: (v: unknown) => unknown) =>
        Promise.resolve({ data: [{ id: 'new-1', ...(row as object) }], error: null }).then(res);
      return w;
    };
    q.insert = (row: unknown) => {
      h.insert(table, row);
      return written(row);
    };
    q.update = (row: unknown) => {
      h.update(table, row);
      return written(row);
    };
    return q;
  };
  return { supabase: { from: chain } };
});

import { BondForm } from '../bonds/BondForm';
import { InsuranceForm } from '../bonds/InsuranceForm';
import { PermitForm } from '../permits/PermitForm';
import { WarrantyForm } from '../warranty/WarrantyForm';
import { WarrantyClaimForm } from '../warranty/WarrantyClaimForm';

const PROFILE = { id: 'u-1', company_id: 'co-1' };

// The dialogs' pickers are TanStack queries (US-266).
const render = (ui: ReactElement) =>
  rtlRender(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  h.rows = { projects: [{ id: 'p-1', name: 'Main St' }], warranties: [{ id: 'w-1', item_name: 'Sink', manufacturer: 'Kohler' }] };
});

describe('BondForm', () => {
  it('shows required-field errors inline and writes nothing', async () => {
    const user = userEvent.setup();
    render(<BondForm onClose={vi.fn()} onSave={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Add Bond' }));

    expect(await screen.findByText('Bond number is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Bond Number *')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Surety company is required')).toBeInTheDocument();
    expect(screen.getByText('Effective date is required')).toBeInTheDocument();
    expect(h.insert).not.toHaveBeenCalled();
  });

  it('inserts the bond row once the required fields are filled', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<BondForm onClose={vi.fn()} onSave={onSave} />);
    await user.type(screen.getByLabelText('Bond Number *'), 'B-1');
    await user.type(screen.getByLabelText('Bond Name *'), 'Performance');
    await user.type(screen.getByLabelText('Principal (Contractor) *'), 'Acme Builders');
    await user.type(screen.getByLabelText('Obligee (Project Owner) *'), 'City');
    await user.type(screen.getByLabelText('Surety Company *'), 'Surety Co');
    await user.type(screen.getByLabelText('Effective Date *'), '2026-01-01');
    await user.type(screen.getByLabelText('Expiry Date *'), '2027-01-01');
    await user.click(screen.getByRole('button', { name: 'Add Bond' }));

    await waitFor(() => expect(h.insert).toHaveBeenCalledTimes(1));
    expect(h.insert.mock.calls[0]).toEqual([
      'bonds',
      buildBondData(
        {
          ...bondFormDefaults(),
          bond_number: 'B-1',
          bond_name: 'Performance',
          principal_name: 'Acme Builders',
          obligee_name: 'City',
          surety_company: 'Surety Co',
          effective_date: '2026-01-01',
          expiry_date: '2027-01-01',
        },
        PROFILE,
      ),
    ]);
    expect(onSave).toHaveBeenCalled();
  });

  it('builds the same row the useState form did', () => {
    const row = buildBondData(bondFormDefaults({ bond_number: 'B-9', bond_amount: 5000, claim_status: 'pending' }), PROFILE);
    expect(row).toMatchObject({
      company_id: 'co-1',
      created_by: 'u-1',
      project_id: null,
      bond_type: 'performance',
      bond_number: 'B-9',
      bond_amount: 5000,
      premium_amount: 0,
      bond_percentage: 100,
      effective_date: null,
      claim_made: false,
      claim_amount: 0,
      claim_status: 'pending',
    });
  });
});

describe('InsuranceForm', () => {
  it('rejects an expiry before the effective date inline', async () => {
    const user = userEvent.setup();
    render(<InsuranceForm onClose={vi.fn()} onSave={vi.fn()} />);
    await user.type(screen.getByLabelText('Effective Date *'), '2026-06-01');
    await user.type(screen.getByLabelText('Expiry Date *'), '2026-01-01');
    await user.click(screen.getByRole('button', { name: 'Add Policy' }));

    expect(await screen.findByText('Expiry date must be after the effective date')).toBeInTheDocument();
    expect(screen.getByText('Policy number is required')).toBeInTheDocument();
    expect(h.insert).not.toHaveBeenCalled();
  });

  it('keeps every formData key and parses the amounts', () => {
    const row = buildInsuranceData(insuranceFormDefaults({ coverage_limit: 1000000, claims_count: 2 }), PROFILE);
    expect(row).toMatchObject({
      policy_type: 'general_liability',
      coverage_limit: 1000000,
      deductible: 0,
      claims_made: false,
      total_claims_amount: 0,
      claims_count: 2,
      company_id: 'co-1',
      created_by: 'u-1',
    });
  });
});

describe('PermitForm', () => {
  it('requires a permit type, name and authority inline', async () => {
    const user = userEvent.setup();
    render(<PermitForm projectId="p-1" onClose={vi.fn()} onSave={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Add Permit' }));

    expect(await screen.findByText('Select a permit type')).toBeInTheDocument();
    expect(screen.getByText('Permit name is required')).toBeInTheDocument();
    expect(screen.getByText('Issuing authority is required')).toBeInTheDocument();
    expect(h.insert).not.toHaveBeenCalled();
  });

  it('leaves untouched dates out of the row, as before', () => {
    const row = buildPermitData(permitFormDefaults(undefined, 'p-1'), PROFILE);
    expect(row.application_date).toBeUndefined();
    expect(row.permit_start_date).toBeUndefined();
    expect(JSON.parse(JSON.stringify(row))).not.toHaveProperty('approval_date');
    expect(row).toMatchObject({ project_id: 'p-1', application_fee: 0, permit_fee: 0, bond_amount: 0, priority: 'medium' });
  });
});

describe('WarrantyForm', () => {
  it('requires an item name and start date inline', async () => {
    const user = userEvent.setup();
    render(<WarrantyForm onClose={vi.fn()} onSave={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Create Warranty' }));

    expect(await screen.findByText('Item name is required')).toBeInTheDocument();
    expect(screen.getByText('Start date is required')).toBeInTheDocument();
    expect(h.insert).not.toHaveBeenCalled();
  });

  it('nulls empty ids and dates and sends the duration as a number', () => {
    const row = buildWarrantyData({ ...warrantyFormDefaults(), item_name: 'Sink', warranty_start_date: '2026-01-01' }, PROFILE);
    expect(row).toMatchObject({
      item_name: 'Sink',
      warranty_duration_months: 12,
      project_id: null,
      vendor_id: null,
      purchase_order_id: null,
      warranty_start_date: '2026-01-01',
      installation_date: null,
      company_id: 'co-1',
    });
  });
});

describe('WarrantyClaimForm', () => {
  it('requires a warranty, description and claimant inline', async () => {
    const user = userEvent.setup();
    render(<WarrantyClaimForm onClose={vi.fn()} onSave={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'File Claim' }));

    expect(await screen.findByText('Select a warranty')).toBeInTheDocument();
    expect(screen.getByText('Describe the issue')).toBeInTheDocument();
    expect(screen.getByText('Claimant name is required')).toBeInTheDocument();
    expect(h.insert).not.toHaveBeenCalled();
  });

  it('inserts the same warranty_claims row', async () => {
    const user = userEvent.setup();
    render(<WarrantyClaimForm onClose={vi.fn()} onSave={vi.fn()} />);
    await user.click(await screen.findByRole('option', { name: 'Sink - Kohler' }));
    await user.type(screen.getByLabelText('Issue Description *'), 'Leaks');
    await user.type(screen.getByLabelText('Claimant Name *'), 'Dana');
    await user.click(screen.getByRole('button', { name: 'File Claim' }));

    await waitFor(() => expect(h.insert).toHaveBeenCalledTimes(1));
    expect(h.insert.mock.calls[0]).toEqual([
      'warranty_claims',
      buildWarrantyClaimInsert(
        { ...warrantyClaimFormDefaults(), warranty_id: 'w-1', issue_description: 'Leaks', claimant_name: 'Dana' },
        PROFILE,
      ),
    ]);
    expect(h.insert.mock.calls[0][1]).toMatchObject({ claim_number: '', resolution_cost: 0, created_by: 'u-1' });
  });
});
