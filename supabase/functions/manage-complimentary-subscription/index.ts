import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ComplimentaryRequest {
  action: 'grant' | 'revoke';
  user_email: string;
  duration_months?: number; // For temporary subscriptions
  reason: string;
  subscription_tier?: 'starter' | 'professional' | 'enterprise';
  type?: 'permanent' | 'temporary';
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[COMPLIMENTARY-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

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
    const adminUser = userData.user;
    if (!adminUser?.email) throw new Error("Admin user not authenticated");

    const { data: adminProfile } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('id', adminUser.id)
      .single();

    if (!adminProfile || adminProfile.role !== 'root_admin') {
      throw new Error("Only root admins can manage complimentary subscriptions");
    }

    const request: ComplimentaryRequest = await req.json();
    logStep("Request received", request);

    // Find target user
    const { data: targetUserData } = await supabaseClient.auth.admin.listUsers();
    const targetUser = targetUserData.users.find(u => u.email === request.user_email);
    if (!targetUser) {
      throw new Error(`User with email ${request.user_email} not found`);
    }

    if (request.action === 'grant') {
      const expiresAt = request.duration_months && request.type === 'temporary' 
        ? new Date(Date.now() + (request.duration_months * 30 * 24 * 60 * 60 * 1000)).toISOString()
        : null;

      const tier = request.subscription_tier || 'professional';
      const type = request.type || 'temporary';

      const { data: existingSubscriber } = await supabaseClient
        .from('subscribers')
        .select('id')
        .eq('user_id', targetUser.id)
        .single();

      if (existingSubscriber) {
        await supabaseClient
          .from('subscribers')
          .update({
            subscribed: true,
            subscription_tier: tier,
            is_complimentary: true,
            complimentary_type: type,
            complimentary_granted_by: adminUser.id,
            complimentary_granted_at: new Date().toISOString(),
            complimentary_expires_at: expiresAt,
            complimentary_reason: request.reason,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSubscriber.id);
      } else {
        await supabaseClient
          .from('subscribers')
          .insert({
            user_id: targetUser.id,
            email: targetUser.email,
            subscribed: true,
            subscription_tier: tier,
            is_complimentary: true,
            complimentary_type: type,
            complimentary_granted_by: adminUser.id,
            complimentary_granted_at: new Date().toISOString(),
            complimentary_expires_at: expiresAt,
            complimentary_reason: request.reason
          });
      }

      const { data: subscriber } = await supabaseClient
        .from('subscribers')
        .select('id')
        .eq('user_id', targetUser.id)
        .single();

      if (!subscriber) {
        throw new Error('Subscriber record not found after grant operation');
      }

      await supabaseClient
        .from('complimentary_subscription_history')
        .insert({
          subscriber_id: subscriber.id,
          granted_by: adminUser.id,
          expires_at: expiresAt,
          reason: request.reason,
          complimentary_type: type,
          status: 'active'
        });

      logStep("Complimentary subscription granted", { 
        targetUser: request.user_email, 
        tier, 
        type, 
        expiresAt 
      });

      return new Response(JSON.stringify({
        success: true,
        message: `Complimentary ${tier} subscription granted to ${request.user_email}`,
        expires_at: expiresAt,
        type: type
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else if (request.action === 'revoke') {
      const { data: subscriber } = await supabaseClient
        .from('subscribers')
        .select('id')
        .eq('user_id', targetUser.id)
        .single();

      if (!subscriber) {
        throw new Error("Subscriber not found");
      }

      await supabaseClient
        .from('subscribers')
        .update({
          subscribed: false,
          is_complimentary: false,
          complimentary_type: null,
          complimentary_granted_by: null,
          complimentary_granted_at: null,
          complimentary_expires_at: null,
          complimentary_reason: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriber.id);

      await supabaseClient
        .from('complimentary_subscription_history')
        .update({
          status: 'revoked',
          revoked_by: adminUser.id,
          revoked_at: new Date().toISOString(),
          revoked_reason: request.reason
        })
        .eq('subscriber_id', subscriber.id)
        .eq('status', 'active');

      logStep("Complimentary subscription revoked", { targetUser: request.user_email });

      return new Response(JSON.stringify({
        success: true,
        message: `Complimentary subscription revoked for ${request.user_email}`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Default: invalid action
    return new Response(JSON.stringify({ success: false, error: 'Invalid action' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});