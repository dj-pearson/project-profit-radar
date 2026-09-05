/**
 * US-318: converting an estimate has to produce a budget.
 *
 * This hop is what the product is named for - a profit radar needs a budget to
 * compare actuals against - and it had never once completed. Three independent
 * failures, and the dialog reported success over all of them:
 *
 *   1. The project insert sent location, estimated_end_date and
 *      created_from_estimate_id. None of those columns exist.
 *   2. Line items were read as estimate.line_items off a select('*') on
 *      estimates. They are a child table, so the array was always undefined.
 *   3. The transfer wrote a job_costs shape in which every field was wrong,
 *      and swallowed the error.
 *
 * Nothing anywhere inserted project_budgets, which is what the budget
 * dashboards read. So these tests assert the writes, by column name, against a
 * fake that records them.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Row = Record<string, unknown>;

const state: {
  estimate: Row | null;
  lineItems: Row[];
  inserts: Record<string, Row[]>;
  updates: Record<string, Row[]>;
  failInsertOn: string | null;
} = {
  estimate: null,
  lineItems: [],
  inserts: {},
  updates: {},
  failInsertOn: null,
};

/**
 * A hand-written supabase double rather than a mocking library, because what
 * is under test is which TABLE gets which COLUMNS - the exact thing a loose
 * mock would let through.
 */
function makeClient() {
  const from = (table: string) => {
    const api: Record<string, unknown> = {};

    api.select = () => api;
    api.order = () => Promise.resolve({ data: state.lineItems, error: null });
    api.eq = (_col: string, _val: unknown) => {
      if (table === 'estimate_line_items') {
        return {
          order: () => Promise.resolve({ data: state.lineItems, error: null }),
          then: (res: (v: unknown) => unknown) =>
            res({ data: state.lineItems, error: null }),
        };
      }
      if (table === 'estimates') {
        return {
          single: () =>
            Promise.resolve(
              state.estimate
                ? { data: state.estimate, error: null }
                : { data: null, error: { message: 'not found' } }
            ),
          then: (res: (v: unknown) => unknown) => res({ data: null, error: null }),
        };
      }
      return { then: (res: (v: unknown) => unknown) => res({ data: null, error: null }) };
    };

    api.insert = (rows: Row | Row[]) => {
      const list = Array.isArray(rows) ? rows : [rows];
      if (state.failInsertOn === table) {
        const result = { data: null, error: { message: `insert into ${table} refused` } };
        return {
          select: () => ({ single: () => Promise.resolve(result) }),
          then: (res: (v: unknown) => unknown) => res(result),
        };
      }
      state.inserts[table] = (state.inserts[table] || []).concat(list);
      const created = { id: `${table}-1`, ...list[0] };
      return {
        select: () => ({ single: () => Promise.resolve({ data: created, error: null }) }),
        then: (res: (v: unknown) => unknown) => res({ data: list, error: null }),
      };
    };

    api.update = (row: Row) => {
      state.updates[table] = (state.updates[table] || []).concat([row]);
      return { eq: () => Promise.resolve({ data: null, error: null }) };
    };

    return api;
  };

  return { from };
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => makeClient().from(table),
  },
}));

import { estimateConversionService } from '@/services/estimateToProjectConversion';

const COMPANY = 'company-1';

const baseEstimate: Row = {
  id: 'est-1',
  title: 'Whitfield kitchen',
  description: 'Full gut and refit',
  client_name: 'Dana Whitfield',
  client_email: 'dana@example.com',
  site_address: '14 Maple St',
  total_amount: 48000,
  project_id: null,
  status: 'accepted',
  notes: 'Owner supplies the range.',
};

const codedLines: Row[] = [
  {
    id: 'li-1', item_name: 'Framing', description: null, quantity: 1, unit: 'each',
    unit_cost: 12000, cost_code_id: 'cc-framing', category: 'Carpentry',
    labor_cost: 8000, material_cost: 4000, equipment_cost: null, total_cost: 12000,
  },
  {
    id: 'li-2', item_name: 'Blocking', description: null, quantity: 1, unit: 'each',
    unit_cost: 3000, cost_code_id: 'cc-framing', category: 'Carpentry',
    labor_cost: 3000, material_cost: null, equipment_cost: null, total_cost: 3000,
  },
  {
    id: 'li-3', item_name: 'Rough-in', description: null, quantity: 1, unit: 'each',
    unit_cost: 9000, cost_code_id: 'cc-plumbing', category: 'Plumbing',
    labor_cost: null, material_cost: null, equipment_cost: null, total_cost: 9000,
  },
];

beforeEach(() => {
  state.estimate = { ...baseEstimate };
  state.lineItems = codedLines.map((l) => ({ ...l }));
  state.inserts = {};
  state.updates = {};
  state.failInsertOn = null;
});

describe('estimate to project conversion (US-318)', () => {
  it('creates the project using columns that exist', async () => {
    const result = await estimateConversionService.convertEstimateToProject('est-1', COMPANY);

    expect(result.success).toBe(true);
    const [project] = state.inserts['projects'];

    // The three that did not exist and made every conversion fail.
    expect(project).not.toHaveProperty('location');
    expect(project).not.toHaveProperty('estimated_end_date');
    expect(project).not.toHaveProperty('created_from_estimate_id');

    expect(project).toMatchObject({
      company_id: COMPANY,
      name: 'Whitfield kitchen',
      site_address: '14 Maple St',
      created_from: 'estimate:est-1',
    });
  });

  it('seeds project_budgets, one row per cost code, summing the lines', async () => {
    const result = await estimateConversionService.convertEstimateToProject('est-1', COMPANY);

    const budgets = state.inserts['project_budgets'];
    expect(budgets).toHaveLength(2);

    const framing = budgets.find((b) => b.cost_code_id === 'cc-framing');
    expect(framing).toMatchObject({
      budgeted_amount: 15000,   // 12000 + 3000
      labor_budget: 11000,      // 8000 + 3000
      material_budget: 4000,
    });
    // Nothing invented where the estimator gave no split.
    expect(framing?.equipment_budget).toBeNull();

    const plumbing = budgets.find((b) => b.cost_code_id === 'cc-plumbing');
    expect(plumbing).toMatchObject({ budgeted_amount: 9000 });
    expect(plumbing?.labor_budget).toBeNull();

    expect(result.budgetLinesCreated).toBe(2);
    expect(result.budgetTotal).toBe(24000);
  });

  it('does not post the estimate as incurred cost', async () => {
    // job_costs holds actuals. Seeding it at conversion would make every job
    // start out fully spent, and the old code tried to - with a shape in which
    // every column was wrong.
    await estimateConversionService.convertEstimateToProject('est-1', COMPANY);
    expect(state.inserts['job_costs']).toBeUndefined();
  });

  it('marks the estimate converted and links it to the project', async () => {
    await estimateConversionService.convertEstimateToProject('est-1', COMPANY);
    const [update] = state.updates['estimates'];
    expect(update).toMatchObject({ status: 'accepted' });
    expect(update.project_id).toBeTruthy();
  });

  it('reports line items with no cost code instead of dropping them silently', async () => {
    state.lineItems = [
      ...codedLines,
      {
        id: 'li-4', item_name: 'Allowance', description: null, quantity: 1, unit: 'each',
        unit_cost: 5000, cost_code_id: null, category: null,
        labor_cost: null, material_cost: null, equipment_cost: null, total_cost: 5000,
      },
    ];

    const result = await estimateConversionService.convertEstimateToProject('est-1', COMPANY);

    expect(result.uncodedLineItems).toBe(1);
    expect(result.budgetTotal).toBe(24000); // the uncoded 5000 is not invented into a code
  });

  it('says the budget failed rather than reporting a clean conversion', async () => {
    state.failInsertOn = 'project_budgets';

    const result = await estimateConversionService.convertEstimateToProject('est-1', COMPANY);

    // The project exists, so this is not a failed conversion - but the caller
    // must not be told the budget came across.
    expect(result.success).toBe(true);
    expect(result.budgetLinesCreated).toBe(0);
    expect(result.error).toMatch(/budget was not/i);
  });

  it('refuses to convert an estimate twice', async () => {
    state.estimate = { ...baseEstimate, project_id: 'proj-existing' };

    const result = await estimateConversionService.convertEstimateToProject('est-1', COMPANY);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already been converted/i);
    expect(state.inserts['projects']).toBeUndefined();
  });

  it('warns in the preview when lines carry no cost code', async () => {
    state.lineItems = [{ id: 'li-9', cost_code_id: null }];

    const preview = await estimateConversionService.getConversionPreview('est-1');

    expect(preview.canConvert).toBe(true);
    expect(preview.warnings.join(' ')).toMatch(/no budget lines/i);
  });
});
