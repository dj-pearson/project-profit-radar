/**
 * Company billing settings: numbering, tax and payment terms (US-332).
 *
 * Each of these is something a contractor hits in the first hour and each was
 * a support ticket: no tax rate anywhere in the schema, invoice numbers from a
 * global sequence with a hardcoded 'INV-' prefix so every company saw gaps in
 * its own numbering, payment terms buried in a JSON blob on an unrouted page.
 *
 * The formatting and arithmetic live here so the settings preview, the
 * document forms and the database agree on what a number looks like and what a
 * line costs.
 */

import { z } from 'zod';

export type DocumentType = 'invoice' | 'estimate' | 'change_order' | 'purchase_order';

export interface NumberFormat {
  prefix: string;
  includeYear: boolean;
  padWidth: number;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  invoice: 'Invoices',
  estimate: 'Estimates',
  change_order: 'Change orders',
  purchase_order: 'Purchase orders',
};

/**
 * What a document number will look like.
 *
 * Must match next_document_number() in 20260903210000 exactly: this is the
 * preview shown while somebody types a prefix, and a preview that disagrees
 * with what gets minted is worse than no preview.
 */
export function formatDocumentNumber(
  format: NumberFormat,
  n: number,
  onDate: Date = new Date()
): string {
  const width = Math.min(Math.max(Math.trunc(format.padWidth) || 1, 1), 12);
  const year = format.includeYear ? `${onDate.getFullYear()}-` : '';
  return `${format.prefix ?? ''}${year}${String(Math.trunc(n)).padStart(width, '0')}`;
}

/**
 * When an invoice issued today is due.
 *
 * Zero days is due on receipt, which is a real term and not a missing value -
 * hence an explicit number rather than a nullable one.
 */
export function dueDateFrom(issueDate: Date | string, termsDays: number): string {
  const issued = typeof issueDate === 'string' ? parseDateOnly(issueDate) : issueDate;
  if (!issued || Number.isNaN(issued.getTime())) return '';
  const days = Math.max(0, Math.trunc(Number(termsDays) || 0));
  const due = new Date(issued.getFullYear(), issued.getMonth(), issued.getDate() + days);
  return isoDateOnly(due);
}

export function paymentTermsLabel(days: number): string {
  const d = Math.max(0, Math.trunc(Number(days) || 0));
  return d === 0 ? 'Due on receipt' : `Net ${d}`;
}

export interface TaxableLine {
  amount: number;
  /** Percent. When absent the company default applies. */
  taxRate?: number | null;
  /** A line for labour in a state that does not tax labour, say. */
  taxable?: boolean;
}

export interface TaxTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
  /** Tax per distinct rate, for a document that spans a county line. */
  byRate: Array<{ rate: number; taxable: number; tax: number }>;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Tax a document's lines.
 *
 * Rounded per rate rather than per line, then summed. Rounding each line
 * separately and adding is what makes an invoice total disagree with the same
 * figures re-entered in QuickBooks, and the difference is what an accountant
 * spends an afternoon on.
 */
export function computeTax(lines: TaxableLine[], defaultRate: number): TaxTotals {
  const groups = new Map<number, number>();
  let subtotal = 0;

  for (const line of lines) {
    const amount = Number(line.amount) || 0;
    subtotal += amount;
    if (line.taxable === false) continue;
    const rate = line.taxRate == null ? (Number(defaultRate) || 0) : Number(line.taxRate) || 0;
    if (rate <= 0) continue;
    groups.set(rate, (groups.get(rate) ?? 0) + amount);
  }

  const byRate = [...groups.entries()]
    .map(([rate, taxable]) => ({
      rate,
      taxable: round2(taxable),
      tax: round2(taxable * (rate / 100)),
    }))
    .sort((a, b) => a.rate - b.rate);

  const taxAmount = round2(byRate.reduce((sum, g) => sum + g.tax, 0));
  return {
    subtotal: round2(subtotal),
    taxAmount,
    total: round2(round2(subtotal) + taxAmount),
    byRate,
  };
}

/**
 * The terms that belong on one document type.
 *
 * What a contractor promises on an estimate is not what they promise on an
 * invoice, so these are separate fields rather than one blob.
 */
export function termsFor(
  settings: {
    estimate_terms?: string | null;
    invoice_terms?: string | null;
    change_order_terms?: string | null;
  } | null | undefined,
  docType: DocumentType
): string {
  if (!settings) return '';
  switch (docType) {
    case 'estimate': return settings.estimate_terms ?? '';
    case 'invoice': return settings.invoice_terms ?? '';
    case 'change_order': return settings.change_order_terms ?? '';
    default: return '';
  }
}

/** Licence and insurance, as they read in a document header. */
export function licenceLine(settings: {
  license_number?: string | null;
  insurance_carrier?: string | null;
  insurance_policy_number?: string | null;
} | null | undefined): string {
  if (!settings) return '';
  const parts: string[] = [];
  if (settings.license_number) parts.push(`Licence ${settings.license_number}`);
  if (settings.insurance_carrier) {
    parts.push(
      settings.insurance_policy_number
        ? `Insured by ${settings.insurance_carrier} (policy ${settings.insurance_policy_number})`
        : `Insured by ${settings.insurance_carrier}`
    );
  }
  return parts.join(' | ');
}

/** True when the insurance on file has lapsed, which belongs on no document. */
export function insuranceExpired(
  expiresOn: string | null | undefined,
  today: Date = new Date()
): boolean {
  if (!expiresOn) return false;
  const d = parseDateOnly(expiresOn);
  if (!d) return false;
  return d.getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
}

function parseDateOnly(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function isoDateOnly(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ---------------------------------------------------------------------------
// Defaults a new document starts from (US-332, second pass)
// ---------------------------------------------------------------------------


export interface NamedTaxRate {
  id: string;
  name: string;
  rate: number;
  applies_to: string;
  is_default: boolean;
  is_active: boolean;
}

/**
 * The rate a new document starts with.
 *
 * Two places can say "default": company_settings.default_tax_rate and a named
 * rate flagged is_default. The named one wins because it is the more specific
 * statement - somebody went to the trouble of naming it - and the plain number
 * is what applies when no rate has been named at all.
 */
export function effectiveDefaultTaxRate(
  defaultTaxRate: number | null | undefined,
  rates: Array<Pick<NamedTaxRate, 'rate' | 'is_default' | 'is_active'>> | null | undefined
): number {
  const named = (rates ?? []).find((r) => r.is_default && r.is_active);
  if (named) return Number(named.rate) || 0;
  return Number(defaultTaxRate) || 0;
}

/** What the billing settings form validates before it writes. */
export const billingSettingsSchema = z.object({
  default_tax_rate: z.coerce.number()
    .min(0, 'A tax rate cannot be negative')
    .max(100, 'A tax rate is a percentage, 100 at most'),
  default_payment_terms_days: z.coerce.number()
    .int('Whole days only')
    .min(0, 'Zero means due on receipt; it cannot go below that')
    .max(365, 'More than a year is not a payment term'),
  license_number: z.string().trim().max(100),
  insurance_carrier: z.string().trim().max(200),
  insurance_policy_number: z.string().trim().max(100),
  insurance_expires_on: z.string()
    .refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Use a full date'),
  estimate_terms: z.string().max(10000),
  invoice_terms: z.string().max(10000),
  change_order_terms: z.string().max(10000),
});

export type BillingSettingsValues = z.infer<typeof billingSettingsSchema>;

export const EMPTY_BILLING_SETTINGS: BillingSettingsValues = {
  default_tax_rate: 0,
  default_payment_terms_days: 30,
  license_number: '',
  insurance_carrier: '',
  insurance_policy_number: '',
  insurance_expires_on: '',
  estimate_terms: '',
  invoice_terms: '',
  change_order_terms: '',
};

/** A numbering row as the settings form edits it. */
export const numberFormatSchema = z.object({
  prefix: z.string().max(20, 'Keep the prefix under 20 characters')
    .regex(/^[A-Za-z0-9._/-]*$/, 'Letters, digits and - _ . / only'),
  include_year: z.boolean(),
  pad_width: z.coerce.number().int().min(1).max(12),
  next_number: z.coerce.number().int().min(1, 'Numbering starts at 1'),
});

export interface BillingDefaults {
  taxRate: number;
  paymentTermsDays: number;
  terms: Record<'estimate' | 'invoice' | 'change_order', string>;
  licenceLine: string;
  taxRates: NamedTaxRate[];
}

export const FALLBACK_BILLING_DEFAULTS: BillingDefaults = {
  taxRate: 0,
  paymentTermsDays: 30,
  terms: { estimate: '', invoice: '', change_order: '' },
  licenceLine: '',
  taxRates: [],
};

/** Settings row plus named rates, reduced to what a new document needs. */
export function billingDefaultsFrom(
  settings: (Partial<BillingSettingsValues> & Record<string, unknown>) | null | undefined,
  rates: NamedTaxRate[] | null | undefined
): BillingDefaults {
  const active = (rates ?? []).filter((r) => r.is_active);
  return {
    taxRate: effectiveDefaultTaxRate(settings?.default_tax_rate, active),
    paymentTermsDays: settings?.default_payment_terms_days == null
      ? 30
      : Math.max(0, Math.trunc(Number(settings.default_payment_terms_days) || 0)),
    terms: {
      estimate: termsFor(settings, 'estimate'),
      invoice: termsFor(settings, 'invoice'),
      change_order: termsFor(settings, 'change_order'),
    },
    licenceLine: licenceLine(settings),
    taxRates: active,
  };
}

/**
 * A new invoice's due date, rate and terms.
 *
 * Terms fall back to a sentence built from the payment terms, so an invoice
 * from a company that has not written any still says when it is due.
 */
export function newInvoiceDefaults(
  defaults: BillingDefaults,
  issueDate: Date | string = new Date()
): { due_date: string; tax_rate: number; terms: string } {
  const days = defaults.paymentTermsDays;
  return {
    due_date: dueDateFrom(issueDate, days),
    tax_rate: defaults.taxRate,
    terms: defaults.terms.invoice || (days === 0
      ? 'Payment is due on receipt.'
      : `Payment is due within ${days} days of invoice date.`),
  };
}

// ---------------------------------------------------------------------------
// Per-line tax choice
// ---------------------------------------------------------------------------

/**
 * What a line's tax picker holds. 'default' means the document rate applies
 * (tax_rate NULL on the row), 'none' means the line is not taxed, and
 * 'rate:<n>' is a specific rate - stored as the number rather than the named
 * rate's id so a later edit to the named rate does not change a sent document.
 */
export type LineTaxChoice = 'default' | 'none' | `rate:${number}`;

export interface LineTax {
  tax_rate: number | null;
  taxable: boolean;
}

export function lineTaxChoice(line: Partial<LineTax> | null | undefined): LineTaxChoice {
  if (line?.taxable === false) return 'none';
  if (line?.tax_rate == null) return 'default';
  return `rate:${Number(line.tax_rate)}`;
}

export function lineTaxFromChoice(choice: string): LineTax {
  if (choice === 'none') return { tax_rate: null, taxable: false };
  if (choice.startsWith('rate:')) {
    const n = Number(choice.slice(5));
    if (Number.isFinite(n) && n >= 0 && n <= 100) return { tax_rate: n, taxable: true };
  }
  return { tax_rate: null, taxable: true };
}

/** Tax groups as the PDFs print them: one line per rate. */
export function taxBreakdownLabel(group: { rate: number }, rates: NamedTaxRate[] = []): string {
  const named = rates.find((r) => Number(r.rate) === group.rate);
  return named ? `${named.name} (${group.rate}%)` : `Tax (${group.rate}%)`;
}
