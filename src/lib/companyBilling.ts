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
