import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { initializeAuthContext, errorResponse, successResponse, safeErrorResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateBody } from '../_shared/validate-body.ts';
import { captureException } from '../_shared/observability.ts';

interface InvoiceRequest {
  client_id?: string;
  client_name: string;
  client_email: string;
  project_id?: string;
  due_date: string;
  line_items: {
    description: string;
    quantity: number;
    unit_price: number;
    cost_code_id?: string;
    project_phase_id?: string;
    tax_rate?: number | null;
    taxable?: boolean;
  }[];
  tax_rate?: number;
  discount_amount?: number;
  notes?: string;
  terms?: string;
}

const InvoiceRequestSchema = z.object({
  // US-326 made contacts the customer entity and added invoices.client_id, but
  // this function never accepted it, so the two paths that go through here -
  // the manual invoice form and the estimate conversion - wrote the customer's
  // name as a string and left the row unlinked. Optional, because an older
  // client that does not send it must keep working.
  client_id: z.string().uuid().optional(),
  client_name: z.string().min(1).max(500),
  client_email: z.string().email().max(255),
  project_id: z.string().uuid().optional(),
  due_date: z.string().min(1),
  line_items: z.array(z.object({
    description: z.string().min(1).max(2000),
    quantity: z.number(),
    unit_price: z.number(),
    cost_code_id: z.string().uuid().optional(),
    project_phase_id: z.string().uuid().optional(),
    // US-332: a line may carry its own rate (county line, untaxed labour).
    // Both optional, so a client that sends neither gets exactly the old
    // single-rate arithmetic.
    tax_rate: z.number().min(0).max(100).nullable().optional(),
    taxable: z.boolean().optional(),
  })).min(1),
  tax_rate: z.number().optional(),
  discount_amount: z.number().optional(),
  notes: z.string().max(10000).optional(),
  terms: z.string().max(10000).optional(),
});

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Tax per line, rounded per rate rather than per line. Mirrors computeTax in
 * src/lib/companyBilling.ts so the form's preview and the stored invoice agree.
 * A line with no rate of its own takes the invoice rate.
 */
function lineTax(
  lines: { quantity: number; unit_price: number; tax_rate?: number | null; taxable?: boolean }[],
  invoiceRate: number,
): number {
  const groups = new Map<number, number>();
  for (const line of lines) {
    if (line.taxable === false) continue;
    const rate = line.tax_rate == null ? invoiceRate : line.tax_rate;
    if (!rate || rate <= 0) continue;
    groups.set(rate, (groups.get(rate) ?? 0) + line.quantity * line.unit_price);
  }
  let tax = 0;
  for (const [rate, taxable] of groups) tax += round2(taxable * (rate / 100));
  return round2(tax);
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-INVOICE] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    logStep("Invoice generation started");

    // Initialize auth context with site isolation
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized - Missing or invalid authentication', 401);
    }

    const { user, supabase } = authContext;
    logStep("User authenticated", { userId: user.id });

    const parsed = await validateBody(req, InvoiceRequestSchema, { name: 'generate-invoice' });
    if (!parsed.ok) return parsed.response;
    const invoiceData = parsed.data as InvoiceRequest;
    logStep("Invoice data received", {
      client: invoiceData.client_name,
      itemCount: invoiceData.line_items.length });

    // Get user's company with site isolation
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      logStep("Profile error", { error: profileError?.message });
      return errorResponse("User company not found", 404);
    }

    if (!['admin', 'accounting', 'project_manager', 'root_admin'].includes(profile.role)) {
      return errorResponse("Insufficient permissions to create invoices", 403);
    }

    // Calculate totals
    const subtotal = invoiceData.line_items.reduce((sum, item) =>
      sum + (item.quantity * item.unit_price), 0
    );

    const taxRate = invoiceData.tax_rate || 0;
    const taxAmount = lineTax(invoiceData.line_items, taxRate);
    const hasLineTax = invoiceData.line_items.some(
      (item) => item.tax_rate != null || item.taxable === false);
    const discountAmount = invoiceData.discount_amount || 0;
    const totalAmount = subtotal + taxAmount - discountAmount;

    logStep("Calculated totals", { subtotal, taxAmount, totalAmount });

    // Create invoice with site isolation
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        company_id: profile.company_id,
        client_id: invoiceData.client_id ?? null,
        client_name: invoiceData.client_name,
        client_email: invoiceData.client_email,
        project_id: invoiceData.project_id || null,
        due_date: invoiceData.due_date,
        subtotal: subtotal,
        tax_amount: taxAmount,
        tax_rate: taxRate,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        notes: invoiceData.notes,
        terms: invoiceData.terms,
        created_by: user.id,
        status: 'draft'
      })
      .select()
      .single();

    if (invoiceError) {
      logStep("Invoice creation error", { error: invoiceError.message });
      return errorResponse(`Error creating invoice: ${invoiceError.message}`, 500);
    }

    logStep("Invoice created", { invoiceId: invoice.id, invoiceNumber: invoice.invoice_number });

    // Create line items with site isolation
    const lineItemsToInsert = invoiceData.line_items.map(item => ({
      invoice_id: invoice.id,        description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      cost_code_id: item.cost_code_id || null,
      project_phase_id: item.project_phase_id || null,
      // Only written when some line overrides the rate, so an invoice from a
      // client that never sends them inserts exactly the columns it always did.
      ...(hasLineTax ? { tax_rate: item.tax_rate ?? null, taxable: item.taxable !== false } : {}),
    }));

    const { error: lineItemsError } = await supabase
      .from('invoice_line_items')
      .insert(lineItemsToInsert);

    if (lineItemsError) {
      logStep("Line items error", { error: lineItemsError.message });
      return errorResponse(`Error creating line items: ${lineItemsError.message}`, 500);
    }

    logStep("Line items created", { count: lineItemsToInsert.length });

    // Return complete invoice data with site isolation
    const { data: completeInvoice } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_line_items(*),
        projects(name),
        companies(name)
      `)
      .eq('id', invoice.id)
      .single();

    return successResponse({
      success: true,
      invoice: completeInvoice
    });

  } catch (error) {
    await captureException(error, { fn: 'generate-invoice', req });
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in generate-invoice", { message: errorMessage });
    return safeErrorResponse(req);
  }
});
