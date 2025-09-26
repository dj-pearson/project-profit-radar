import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Generate1099Request {
  tax_year: number;
  contractor_ids?: string[];
  include_zero_amounts?: boolean;
}

interface ContractorPaymentSummary {
  contractor_id: string;
  contractor_name: string;
  tax_id: string;
  tax_id_type: string;
  address: string;
  total_payments: number;
  payment_count: number;
  w9_on_file: boolean;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-1099S] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("1099 generation started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    const requestData: Generate1099Request = await req.json();
    logStep("Request data received", { 
      tax_year: requestData.tax_year,
      contractor_count: requestData.contractor_ids?.length 
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

    if (!['admin', 'accounting', 'root_admin'].includes(profile.role)) {
      throw new Error("Insufficient permissions to generate 1099s");
    }

    // Build contractor filter
    let contractorFilter = supabaseClient
      .from('contractors')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('is_active', true);

    if (requestData.contractor_ids && requestData.contractor_ids.length > 0) {
      contractorFilter = contractorFilter.in('id', requestData.contractor_ids);
    }

    const { data: contractors, error: contractorsError } = await contractorFilter;
    if (contractorsError) throw contractorsError;

    logStep("Contractors loaded", { count: contractors?.length });

    // Generate 1099 data for each contractor
    const contractorSummaries: ContractorPaymentSummary[] = [];

    for (const contractor of contractors || []) {
      // Get payments for this contractor in the tax year
      const { data: payments, error: paymentsError } = await supabaseClient
        .from('contractor_payments')
        .select('amount, payment_date')
        .eq('contractor_id', contractor.id)
        .eq('company_id', profile.company_id)
        .eq('is_1099_reportable', true)
        .eq('tax_year', requestData.tax_year);

      if (paymentsError) throw paymentsError;

      const totalPayments = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

      // Only include contractors with payments over $600 (IRS threshold) unless specified otherwise
      const threshold = 600;
      if (!requestData.include_zero_amounts && totalPayments < threshold) {
        continue;
      }

      contractorSummaries.push({
        contractor_id: contractor.id,
        contractor_name: contractor.business_name,
        tax_id: contractor.tax_id || '',
        tax_id_type: contractor.tax_id_type || 'ein',
        address: contractor.address || '',
        total_payments: totalPayments,
        payment_count: payments?.length || 0,
        w9_on_file: !!contractor.w9_file_path
      });
    }

    logStep("Payment summaries calculated", { summaries_count: contractorSummaries.length });

    // Generate 1099-NEC forms data
    const forms1099Data = contractorSummaries.map(summary => ({
      contractor_id: summary.contractor_id,
      contractor_name: summary.contractor_name,
      contractor_tax_id: summary.tax_id,
      contractor_address: summary.address,
      tax_year: requestData.tax_year,
      box1_nonemployee_compensation: summary.total_payments,
      box2_payer_made_direct_sales: 0,
      box4_federal_income_tax_withheld: 0,
      box5_state_tax_withheld: 0,
      box6_state_payers_state_no: '',
      box7_state_income: 0,
      generated_date: new Date().toISOString(),
      generated_by: user.id,
      status: 'draft'
    }));

    // Store 1099 records (would need to create this table)
    const { error: formsError } = await supabaseClient
      .from('forms_1099')
      .upsert(forms1099Data, {
        onConflict: 'contractor_id,tax_year',
        ignoreDuplicates: false
      });

    if (formsError) {
      logStep("Warning: Could not save 1099 forms to database", { error: formsError.message });
      // Continue anyway as we can still return the data
    }

    // Prepare response with summary and warnings
    const warnings = [];
    const missingW9Count = contractorSummaries.filter(s => !s.w9_on_file).length;
    const missingTaxIdCount = contractorSummaries.filter(s => !s.tax_id).length;
    const missingAddressCount = contractorSummaries.filter(s => !s.address).length;

    if (missingW9Count > 0) {
      warnings.push(`${missingW9Count} contractor(s) missing W-9 forms`);
    }
    if (missingTaxIdCount > 0) {
      warnings.push(`${missingTaxIdCount} contractor(s) missing tax ID`);
    }
    if (missingAddressCount > 0) {
      warnings.push(`${missingAddressCount} contractor(s) missing address`);
    }

    const response = {
      success: true,
      tax_year: requestData.tax_year,
      contractors_processed: contractors?.length || 0,
      forms_generated: contractorSummaries.length,
      total_payments_reported: contractorSummaries.reduce((sum, s) => sum + s.total_payments, 0),
      contractor_summaries: contractorSummaries,
      forms_1099_data: forms1099Data,
      warnings,
      irs_filing_deadline: `${requestData.tax_year + 1}-01-31`,
      recipient_deadline: `${requestData.tax_year + 1}-01-31`
    };

    logStep("1099 generation completed", { 
      forms_count: forms1099Data.length,
      total_amount: response.total_payments_reported 
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in generate-1099s", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});