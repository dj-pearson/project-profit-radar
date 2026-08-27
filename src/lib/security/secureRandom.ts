/**
 * Cryptographically secure random strings.
 *
 * Math.random() is not a CSPRNG. V8 implements it as xorshift128+, whose
 * internal state can be recovered from a small number of consecutive outputs,
 * so anything derived from it is predictable to anyone who can observe or
 * brute-force a little of the sequence. It is fine for jitter and animation and
 * wrong for anything that grants access.
 *
 * Found by US-296: a webhook signing secret, MFA backup codes and a TOTP secret
 * were all built from Math.random().toString(36). The webhook one was live -
 * that secret is what verifies a delivery actually came from Brikly.
 */

/**
 * Unambiguous alphabet: none of 0 O 1 I L, the pairs people get wrong reading a
 * code off paper. That leaves 31 characters, which does not divide 256 - which
 * is exactly why randomString rejection-samples instead of taking a modulo.
 */
const READABLE = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
/** RFC 4648 base32, which is what authenticator apps expect for a TOTP secret. */
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Draw `length` characters from `alphabet` without modulo bias.
 *
 * Rejection sampling rather than `byte % alphabet.length`: with a 32-character
 * alphabet the modulo happens to be uniform, but it is not for 62, and a helper
 * that is only correct for the alphabet it was written against is a trap for
 * whoever changes the alphabet later.
 */
function randomString(length: number, alphabet: string): string {
  if (length <= 0) return '';
  const max = Math.floor(256 / alphabet.length) * alphabet.length;
  let out = '';
  const buf = new Uint8Array(Math.ceil(length * 1.3) + 8);
  while (out.length < length) {
    crypto.getRandomValues(buf);
    for (let i = 0; i < buf.length && out.length < length; i += 1) {
      if (buf[i] < max) out += alphabet[buf[i] % alphabet.length];
    }
  }
  return out;
}

/** A hex secret suitable for signing, e.g. a webhook shared secret. */
export function secureSecret(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** One human-retypable recovery code, e.g. "A7K2-9QMX". */
export function secureRecoveryCode(): string {
  return `${randomString(4, READABLE)}-${randomString(4, READABLE)}`;
}

/** A base32 TOTP secret, the format authenticator apps accept. */
export function secureTotpSecret(length = 32): string {
  return randomString(length, BASE32);
}

export { randomString as __randomStringForTests };
