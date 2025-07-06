import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ENHANCED-CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Simple decryption function (matches store-stripe-keys)
const decryptKey = (encryptedKey: string): string => {
  return atob(encryptedKey);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { invoice_id, amount, description, success_url, cancel_url } = await req.json();
    if (!invoice_id || !amount) {
      throw new Error("invoice_id and amount are required");
    }

    // Get user's company and payment settings
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    if (!userProfile?.company_id) throw new Error("User company not found");

    logStep("User company found", { company_id: userProfile.company_id });

    // Get company payment settings
    const { data: paymentSettings, error: settingsError } = await supabaseClient
      .from('company_payment_settings')
      .select('*')
      .eq('company_id', userProfile.company_id)
      .eq('is_active', true)
      .single();

    if (settingsError) {
      logStep("No payment settings found, using default Pearson Stripe");
      // Default to Pearson Stripe if no settings configured
      paymentSettings = {
        processor_type: 'pearson_stripe',
        processing_fee_percentage: 2.9,
        chargeback_fee: 15.00
      };
    }

    logStep("Payment settings loaded", { processor_type: paymentSettings.processor_type });

    let stripeSecretKey: string;
    let finalAmount = amount;
    let receiptEmail = user.email;

    if (paymentSettings.processor_type === 'pearson_stripe') {
      // Use Pearson Media Stripe account
      stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
      if (!stripeSecretKey) throw new Error("Pearson Stripe secret key not configured");

      // Add processing fee
      const processingFee = Math.round(amount * (paymentSettings.processing_fee_percentage / 100));
      finalAmount = amount + processingFee;

      logStep("Using Pearson Stripe", { 
        originalAmount: amount, 
        processingFee, 
        finalAmount 
      });
    } else {
      // Use company's own Stripe account
      if (!paymentSettings.stripe_secret_key_encrypted) {
        throw new Error("Company Stripe keys not configured");
      }

      stripeSecretKey = decryptKey(paymentSettings.stripe_secret_key_encrypted);
      logStep("Using company's own Stripe account");
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    logStep("Customer lookup completed", { hasExistingCustomer: !!customerId });

    // Create checkout session
    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { 
              name: description || `Invoice Payment`,
              description: paymentSettings.processor_type === 'pearson_stripe' 
                ? `Processed by Pearson Media - Project Services`
                : undefined
            },
            unit_amount: finalAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: success_url || `${req.headers.get("origin")}/payment-success?invoice_id=${invoice_id}`,
      cancel_url: cancel_url || `${req.headers.get("origin")}/invoices`,
      metadata: {
        invoice_id,
        processor_type: paymentSettings.processor_type,
        original_amount: amount.toString(),
        company_id: userProfile.company_id
      }
    };

    if (paymentSettings.processor_type === 'pearson_stripe') {
      sessionParams.receipt_email = receiptEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ 
      url: session.url,
      session_id: session.id,
      processor_type: paymentSettings.processor_type,
      final_amount: finalAmount
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in enhanced-create-checkout", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});