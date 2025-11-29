import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

interface InvoiceRequest {
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
  }[];
  tax_rate?: number;
  discount_amount?: number;
  notes?: string;
  terms?: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-INVOICE] ${step}${detailsStr}`);
};

serve(async (req) => {
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

    const { user, siteId, supabase } = authContext;
    logStep("User authenticated", { userId: user.id, siteId });

    const invoiceData: InvoiceRequest = await req.json();
    logStep("Invoice data received", {
      client: invoiceData.client_name,
      itemCount: invoiceData.line_items.length,
      siteId
    });

    // Get user's company with site isolation
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .eq('site_id', siteId)
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
    const taxAmount = subtotal * (taxRate / 100);
    const discountAmount = invoiceData.discount_amount || 0;
    const totalAmount = subtotal + taxAmount - discountAmount;

    logStep("Calculated totals", { subtotal, taxAmount, totalAmount, siteId });

    // Create invoice with site isolation
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        company_id: profile.company_id,
        site_id: siteId,  // CRITICAL: Include site_id
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

    logStep("Invoice created", { invoiceId: invoice.id, invoiceNumber: invoice.invoice_number, siteId });

    // Create line items with site isolation
    const lineItemsToInsert = invoiceData.line_items.map(item => ({
      invoice_id: invoice.id,
      site_id: siteId,  // CRITICAL: Include site_id
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      cost_code_id: item.cost_code_id || null,
      project_phase_id: item.project_phase_id || null
    }));

    const { error: lineItemsError } = await supabase
      .from('invoice_line_items')
      .insert(lineItemsToInsert);

    if (lineItemsError) {
      logStep("Line items error", { error: lineItemsError.message });
      return errorResponse(`Error creating line items: ${lineItemsError.message}`, 500);
    }

    logStep("Line items created", { count: lineItemsToInsert.length, siteId });

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
      .eq('site_id', siteId)
      .single();

    return successResponse({
      success: true,
      invoice: completeInvoice
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in generate-invoice", { message: errorMessage });
    return errorResponse(errorMessage, 500);
  }
});
