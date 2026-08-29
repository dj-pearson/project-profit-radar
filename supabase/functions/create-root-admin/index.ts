import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/secure-cors.ts';
import { writeAuditLog } from '../_shared/audit-log.ts';
import { checkRateLimit, rateLimitResponse, getClientIP, RATE_LIMITS } from "../_shared/rate-limiter.ts";

serve(async (req) => {
  // Use secure CORS (whitelist-based)
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    // The client is built here rather than after the secret check, because the
    // rate limit has to come FIRST to be worth anything: limiting attempts only
    // after a correct secret protects nothing. ADMIN_CREATION_SECRET is compared
    // with !== below and this endpoint mints a root admin, so unlimited guesses
    // were the real exposure.
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const clientIP = getClientIP(req);
    const rl = await checkRateLimit(supabaseAdmin, {
      identifier: clientIP,
      endpoint: 'create-root-admin',
      ...RATE_LIMITS.AUTH,
    });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    // SECURITY: Require a secret API key for this sensitive operation
    // This prevents unauthorized admin creation
    const adminCreationSecret = req.headers.get('X-Admin-Creation-Secret');
    const expectedSecret = Deno.env.get('ADMIN_CREATION_SECRET');

    if (!expectedSecret) {
      console.error('[SECURITY] ADMIN_CREATION_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error', success: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!adminCreationSecret || adminCreationSecret !== expectedSecret) {
      console.error('[SECURITY] Unauthorized attempt to create root admin');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', success: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    console.log("Creating root admin user (authorized request)...");

    // Get admin credentials from environment variables
    const adminEmail = Deno.env.get("ADMIN_EMAIL");
    const adminPassword = Deno.env.get("ADMIN_PASSWORD");
    
    if (!adminEmail || !adminPassword) {
      throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required");
    }

    // Create the root admin user
    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        data: {
          first_name: 'Dan',
          last_name: 'Pearson',
          role: 'root_admin'
        }
      }
    });

    if (authError) {
      console.error("Auth error:", authError);
      throw authError;
    }

    console.log("Root admin user created:", authData.user?.id);

    // Update the user profile with root_admin role
    if (authData.user) {
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .update({
          role: 'root_admin',
          first_name: 'Dan',
          last_name: 'Pearson',
          is_active: true
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error("Profile update error:", profileError);
      } else {
        console.log("Root admin profile updated successfully");
      }

      // Audit trail (US-244): a platform superuser now exists. This endpoint is
      // gated by ADMIN_CREATION_SECRET rather than a session, so there is no
      // actor user to name — the row records that the secret was used.
      await writeAuditLog(supabaseAdmin, {
        actorUserId: null,
        action: 'root_admin.created',
        entityType: 'user_profile',
        entityId: authData.user.id,
        after: { role: 'root_admin', email: adminEmail },
        description: 'Root admin created via ADMIN_CREATION_SECRET',
        riskLevel: 'critical',
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Root admin user created successfully",
        user_id: authData.user?.id,
        email: adminEmail
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error creating root admin:", error);
    // SECURITY: Don't expose internal error details
    return new Response(
      JSON.stringify({
        error: 'An error occurred during admin creation',
        success: false
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});