/**
 * US-332, second pass: what a new document starts from, and the per-line tax
 * choice. The first pass stored the settings; these are the functions every
 * creation path now reads them through.
 */
import { describe, it, expect } from 'vitest';
import {
  effectiveDefaultTaxRate, billingDefaultsFrom, newInvoiceDefaults,
  lineTaxChoice, lineTaxFromChoice, billingSettingsSchema, numberFormatSchema,
  taxBreakdownLabel, computeTax, EMPTY_BILLING_SETTINGS, FALLBACK_BILLING_DEFAULTS,
  type NamedTaxRate,
} from '../companyBilling';

const rate = (over: Partial<NamedTaxRate>): NamedTaxRate => ({
  id: over.id ?? `r-${over.rate}`,
  name: over.name ?? `Rate ${over.rate}`,
  rate: over.rate ?? 0,
  applies_to: 'all',
  is_default: over.is_default ?? false,
  is_active: over.is_active ?? true,
});

describe('the rate a new document starts with', () => {
  it('uses the plain company default when no named rate is the default', () => {
    expect(effectiveDefaultTaxRate(8.25, [rate({ rate: 6 })])).toBe(8.25);
  });

  it('prefers a named default rate over the plain number', () => {
    expect(effectiveDefaultTaxRate(8.25, [rate({ rate: 6 }), rate({ rate: 7.5, is_default: true })]))
      .toBe(7.5);
  });

  it('ignores a named default that has been switched off', () => {
    expect(effectiveDefaultTaxRate(8.25, [rate({ rate: 7.5, is_default: true, is_active: false })]))
      .toBe(8.25);
  });

  it('is zero with no settings at all, which is what every form did before', () => {
    expect(effectiveDefaultTaxRate(null, null)).toBe(0);
  });
});

describe('billing defaults from the settings row', () => {
  const settings = {
    ...EMPTY_BILLING_SETTINGS,
    default_tax_rate: 8.25,
    default_payment_terms_days: 15,
    license_number: 'CCB-123456',
    invoice_terms: 'Late payments accrue 1.5% a month.',
    estimate_terms: 'Valid for 30 days.',
  };

  it('carries payment terms, terms per type, and the licence line', () => {
    const d = billingDefaultsFrom(settings, []);
    expect(d.taxRate).toBe(8.25);
    expect(d.paymentTermsDays).toBe(15);
    expect(d.terms.invoice).toBe('Late payments accrue 1.5% a month.');
    expect(d.terms.estimate).toBe('Valid for 30 days.');
    expect(d.terms.change_order).toBe('');
    expect(d.licenceLine).toBe('Licence CCB-123456');
  });

  it('offers only active named rates to the line picker', () => {
    const d = billingDefaultsFrom(settings, [rate({ rate: 6 }), rate({ rate: 9, is_active: false })]);
    expect(d.taxRates.map((r) => r.rate)).toEqual([6]);
  });

  it('keeps zero days as due on receipt rather than falling back to 30', () => {
    expect(billingDefaultsFrom({ ...settings, default_payment_terms_days: 0 }, []).paymentTermsDays).toBe(0);
    expect(billingDefaultsFrom(null, null).paymentTermsDays).toBe(30);
  });
});

describe('a new invoice', () => {
  it('is due by the company payment terms, from the issue date', () => {
    const d = { ...FALLBACK_BILLING_DEFAULTS, paymentTermsDays: 45, taxRate: 7 };
    expect(newInvoiceDefaults(d, '2026-09-23')).toEqual({
      due_date: '2026-11-07',
      tax_rate: 7,
      terms: 'Payment is due within 45 days of invoice date.',
    });
  });

  it('prints the company invoice terms when it has written some', () => {
    const d = { ...FALLBACK_BILLING_DEFAULTS, terms: { estimate: '', invoice: 'Net 30. Thank you.', change_order: '' } };
    expect(newInvoiceDefaults(d, '2026-09-23').terms).toBe('Net 30. Thank you.');
  });

  it('says due on receipt for zero-day terms', () => {
    const d = { ...FALLBACK_BILLING_DEFAULTS, paymentTermsDays: 0 };
    expect(newInvoiceDefaults(d, '2026-09-23')).toMatchObject({
      due_date: '2026-09-23',
      terms: 'Payment is due on receipt.',
    });
  });

  it('matches what the forms hardcoded before, for a company with no settings', () => {
    // An unconfigured company must see no change: Net 30, zero tax, same sentence.
    expect(newInvoiceDefaults(FALLBACK_BILLING_DEFAULTS, '2026-09-23')).toEqual({
      due_date: '2026-10-23',
      tax_rate: 0,
      terms: 'Payment is due within 30 days of invoice date.',
    });
  });
});

describe('per-line tax choice', () => {
  it('round-trips each choice through what is stored on the row', () => {
    for (const stored of [
      { tax_rate: null, taxable: true },
      { tax_rate: null, taxable: false },
      { tax_rate: 6.5, taxable: true },
      { tax_rate: 0, taxable: true },
    ]) {
      expect(lineTaxFromChoice(lineTaxChoice(stored))).toEqual(stored);
    }
  });

  it('reads a line with no tax columns (saved before US-332) as the document rate', () => {
    expect(lineTaxChoice({})).toBe('default');
    expect(lineTaxChoice(undefined)).toBe('default');
  });

  it('refuses a nonsense rate rather than storing it', () => {
    expect(lineTaxFromChoice('rate:150')).toEqual({ tax_rate: null, taxable: true });
    expect(lineTaxFromChoice('rate:abc')).toEqual({ tax_rate: null, taxable: true });
  });

  it('labels a tax group with the named rate when there is one', () => {
    const rates = [rate({ rate: 6, name: 'Materials (county)' })];
    expect(taxBreakdownLabel({ rate: 6 }, rates)).toBe('Materials (county) (6%)');
    expect(taxBreakdownLabel({ rate: 8.25 }, rates)).toBe('Tax (8.25%)');
  });

  it('keeps an estimate with no overrides at exactly the old single-rate figure', () => {
    // EstimateForm used (subtotal + markup) * rate. Per line on the marked-up
    // amount must agree to the cent when nobody picks a line rate.
    const lines = [{ q: 3, c: 412.5 }, { q: 1, c: 1999.99 }, { q: 12, c: 18.75 }];
    const markup = 1.2;
    const rateNow = 8.25;
    const old = lines.reduce((s, l) => s + l.q * l.c, 0) * markup * (rateNow / 100);
    const perLine = computeTax(lines.map((l) => ({ amount: l.q * l.c * markup })), rateNow);
    expect(perLine.taxAmount).toBe(Math.round(old * 100) / 100);
  });
});

describe('settings validation', () => {
  it('accepts the empty settings a new company starts with', () => {
    expect(billingSettingsSchema.safeParse(EMPTY_BILLING_SETTINGS).success).toBe(true);
  });

  it('refuses a tax rate over 100 and negative payment terms', () => {
    const r = billingSettingsSchema.safeParse({
      ...EMPTY_BILLING_SETTINGS, default_tax_rate: 150, default_payment_terms_days: -1,
    });
    expect(r.success).toBe(false);
    const fields = r.success ? [] : r.error.issues.map((i) => i.path[0]);
    expect(fields).toEqual(expect.arrayContaining(['default_tax_rate', 'default_payment_terms_days']));
  });

  it('takes the strings a number input produces', () => {
    const r = billingSettingsSchema.safeParse({
      ...EMPTY_BILLING_SETTINGS, default_tax_rate: '7.25', default_payment_terms_days: '15',
    });
    expect(r.success && r.data.default_tax_rate).toBe(7.25);
  });

  it('refuses a numbering prefix that would not survive a filename or a URL', () => {
    expect(numberFormatSchema.safeParse({ prefix: 'INV-', include_year: true, pad_width: 4, next_number: 1 }).success)
      .toBe(true);
    expect(numberFormatSchema.safeParse({ prefix: 'INV #', include_year: true, pad_width: 4, next_number: 1 }).success)
      .toBe(false);
    expect(numberFormatSchema.safeParse({ prefix: 'INV-', include_year: true, pad_width: 4, next_number: 0 }).success)
      .toBe(false);
  });
});
