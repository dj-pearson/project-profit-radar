import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { writeAuditLog } from '../_shared/audit-log.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

/**
 * This endpoint gives away paid product, so the two fields that decide WHAT is
 * given away are the ones worth constraining.
 *
 * subscription_tier lands in subscribers.subscription_tier, which is plain TEXT
 * in the live schema - there is a subscription_tier ENUM type in Postgres but
 * this column does not use it, and no CHECK constrains it either. So any string
 * was writable, and downstream entitlement checks would then compare a tier
 * name nothing recognises.
 *
 * duration_months is multiplied out into an expiry date. Unbounded it accepted
 * a negative (an expiry in the past, i.e. a grant that is already dead) and a
 * non-number (NaN, which makes new Date(NaN).toISOString() throw RangeError and
 * return a 500). complimentary_type is the one field Postgres already
 * constrains - a CHECK allows permanent, temporary and root_admin.
 */
const ComplimentarySchema = z.object({
  action: z.enum(['grant', 'revoke']),
  user_email: z.string().email().max(320),
  duration_months: z.number().int().positive().max(120).optional(),
  reason: z.string().min(1).max(1000),
  subscription_tier: z.enum(['starter', 'professional', 'enterprise']).optional(),
  type: z.enum(['permanent', 'temporary']).optional(),
});

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
  const corsHeaders = getCorsHeaders(req);
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

    const parsed = await validateBody(req, ComplimentarySchema, {
      name: 'manage-complimentary-subscription',
    });
    if (!parsed.ok) return parsed.response;
    const request = parsed.data as ComplimentaryRequest;
    logStep("Request received", request);

    // Find target user
    const { data: targetUserData } = await supabaseClient.auth.admin.listUsers();
    const targetUser = targetUserData.users.find(u => u.email === request.user_email);
    if (!targetUser) {
      throw new Error(`User with email ${request.user_email} not found`);
    }

    if (request.action === 'grant') {
      // Checked here as well as in the schema, deliberately. validateBody
      // defaults to report mode, which logs a bad shape and hands the handler
      // the RAW body - so until INPUT_VALIDATION_MODE=enforce is set, a
      // non-numeric duration_months would still reach this line, make the sum
      // NaN, and throw RangeError out of toISOString() as a 500.
      const months = Number(request.duration_months);
      const wantsExpiry = request.type === 'temporary' && Number.isFinite(months) && months > 0;
      const expiresAt = wantsExpiry
        ? new Date(Date.now() + (months * 30 * 24 * 60 * 60 * 1000)).toISOString()
        : null;

      const tier = request.subscription_tier || 'professional';
      const type = request.type || 'temporary';

      const { data: existingSubscriber } = await supabaseClient
        .from('subscribers')
        .select('id')
        .eq('user_id', targetUser.id)
        .single();

      if (existingSubscriber) {
        const { error: updateSubscribersError } = await supabaseClient
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
        if (updateSubscribersError) {
          throw new Error(`Failed to update subscribers: ${updateSubscribersError.message}`);
        }
      } else {
        const { error: insertSubscribersError } = await supabaseClient
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
        if (insertSubscribersError) {
          throw new Error(`Failed to insert subscribers: ${insertSubscribersError.message}`);
        }
      }

      const { data: subscriber } = await supabaseClient
        .from('subscribers')
        .select('id')
        .eq('user_id', targetUser.id)
        .single();

      if (!subscriber) {
        throw new Error('Subscriber record not found after grant operation');
      }

      // This row records who gave away paid product, to whom and why. The
      // error was discarded, so a grant could take effect with no history entry
      // behind it (US-300).
      const { error: historyError } = await supabaseClient
        .from('complimentary_subscription_history')
        .insert({
          subscriber_id: subscriber.id,
          granted_by: adminUser.id,
          expires_at: expiresAt,
          reason: request.reason,
          complimentary_type: type,
          status: 'active'
        });

      if (historyError) {
        throw new Error(
          `The complimentary subscription was granted but not recorded in history: ${historyError.message}`,
        );
      }

      // Audit trail (US-244): giving away paid product. Names the admin who
      // did it, who received it, and when it lapses.
      await writeAuditLog(supabaseClient, {
        actorUserId: adminUser.id,
        action: 'complimentary_subscription.granted',
        entityType: 'subscriber',
        entityId: subscriber.id,
        after: { tier, complimentary_type: type, expires_at: expiresAt, reason: request.reason },
        description: `Granted complimentary ${tier} to ${request.user_email}`,
        riskLevel: 'high',
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

      const { error: updateSubscribersError } = await supabaseClient
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
      if (updateSubscribersError) {
        throw new Error(`Failed to update subscribers: ${updateSubscribersError.message}`);
      }

      // Closing the history row records who revoked the grant. The error was
      // discarded, so a revoked subscription could still read as an active
      // complimentary grant in the history (US-300).
      const { error: revokeHistoryError } = await supabaseClient
        .from('complimentary_subscription_history')
        .update({
          status: 'revoked',
          revoked_by: adminUser.id,
          revoked_at: new Date().toISOString(),
          revoked_reason: request.reason
        })
        .eq('subscriber_id', subscriber.id)
        .eq('status', 'active');

      if (revokeHistoryError) {
        throw new Error(
          `The complimentary subscription was revoked but the history still shows it active: ${revokeHistoryError.message}`,
        );
      }

      await writeAuditLog(supabaseClient, {
        actorUserId: adminUser.id,
        action: 'complimentary_subscription.revoked',
        entityType: 'subscriber',
        entityId: subscriber.id,
        after: { subscribed: false, is_complimentary: false },
        description: `Revoked complimentary subscription for ${request.user_email}`,
        riskLevel: 'high',
      });

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