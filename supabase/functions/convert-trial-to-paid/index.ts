// Convert Trial to Paid Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConversionRequest {
  company_id: string;
  subscription_tier: 'starter' | 'professional' | 'enterprise';
  billing_period: 'monthly' | 'annual';
  payment_method_id?: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TRIAL-CONVERSION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Trial conversion started");

        const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, supabase: supabaseClient } = authContext;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { company_id, subscription_tier, billing_period, payment_method_id }: ConversionRequest = await req.json();
    logStep("Conversion request", {  company_id, subscription_tier, billing_period });

    // Verify user has access to this company
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.company_id !== company_id || !['admin', 'root_admin'].includes(profile.role)) {
      throw new Error("Unauthorized to convert this company's trial");
    }

    // Get company details
    const { data: company } = await supabaseClient
      .from('companies')
      .select('id, name, subscription_status, trial_end_date')
      .eq('id', company_id)
      .single();

    if (!company) throw new Error("Company not found");
    if (!['trial', 'grace_period', 'suspended'].includes(company.subscription_status)) {
      throw new Error("Company is not in trial status");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2023-10-16" 
    });

    // Check if customer exists in Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: company.name,
        metadata: {
          company_id: company_id,
          user_id: user.id
        }
      });
      customerId = customer.id;
      logStep("Created new Stripe customer", { customerId });
    }

    // Define pricing
    const pricing = {
      starter: { monthly: 14900, annual: 149000 },
      professional: { monthly: 29900, annual: 299000 },
      enterprise: { monthly: 59900, annual: 599000 }
    };

    const amount = pricing[subscription_tier][billing_period];
    const interval = billing_period === 'annual' ? 'year' : 'month';

    let subscriptionResult;

    if (payment_method_id) {
      // Create subscription with existing payment method
      try {
        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [{
            price_data: {
              currency: "usd",
              product_data: { 
                name: `${subscription_tier.charAt(0).toUpperCase() + subscription_tier.slice(1)} Plan`,
                description: `Build Desk ${subscription_tier} subscription - ${billing_period} billing`
              },
              unit_amount: amount,
              recurring: { interval },
            },
          }],
          default_payment_method: payment_method_id,
          metadata: {
            company_id,
            user_id: user.id,
            subscription_tier,
            billing_period,
            converted_from_trial: 'true'
          }
        });

        subscriptionResult = {
          success: true,
          subscription_id: subscription.id,
          status: subscription.status
        };

        logStep("Created subscription with payment method", { 
          subscriptionId: subscription.id, 
          status: subscription.status 
        });

      } catch (error) {
        logStep("Subscription creation failed", { error: error instanceof Error ? error.message : 'Unknown error' });
        subscriptionResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    } else {
      // Create checkout session for payment
      const origin = req.headers.get("origin") || "http://localhost:3000";
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { 
              name: `${subscription_tier.charAt(0).toUpperCase() + subscription_tier.slice(1)} Plan`,
              description: `Build Desk ${subscription_tier} subscription - ${billing_period} billing`
            },
            unit_amount: amount,
            recurring: { interval },
          },
          quantity: 1,
        }],
        mode: "subscription",
        success_url: `${origin}/setup?session_id={CHECKOUT_SESSION_ID}&converted=true`,
        cancel_url: `${origin}/subscription?canceled=true`,
        metadata: {
          company_id,
          user_id: user.id,
          subscription_tier,
          billing_period,
          converted_from_trial: 'true'
        }
      });

      subscriptionResult = {
        success: true,
        checkout_url: session.url,
        session_id: session.id
      };

      logStep("Created checkout session", { sessionId: session.id });
    }

    // Update company status to pending conversion
    await supabaseClient
      .from("companies")
      .update({
        subscription_status: "converting",
        subscription_tier,
        updated_at: new Date().toISOString()
      })
      .eq("id", company_id);

    logStep("Updated company status to converting", { company_id });

    return new Response(JSON.stringify(subscriptionResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in trial conversion", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});