/**
 * US-327: bill the contract, not a constant.
 *
 * Two screens declared `const totalBudget = 100000` / `const totalInvoiceValue
 * = 100000` and then found their own prior invoices with a text search on the
 * notes field. Every figure a contractor saw was fiction unless the job was
 * worth exactly a hundred thousand dollars, and an invoice noting "progress
 * photos attached" counted as a progress billing.
 *
 * The headline case here is the one the story asks for: 30% of a $250,000
 * schedule of values with 10% retainage.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import {
  computeProgressInvoice,
  computeRetainageBalance,
  computeTimeAndMaterials,
  reconcileSovToContract,
  cents,
  type SovLine,
} from '../progressBilling';

const line = (id: string, scheduled: number, billed = 0): SovLine => ({
  sov_line_id: id,
  description: id,
  scheduled_value: scheduled,
  previously_billed: billed,
});

describe('progress billing off a schedule of values (US-327)', () => {
  it('bills 30% of a $250,000 SOV with 10% retainage', () => {
    const result = computeProgressInvoice({
      lines: [
        line('sitework', 50_000),
        line('framing', 100_000),
        line('mechanical', 60_000),
        line('finishes', 40_000),
      ],
      percentComplete: {
        sitework: 30, framing: 30, mechanical: 30, finishes: 30,
      },
      retainagePercentage: 10,
    });

    expect(result.contractTotal).toBe(250_000);
    expect(result.completedToDate).toBe(75_000);
    expect(result.thisPeriodGross).toBe(75_000);
    expect(result.retainageThisPeriod).toBe(7_500);
    expect(result.netDue).toBe(67_500);
    expect(result.remainingToBill).toBe(175_000);
  });

  it('bills only the increment when a line was already billed', () => {
    // The second period on the same job: framing goes 30% to 55%.
    const result = computeProgressInvoice({
      lines: [line('framing', 100_000, 30_000)],
      percentComplete: { framing: 55 },
      retainagePercentage: 10,
    });

    expect(result.completedToDate).toBe(55_000);
    expect(result.previouslyBilled).toBe(30_000);
    expect(result.thisPeriodGross).toBe(25_000);
    expect(result.retainageThisPeriod).toBe(2_500);
    expect(result.netDue).toBe(22_500);
  });

  it('holds a line at its billed percentage when none is entered', () => {
    // A period that touches one trade must not un-bill the rest. Before this,
    // a missing percentage would have read as zero and produced a credit.
    const result = computeProgressInvoice({
      lines: [line('framing', 100_000, 40_000), line('roofing', 50_000, 50_000)],
      percentComplete: { framing: 60 },
    });

    expect(result.lines.find((l) => l.sov_line_id === 'roofing')?.thisPeriod).toBe(0);
    expect(result.thisPeriodGross).toBe(20_000);
  });

  it('shows a credit rather than silently zeroing a reduced percentage', () => {
    // Clamping to zero here would hide a correction the accountant must see.
    const result = computeProgressInvoice({
      lines: [line('framing', 100_000, 60_000)],
      percentComplete: { framing: 45 },
    });
    expect(result.thisPeriodGross).toBe(-15_000);
  });

  it('never bills past 100% of a line', () => {
    const result = computeProgressInvoice({
      lines: [line('framing', 100_000, 90_000)],
      percentComplete: { framing: 140 },
    });
    expect(result.completedToDate).toBe(100_000);
    expect(result.thisPeriodGross).toBe(10_000);
  });

  it('rounds every line to cents so a long SOV closes out exactly', () => {
    // 33.33% of 10,000.01 is 3,333.003333, which is 3,333.00 on an invoice.
    // Left unrounded, twelve such lines total 39,996.039996 and the drift
    // grows every period until the final billing cannot close the contract.
    const lines = Array.from({ length: 12 }, (_, i) => line(`l${i}`, 10_000.01));
    const percents = Object.fromEntries(lines.map((l) => [l.sov_line_id, 33.33]));
    const result = computeProgressInvoice({ lines, percentComplete: percents });

    const unrounded = 10_000.01 * 0.3333 * 12;
    expect(unrounded).not.toBe(39_996);
    expect(result.thisPeriodGross).toBe(39_996);
    // completedToDate is rounded too, not just the period amount: it drives
    // the invoice's progress_percentage and the remaining-on-contract figure.
    expect(result.completedToDate).toBe(39_996);
    for (const l of result.lines) {
      expect(l.completedToDate).toBe(3_333);
      expect(l.thisPeriod).toBe(3_333);
      expect(cents(l.thisPeriod)).toBe(l.thisPeriod);
    }
  });

  it('treats zero retainage as no withholding', () => {
    const result = computeProgressInvoice({
      lines: [line('a', 10_000)],
      percentComplete: { a: 50 },
    });
    expect(result.retainageThisPeriod).toBe(0);
    expect(result.netDue).toBe(5_000);
  });
});

describe('retainage is one balance (US-327)', () => {
  it('is what was withheld less what was released', () => {
    const balance = computeRetainageBalance({ withheldToDate: 18_750, releasedToDate: 5_000 });
    expect(balance.balance).toBe(13_750);
  });

  it('never goes negative when more was released than withheld', () => {
    const balance = computeRetainageBalance({ withheldToDate: 1_000, releasedToDate: 1_400 });
    expect(balance.balance).toBe(0);
  });

  it('matches what the progress billings actually held back', () => {
    // Three periods on the $250,000 job at 10%: the retainage balance is the
    // sum of what each invoice withheld, not a percentage of a constant.
    const periods = [75_000, 60_000, 40_000];
    const withheld = periods.reduce(
      (sum, gross) => sum + computeProgressInvoice({
        lines: [line('contract', 250_000)],
        percentComplete: { contract: (gross / 250_000) * 100 },
        retainagePercentage: 10,
      }).retainageThisPeriod,
      0
    );
    expect(computeRetainageBalance({ withheldToDate: withheld, releasedToDate: 0 }).balance)
      .toBe(17_500);
  });
});

describe('time and materials (US-327)', () => {
  const rows = [
    { source_type: 'time' as const, source_id: 't1', description: 'Framing crew', work_date: '2026-09-01', quantity: 8, unit_price: 95 },
    { source_type: 'time' as const, source_id: 't2', description: 'Cleanup', work_date: '2026-09-02', quantity: 4.5, unit_price: 65 },
    { source_type: 'expense' as const, source_id: 'e1', description: 'Lumber', work_date: '2026-09-01', quantity: 1, unit_price: 1_320.5 },
  ];

  it('prices labor and expenses separately and totals them', () => {
    const totals = computeTimeAndMaterials(rows);
    expect(totals.laborTotal).toBe(1_052.5);
    expect(totals.expenseTotal).toBe(1_320.5);
    expect(totals.total).toBe(2_373);
  });

  it('refuses to bill an hour with no billing rate', () => {
    // Billing at zero reads to the customer as free work; billing at cost
    // gives away the margin. Neither is a default worth having.
    const totals = computeTimeAndMaterials([
      ...rows,
      { source_type: 'time' as const, source_id: 't3', description: 'New hire', work_date: '2026-09-03', quantity: 8, unit_price: null },
    ]);
    expect(totals.unpriced.map((r) => r.source_id)).toEqual(['t3']);
    expect(totals.total).toBe(2_373);
  });

  it('excludes a zero-hour entry rather than writing a zero line', () => {
    const totals = computeTimeAndMaterials([
      { source_type: 'time' as const, source_id: 't4', description: 'Clocked in and out', work_date: '2026-09-04', quantity: 0, unit_price: 95 },
    ]);
    expect(totals.billable).toHaveLength(0);
    expect(totals.unpriced).toHaveLength(1);
  });
});

describe('the SOV must reconcile to the contract (US-327)', () => {
  it('agrees when the schedule totals the contract', () => {
    expect(reconcileSovToContract({ sovTotal: 250_000, contractValue: 250_000 }).agrees).toBe(true);
  });

  it('reports the gap when a change order moved one and not the other', () => {
    const r = reconcileSovToContract({ sovTotal: 250_000, contractValue: 262_400 });
    expect(r.agrees).toBe(false);
    expect(r.difference).toBe(-12_400);
  });

  it('tolerates rounding across many lines', () => {
    expect(reconcileSovToContract({
      sovTotal: 250_000.08, contractValue: 250_000, toleranceCents: 12,
    }).agrees).toBe(true);
  });
});

/**
 * Strip comments before asserting on source. Both rewritten files open by
 * quoting the constant they replaced, so a raw match would fail on the
 * explanation rather than on the code.
 */
const strip = (path: string) =>
  readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('--'))
    .join('\n');

describe('the constants and the notes hack are gone (US-327)', () => {
  const progress = strip('src/components/invoices/ProgressBillingManager.tsx');
  const retention = strip('src/components/invoices/RetentionManager.tsx');

  it('no longer invents a $100,000 contract', () => {
    expect(progress).not.toMatch(/totalBudget\s*=\s*100000/);
    expect(retention).not.toMatch(/totalInvoiceValue\s*=\s*100000/);
  });

  it('no longer finds its own invoices by searching the notes text', () => {
    expect(progress).not.toMatch(/ilike\('notes'/);
    expect(retention).not.toMatch(/ilike\('notes'/);
  });

  it('reads the schedule of values and the retainage view instead', () => {
    expect(progress).toMatch(/from\('project_sov_status'\)/);
    expect(retention).toMatch(/from\('project_retainage'\)/);
  });

  it('writes the retainage columns that were always there and never set', () => {
    expect(progress).toMatch(/retention_percentage:/);
    expect(progress).toMatch(/retention_amount:/);
  });

  it('stamps each invoice with its type rather than a note to grep later', () => {
    expect(progress).toMatch(/invoice_type: 'progress'/);
    expect(retention).toMatch(/invoice_type: 'retention_release'/);
  });

  it('deleted the payment-application page that kept mock data', () => {
    expect(existsSync('src/components/financial/PaymentApplicationAutomation.tsx')).toBe(false);
  });
});

describe('the migration (US-327)', () => {
  const sql = strip('supabase/migrations/20260903130000_schedule_of_values.sql');

  it('is additive: no drops, no tightening', () => {
    expect(sql).not.toMatch(/DROP TABLE/);
    expect(sql).not.toMatch(/DROP COLUMN/);
    expect(sql).not.toMatch(/SET NOT NULL/);
  });

  it('leaves the broken payment_applications table alone', () => {
    // 20250912192312 declared it with a generated column referencing a column
    // that does not exist and another generated column, which Postgres
    // rejects. Migrations are append-only, so it is commented, not rewritten.
    const raw = readFileSync('supabase/migrations/20260903130000_schedule_of_values.sql', 'utf8');
    expect(raw).toMatch(/COMMENT ON TABLE public\.payment_applications/);
    expect(raw).toMatch(/DEPRECATED \(US-327\)/);
    expect(sql).not.toMatch(/CREATE TABLE[^;]*payment_applications/);
  });

  it('deprecates the retention model nothing wrote to', () => {
    const raw = readFileSync('supabase/migrations/20260903130000_schedule_of_values.sql', 'utf8');
    expect(raw).toMatch(/COMMENT ON TABLE public\.retention_items[\s\S]{0,80}DEPRECATED/);
  });

  it('drives retainage from the project terms', () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS retainage_percentage/);
  });

  it('keeps concurrent indexes out of the transactional migration', () => {
    expect(sql).not.toMatch(/CONCURRENTLY/);
    const idx = strip('supabase/migrations/20260903140000_sov_indexes.sql');
    expect(idx).toMatch(/CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_line_items_sov_line/);
  });

  it('stops the same hour being billed twice', () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS billed_invoice_id/);
    expect(sql).toMatch(/billed_invoice_id IS NULL/);
  });

  it('does not invent a billing rate when none is set', () => {
    const fn = sql.slice(sql.indexOf('FUNCTION public.resolve_billing_rate'));
    expect(fn).toMatch(/RETURN NULL;/);
  });
});
