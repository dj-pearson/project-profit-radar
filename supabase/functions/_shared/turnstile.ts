/**
 * Cloudflare Turnstile verification for the public lead forms (US-351).
 *
 * The forms send the widget's token as `turnstileToken`; this checks it with
 * Cloudflare before anything is written.
 *
 * Enforcement follows the secret. With TURNSTILE_SECRET_KEY unset the check
 * is skipped and says so, because the widget only renders once the web build
 * has VITE_TURNSTILE_SITE_KEY: setting the secret first would reject every
 * real submission. Roll out site key first, then the secret.
 *
 * Once enforced it fails closed: a missing token, a Cloudflare error or an
 * unreachable siteverify all refuse the submission.
 *
 * Pure apart from the injected fetch and env, so vitest can load it.
 */

export const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export type TurnstileResult =
  | { ok: true; enforced: boolean }
  | { ok: false; reason: 'missing-token' | 'rejected' | 'unreachable'; codes?: string[] };

export async function verifyTurnstile(
  token: unknown,
  remoteIp: string | null,
  opts: { secret: string | undefined; fetchImpl?: typeof fetch },
): Promise<TurnstileResult> {
  if (!opts.secret) return { ok: true, enforced: false };
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) {
    return { ok: false, reason: 'missing-token' };
  }

  const form = new URLSearchParams({ secret: opts.secret, response: token });
  if (remoteIp && remoteIp !== 'unknown') form.set('remoteip', remoteIp);

  try {
    const res = await (opts.fetchImpl ?? fetch)(SITEVERIFY_URL, { method: 'POST', body: form });
    const body = await res.json().catch(() => null) as { success?: boolean; 'error-codes'?: string[] } | null;
    if (!res.ok || !body) return { ok: false, reason: 'unreachable' };
    if (body.success !== true) return { ok: false, reason: 'rejected', codes: body['error-codes'] };
    return { ok: true, enforced: true };
  } catch {
    return { ok: false, reason: 'unreachable' };
  }
}

export const TURNSTILE_FAILED_MESSAGE = 'Please complete the verification and try again.';
