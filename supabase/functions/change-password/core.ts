/**
 * Password change for a signed-in user, with reauthentication and session
 * revocation enforced on the server (US-347).
 *
 * The profile page called supabase.auth.updateUser({ password }) straight from
 * the browser: no proof the person at the keyboard knows anything beyond the
 * session they are holding, and every other session, a thief's included,
 * stayed signed in afterwards. Doing the reauthentication check in the
 * browser would only be a UX step, because updateUser is callable directly
 * with the same session. So the change happens here, and here only:
 *
 *   1. the caller's reauthentication OTP (send-auth-otp type
 *      'reauthentication', emailed to the account address) must verify,
 *   2. the new password must pass the server password policy,
 *   3. the password is changed through the admin API,
 *   4. every other session is revoked, keeping the caller's own.
 *
 * Pure: every side effect is injected, so the order and the failure paths can
 * be tested without Deno or a database.
 */

export interface ChangePasswordDeps {
  verifyReauthOtp: (email: string, code: string) => Promise<{ ok: boolean; error?: string }>;
  validatePassword: (password: string) => { valid: boolean; errors: string[] };
  updatePassword: (userId: string, password: string) => Promise<{ error?: string }>;
  revokeOtherSessions: (userId: string, keepSessionId: string | null) => Promise<{ revoked?: number; error?: string }>;
}

export interface ChangePasswordInput {
  userId: string;
  email: string | null;
  sessionId: string | null;
  otpCode: unknown;
  newPassword: unknown;
}

export type ChangePasswordResult =
  | { status: 200; body: { success: true; data: { revokedSessions: number | null }; timestamp: string } }
  | { status: 400 | 401 | 500; body: { success: false; error: string; details?: string[]; timestamp: string } };

const now = () => new Date().toISOString();
const fail = (status: 400 | 401 | 500, error: string, details?: string[]): ChangePasswordResult =>
  ({ status, body: { success: false, error, ...(details ? { details } : {}), timestamp: now() } });

export async function changePassword(input: ChangePasswordInput, deps: ChangePasswordDeps): Promise<ChangePasswordResult> {
  if (typeof input.otpCode !== 'string' || !/^\d{6}$/.test(input.otpCode)) {
    return fail(400, 'Enter the 6-digit code we emailed you');
  }
  if (typeof input.newPassword !== 'string' || input.newPassword.length === 0 || input.newPassword.length > 256) {
    return fail(400, 'Enter a new password');
  }
  if (!input.email) {
    return fail(400, 'Your account has no email address to verify against');
  }

  const policy = deps.validatePassword(input.newPassword);
  if (!policy.valid) {
    return fail(400, 'Password does not meet security requirements', policy.errors);
  }

  // Verify before changing anything. A wrong code changes nothing.
  const otp = await deps.verifyReauthOtp(input.email, input.otpCode);
  if (!otp.ok) {
    return fail(401, otp.error || 'Invalid or expired verification code');
  }

  const updated = await deps.updatePassword(input.userId, input.newPassword);
  if (updated.error) {
    return fail(500, 'Failed to update password');
  }

  // The password has changed; a revocation failure is reported back rather
  // than hidden, so the client can fall back to signOut({ scope: 'others' }).
  const revoked = await deps.revokeOtherSessions(input.userId, input.sessionId);
  return {
    status: 200,
    body: { success: true, data: { revokedSessions: revoked.error ? null : (revoked.revoked ?? 0) }, timestamp: now() },
  };
}

/** session_id claim of an access token GoTrue has already verified. */
export function sessionIdFromJwt(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.session_id === 'string' ? json.session_id : null;
  } catch {
    return null;
  }
}
