import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
  subscription_tier: 'starter' | 'professional' | 'enterprise';
  company_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    const { subscription_tier, company_id }: CheckoutRequest = await req.json();

    console.log(`Creating checkout for user ${user.email}, tier: ${subscription_tier}`);

    // STUB: In a real implementation, this would create a Stripe checkout session
    // For now, we'll just simulate the response
    const stubCheckoutUrl = `https://checkout.stripe.com/pay/cs_test_stub_${subscription_tier}_${Date.now()}`;

    // Update company subscription status to 'pending' if company_id provided
    if (company_id) {
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      await supabaseService
        .from("companies")
        .update({
          subscription_tier,
          subscription_status: "pending",
          updated_at: new Date().toISOString()
        })
        .eq("id", company_id);
    }

    console.log(`Checkout session created: ${stubCheckoutUrl}`);

    return new Response(
      JSON.stringify({ 
        url: stubCheckoutUrl,
        session_id: `cs_test_stub_${subscription_tier}_${Date.now()}`,
        message: "STUB: This is a placeholder checkout URL. Integrate with real Stripe later."
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error creating checkout:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});