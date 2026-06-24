/**
 * Login Brute Force Protection Service
 *
 * Implements account lockout protection to prevent brute force password attacks.
 * Uses exponential backoff and account lockout after configurable failed attempts.
 *
 * SECURITY FEATURES:
 * - Tracks failed login attempts per email
 * - Progressive lockout duration (exponential backoff)
 * - Locks account after MAX_FAILED_ATTEMPTS
 * - Clears attempts on successful login
 * - Rate limits by email, not just IP (prevents credential stuffing)
 */

import { supabase } from '@/integrations/supabase/client';

// Configuration constants
const MAX_FAILED_ATTEMPTS = 5;
const INITIAL_LOCKOUT_MINUTES = 5;
const MAX_LOCKOUT_MINUTES = 60;
const ATTEMPT_WINDOW_MINUTES = 15; // Reset failed attempts after this window of no failures

export interface LoginAttemptResult {
  allowed: boolean;
  remainingAttempts?: number;
  lockoutUntil?: Date;
  lockoutMinutes?: number;
  message?: string;
}

/**
 * Check if a login attempt is allowed for the given email
 * Returns lockout status and remaining attempts
 */
export async function checkLoginAttempt(email: string): Promise<LoginAttemptResult> {
  try {
    // Normalize email to prevent bypass via case manipulation
    const normalizedEmail = email.toLowerCase().trim();

    // First, try to get user by email to check their security status
    const { data: userData, error: userError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    // If user doesn't exist, allow attempt but don't reveal user existence
    // This prevents user enumeration attacks
    if (!userData) {
      return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };
    }

    // Check user_security table for lockout status
    const { data: securityData, error: securityError } = await supabase
      .from('user_security')
      .select('failed_login_attempts, last_failed_attempt, account_locked_until')
      .eq('user_id', userData.id)
      .maybeSingle();

    // No security record means no failed attempts yet
    if (!securityData) {
      return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };
    }

    // Check if account is currently locked
    if (securityData.account_locked_until) {
      const lockoutEnd = new Date(securityData.account_locked_until);
      const now = new Date();

      if (lockoutEnd > now) {
        const lockoutMinutes = Math.ceil((lockoutEnd.getTime() - now.getTime()) / (1000 * 60));
        return {
          allowed: false,
          lockoutUntil: lockoutEnd,
          lockoutMinutes,
          message: `Account is temporarily locked. Please try again in ${lockoutMinutes} minute${lockoutMinutes === 1 ? '' : 's'}.`,
        };
      }
    }

    // Check if failed attempts should be reset (outside the attempt window)
    if (securityData.last_failed_attempt) {
      const lastAttempt = new Date(securityData.last_failed_attempt);
      const windowEnd = new Date(lastAttempt.getTime() + ATTEMPT_WINDOW_MINUTES * 60 * 1000);

      if (new Date() > windowEnd) {
        // Window expired, treat as fresh start
        return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };
      }
    }

    const failedAttempts = securityData.failed_login_attempts || 0;
    const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - failedAttempts);

    return {
      allowed: remainingAttempts > 0,
      remainingAttempts,
      message: remainingAttempts <= 2 && remainingAttempts > 0
        ? `Warning: ${remainingAttempts} login attempt${remainingAttempts === 1 ? '' : 's'} remaining before account lockout.`
        : undefined,
    };
  } catch (error) {
    // Fail open with warning - don't block legitimate users due to service errors
    // But log for monitoring
    console.error('[SECURITY] Error checking login attempt:', error);
    return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }
}

/**
 * Record a failed login attempt
 * Increments counter and potentially locks the account
 */
export async function recordFailedLogin(email: string): Promise<LoginAttemptResult> {
  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Get user ID
    const { data: userData } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    // If user doesn't exist, return without recording (prevents enumeration)
    if (!userData) {
      return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS - 1 };
    }

    // Get current security status
    const { data: securityData } = await supabase
      .from('user_security')
      .select('failed_login_attempts, last_failed_attempt')
      .eq('user_id', userData.id)
      .maybeSingle();

    let currentAttempts = 0;

    // Check if we should reset the counter (outside window)
    if (securityData?.last_failed_attempt) {
      const lastAttempt = new Date(securityData.last_failed_attempt);
      const windowEnd = new Date(lastAttempt.getTime() + ATTEMPT_WINDOW_MINUTES * 60 * 1000);

      if (new Date() <= windowEnd) {
        currentAttempts = securityData.failed_login_attempts || 0;
      }
    }

    const newAttemptCount = currentAttempts + 1;
    const now = new Date().toISOString();

    // Calculate lockout if max attempts reached
    let accountLockedUntil: string | null = null;
    let lockoutMinutes = 0;

    if (newAttemptCount >= MAX_FAILED_ATTEMPTS) {
      // Exponential backoff: 5, 10, 20, 40, 60 (capped) minutes
      const lockoutExponent = Math.min(newAttemptCount - MAX_FAILED_ATTEMPTS, 4);
      lockoutMinutes = Math.min(
        INITIAL_LOCKOUT_MINUTES * Math.pow(2, lockoutExponent),
        MAX_LOCKOUT_MINUTES
      );
      accountLockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000).toISOString();
    }

    // Upsert security record
    const { error: upsertError } = await supabase
      .from('user_security')
      .upsert({
        user_id: userData.id,
        failed_login_attempts: newAttemptCount,
        last_failed_attempt: now,
        account_locked_until: accountLockedUntil,
      }, {
        onConflict: 'user_id',
      });

    if (upsertError) {
      console.error('[SECURITY] Error recording failed login:', upsertError);
    }

    // Log security event
    try {
      await supabase.rpc('log_security_event', {
        p_user_id: userData.id,
        p_event_type: 'failed_login',
        p_ip_address: null, // Will be captured server-side
        p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        p_details: {
          attempt_count: newAttemptCount,
          locked: newAttemptCount >= MAX_FAILED_ATTEMPTS,
          lockout_minutes: lockoutMinutes || null,
        },
      });
    } catch (logError) {
      // Don't fail the operation if logging fails
      console.error('[SECURITY] Error logging security event:', logError);
    }

    const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - newAttemptCount);

    if (accountLockedUntil) {
      return {
        allowed: false,
        remainingAttempts: 0,
        lockoutUntil: new Date(accountLockedUntil),
        lockoutMinutes,
        message: `Account locked due to too many failed attempts. Please try again in ${lockoutMinutes} minute${lockoutMinutes === 1 ? '' : 's'}.`,
      };
    }

    return {
      allowed: true,
      remainingAttempts,
      message: remainingAttempts <= 2
        ? `Warning: ${remainingAttempts} login attempt${remainingAttempts === 1 ? '' : 's'} remaining before account lockout.`
        : undefined,
    };
  } catch (error) {
    console.error('[SECURITY] Error recording failed login:', error);
    return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }
}

/**
 * Clear failed login attempts on successful login
 */
export async function clearFailedAttempts(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_security')
      .update({
        failed_login_attempts: 0,
        last_failed_attempt: null,
        account_locked_until: null,
      })
      .eq('user_id', userId);

    if (error) {
      console.error('[SECURITY] Error clearing failed attempts:', error);
    }

    // Log successful login
    try {
      await supabase.rpc('log_security_event', {
        p_user_id: userId,
        p_event_type: 'successful_login',
        p_ip_address: null,
        p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        p_details: { cleared_failed_attempts: true },
      });
    } catch (logError) {
      console.error('[SECURITY] Error logging security event:', logError);
    }
  } catch (error) {
    console.error('[SECURITY] Error clearing failed attempts:', error);
  }
}

/**
 * Get lockout status message for display
 */
export function getLockoutMessage(result: LoginAttemptResult): string {
  if (!result.allowed && result.lockoutMinutes) {
    if (result.lockoutMinutes >= 60) {
      const hours = Math.floor(result.lockoutMinutes / 60);
      const mins = result.lockoutMinutes % 60;
      return `Account is locked. Please try again in ${hours} hour${hours > 1 ? 's' : ''}${mins > 0 ? ` and ${mins} minute${mins > 1 ? 's' : ''}` : ''}.`;
    }
    return `Account is locked. Please try again in ${result.lockoutMinutes} minute${result.lockoutMinutes === 1 ? '' : 's'}.`;
  }

  if (result.message) {
    return result.message;
  }

  return '';
}
