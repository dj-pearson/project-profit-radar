/**
 * The MFA step that runs between signInWithPassword and letting the app in (US-346).
 *
 * MFA could be enrolled but nothing in the sign-in path ever asked for it.
 * signIn() now holds the new session back from the app, asks
 * verify-mfa-login whether this account has a factor, and only releases the
 * session once the code is verified. An abandoned or failed challenge signs
 * the half-session out.
 *
 * Limitation, stated plainly: the gate is in the client. After
 * signInWithPassword the tokens are real, so someone with the password who
 * calls the REST API directly is not stopped by this. Closing that needs the
 * server to refuse a session that has not passed MFA (Supabase AAL2, or an
 * RLS check on a verified-MFA claim). This makes the product ask for the
 * factor a user turned on, which it did not do at all before.
 */
import { getEdgeFunctionUrl, supabaseAnonKey } from '@/integrations/supabase/client';

/** localStorage key marking a session that has not passed its MFA challenge. */
export const MFA_PENDING_KEY = 'brikly.mfaPending';

export type MfaCheck = { required: false } | { required: true };

async function callVerifyMfa(accessToken: string, body: Record<string, unknown>) {
  const response = await fetch(getEdgeFunctionUrl('verify-mfa-login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result?.success !== true) {
    throw new Error(result?.error || `MFA check failed (${response.status})`);
  }
  return result;
}

/**
 * Whether this sign-in has to pass an MFA challenge. Throws when the answer
 * cannot be obtained; the caller fails closed on that.
 *
 * userId is sent as well as the bearer so a verify-mfa-login deployed before
 * US-346 (which read userId from the body) keeps answering during a
 * mixed-version window; the new function rejects it only when it differs.
 */
export async function checkMfaRequired(accessToken: string, userId: string, deviceId: string | null): Promise<MfaCheck> {
  const status = await callVerifyMfa(accessToken, { action: 'check', userId });
  if (!status.mfaRequired) return { required: false };

  // A device the user chose to trust within the last 90 days skips the code.
  if (deviceId) {
    try {
      const trust = await callVerifyMfa(accessToken, { action: 'check_trusted_device', userId, deviceId });
      if (trust.isTrusted) return { required: false };
    } catch {
      // Not trusted as far as we can tell; ask for the code.
    }
  }
  return { required: true };
}

export function readDeviceId(): string | null {
  try {
    return localStorage.getItem('bd_device_id');
  } catch {
    return null;
  }
}

export function markMfaPending(userId: string | null) {
  try {
    if (userId) localStorage.setItem(MFA_PENDING_KEY, userId);
    else localStorage.removeItem(MFA_PENDING_KEY);
  } catch {
    /* storage unavailable: the in-memory gate still holds for this tab */
  }
}

export function readMfaPending(): string | null {
  try {
    return localStorage.getItem(MFA_PENDING_KEY);
  } catch {
    return null;
  }
}
