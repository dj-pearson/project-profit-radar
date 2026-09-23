/**
 * The email/OTP auth flows. Each one is a call to our own edge function (which
 * sends the email itself instead of GoTrue), so none of them touch provider
 * state; AuthProvider wraps them as stable actions.
 */
import { getEdgeFunctionUrl, supabaseAnonKey } from "@/integrations/supabase/client";
import { gtag } from "@/hooks/useGoogleAnalytics";
import { logger } from "@/lib/logger";
import { LEGAL_TERMS_VERSION } from "@/lib/legal/termsVersion";
import type { SendOTPOptions, VerifyOTPOptions, VerifyOTPResult } from "./types";

async function postToEdgeFunction(name: string, body: unknown): Promise<Response> {
  return fetch(getEdgeFunctionUrl(name), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(body),
  });
}

export type SignUpUserData = { first_name?: string; last_name?: string; terms_accepted?: boolean };

// Sign up using our custom edge function (bypasses Supabase's email)
export async function signUpWithOtp(
  email: string,
  password: string,
  userData?: SignUpUserData,
): Promise<{ error?: string; userId?: string; expiresInMinutes?: number }> {
  try {
    // Call our custom signup edge function (doesn't trigger Supabase email)
    const response = await postToEdgeFunction('signup-with-otp', {
      email,
      password,
      firstName: userData?.first_name || "",
      lastName: userData?.last_name || "",
      // US-361: recorded on the profile with the version agreed to.
      termsAccepted: userData?.terms_accepted === true,
      termsVersion: LEGAL_TERMS_VERSION,
      // No role: the server fixes it. It used to be forwarded from the
      // caller straight into a service-role insert (US-338).
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error("AuthContext: Sign up error:", data.error);
      return { error: data.error || "Failed to create account" };
    }

    logger.debug("AuthContext: Sign up successful, OTP sent");
    gtag.trackAuth("signup", "email");
    return { userId: data.userId, expiresInMinutes: data.expiresInMinutes };
  } catch (error) {
    logger.error("AuthContext: Sign up exception:", error);
    return { error: "An unexpected error occurred" };
  }
}

// Request password reset using our custom edge function (bypasses Supabase's email)
export async function requestPasswordReset(email: string): Promise<{ error?: string; expiresInMinutes?: number }> {
  try {
    logger.debug("AuthContext: Requesting password reset via OTP flow...");

    // Call our custom reset password edge function
    const response = await postToEdgeFunction('reset-password-otp', {
      action: "request",
      email,
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error("AuthContext: Reset password error:", data.error);
      return { error: data.error || "Failed to send reset code" };
    }

    logger.debug("AuthContext: Password reset OTP sent");
    return { expiresInMinutes: data.expiresInMinutes };
  } catch (error) {
    logger.error("AuthContext: Reset password exception:", error);
    return { error: "An unexpected error occurred" };
  }
}

// Verify OTP and set new password
export async function resetPasswordWithOtp(
  email: string,
  otpCode: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.debug("AuthContext: Verifying reset OTP and updating password...");

    const response = await postToEdgeFunction('reset-password-otp', {
      action: "verify",
      email,
      otpCode,
      newPassword,
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error("AuthContext: Reset password verify error:", data.error);
      return { success: false, error: data.error || "Failed to reset password" };
    }

    logger.debug("AuthContext: Password reset successful");
    return { success: true };
  } catch (error) {
    logger.error("AuthContext: Reset password verify exception:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function sendAuthOtp(options: SendOTPOptions): Promise<{ error?: string; expiresInMinutes?: number }> {
  try {
    logger.debug(`Sending OTP for ${options.type} to ${options.email}`);

    const response = await postToEdgeFunction('send-auth-otp', {
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error("Send OTP error:", data.error);
      return { error: data.error || "Failed to send verification code" };
    }

    logger.debug("OTP sent successfully");
    return { expiresInMinutes: data.expiresInMinutes || 15 };
  } catch (error) {
    logger.error("Send OTP exception:", error);
    return { error: "An unexpected error occurred" };
  }
}

export async function resendAuthOtp(options: SendOTPOptions): Promise<{ error?: string; expiresInMinutes?: number }> {
  // Resend is just sending again
  return sendAuthOtp(options);
}

export async function verifyAuthOtp(options: VerifyOTPOptions): Promise<VerifyOTPResult> {
  try {
    logger.debug(`Verifying OTP for ${options.type}`);

    const response = await postToEdgeFunction('verify-auth-otp', {
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error("Verify OTP error:", data.error);
      return { success: false, error: data.error || "Verification failed" };
    }

    logger.debug("OTP verified successfully:", data);
    gtag.trackAuth("otp_verified", options.type);

    return {
      success: true,
      ...data,
    };
  } catch (error) {
    logger.error("Verify OTP exception:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
