import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * US-326 made `contacts` the customer entity and added invoices.client_id, then
 * backfilled it. The writers were never converted, so every new invoice
 * re-created the problem the migration had just repaired: the customer's name
 * copied as a string, the row unlinked.
 *
 * Source-reading rather than behavioural, for the same reason the edge-function
 * validation tests are: the Deno function cannot be imported into vitest, and
 * the thing worth asserting is that the field exists on the contract at all.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('the invoice path carries the customer, not just their name', () => {
  it('generate-invoice accepts client_id and writes it', () => {
    const fn = read('supabase/functions/generate-invoice/index.ts');

    // Optional, not required: an older client that does not send it still works.
    expect(fn).toMatch(/client_id:\s*z\.string\(\)\.uuid\(\)\.optional\(\)/);
    expect(fn).toMatch(/client_id:\s*invoiceData\.client_id\s*\?\?\s*null/);
  });

  it('converting an estimate to an invoice carries the estimate’s customer', () => {
    const dialog = read('src/components/estimates/ConvertToInvoiceDialog.tsx');

    // Reading it is half of it - the select has to ask for the column.
    expect(dialog).toMatch(/from\('estimates'\)\.select\('[^']*\bclient_id\b/);
    expect(dialog).toMatch(/client_id:\s*estimate\.client_id/);
  });

  it('the manual invoice form can pick a customer rather than typing one', () => {
    const form = read('src/components/InvoiceGenerator.tsx');

    expect(form).toContain('ContactPicker');
    // Choosing a project has to bring its customer across too, otherwise the
    // most common path still produces an unlinked invoice.
    expect(form).toMatch(/\.select\('id, name, client_id/);
    expect(form).toMatch(/client_id:\s*project\.client_id/);
  });

  it('never sends null for an optional uuid, which the schema would reject', () => {
    const form = read('src/components/InvoiceGenerator.tsx');
    // z.string().uuid().optional() accepts undefined, not null, and the form
    // holds null when nothing is picked.
    expect(form).toMatch(/client_id:\s*invoiceData\.client_id\s*\?\?\s*undefined/);
  });
});
