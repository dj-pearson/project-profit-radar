// Setup MFA Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { TOTP } from "https://deno.land/x/otpauth@v9.2.4/dist/otpauth.esm.js";
import QRCode from "https://esm.sh/qrcode@1.5.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateRequest, sanitizeError, createErrorResponse } from "../_shared/validation.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { createServiceClient } from '../_shared/service-client.ts';
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/secure-cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";
import { writeSecurityLog } from "../_shared/security-log.ts";

// SECURITY: Input validation schema
const SetupMFASchema = z.object({
  user_id: z.string().uuid('Invalid user ID format')
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, supabase: supabaseClient } = authContext;

    // Rate limit: 3 MFA setup attempts per hour per user (prevents secret regeneration abuse)
    // US-307: the limiter writes rate_limit_state through consume_rate_limit,
    // which is granted to service_role only. A user-JWT client here means the
    // RPC is refused and the limit silently never applies.
    const rateLimitResult = await checkRateLimit(createServiceClient(), {
      identifier: user.id,
      endpoint: 'setup-mfa',
      maxRequests: 3,
      windowMinutes: 60,
    });

    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }

    // SECURITY: Validate request body
    const requestBody = await req.json();
    const validation = validateRequest(SetupMFASchema, requestBody);

    if (!validation.success) {
      return createErrorResponse(400, validation.error, corsHeaders);
    }

    const { user_id } = validation.data;

    // Verify the user can only set up MFA for themselves
    if (user.id !== user_id) {
      return createErrorResponse(403, "Unauthorized access", corsHeaders);
    }

    // Generate a secret for TOTP
    const secret = new TOTP({
      issuer: "Brikly",
      label: user.email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
    });

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(secret.toString());

    // Store the secret (temporarily) in user_security table
    const { error: updateError } = await supabaseClient
      .from("user_security")
      .upsert({
        user_id: user_id,
        two_factor_secret: secret.secret,
        two_factor_enabled: false, // Not enabled until verified
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (updateError) {
      console.error("Error storing MFA secret:", updateError);
      throw new Error("Failed to initialize MFA setup");
    }

    // Log security event. security_logs is service-role-only (US-306 follow-up):
    // a client that can write its own security log can forge the record of its
    // own behaviour. The caller is already authenticated above.
    await writeSecurityLog(createServiceClient(), {
      user_id: user_id,
      event_type: "mfa_setup_initiated",
      ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
      user_agent: req.headers.get("user-agent"),
      details: {
        timestamp: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        qr_code_url: qrCodeDataUrl,
        secret: secret.secret,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const safeMessage = sanitizeError(error);
    return createErrorResponse(500, safeMessage, corsHeaders);
  }
});