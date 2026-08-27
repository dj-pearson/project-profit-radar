import { describe, it, expect } from 'vitest';
import {
  secureSecret,
  secureRecoveryCode,
  secureTotpSecret,
  __randomStringForTests as randomString,
} from '../secureRandom';

describe('secureSecret', () => {
  it('is hex of the requested byte length', () => {
    expect(secureSecret(32)).toMatch(/^[0-9a-f]{64}$/);
    expect(secureSecret(16)).toMatch(/^[0-9a-f]{32}$/);
  });

  it('does not repeat across draws', () => {
    const seen = new Set(Array.from({ length: 200 }, () => secureSecret(16)));
    expect(seen.size).toBe(200);
  });
});

describe('secureRecoveryCode', () => {
  it('is two groups of four from the unambiguous alphabet', () => {
    expect(secureRecoveryCode()).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/);
  });

  it('never emits characters a human would mistype', () => {
    const codes = Array.from({ length: 500 }, secureRecoveryCode).join('');
    // 0/O and 1/I/L are the pairs people get wrong reading a code off paper.
    expect(codes).not.toMatch(/[01OIL]/);
  });

  it('does not repeat across draws', () => {
    const seen = new Set(Array.from({ length: 500 }, secureRecoveryCode));
    expect(seen.size).toBe(500);
  });
});

describe('secureTotpSecret', () => {
  it('is RFC 4648 base32, which is what authenticator apps parse', () => {
    expect(secureTotpSecret(32)).toMatch(/^[A-Z2-7]{32}$/);
  });

  it('honours the requested length', () => {
    expect(secureTotpSecret(16)).toHaveLength(16);
  });
});

describe('randomString', () => {
  it('returns empty for a non-positive length', () => {
    expect(randomString(0, 'AB')).toBe('');
    expect(randomString(-1, 'AB')).toBe('');
  });

  it('uses every character of a small alphabet, so rejection sampling has not skewed it', () => {
    const out = randomString(4000, 'ABCD');
    for (const c of 'ABCD') expect(out).toContain(c);
    const counts = [...'ABCD'].map((c) => out.split(c).length - 1);
    // Uniform within a wide tolerance - this is a bias smoke test, not a
    // statistical proof.
    for (const n of counts) expect(n).toBeGreaterThan(4000 / 4 / 2);
  });

  it('stays within the alphabet for a size that does not divide 256', () => {
    // 62 is the case where `byte % alphabet.length` would bias toward the
    // start of the alphabet; rejection sampling is what avoids it.
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const out = randomString(2000, alphabet);
    expect(out).toHaveLength(2000);
    for (const c of out) expect(alphabet).toContain(c);
  });
});
