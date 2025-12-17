// Setup MFA Edge Function
// Updated with multi-tenant site_id isolation
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { TOTP } from "https://deno.land/x/otpauth@v9.2.4/dist/otpauth.esm.js";
import QRCode from "https://esm.sh/qrcode@1.5.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateRequest, sanitizeError, createErrorResponse } from "../_shared/validation.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SECURITY: Input validation schema
const SetupMFASchema = z.object({
  user_id: z.string().uuid('Invalid user ID format')
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize auth context - extracts user AND site_id from JWT
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, siteId, supabase: supabaseClient } = authContext;

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
      issuer: "Project Profit Radar",
      label: user.email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
    });

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(secret.toString());

    // Store the secret (temporarily) in user_security table with site isolation
    const { error: updateError } = await supabaseClient
      .from("user_security")
      .upsert({
        site_id: siteId,  // CRITICAL: Include site_id
        user_id: user_id,
        two_factor_secret: secret.secret,
        two_factor_enabled: false, // Not enabled until verified
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,site_id'  // Update conflict resolution for multi-tenant
      });

    if (updateError) {
      console.error("Error storing MFA secret:", updateError);
      throw new Error("Failed to initialize MFA setup");
    }

    // Log security event with site isolation
    await supabaseClient.from("security_logs").insert({
      site_id: siteId,  // CRITICAL: Include site_id
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