import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { changePassword, sessionIdFromJwt, type ChangePasswordDeps } from '../change-password/core.ts';

const USER = '11111111-0000-0000-0000-000000000001';
const SESSION = 'aaaaaaaa-0000-0000-0000-000000000001';

function deps(over: Partial<ChangePasswordDeps> = {}) {
  return {
    verifyReauthOtp: vi.fn(async () => ({ ok: true })),
    validatePassword: vi.fn(() => ({ valid: true, errors: [] as string[] })),
    updatePassword: vi.fn(async () => ({})),
    revokeOtherSessions: vi.fn(async () => ({ revoked: 2 })),
    ...over,
  };
}
const input = { userId: USER, email: 'dana@reyesbuild.com', sessionId: SESSION, otpCode: '123456', newPassword: 'N3w-long-passw0rd!' };

describe('change-password (US-347)', () => {
  it('verifies the reauth code, changes the password, then ends the other sessions', async () => {
    const d = deps();
    const r = await changePassword(input, d);
    expect(r.status).toBe(200);
    expect(d.verifyReauthOtp).toHaveBeenCalledWith('dana@reyesbuild.com', '123456');
    expect(d.updatePassword).toHaveBeenCalledWith(USER, 'N3w-long-passw0rd!');
    expect(d.revokeOtherSessions).toHaveBeenCalledWith(USER, SESSION);
    expect(r.body).toMatchObject({ success: true, data: { revokedSessions: 2 } });
    // Order: nothing changes before the code verifies.
    expect(d.verifyReauthOtp.mock.invocationCallOrder[0]).toBeLessThan(d.updatePassword.mock.invocationCallOrder[0]);
  });

  it('a wrong code changes nothing', async () => {
    const d = deps({ verifyReauthOtp: vi.fn(async () => ({ ok: false, error: 'Invalid code' })) });
    const r = await changePassword(input, d);
    expect(r.status).toBe(401);
    expect(d.updatePassword).not.toHaveBeenCalled();
    expect(d.revokeOtherSessions).not.toHaveBeenCalled();
  });

  it('a malformed code is refused before it spends a verification attempt', async () => {
    const d = deps();
    expect((await changePassword({ ...input, otpCode: '12ab56' }, d)).status).toBe(400);
    expect(d.verifyReauthOtp).not.toHaveBeenCalled();
  });

  it('a weak password is refused before the code is consumed', async () => {
    const d = deps({ validatePassword: vi.fn(() => ({ valid: false, errors: ['too short'] })) });
    const r = await changePassword(input, d);
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ details: ['too short'] });
    expect(d.verifyReauthOtp).not.toHaveBeenCalled();
  });

  it('a failed update does not revoke sessions', async () => {
    const d = deps({ updatePassword: vi.fn(async () => ({ error: 'boom' })) });
    expect((await changePassword(input, d)).status).toBe(500);
    expect(d.revokeOtherSessions).not.toHaveBeenCalled();
  });

  it('reports a failed revocation instead of hiding it', async () => {
    const d = deps({ revokeOtherSessions: vi.fn(async () => ({ error: 'nope' })) });
    const r = await changePassword(input, d);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ data: { revokedSessions: null } });
  });

  it('reads session_id from the access token', () => {
    const payload = btoa(JSON.stringify({ sub: USER, session_id: SESSION })).replace(/=+$/, '');
    expect(sessionIdFromJwt(`h.${payload}.s`)).toBe(SESSION);
    expect(sessionIdFromJwt('garbage')).toBeNull();
  });
});

describe('reset-password-otp ends every session after a reset (US-347)', () => {
  const src = readFileSync(join(process.cwd(), 'supabase/functions/reset-password-otp/index.ts'), 'utf8');

  it('calls revoke_user_sessions after updateUserById, with no session kept', () => {
    const update = src.indexOf('admin.updateUserById(');
    const revoke = src.indexOf("rpc('revoke_user_sessions'");
    expect(update).toBeGreaterThan(-1);
    expect(revoke).toBeGreaterThan(update);
    expect(src.slice(revoke, revoke + 200)).not.toContain('p_keep_session_id');
  });
});
