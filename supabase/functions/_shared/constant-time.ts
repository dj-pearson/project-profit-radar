/**
 * Compare two secrets in time that does not depend on where they differ
 * (US-358). `a !== b` returns at the first differing character, so response
 * timing leaks how much of a guess was right. This walks the full length of
 * the longer input every time and folds the length difference in as well.
 *
 * Pure, so vitest can load it.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  const len = Math.max(x.length, y.length);
  let diff = x.length ^ y.length;
  for (let i = 0; i < len; i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}
