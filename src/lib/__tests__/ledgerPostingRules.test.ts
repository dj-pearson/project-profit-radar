/**
 * US-334: every posting rule balances, uses the right accounts, and skips
 * rather than guesses. The figures are the ones supabase/tests/rls/
 * ledger_posting.test.sql proves against the real triggers on Postgres, so a
 * rule changed in one place and not the other fails one of the two suites.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  billLines,
  billPaymentLines,
  creditsOf,
  debitsOf,
  expenseLines,
  invoiceLines,
  invoicePaymentLines,
  isBalanced,
  jobCostRole,
  normalizeLines,
  reconcile,
  sourceLabel,
  timeEntryLines,
  type PostingResult,
  type PostingRole,
  type ResolveAccount,
} from '../ledgerPostingRules';

// The seeded chart (20250707000001), by role.
const SEEDED: Record<PostingRole, string> = {
  receivable: '1100',
  retainage_receivable: '1110',
  bank: '1010',
  credit_card: '2100',
  payable: '2000',
  sales_tax_payable: '2200',
  accrued_wages: '2300',
  revenue: '4000',
  direct_labor: '5000',
  direct_materials: '5100',
  subcontractors: '5200',
  equipment_costs: '5300',
  other_cogs: '5400',
  overhead_expense: '6920',
};
const seeded: ResolveAccount = (role) => SEEDED[role];
const without = (...missing: PostingRole[]): ResolveAccount =>
  (role) => (missing.includes(role) ? null : SEEDED[role]);

/** Net amount per account, for readable assertions. */
function byAccount(result: PostingResult): Record<string, number> {
  expect(result.status).toBe('post');
  if (result.status !== 'post') return {};
  const out: Record<string, number> = {};
  for (const l of result.lines) out[l.account as string] = (out[l.account as string] ?? 0) + l.amount;
  return out;
}

function expectBalanced(result: PostingResult) {
  if (result.status !== 'post') throw new Error(`expected post, got ${result.status}`);
  expect(isBalanced(result.lines)).toBe(true);
  expect(debitsOf(result.lines)).toBe(creditsOf(result.lines));
}

describe('invoice (AR / revenue)', () => {
  it('posts receivable against revenue and tax to its liability', () => {
    const r = invoiceLines({ status: 'sent', total_amount: 1080, tax_amount: 80 }, seeded);
    expectBalanced(r);
    expect(byAccount(r)).toEqual({ '1100': 1080, '2200': -80, '4000': -1000 });
  });

  it('books retainage withheld as earned revenue in its own receivable', () => {
    const r = invoiceLines(
      { status: 'sent', invoice_type: 'progress', total_amount: 9000, retention_amount: 1000 }, seeded);
    expectBalanced(r);
    expect(byAccount(r)).toEqual({ '1100': 9000, '1110': 1000, '4000': -10000 });
  });

  it('moves a retainage release between receivables without booking revenue twice', () => {
    const r = invoiceLines(
      { status: 'sent', invoice_type: 'retention_release', total_amount: 1000 }, seeded);
    expectBalanced(r);
    expect(byAccount(r)).toEqual({ '1100': 1000, '1110': -1000 });
  });

  it('falls back to the receivable account when there is no retainage account', () => {
    const r = invoiceLines(
      { status: 'sent', total_amount: 900, retention_amount: 100 }, without('retainage_receivable'));
    expect(byAccount(r)).toEqual({ '1100': 1000, '4000': -1000 });
  });

  it('posts nothing for a draft, a void or a cancelled invoice', () => {
    for (const status of ['draft', 'void', 'cancelled', null]) {
      expect(invoiceLines({ status, total_amount: 100 }, seeded).status).toBe('nothing');
    }
  });

  it('skips rather than guesses when the revenue account is missing', () => {
    expect(invoiceLines({ status: 'sent', total_amount: 100 }, without('revenue')).status).toBe('skip');
  });

  it('does not need a tax account for an invoice with no tax', () => {
    const r = invoiceLines({ status: 'sent', total_amount: 100, tax_amount: 0 }, without('sales_tax_payable'));
    expect(byAccount(r)).toEqual({ '1100': 100, '4000': -100 });
  });

  it('flips sides for a negative (credit) invoice rather than dropping it', () => {
    const r = invoiceLines({ status: 'sent', total_amount: -200 }, seeded);
    expectBalanced(r);
    expect(byAccount(r)).toEqual({ '1100': -200, '4000': 200 });
  });

  it('carries the project on every line', () => {
    const r = invoiceLines({ status: 'sent', total_amount: 100, project_id: 'p1' }, seeded);
    if (r.status !== 'post') throw new Error('expected post');
    expect(r.lines.every((l) => l.projectId === 'p1')).toBe(true);
  });
});

describe('customer payment (cash / AR)', () => {
  it('posts the bank against receivable', () => {
    const r = invoicePaymentLines({ payment_amount: 4500 }, seeded);
    expectBalanced(r);
    expect(byAccount(r)).toEqual({ '1010': 4500, '1100': -4500 });
  });

  it('skips when the company has no bank or cash account', () => {
    expect(invoicePaymentLines({ payment_amount: 1 }, without('bank')).status).toBe('skip');
  });
});

describe('expense (cost / cash or card)', () => {
  it('posts a job expense by category against the card', () => {
    const r = expenseLines(
      { amount: 300, project_id: 'p1', payment_method: 'credit_card', category: 'Subcontractor' }, seeded);
    expectBalanced(r);
    expect(byAccount(r)).toEqual({ '5200': 300, '2100': -300 });
  });

  it('posts an uncategorised job expense as materials, as US-322 costs it', () => {
    expect(byAccount(expenseLines({ amount: 120, project_id: 'p1', payment_method: 'check' }, seeded)))
      .toEqual({ '5100': 120, '1010': -120 });
  });

  it('posts overhead when the expense is on no job', () => {
    expect(byAccount(expenseLines({ amount: 50, payment_method: 'check' }, seeded)))
      .toEqual({ '6920': 50, '1010': -50 });
  });

  it('posts nothing for a rejected expense', () => {
    expect(expenseLines({ amount: 75, payment_status: 'rejected' }, seeded).status).toBe('nothing');
  });

  it('maps categories to job-cost accounts', () => {
    expect(jobCostRole('Labor')).toBe('direct_labor');
    expect(jobCostRole('Equipment rental')).toBe('equipment_costs');
    expect(jobCostRole('Permits & fees')).toBe('other_cogs');
    expect(jobCostRole('Lumber')).toBe('direct_materials');
    expect(jobCostRole(null)).toBe('direct_materials');
  });
});

describe('bill (expense lines / AP)', () => {
  it('posts each line with its tax against payables for the total', () => {
    const r = billLines({
      status: 'open',
      lines: [
        { expense_account_id: '5100', amount: 500, tax_amount: 40 },
        { expense_account_id: '6200', amount: 200 },
      ],
    }, seeded);
    expectBalanced(r);
    expect(byAccount(r)).toEqual({ '5100': 540, '6200': 200, '2000': -740 });
  });

  it('credits the bill\'s own payables account when it names one', () => {
    const r = billLines({
      status: 'open', ap_account_id: '2010',
      lines: [{ expense_account_id: '5200', amount: 1000 }],
    }, seeded);
    expect(byAccount(r)).toEqual({ '5200': 1000, '2010': -1000 });
  });

  it('skips a bill with no lines instead of guessing an expense account', () => {
    expect(billLines({ status: 'open', lines: [] }, seeded).status).toBe('skip');
  });

  it('posts nothing for a draft or void bill', () => {
    expect(billLines({ status: 'void', lines: [{ expense_account_id: '5100', amount: 1 }] }, seeded).status)
      .toBe('nothing');
  });
});

describe('bill payment (AP / cash)', () => {
  it('clears payables from the bank', () => {
    const r = billPaymentLines(
      { total_amount: 400, payment_method: 'check', applications: [{ amount_applied: 400 }] }, seeded);
    expectBalanced(r);
    expect(byAccount(r)).toEqual({ '2000': 400, '1010': -400 });
  });

  it('is the same entry before and after its applications arrive', () => {
    // The app inserts the payment, then its applications, in two requests.
    // The same lines both times is what keeps that from posting twice.
    const before = billPaymentLines({ total_amount: 400, applications: [] }, seeded);
    const after = billPaymentLines({ total_amount: 400, applications: [{ amount_applied: 400 }] }, seeded);
    expect(before).toEqual(after);
  });

  it('clears each bill\'s own payables account', () => {
    const r = billPaymentLines({
      total_amount: 500,
      applications: [{ amount_applied: 300, bill_ap_account_id: '2010' }, { amount_applied: 200 }],
    }, seeded);
    expectBalanced(r);
    expect(byAccount(r)).toEqual({ '2010': 300, '2000': 200, '1010': -500 });
  });

  it('pays from the bank account it names, or the card for a card payment', () => {
    expect(byAccount(billPaymentLines({ total_amount: 10, bank_account_id: '1030', applications: [] }, seeded)))
      .toEqual({ '2000': 10, '1030': -10 });
    expect(byAccount(billPaymentLines({ total_amount: 10, payment_method: 'credit_card', applications: [] }, seeded)))
      .toEqual({ '2000': 10, '2100': -10 });
  });
});

describe('approved labour (direct labor / accrued wages)', () => {
  it('posts the frozen labor cost', () => {
    const r = timeEntryLines({ approval_status: 'approved', labor_cost: 250.5, project_id: 'p1' }, seeded);
    expectBalanced(r);
    expect(byAccount(r)).toEqual({ '5000': 250.5, '2300': -250.5 });
  });

  it('posts nothing until approved, or without a cost', () => {
    expect(timeEntryLines({ approval_status: 'pending', labor_cost: 100 }, seeded).status).toBe('nothing');
    expect(timeEntryLines({ approval_status: 'approved', labor_cost: null }, seeded).status).toBe('nothing');
  });

  it('skips when the chart has no accrued wages account', () => {
    expect(timeEntryLines({ approval_status: 'approved', labor_cost: 1 }, without('accrued_wages')).status)
      .toBe('skip');
  });
});

describe('normalising lines', () => {
  it('nets lines on the same account, project and cost code and drops zeros', () => {
    expect(normalizeLines([
      { account: 'a', amount: 10 },
      { account: 'a', amount: -10 },
      { account: 'b', amount: 5, projectId: 'p' },
      { account: 'b', amount: 5, projectId: 'p' },
    ])).toEqual([{ account: 'b', amount: 10, projectId: 'p', costCodeId: null }]);
  });

  it('rounds to cents so 0.1 + 0.2 balances', () => {
    expect(isBalanced(normalizeLines([
      { account: 'a', amount: 0.1 }, { account: 'a', amount: 0.2 }, { account: 'b', amount: -0.3 },
    ]))).toBe(true);
  });
});

describe('reconciling with what is already posted (idempotency)', () => {
  const posted = invoiceLines({ status: 'sent', total_amount: 1080, tax_amount: 80 }, seeded);
  const current = posted.status === 'post' ? posted.lines : [];

  it('writes nothing when the ledger already matches the document', () => {
    expect(reconcile(current, posted)).toEqual({ reversal: null, posting: null });
  });

  it('writes nothing for the first posting of a document that should have nothing', () => {
    expect(reconcile([], { status: 'nothing' })).toEqual({ reversal: null, posting: null });
  });

  it('reverses what is there and posts the new figures on a correction', () => {
    const corrected = invoiceLines({ status: 'sent', total_amount: 1296, tax_amount: 96 }, seeded);
    const { reversal, posting } = reconcile(current, corrected);
    expect(reversal && isBalanced(reversal)).toBe(true);
    expect(posting && isBalanced(posting)).toBe(true);
    // Original + reversal + new nets to exactly the new document.
    const net = normalizeLines([...current, ...(reversal ?? []), ...(posting ?? [])]);
    expect(net).toEqual(corrected.status === 'post' ? corrected.lines : []);
  });

  it('reverses to zero on a void and posts nothing new', () => {
    const { reversal, posting } = reconcile(current, invoiceLines({ status: 'void', total_amount: 1080 }, seeded));
    expect(posting).toBeNull();
    expect(normalizeLines([...current, ...(reversal ?? [])])).toEqual([]);
  });

  it('leaves the ledger alone when the document cannot be posted', () => {
    expect(reconcile(current, { status: 'skip', reason: 'x' })).toEqual({ reversal: null, posting: null });
  });
});

describe('labels', () => {
  it('names each source the rules post under', () => {
    expect(sourceLabel('invoice_payment')).toBe('Customer payment');
    expect(sourceLabel('time_entry')).toBe('Approved labor');
    expect(sourceLabel(null)).toBe('Journal entry');
  });
});

describe('the migration agrees with these rules (US-334)', () => {
  const sql = readFileSync('supabase/migrations/20260924180000_ledger_posting_all_sources.sql', 'utf8')
    .split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');

  it('looks accounts up by the same seeded numbers', () => {
    for (const [role, number] of Object.entries(SEEDED)) {
      expect(sql, role).toMatch(new RegExp(`\\('${role}',\\s+1, '${number}'`));
    }
  });

  it('is additive: no drops, no tightening, no deletes of ledger rows', () => {
    expect(sql).not.toMatch(/DROP (TABLE|COLUMN|FUNCTION)/i);
    expect(sql).not.toMatch(/SET NOT NULL/i);
    expect(sql).not.toMatch(/DELETE FROM public\.journal_/i);
  });

  it('takes the ledger internals away from client roles', () => {
    for (const fn of ['post_ledger_entry', 'ledger_sync', 'ledger_write_entry', 'ledger_sync_invoice']) {
      expect(sql, fn).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\([^)]*\\) FROM PUBLIC, anon, authenticated`));
    }
  });

  it('pins search_path on every SECURITY DEFINER function it defines', () => {
    const fns = sql.split(/CREATE OR REPLACE FUNCTION/).slice(1);
    for (const fn of fns.filter((f) => /SECURITY DEFINER/.test(f.split('AS $$')[0]))) {
      expect(fn.split('AS $$')[0]).toMatch(/SET search_path = public/);
    }
  });
});
