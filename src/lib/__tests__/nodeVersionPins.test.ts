import { describe, it, expect } from 'vitest';
// @ts-expect-error - plain .mjs guard script, no types
import { comparatorMinimum, rolldownFloor } from '../../../scripts/check-node-version-pins.mjs';

/**
 * The Node floor is derived, not hardcoded (US-399), and the derivation is the
 * part that can be quietly wrong.
 *
 * The first version matched every `\d+.\d+.\d+` in rolldown's engines range and
 * took the largest. That reads correctly against the range rolldown ships today
 * (`^20.19.0 || >=22.12.0`) and breaks the moment one carries a ceiling: for
 * `>=20.19.0 <23.0.0` it returns 23.0.0, so the guard would reject Node 22.12.0
 * - a version that satisfies the range - and block CI until somebody edited the
 * script. Caught in review on #200.
 *
 * An upper bound says how high the range goes, never how low.
 */
describe('comparatorMinimum', () => {
  it('reads the lower bound off each comparator form', () => {
    expect(comparatorMinimum('>=22.12.0')).toEqual([22, 12, 0]);
    expect(comparatorMinimum('>20.19.0')).toEqual([20, 19, 0]);
    expect(comparatorMinimum('^20.19.0')).toEqual([20, 19, 0]);
    expect(comparatorMinimum('~22.12.3')).toEqual([22, 12, 3]);
    expect(comparatorMinimum('22.12.0')).toEqual([22, 12, 0]);
    expect(comparatorMinimum('v22.12.0')).toEqual([22, 12, 0]);
  });

  it('treats an upper bound as no lower bound at all', () => {
    expect(comparatorMinimum('<23.0.0')).toBeNull();
    expect(comparatorMinimum('<=22.99.0')).toBeNull();
  });

  it('fills in omitted minor and patch', () => {
    expect(comparatorMinimum('>=22')).toEqual([22, 0, 0]);
    expect(comparatorMinimum('^20.19')).toEqual([20, 19, 0]);
  });

  it('returns null rather than guessing at nonsense', () => {
    expect(comparatorMinimum('latest')).toBeNull();
    expect(comparatorMinimum('')).toBeNull();
  });
});

describe('rolldownFloor', () => {
  const FALLBACK = [22, 12, 0];

  it('handles the range rolldown ships today', () => {
    expect(rolldownFloor('^20.19.0 || >=22.12.0')).toEqual([22, 12, 0]);
  });

  it('does not mistake a ceiling for a floor', () => {
    // The regression this test exists for.
    expect(rolldownFloor('>=20.19.0 <23.0.0')).toEqual([20, 19, 0]);
    expect(rolldownFloor('>=20.0.0 <21.0.0 || >=22.0.0 <23.0.0')).toEqual([22, 0, 0]);
  });

  it('takes the highest branch minimum across a disjunction', () => {
    // Deliberately stricter than semver: one pin then satisfies the range
    // whichever major it lands on, and it matches the single `>=` floor
    // package.json declares.
    expect(rolldownFloor('^20.19.0 || ^22.12.0 || >=24.0.0')).toEqual([24, 0, 0]);
  });

  it('takes the highest lower bound within a single ANDed branch', () => {
    expect(rolldownFloor('>=20.0.0 >=22.12.0')).toEqual([22, 12, 0]);
  });

  it('falls back when the range sets no lower bound or cannot be read', () => {
    expect(rolldownFloor('<23.0.0')).toEqual(FALLBACK);
    expect(rolldownFloor('garbage')).toEqual(FALLBACK);
  });

  it('reads the real lockfile when given no override', () => {
    // No argument means "go look at package-lock.json", which is how the guard
    // actually runs. Assert the shape, not a version that will age.
    const floor = rolldownFloor();
    expect(Array.isArray(floor)).toBe(true);
    expect(floor).toHaveLength(3);
    expect(floor.every((n: unknown) => typeof n === 'number')).toBe(true);
  });
});
