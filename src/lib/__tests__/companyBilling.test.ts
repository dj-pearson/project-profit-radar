/**
 * US-332: the settings a contractor hits in the first hour.
 *
 * None of this existed. No tax_rates table and no default_tax_rate column
 * anywhere in src or migrations; invoice numbers from a global sequence with a
 * hardcoded 'INV-' prefix, so two companies interleave and each sees gaps in
 * its own numbering; a licence column the CSV templates carry and no UI writes;
 * terms and conditions only inside estimate templates, so an invoice had none.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import {
  formatDocumentNumber, dueDateFrom, paymentTermsLabel, computeTax,
  termsFor, licenceLine, insuranceExpired,
} from '../companyBilling';

const strip = (path: string) =>
  readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('--'))
    .join('\n');

describe('document numbering (US-332)', () => {
  const onDate = new Date(2026, 8, 4);

  it('formats a number the way the database will mint it', () => {
    expect(formatDocumentNumber({ prefix: 'INV-', includeYear: true, padWidth: 4 }, 7, onDate))
      .toBe('INV-2026-0007');
  });

  it('drops the year when a company does not want one', () => {
    expect(formatDocumentNumber({ prefix: 'INV-', includeYear: false, padWidth: 5 }, 42, onDate))
      .toBe('INV-00042');
  });

  it('takes an empty prefix', () => {
    expect(formatDocumentNumber({ prefix: '', includeYear: false, padWidth: 3 }, 9, onDate))
      .toBe('009');
  });

  it('does not truncate a number wider than the padding', () => {
    // Padding is a minimum, not a maximum. Truncating would mint a duplicate.
    expect(formatDocumentNumber({ prefix: '', includeYear: false, padWidth: 2 }, 123456, onDate))
      .toBe('123456');
  });

  it('clamps a nonsense padding rather than producing a giant string', () => {
    expect(formatDocumentNumber({ prefix: '', includeYear: false, padWidth: 0 }, 1, onDate))
      .toBe('1');
    expect(formatDocumentNumber({ prefix: '', includeYear: false, padWidth: 99 }, 1, onDate))
      .toHaveLength(12);
  });
});

describe('payment terms (US-332)', () => {
  it('computes a due date from the issue date', () => {
    expect(dueDateFrom('2026-09-04', 30)).toBe('2026-10-04');
  });

  it('treats zero days as due on receipt, not as a missing value', () => {
    expect(dueDateFrom('2026-09-04', 0)).toBe('2026-09-04');
    expect(paymentTermsLabel(0)).toBe('Due on receipt');
    expect(paymentTermsLabel(30)).toBe('Net 30');
  });

  it('crosses a month and a year end', () => {
    expect(dueDateFrom('2026-12-15', 30)).toBe('2027-01-14');
  });

  it('reads a date as local, not UTC', () => {
    // new Date('2026-09-04') is UTC midnight and shifts back a day west of
    // Greenwich, which would make every invoice due a day early there.
    //
    // Asserted on the source rather than the output: CI runs in UTC, where
    // both parses agree, so a behavioural test here passes either way and
    // proves nothing. Verified by mutation - replacing the date-only branch
    // with new Date() leaves every behavioural assertion in this file green.
    const src = readFileSync('src/lib/companyBilling.ts', 'utf8');
    expect(src).toMatch(/const m = \/\^\(\\d\{4\}\)-\(\\d\{2\}\)-\(\\d\{2\}\)\//);
    expect(src).toMatch(/new Date\(Number\(m\[1\]\), Number\(m\[2\]\) - 1, Number\(m\[3\]\)\)/);
    expect(dueDateFrom('2026-09-04', 0)).toBe('2026-09-04');
  });
});

describe('tax (US-332)', () => {
  it('applies the company default to lines with no rate of their own', () => {
    const t = computeTax([{ amount: 1000 }, { amount: 500 }], 8.25);
    expect(t.subtotal).toBe(1500);
    expect(t.taxAmount).toBe(123.75);
    expect(t.total).toBe(1623.75);
  });

  it('lets a line override the default', () => {
    const t = computeTax([{ amount: 1000, taxRate: 6 }, { amount: 1000 }], 8);
    expect(t.taxAmount).toBe(140);
    expect(t.byRate.map((g) => g.rate)).toEqual([6, 8]);
  });

  it('leaves an untaxed line out of the tax but in the subtotal', () => {
    // Labour is not taxed in most states; it is still on the invoice.
    const t = computeTax([{ amount: 1000, taxable: false }, { amount: 1000 }], 10);
    expect(t.subtotal).toBe(2000);
    expect(t.taxAmount).toBe(100);
  });

  it('rounds per rate rather than per line', () => {
    // Rounding each line and adding is what makes an invoice total disagree
    // with the same figures re-entered in QuickBooks. Three lines at 8.25%:
    // per-line gives 0.83 + 0.83 + 0.83 = 2.49; per-rate gives 2.48.
    const t = computeTax(
      [{ amount: 10.01 }, { amount: 10.01 }, { amount: 10.01 }],
      8.25
    );
    expect(t.taxAmount).toBe(2.48);
  });

  it('charges nothing at a zero rate', () => {
    const t = computeTax([{ amount: 1000 }], 0);
    expect(t.taxAmount).toBe(0);
    expect(t.total).toBe(1000);
  });
});

describe('what prints on a document (US-332)', () => {
  it('gives each document type its own terms', () => {
    const settings = {
      estimate_terms: 'Valid 30 days',
      invoice_terms: 'Net 30',
      change_order_terms: 'Signed before work',
    };
    expect(termsFor(settings, 'estimate')).toBe('Valid 30 days');
    expect(termsFor(settings, 'invoice')).toBe('Net 30');
    expect(termsFor(settings, 'change_order')).toBe('Signed before work');
    expect(termsFor(settings, 'purchase_order')).toBe('');
    expect(termsFor(null, 'invoice')).toBe('');
  });

  it('builds the licence line from whatever is filled in', () => {
    expect(licenceLine({ license_number: 'CA-12345' })).toBe('Licence CA-12345');
    expect(licenceLine({
      license_number: 'CA-12345', insurance_carrier: 'Acme', insurance_policy_number: 'P-9',
    })).toBe('Licence CA-12345 | Insured by Acme (policy P-9)');
    expect(licenceLine({})).toBe('');
  });

  it('knows when the insurance on file has lapsed', () => {
    const today = new Date(2026, 8, 4);
    expect(insuranceExpired('2026-09-03', today)).toBe(true);
    expect(insuranceExpired('2026-09-04', today)).toBe(false);
    expect(insuranceExpired(null, today)).toBe(false);
  });
});

describe('the migration (US-332)', () => {
  const raw = readFileSync('supabase/migrations/20260903210000_company_billing_settings.sql', 'utf8');
  const sql = strip('supabase/migrations/20260903210000_company_billing_settings.sql');

  it('is additive: no drops, no tightening', () => {
    expect(sql).not.toMatch(/DROP TABLE/);
    expect(sql).not.toMatch(/DROP COLUMN/);
    expect(sql).not.toMatch(/ALTER COLUMN[^;]*SET NOT NULL/);
  });

  it('renumbers nobody: an unconfigured company keeps the global sequence', () => {
    // This is what makes the migration safe to apply to a live database.
    const fn = sql.slice(sql.indexOf('FUNCTION public.next_document_number'));
    expect(fn).toMatch(/IF NOT FOUND THEN\s*RETURN NULL;/);
    expect(sql).toMatch(/COALESCE\(v_number, public\.generate_invoice_number\(\)\)/);
    expect(sql).toMatch(/COALESCE\(v_number, public\.generate_estimate_number\(\)\)/);
  });

  it('hands out a number under a row lock, so two people cannot get the same one', () => {
    const fn = sql.slice(sql.indexOf('FUNCTION public.next_document_number'));
    expect(fn).toMatch(/UPDATE public\.document_number_settings[\s\S]*RETURNING next_number - 1/);
  });

  it('counts per company, which is the whole point', () => {
    expect(sql).toMatch(/PRIMARY KEY \(company_id, doc_type\)/);
  });

  it('does not let an estimator rewind the counter', () => {
    // next_number is advanced by a SECURITY DEFINER function; direct writes are
    // restricted, or somebody could reset it and mint a duplicate invoice
    // number.
    const policy = sql.slice(sql.indexOf('CREATE POLICY "Admins set their company numbering"'));
    for (const role of ['admin', 'root_admin', 'accounting']) {
      expect(policy).toMatch(new RegExp(`'${role}'`));
    }
    expect(policy).not.toMatch(/'field_supervisor'/);
  });

  it('keeps the trigger functions unprivileged', () => {
    // The originals were not SECURITY DEFINER and only the counter needs to be.
    const trigger = sql.slice(sql.indexOf('FUNCTION public.set_invoice_number'));
    const body = trigger.slice(0, trigger.indexOf('$$;'));
    expect(body).not.toMatch(/SECURITY DEFINER/);
  });

  it('allows only one default tax rate per company', () => {
    expect(sql).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_rates_one_default[\s\S]{0,120}WHERE is_default/);
  });

  it('carries the unrouted page settings over before it is deleted', () => {
    expect(sql).toMatch(/billing_settings->>'default_payment_terms'/);
    expect(existsSync('src/pages/CompanyAdminSettings.tsx')).toBe(false);
  });

  it('guards each policy on the name it creates, so a re-run is safe', () => {
    const created = [...raw.matchAll(/CREATE POLICY "([^"]+)"/g)].map((m) => m[1]);
    const guarded = [...raw.matchAll(/policyname = '([^']+)'/g)].map((m) => m[1]);
    expect(created.sort()).toEqual(guarded.sort());
  });
});

describe('the settings page (US-332)', () => {
  it('renders the billing card', () => {
    expect(strip('src/pages/CompanySettings.tsx')).toMatch(/<CompanyBillingSettings \/>/);
  });

  it('does not default a newly added tax rate to being the default', () => {
    // The partial unique index refuses a second default, so an added rate that
    // claimed it would fail the insert.
    const card = strip('src/components/settings/CompanyBillingSettings.tsx');
    const add = card.slice(card.indexOf('const addTaxRate'));
    expect(add.slice(0, add.indexOf('};'))).toMatch(/is_default: false/);
  });

  it('reaches the document templates page, which is routed', () => {
    expect(strip('src/components/settings/CompanyBillingSettings.tsx'))
      .toMatch(/navigate\('\/document-templates'\)/);
    expect(readFileSync('src/routes/projectRoutes.tsx', 'utf8'))
      .toMatch(/path="\/document-templates"/);
  });
});
