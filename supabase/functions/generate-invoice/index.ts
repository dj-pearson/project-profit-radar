import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Invoice generation started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    const invoiceData: InvoiceRequest = await req.json();
    logStep("Invoice data received", { 
      client: invoiceData.client_name, 
      itemCount: invoiceData.line_items.length 
    });

    // Get user's company
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      throw new Error("User company not found");
    }

    if (!['admin', 'accounting', 'project_manager', 'root_admin'].includes(profile.role)) {
      throw new Error("Insufficient permissions to create invoices");
    }

    // Calculate totals
    const subtotal = invoiceData.line_items.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price), 0
    );
    
    const taxRate = invoiceData.tax_rate || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const discountAmount = invoiceData.discount_amount || 0;
    const totalAmount = subtotal + taxAmount - discountAmount;

    logStep("Calculated totals", { subtotal, taxAmount, totalAmount });

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .insert({
        company_id: profile.company_id,
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
      throw new Error(`Error creating invoice: ${invoiceError.message}`);
    }

    logStep("Invoice created", { invoiceId: invoice.id, invoiceNumber: invoice.invoice_number });

    // Create line items
    const lineItemsToInsert = invoiceData.line_items.map(item => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      cost_code_id: item.cost_code_id || null,
      project_phase_id: item.project_phase_id || null
    }));

    const { error: lineItemsError } = await supabaseClient
      .from('invoice_line_items')
      .insert(lineItemsToInsert);

    if (lineItemsError) {
      throw new Error(`Error creating line items: ${lineItemsError.message}`);
    }

    logStep("Line items created", { count: lineItemsToInsert.length });

    // Return complete invoice data
    const { data: completeInvoice } = await supabaseClient
      .from('invoices')
      .select(`
        *,
        invoice_line_items(*),
        projects(name),
        companies(name)
      `)
      .eq('id', invoice.id)
      .single();

    return new Response(JSON.stringify({
      success: true,
      invoice: completeInvoice
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in generate-invoice", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});