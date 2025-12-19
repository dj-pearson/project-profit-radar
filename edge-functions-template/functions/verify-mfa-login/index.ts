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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const VerifyMFALoginSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
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
  userId: z.string().uuid("Invalid user ID"),
  code: z.string().min(6, "Invalid backup code").max(12),
  sessionToken: z.string().optional(),
});

// Check MFA status schema
const CheckMFAStatusSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      return createErrorResponse(400, "Invalid request body", corsHeaders);
    }

    const action = requestBody.action || "verify";

    switch (action) {
      case "check": {
        // Check if user has MFA enabled
        const validation = validateRequest(CheckMFAStatusSchema, requestBody);
        if (!validation.success) {
          return createErrorResponse(400, validation.error, corsHeaders);
        }

        const { userId } = validation.data;

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

        const { userId, code, trustDevice, deviceInfo } = validation.data;

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
        const userEmail = userData?.user?.email || "user@builddesk.com";

        // Verify the TOTP code
        const totp = new TOTP({
          issuer: "BuildDesk",
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
          await supabaseClient.from("security_logs").insert({
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

          await supabaseClient.from("trusted_devices").upsert(
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
        }

        // Update MFA usage stats
        await supabaseClient
          .from("mfa_devices")
          .update({
            last_used_at: new Date().toISOString(),
            total_uses: supabaseClient.rpc("increment_mfa_uses", { device_id: userId }),
          })
          .eq("user_id", userId)
          .eq("mfa_type", "totp")
          .eq("is_enabled", true);

        // Log successful MFA verification
        await supabaseClient.from("security_logs").insert({
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

        const { userId, code } = validation.data;

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
          await supabaseClient.from("security_logs").insert({
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

        await supabaseClient
          .from("user_security")
          .update({
            backup_codes: updatedCodes,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        // Log successful backup code use
        await supabaseClient.from("security_logs").insert({
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
        const userId = requestBody.userId;

        if (!deviceId || !userId) {
          return createErrorResponse(400, "Device ID and User ID required", corsHeaders);
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
          await supabaseClient
            .from("trusted_devices")
            .update({
              last_seen_at: new Date().toISOString(),
              last_ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
            })
            .eq("id", trustedDevice.id);
        }

        return new Response(
          JSON.stringify({
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
