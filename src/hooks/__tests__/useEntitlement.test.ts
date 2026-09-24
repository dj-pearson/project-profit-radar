import { describe, it, expect } from 'vitest';
import { deriveEntitlement, entitlementErrorCode, type EntitlementInput } from '../useEntitlement';
import { BYTES_PER_GB, TIER_LIMITS } from '@/lib/tiers.generated';

const NOW = new Date('2026-09-23T12:00:00Z');
const base: EntitlementInput = {
  tier: 'starter',
  isComplimentary: false,
  status: 'active',
  trialEndDate: null,
  hasStripeSubscription: false,
  usage: { teamMembers: 0, projects: 0, storageGb: 0 },
  enforced: { planFeatures: false, trialExpiry: false, storageQuota: false },
  now: NOW,
};

describe('deriveEntitlement (US-335)', () => {
  it('reads limits from the one tier definition', () => {
    expect(deriveEntitlement(base).limits).toEqual(TIER_LIMITS.starter);
    expect(deriveEntitlement({ ...base, tier: 'professional' }).limits).toEqual(TIER_LIMITS.professional);
  });

  it('only reports read-only when the server enforces it', () => {
    const expired = { ...base, status: 'trial', trialEndDate: '2026-08-01T00:00:00Z' };
    const off = deriveEntitlement(expired);
    expect(off.access).toBe('read_only');
    expect(off.readOnly).toBe(false);
    expect(deriveEntitlement({ ...expired, enforced: { ...base.enforced, trialExpiry: true } }).readOnly).toBe(true);
  });

  it('counts room against the plan, unlimited for complimentary', () => {
    const full = { ...base, usage: { ...base.usage, projects: TIER_LIMITS.starter.projects } };
    expect(deriveEntitlement(full).hasRoomFor('projects')).toBe(false);
    expect(deriveEntitlement({ ...full, isComplimentary: true }).hasRoomFor('projects')).toBe(true);
  });

  it('flags storage near and over the plan allowance', () => {
    const at = (gb: number) => deriveEntitlement({ ...base, usage: { ...base.usage, storageGb: gb } }).storage;
    expect(at(1)).toMatchObject({ nearLimit: false, overLimit: false });
    expect(at(8.5)).toMatchObject({ nearLimit: true, overLimit: false });
    expect(at(10)).toMatchObject({ overLimit: true, limitBytes: 10 * BYTES_PER_GB });
    expect(deriveEntitlement({ ...base, tier: 'enterprise', usage: { ...base.usage, storageGb: 5000 } }).storage.overLimit).toBe(false);
  });

  it('knows what the plan includes', () => {
    expect(deriveEntitlement(base).planIncludes('quickbooks_sync')).toBe(false);
    expect(deriveEntitlement({ ...base, tier: 'professional' }).planIncludes('quickbooks_sync')).toBe(true);
    expect(deriveEntitlement(base).requiredTierFor('api_access')).toBe('enterprise');
  });
});

describe('entitlementErrorCode', () => {
  it('reads the code from a refusal envelope', () => {
    expect(entitlementErrorCode({ success: false, error: 'x', code: 'account_read_only' })).toBe('account_read_only');
  });

  it('ignores anything else', () => {
    expect(entitlementErrorCode({ success: false, error: 'x', code: 'something_else' })).toBeNull();
    expect(entitlementErrorCode(null)).toBeNull();
    expect(entitlementErrorCode('403')).toBeNull();
  });
});
