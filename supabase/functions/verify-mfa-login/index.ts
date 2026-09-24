/**
 * MFA Login Verification Edge Function
 *
 * Verifies TOTP code during login flow
 * Called after successful password authentication when MFA is enabled
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { TOTP } from "https://deno.land/x/otpauth@v9.2.4/dist/otpauth.esm.js";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateRequest, createErrorResponse, sanitizeError } from "../_shared/validation.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/secure-cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";
import { writeSecurityLog } from "../_shared/security-log.ts";
import { initializeAuthContext } from "../_shared/auth-helpers.ts";
import { captureException } from '../_shared/observability.ts';
import { API_VERSION, apiVersionHeaders } from '../_shared/api-version.ts';

// Input validation schema
// userId is optional and, when sent, must equal the caller (US-346). Older
// builds of the modal sent it; the identity now comes from the bearer.
const VerifyMFALoginSchema = z.object({
  userId: z.string().uuid("Invalid user ID").optional(),
  code: z
    .string()
    .length(6, "Code must be exactly 6 digits")
    .regex(/^\d{6}$/, "Code must contain only digits"),
  sessionToken: z.string().optional(), // Optional pending session token
  trustDevice: z.boolean().default(false),
  deviceInfo: z
    .object({
      deviceId: z.string().optional(),
      deviceName: z.string().optional(),
      deviceType: z.string().optional(),
      userAgent: z.string().optional(),
    })
    .optional(),
});

// Backup code validation schema
const VerifyBackupCodeSchema = z.object({
  userId: z.string().uuid("Invalid user ID").optional(),
  code: z.string().min(6, "Invalid backup code").max(12),
  sessionToken: z.string().optional(),
});

// Check MFA status schema
const CheckMFAStatusSchema = z.object({
  userId: z.string().uuid("Invalid user ID").optional(),
});

serve(async (req) => {
  // US-273: every response here, error or not, carries X-API-Version.
  const corsHeaders = { ...getCorsHeaders(req), ...apiVersionHeaders() };

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // The caller is whoever the bearer says, never the body (US-346). This
    // used to run on the service role with userId from the body and no auth,
    // so "check" told anyone whether any user id had MFA enrolled, and the
    // verify actions could be driven for any account.
    //
    // This runs right after signInWithPassword, so the caller holds a real
    // session; that session is exactly what the client withholds from the app
    // until verify succeeds.
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return createErrorResponse(401, "Unauthorized", corsHeaders);
    }
    const callerId: string = authContext.user.id;

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      return createErrorResponse(400, "Invalid request body", corsHeaders);
    }

    if (requestBody?.userId !== undefined && requestBody.userId !== callerId) {
      return createErrorResponse(403, "userId does not match the signed-in user", corsHeaders);
    }

    const action = requestBody.action || "verify";

    // Rate limit the code-guessing actions: 5 attempts per minute per account
    // (not per IP, which an attacker rotates),
    // which caps a 6-digit brute force. "check" is not limited here, because
    // it runs on every sign-in and a per-IP limit would lock out an office
    // behind one address.
    if (action === "verify" || action === "verify_backup") {
      const rateLimitResult = await checkRateLimit(supabaseClient, {
        identifier: callerId,
        endpoint: 'verify-mfa-login',
        maxRequests: 5,
        windowMinutes: 1,
      });

      if (!rateLimitResult.allowed) {
        return rateLimitResponse(rateLimitResult, corsHeaders);
      }
    }


    switch (action) {
      case "check": {
        // Check if user has MFA enabled
        const validation = validateRequest(CheckMFAStatusSchema, requestBody);
        if (!validation.success) {
          return createErrorResponse(400, validation.error, corsHeaders);
        }

        const userId = callerId;

        // Check user_security table for MFA status
        const { data: securityData, error: securityError } = await supabaseClient
          .from("user_security")
          .select("two_factor_enabled, two_factor_secret")
          .eq("user_id", userId)
          .single();

        if (securityError && securityError.code !== "PGRST116") {
          console.error("[MFA] Error checking security status:", securityError);
        }

        // Also check mfa_devices table
        const { data: mfaDevices } = await supabaseClient
          .from("mfa_devices")
          .select("id, mfa_type, is_enabled, is_verified")
          .eq("user_id", userId)
          .eq("is_enabled", true)
          .eq("is_verified", true);

        const hasMFA =
          (securityData?.two_factor_enabled && securityData?.two_factor_secret) ||
          (mfaDevices && mfaDevices.length > 0);

        return new Response(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            api_version: API_VERSION,
            success: true,
            mfaRequired: hasMFA,
            mfaType: hasMFA ? "totp" : null,
            hasBackupCodes: !!securityData?.two_factor_enabled,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      case "verify": {
        // Verify TOTP code
        const validation = validateRequest(VerifyMFALoginSchema, requestBody);
        if (!validation.success) {
          return createErrorResponse(400, validation.error, corsHeaders);
        }

        const { code, trustDevice, deviceInfo } = validation.data;
        const userId = callerId;

        // Get the stored TOTP secret
        const { data: securityData, error: fetchError } = await supabaseClient
          .from("user_security")
          .select("two_factor_secret, two_factor_enabled")
          .eq("user_id", userId)
          .single();

        if (fetchError || !securityData?.two_factor_secret) {
          console.error("[MFA] No MFA secret found for user");
          return createErrorResponse(400, "MFA not configured for this account", corsHeaders);
        }

        if (!securityData.two_factor_enabled) {
          return createErrorResponse(400, "MFA is not enabled for this account", corsHeaders);
        }

        // Get user email for TOTP validation
        const { data: userData } = await supabaseClient.auth.admin.getUserById(userId);
        const userEmail = userData?.user?.email || "user@brikly.net";

        // Verify the TOTP code
        const totp = new TOTP({
          issuer: "Brikly",
          label: userEmail,
          algorithm: "SHA1",
          digits: 6,
          period: 30,
          secret: securityData.two_factor_secret,
        });

        // Allow for time drift (window of 1 = ±30 seconds)
        const isValid = totp.validate({ token: code, window: 1 }) !== null;

        if (!isValid) {
          // Log failed attempt
          await writeSecurityLog(supabaseClient, {
            user_id: userId,
            event_type: "mfa_login_failed",
            ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
            user_agent: req.headers.get("user-agent"),
            details: {
              reason: "invalid_code",
              timestamp: new Date().toISOString(),
            },
          });

          return createErrorResponse(401, "Invalid verification code", corsHeaders);
        }

        // If trustDevice is true, add this device to trusted_devices
        if (trustDevice && deviceInfo?.deviceId) {
          const deviceFingerprint = await generateDeviceFingerprint(deviceInfo);

          const { error: trustError } = await supabaseClient.from("trusted_devices").upsert(
            {
              user_id: userId,
              device_id: deviceInfo.deviceId,
              device_name: deviceInfo.deviceName || "Unknown Device",
              device_type: deviceInfo.deviceType || "web",
              device_fingerprint: deviceFingerprint,
              is_trusted: true,
              trusted_at: new Date().toISOString(),
              trust_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
              last_ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
              last_seen_at: new Date().toISOString(),
            },
            {
              onConflict: "user_id,device_id",
            }
          );

          // Not fatal - the sign-in succeeded. It does mean the user asked not
          // to be challenged on this device for 90 days and will be challenged
          // anyway, with no sign of why. The error was discarded (US-300).
          if (trustError) {
            console.error("[verify-mfa-login] device not trusted:", trustError.message);
          }
        }

        // Update MFA usage stats.
        //
        // This had three faults in one line and the discarded error hid all of
        // them (US-300). supabaseClient.rpc(...) returns a builder, not a
        // number, so total_uses was assigned a serialised object; the argument
        // was named device_id while the function's parameter is p_device_id, so
        // PostgREST could not have resolved it; and the value passed was the
        // user id rather than the device id. The builder was never awaited, so
        // the RPC never ran at all.
        //
        // increment_mfa_uses does the increment itself, keyed on
        // mfa_devices.id, so the id has to come back from the update.
        const { data: usedDevices, error: usageError } = await supabaseClient
          .from("mfa_devices")
          .update({ last_used_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("mfa_type", "totp")
          .eq("is_enabled", true)
          .select("id");

        if (usageError) {
          console.error("[verify-mfa-login] MFA usage stats not updated:", usageError.message);
        } else {
          for (const device of usedDevices ?? []) {
            const { error: countError } = await supabaseClient.rpc("increment_mfa_uses", {
              p_device_id: device.id,
            });
            if (countError) {
              console.error("[verify-mfa-login] use counter not incremented:", countError.message);
            }
          }
        }

        // Log successful MFA verification
        await writeSecurityLog(supabaseClient, {
          user_id: userId,
          event_type: "mfa_login_success",
          ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
          user_agent: req.headers.get("user-agent"),
          details: {
            device_trusted: trustDevice,
            timestamp: new Date().toISOString(),
          },
        });

        return new Response(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            api_version: API_VERSION,
            success: true,
            verified: true,
            message: "MFA verification successful",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      case "verify_backup": {
        // Verify backup code
        const validation = validateRequest(VerifyBackupCodeSchema, requestBody);
        if (!validation.success) {
          return createErrorResponse(400, validation.error, corsHeaders);
        }

        const { code } = validation.data;
        const userId = callerId;

        // Get backup codes
        const { data: securityData, error: fetchError } = await supabaseClient
          .from("user_security")
          .select("backup_codes")
          .eq("user_id", userId)
          .single();

        if (fetchError || !securityData?.backup_codes) {
          return createErrorResponse(400, "No backup codes available", corsHeaders);
        }

        const backupCodes = securityData.backup_codes as string[];
        const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, "");

        // Check if code exists and is unused
        const codeIndex = backupCodes.findIndex(
          (c) => c.toUpperCase().replace(/[^A-Z0-9]/g, "") === normalizedCode
        );

        if (codeIndex === -1) {
          // Log failed attempt
          await writeSecurityLog(supabaseClient, {
            user_id: userId,
            event_type: "mfa_backup_code_failed",
            ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
            user_agent: req.headers.get("user-agent"),
            details: {
              reason: "invalid_code",
              timestamp: new Date().toISOString(),
            },
          });

          return createErrorResponse(401, "Invalid backup code", corsHeaders);
        }

        // Remove used backup code
        const updatedCodes = [...backupCodes];
        updatedCodes.splice(codeIndex, 1);

        // Consuming the code is what makes it single-use. The error was
        // discarded, so a failure left the code valid and reusable while the
        // sign-in went ahead - the whole point of a backup code, defeated
        // silently (US-300). Fail closed: no consumption, no login.
        const { error: consumeError } = await supabaseClient
          .from("user_security")
          .update({
            backup_codes: updatedCodes,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (consumeError) {
          console.error("[verify-mfa-login] backup code not consumed:", consumeError.message);
          await writeSecurityLog(supabaseClient, {
            user_id: userId,
            event_type: "mfa_backup_code_consume_failed",
            ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
            user_agent: req.headers.get("user-agent"),
          });
          return createErrorResponse(500, "Could not complete sign-in. Please try again.", corsHeaders);
        }

        // Log successful backup code use
        await writeSecurityLog(supabaseClient, {
          user_id: userId,
          event_type: "mfa_backup_code_used",
          ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
          user_agent: req.headers.get("user-agent"),
          details: {
            remaining_codes: updatedCodes.length,
            timestamp: new Date().toISOString(),
          },
        });

        return new Response(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            api_version: API_VERSION,
            success: true,
            verified: true,
            message: "Backup code verified",
            remainingCodes: updatedCodes.length,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      case "check_trusted_device": {
        // Check if current device is trusted
        const deviceId = requestBody.deviceId;
        const userId = callerId;

        if (!deviceId) {
          return createErrorResponse(400, "Device ID required", corsHeaders);
        }

        const { data: trustedDevice } = await supabaseClient
          .from("trusted_devices")
          .select("*")
          .eq("user_id", userId)
          .eq("device_id", deviceId)
          .eq("is_trusted", true)
          .single();

        const isTrusted =
          trustedDevice && new Date(trustedDevice.trust_expires_at) > new Date();

        if (isTrusted) {
          // Update last seen
          const { error: seenError } = await supabaseClient
            .from("trusted_devices")
            .update({
              last_seen_at: new Date().toISOString(),
              last_ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
            })
            .eq("id", trustedDevice.id);

          // last_ip_address on a trusted device is what an audit reads to see
          // where it has been used from. Discarded before (US-300).
          if (seenError) {
            console.error("[verify-mfa-login] trusted-device last seen not updated:", seenError.message);
          }
        }

        return new Response(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            api_version: API_VERSION,
            success: true,
            isTrusted,
            expiresAt: trustedDevice?.trust_expires_at,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      default:
        return createErrorResponse(400, `Unknown action: ${action}`, corsHeaders);
    }
  } catch (error) {
    await captureException(error, { fn: 'verify-mfa-login', req });
    const safeMessage = sanitizeError(error);
    return createErrorResponse(500, safeMessage, corsHeaders);
  }
});

// Generate device fingerprint hash
async function generateDeviceFingerprint(
  deviceInfo: { deviceId?: string; deviceName?: string; deviceType?: string; userAgent?: string }
): Promise<string> {
  const data = [
    deviceInfo.deviceId || "",
    deviceInfo.deviceType || "",
    deviceInfo.userAgent || "",
  ].join("|");

  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
