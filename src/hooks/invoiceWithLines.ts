/**
 * Write an invoice header and its lines, or neither (US-266, US-327).
 *
 * Progress billing, retainage release and time-and-materials each carried a
 * copy of this sequence. The header is inserted first because the lines need
 * its id; if the lines fail the header is deleted, since a total with no
 * detail behind it is worse than no invoice. If that delete also fails the
 * error says so, with the invoice number, so someone can void it.
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface CreatedInvoice {
  id: string;
  invoice_number: string;
}

export async function insertInvoiceWithLines(
  header: Record<string, unknown>,
  lines: (invoiceId: string) => Record<string, unknown>[],
): Promise<CreatedInvoice> {
  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert(header as never)
    .select('id, invoice_number')
    .single();
  if (error) throw error;
  const created = invoice as CreatedInvoice;

  const { error: lineError } = await supabase
    .from('invoice_line_items')
    .insert(lines(created.id) as never)
    .select('id');

  if (lineError) {
    const { error: rollbackError } = await supabase.from('invoices').delete().eq('id', created.id);
    if (rollbackError) {
      logger.error('Invoice header left orphaned after its lines failed', {
        invoiceId: created.id, rollbackError,
      });
      throw new Error(
        `Invoice ${created.invoice_number} was created without its lines and could ` +
        `not be removed. Void it manually. (${rollbackError.message})`
      );
    }
    throw new Error(`Could not write the invoice lines: ${lineError.message}`);
  }
  return created;
}
