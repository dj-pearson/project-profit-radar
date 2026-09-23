/**
 * The security decisions in oauth-proxy, kept pure so they can be tested
 * (US-349). index.ts does the I/O.
 */

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(message))));
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export function randomToken(bytes = 32): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return b64url(a);
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(value)));
  return Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** `<id>.<hmac(id)>`: what goes to the provider as `state`. */
export async function signState(id: string, secret: string): Promise<string> {
  return `${id}.${await hmac(secret, id)}`;
}

/** The id inside a state we issued, or null for anything else. */
export async function verifyState(state: string, secret: string): Promise<string | null> {
  const dot = state.lastIndexOf('.');
  if (dot <= 0) return null;
  const id = state.slice(0, dot);
  const mac = state.slice(dot + 1);
  return timingSafeEqualStr(mac, await hmac(secret, id)) ? id : null;
}

export interface PendingState {
  expires_at: string;
  browser_binding: string | null;
  provider: string | null;
}

export type PendingCheck = { ok: true } | { ok: false; reason: 'unknown-state' | 'expired' | 'other-browser' };

/**
 * A state is good once: it must exist (the caller deletes it as it reads it),
 * be unexpired, and come back to the browser that started the flow.
 */
export async function checkPendingState(
  row: PendingState | null,
  cookieNonce: string | null,
  now: Date = new Date(),
): Promise<PendingCheck> {
  if (!row) return { ok: false, reason: 'unknown-state' };
  if (new Date(row.expires_at).getTime() <= now.getTime()) return { ok: false, reason: 'expired' };
  if (!row.browser_binding || !cookieNonce) return { ok: false, reason: 'other-browser' };
  if (!timingSafeEqualStr(row.browser_binding, await sha256Hex(cookieNonce))) return { ok: false, reason: 'other-browser' };
  return { ok: true };
}

/** Google sends a boolean, Apple a string. Anything else is unverified. */
export function emailVerified(payload: { email_verified?: unknown }): boolean {
  return payload.email_verified === true || payload.email_verified === 'true';
}

export interface Candidate {
  user_id: string;
  matched_by: 'subject' | 'email';
  stored_subject: string | null;
}

export type LinkDecision =
  | { action: 'sign-in'; userId: string }
  | { action: 'link-then-sign-in'; userId: string }
  | { action: 'create' }
  | { action: 'refuse'; reason: string };

/**
 * Who this provider identity is. A (provider, subject) match wins. Otherwise
 * an email match is accepted only for a verified email and only if that user
 * has no different subject on record for this provider; the first such login
 * binds the subject so later ones match on it.
 */
export function decideLink(candidates: Candidate[], subject: string | null, verified: boolean): LinkDecision {
  if (!subject) return { action: 'refuse', reason: 'provider sent no subject' };
  const bySubject = candidates.find((c) => c.matched_by === 'subject');
  if (bySubject) return { action: 'sign-in', userId: bySubject.user_id };

  if (!verified) return { action: 'refuse', reason: 'provider did not verify the email address' };

  const byEmail = candidates.find((c) => c.matched_by === 'email');
  if (!byEmail) return { action: 'create' };
  if (byEmail.stored_subject && byEmail.stored_subject !== subject) {
    return { action: 'refuse', reason: 'this email is linked to a different account at the provider' };
  }
  return { action: 'link-then-sign-in', userId: byEmail.user_id };
}

/** Only same-site relative paths may be a post-login destination. */
export function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/dashboard';
  return value;
}

export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=') || null;
  }
  return null;
}
