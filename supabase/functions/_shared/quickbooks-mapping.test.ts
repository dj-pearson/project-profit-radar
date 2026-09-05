/**
 * US-333: QuickBooks imports land somewhere a contractor can see them.
 *
 * quickbooks-sync pulled Purchases into quickbooks_expenses and Payments into
 * quickbooks_payments - two tables read by no file in src/, absent from
 * types.ts, shown to nobody. The sync dashboard reported those runs as
 * successful, and US-252 made them paginate, so the larger the company the
 * more rows it imported into tables nobody sees.
 *
 * The rule these tests are mostly about: match confidently or do not match. An
 * expense on the wrong job is worse than one not imported.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  mapPurchase, mapPayment, customerRefOf, jobNameOf, summarise,
  type MappingContext, type QuickBooksPurchase, type QuickBooksPayment,
} from './quickbooks-mapping';

const strip = (path: string) =>
  readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('--'))
    .join('\n');

const ctx = (over: Partial<MappingContext> = {}): MappingContext => ({
  companyId: 'co-1',
  projectsByName: new Map([['maple st', 'proj-maple'], ['whitfield:maple st', 'proj-full']]),
  costCodesByName: new Map([['06-100', 'cc-carp'], ['rough carpentry', 'cc-carp'], ['lumber', 'cc-lumber']]),
  invoicesByNumber: new Map([['INV-2026-0007', { id: 'inv-7', amountDue: 1000 }]]),
  invoicesByQbId: new Map([['qb-inv-42', { id: 'inv-42', amountDue: 500 }]]),
  ...over,
});

const purchase = (over: Partial<QuickBooksPurchase> = {}): QuickBooksPurchase => ({
  Id: 'p1',
  TxnDate: '2026-09-01',
  TotalAmt: 1234.56,
  EntityRef: { name: 'Ace Lumber' },
  Line: [{
    Amount: 1234.56,
    AccountBasedExpenseLineDetail: {
      AccountRef: { name: 'Rough Carpentry' },
      CustomerRef: { name: 'Maple St' },
    },
  }],
  ...over,
});

describe('a QuickBooks purchase becomes an expense (US-333)', () => {
  it('maps vendor, amount, date and description', () => {
    const result = mapPurchase(purchase(), ctx());
    expect(result.kind).toBe('expense');
    if (result.kind !== 'expense') return;
    expect(result.row.vendor_name).toBe('Ace Lumber');
    expect(result.row.amount).toBe(1234.56);
    expect(result.row.expense_date).toBe('2026-09-01');
    expect(result.row.company_id).toBe('co-1');
  });

  it('finds the job on the line, not the header', () => {
    // QuickBooks puts the customer/job on the line detail; the header is the
    // vendor. Reading only the header is how every imported expense ends up on
    // no project.
    const result = mapPurchase(purchase(), ctx());
    if (result.kind !== 'expense') throw new Error('expected an expense');
    expect(result.row.project_id).toBe('proj-maple');
    expect(result.projectMatch).toBe('exact');
  });

  it('reads the job half of "Customer:Job"', () => {
    expect(jobNameOf('Whitfield:Maple St')).toBe('Maple St');
    expect(jobNameOf('Maple St')).toBe('Maple St');
    expect(jobNameOf(undefined)).toBeNull();

    const result = mapPurchase(
      purchase({
        Line: [{ AccountBasedExpenseLineDetail: { CustomerRef: { name: 'Someone:Maple St' } } }],
      }),
      ctx()
    );
    if (result.kind !== 'expense') throw new Error('expected an expense');
    expect(result.row.project_id).toBe('proj-maple');
  });

  it('prefers the whole "Customer:Job" string when a project matches it', () => {
    const result = mapPurchase(
      purchase({
        Line: [{ AccountBasedExpenseLineDetail: { CustomerRef: { name: 'Whitfield:Maple St' } } }],
      }),
      ctx()
    );
    if (result.kind !== 'expense') throw new Error('expected an expense');
    expect(result.row.project_id).toBe('proj-full');
  });

  it('matches a cost code by account name or by code', () => {
    const byName = mapPurchase(purchase(), ctx());
    if (byName.kind !== 'expense') throw new Error('expected an expense');
    expect(byName.row.cost_code_id).toBe('cc-carp');

    const byCode = mapPurchase(
      purchase({
        Line: [{ AccountBasedExpenseLineDetail: { AccountRef: { name: '06-100' } } }],
      }),
      ctx()
    );
    if (byCode.kind !== 'expense') throw new Error('expected an expense');
    expect(byCode.row.cost_code_id).toBe('cc-carp');
  });

  it('imports an expense with no project rather than guessing one', () => {
    // It is a real cost the company incurred and belongs in the expense list.
    // The queue is how it gets assigned to a job.
    const result = mapPurchase(
      purchase({ Line: [{ AccountBasedExpenseLineDetail: { CustomerRef: { name: 'Unknown Job' } } }] }),
      ctx()
    );
    if (result.kind !== 'expense') throw new Error('expected an expense');
    expect(result.row.project_id).toBeNull();
    expect(result.projectMatch).toBe('none');
  });

  it('never fuzzy-matches a job', () => {
    // Two jobs for the same customer differ by a word. A near match here posts
    // the cost to the wrong one, which nobody notices until the job closes.
    const result = mapPurchase(
      purchase({ Line: [{ AccountBasedExpenseLineDetail: { CustomerRef: { name: 'Maple Street' } } }] }),
      ctx()
    );
    if (result.kind !== 'expense') throw new Error('expected an expense');
    expect(result.row.project_id).toBeNull();
  });

  it('carries the billable flag through', () => {
    const result = mapPurchase(
      purchase({
        Line: [{
          AccountBasedExpenseLineDetail: {
            CustomerRef: { name: 'Maple St' }, BillableStatus: 'Billable',
          },
        }],
      }),
      ctx()
    );
    if (result.kind !== 'expense') throw new Error('expected an expense');
    expect(result.row.is_billable).toBe(true);
  });

  it('queues a purchase with no date or no amount', () => {
    const noDate = mapPurchase(purchase({ TxnDate: undefined }), ctx());
    expect(noDate.kind).toBe('unmatched');
    const noAmount = mapPurchase(purchase({ TotalAmt: 0 }), ctx());
    expect(noAmount.kind).toBe('unmatched');
    if (noAmount.kind !== 'unmatched') return;
    expect(noAmount.reason).toBe('Zero amount');
  });

  it('reads the customer ref off either line detail shape', () => {
    expect(customerRefOf(purchase())?.name).toBe('Maple St');
    expect(customerRefOf(purchase({
      Line: [{ ItemBasedExpenseLineDetail: { CustomerRef: { name: 'Other' } } }],
    }))?.name).toBe('Other');
    expect(customerRefOf(purchase({ Line: [] }))).toBeNull();
  });
});

describe('a QuickBooks payment becomes an invoice payment (US-333)', () => {
  const payment = (over: Partial<QuickBooksPayment> = {}): QuickBooksPayment => ({
    Id: 'pay-1',
    TxnDate: '2026-09-02',
    TotalAmt: 500,
    CustomerRef: { name: 'Whitfield' },
    Line: [{ Amount: 500, LinkedTxn: [{ TxnId: 'qb-inv-42', TxnType: 'Invoice' }] }],
    ...over,
  });

  it('uses the linked transaction, which is authoritative', () => {
    const result = mapPayment(payment(), ctx());
    expect(result.kind).toBe('payment');
    if (result.kind !== 'payment') return;
    expect(result.row.invoice_id).toBe('inv-42');
    expect(result.row.payment_amount).toBe(500);
  });

  it('falls back to an invoice number in the reference or memo', () => {
    const byRef = mapPayment(
      payment({ Line: [], PaymentRefNum: 'INV-2026-0007' }), ctx());
    if (byRef.kind !== 'payment') throw new Error('expected a payment');
    expect(byRef.row.invoice_id).toBe('inv-7');

    const byMemo = mapPayment(
      payment({ Line: [], PrivateNote: 'INV-2026-0007' }), ctx());
    if (byMemo.kind !== 'payment') throw new Error('expected a payment');
    expect(byMemo.row.invoice_id).toBe('inv-7');
  });

  it('refuses to import a payment it cannot tie to an invoice', () => {
    // Unlike an expense. A payment row pointing at the wrong invoice marks it
    // paid, and an AR list saying a customer has paid when they have not is
    // worse than one missing a row.
    const result = mapPayment(payment({ Line: [], PaymentRefNum: 'UNKNOWN' }), ctx());
    expect(result.kind).toBe('unmatched');
    if (result.kind !== 'unmatched') return;
    expect(result.reason).toMatch(/No linked invoice/);
    expect(result.counterparty).toBe('Whitfield');
  });

  it('ignores a linked transaction that is not an invoice', () => {
    const result = mapPayment(
      payment({ Line: [{ LinkedTxn: [{ TxnId: 'qb-inv-42', TxnType: 'CreditMemo' }] }] }),
      ctx()
    );
    expect(result.kind).toBe('unmatched');
  });

  it('queues a payment with no date or a non-positive amount', () => {
    expect(mapPayment(payment({ TxnDate: undefined }), ctx()).kind).toBe('unmatched');
    expect(mapPayment(payment({ TotalAmt: 0 }), ctx()).kind).toBe('unmatched');
    expect(mapPayment(payment({ TotalAmt: -50 }), ctx()).kind).toBe('unmatched');
  });
});

describe('the run summary the dashboard was missing (US-333)', () => {
  it('counts imported, queued and unassigned separately', () => {
    const results = [
      mapPurchase(purchase(), ctx()),
      mapPurchase(purchase({ Id: 'p2', Line: [{ AccountBasedExpenseLineDetail: { CustomerRef: { name: 'Nope' } } }] }), ctx()),
      mapPurchase(purchase({ Id: 'p3', TotalAmt: 0 }), ctx()),
    ];
    const summary = summarise(results);
    expect(summary.imported).toBe(2);
    expect(summary.needsReview).toBe(1);
    expect(summary.withoutProject).toBe(1);
  });
});

describe('the sync function uses it (US-333)', () => {
  const fn = strip('supabase/functions/quickbooks-sync/index.ts');

  it('no longer writes the two shadow tables', () => {
    expect(fn).not.toMatch(/from\('quickbooks_expenses'\)/);
    expect(fn).not.toMatch(/from\('quickbooks_payments'\)/);
  });

  it('writes the real tables instead', () => {
    expect(fn).toMatch(/from\('expenses'\)/);
    expect(fn).toMatch(/from\('invoice_payments'\)/);
  });

  it('is idempotent on the QuickBooks id', () => {
    // A second run must update rather than importing the same cost twice.
    expect(fn).toMatch(/onConflict: 'company_id,qb_purchase_id'/);
    expect(fn).toMatch(/onConflict: 'company_id,qb_payment_id'/);
  });

  it('builds the lookups once per run, not per record', () => {
    // US-252 made these syncs paginate through everything a company has.
    expect(fn).toMatch(/const mappingContext = await buildMappingContext/);
  });

  it('queues what it cannot map', () => {
    expect(fn).toMatch(/from\('quickbooks_sync_review'\)/);
  });
});

describe('the migration (US-333)', () => {
  const raw = readFileSync('supabase/migrations/20260903230000_quickbooks_review_queue.sql', 'utf8');
  const sql = strip('supabase/migrations/20260903230000_quickbooks_review_queue.sql');

  it('is additive: no drops, no tightening', () => {
    expect(sql).not.toMatch(/DROP TABLE/);
    expect(sql).not.toMatch(/DROP COLUMN/);
    expect(sql).not.toMatch(/ALTER COLUMN[^;]*SET NOT NULL/);
  });

  it('deprecates the shadow tables rather than dropping them', () => {
    expect(raw).toMatch(/COMMENT ON TABLE public\.quickbooks_expenses[\s\S]{0,60}DEPRECATED \(US-333\)/);
    expect(raw).toMatch(/COMMENT ON TABLE public\.quickbooks_payments[\s\S]{0,60}DEPRECATED \(US-333\)/);
  });

  it('keeps one queue row per QuickBooks record', () => {
    expect(sql).toMatch(/UNIQUE \(company_id, entity, qb_id\)/);
  });

  it('makes the import idempotent in the database too', () => {
    const idx = strip('supabase/migrations/20260903240000_quickbooks_review_indexes.sql');
    expect(idx).toMatch(/CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_qb_purchase/);
    expect(idx).toMatch(/CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_payments_qb_payment/);
  });

  it('keeps concurrent indexes out of the transactional migration', () => {
    expect(sql).not.toMatch(/CONCURRENTLY/);
  });

  it('guards each policy on the name it creates, so a re-run is safe', () => {
    const created = [...raw.matchAll(/CREATE POLICY "([^"]+)"/g)].map((m) => m[1]);
    const guarded = [...raw.matchAll(/policyname = '([^']+)'/g)].map((m) => m[1]);
    expect(created.sort()).toEqual(guarded.sort());
  });
});
