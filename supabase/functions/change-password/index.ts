// change-password: see core.ts for why this exists (US-347).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { validatePasswordStrength } from '../_shared/password-policy.ts';
import { enforceRateLimit, RATE_LIMITS } from '../_shared/rate-limiter.ts';
import { createServiceClient } from '../_shared/service-client.ts';
import { writeSecurityLog } from '../_shared/security-log.ts';
import { changePassword, sessionIdFromJwt } from './core.ts';
import { withErrorReporting } from '../_shared/observability.ts';

const ChangePasswordSchema = z.object({
  otpCode: z.string().regex(/^\d{6}$/),
  newPassword: z.string().min(1).max(256),
});

serve(withErrorReporting('change-password', async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, req);
  }

  const authContext = await initializeAuthContext(req);
  if (!authContext) {
    return errorResponse('Unauthorized', 401, req);
  }
  const { user } = authContext;
  const admin = createServiceClient();

  // Each attempt burns a guess at the 6-digit code.
  const limited = await enforceRateLimit(admin, user.id, 'change-password', RATE_LIMITS.AUTH, corsHeaders);
  if (limited) return limited;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return errorResponse('Invalid request body', 400, req);
  }
  const parsed = ChangePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return errorResponse('Enter the 6-digit code and a new password', 400, req);
  }

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');

  const result = await changePassword(
    {
      userId: user.id,
      email: user.email ?? null,
      sessionId: sessionIdFromJwt(token),
      otpCode: parsed.data.otpCode,
      newPassword: parsed.data.newPassword,
    },
    {
      verifyReauthOtp: async (email, code) => {
        const { data, error } = await admin.rpc('verify_otp_code', {
          p_email: email,
          p_otp_code: code,
          p_token_type: 'reauthentication',
        });
        if (error) return { ok: false, error: 'Verification failed' };
        const row = data?.[0];
        return row?.success ? { ok: true } : { ok: false, error: row?.error_message };
      },
      validatePassword: validatePasswordStrength,
      updatePassword: async (userId, password) => {
        const { error } = await admin.auth.admin.updateUserById(userId, { password });
        if (error) console.error('[change-password] update failed:', error.message);
        return { error: error?.message };
      },
      revokeOtherSessions: async (userId, keepSessionId) => {
        const { data, error } = await admin.rpc('revoke_user_sessions', {
          p_user_id: userId,
          p_keep_session_id: keepSessionId,
        });
        if (error) console.error('[change-password] OTHER SESSIONS STILL ACTIVE:', error.message);
        return error ? { error: error.message } : { revoked: data as number };
      },
    },
  );

  if (result.status === 200) {
    await writeSecurityLog(admin, {
      user_id: user.id,
      event_type: 'password_changed',
      ip_address: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for'),
      user_agent: req.headers.get('user-agent'),
      details: { revoked_sessions: result.body.data.revokedSessions, timestamp: new Date().toISOString() },
    });
  }

  if (result.status === 200) {
    return successResponse(result.body.data, req);
  }
  const detail = result.body.details?.length ? `: ${result.body.details.join('; ')}` : '';
  return errorResponse(`${result.body.error}${detail}`, result.status, req);
}));
