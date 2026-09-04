/**
 * US-335: one definition of what a plan includes, and features that are gated.
 *
 * TIER_LIMITS was declared twice - _shared/entitlements.ts and
 * src/contexts/SubscriptionContext.tsx - with a comment on one asking whoever
 * changed it to remember the other. And canAccessFeature returned true for any
 * trial, complimentary or subscribed company, so nothing the Pricing page sells
 * as Professional or Enterprise was gated at all: a Starter account had
 * QuickBooks sync and API access.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  TIER_LIMITS, TIER_ORDER, FEATURE_MIN_TIER,
  tierAllowsFeature, tierRequiredFor, limitsFor, tierRank,
} from './tiers';

const strip = (path: string) =>
  readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');

describe('one tier definition (US-335)', () => {
  it('the generated copy is in sync with its source', () => {
    const result = spawnSync('node', ['scripts/generate-tiers.mjs', '--check'], { encoding: 'utf8' });
    expect(result.stdout + result.stderr).toMatch(/in sync/);
    expect(result.status).toBe(0);
  });

  it('is wired into pre-commit and CI, so drift cannot be committed', () => {
    expect(readFileSync('.husky/pre-commit', 'utf8')).toContain('generate-tiers.mjs --check');
    expect(readFileSync('.github/workflows/ci.yml', 'utf8')).toContain('generate-tiers.mjs --check');
  });

  it('neither consumer declares its own limits any more', () => {
    const client = strip('src/contexts/SubscriptionContext.tsx');
    // The literal table that used to live here.
    expect(client).not.toMatch(/starter:\s*\{\s*\n?\s*name: 'Starter',\s*\n?\s*teamMembers: 5/);
    expect(client).toMatch(/from '@\/lib\/tiers\.generated'/);

    const server = strip('supabase/functions/_shared/entitlements.ts');
    expect(server).not.toMatch(/starter: \{ teamMembers: 5, projects: 10, storage: 10 \}/);
    expect(server).toMatch(/from "\.\/tiers\.ts"/);
  });

  it('marks the generated file as generated', () => {
    expect(readFileSync('src/lib/tiers.generated.ts', 'utf8'))
      .toMatch(/GENERATED FILE - DO NOT EDIT/);
  });

  it('keeps the limits it always had', () => {
    // Changing what a plan includes is a commercial decision, not a refactor.
    expect(TIER_LIMITS.starter).toEqual({ teamMembers: 5, projects: 10, storage: 10 });
    expect(TIER_LIMITS.professional).toEqual({ teamMembers: 20, projects: 50, storage: 100 });
    expect(TIER_LIMITS.enterprise).toEqual({ teamMembers: -1, projects: -1, storage: -1 });
  });

  it('falls back to the cheapest plan for an unrecognised tier', () => {
    expect(limitsFor('nonsense')).toEqual(TIER_LIMITS.starter);
    expect(tierRank('nonsense')).toBe(0);
  });

  it('orders plans cheapest first', () => {
    expect(TIER_ORDER).toEqual(['starter', 'professional', 'enterprise']);
    expect(tierRank('enterprise')).toBeGreaterThan(tierRank('professional'));
  });
});

describe('features are gated by plan (US-335)', () => {
  it('gates what the pricing page sells as Professional', () => {
    expect(tierAllowsFeature('starter', 'quickbooks_sync')).toBe(false);
    expect(tierAllowsFeature('professional', 'quickbooks_sync')).toBe(true);
    expect(tierAllowsFeature('enterprise', 'quickbooks_sync')).toBe(true);
  });

  it('gates what it sells as Enterprise', () => {
    expect(tierAllowsFeature('professional', 'api_access')).toBe(false);
    expect(tierAllowsFeature('enterprise', 'api_access')).toBe(true);
  });

  it('allows anything not sold as tier-specific', () => {
    // The safe default. Gating something nobody sold takes a capability away
    // from a paying customer.
    expect(tierAllowsFeature('starter', 'view_projects')).toBe(true);
    expect(tierRequiredFor('view_projects')).toBeNull();
  });

  it('treats an unknown tier as the cheapest, which withholds rather than grants', () => {
    expect(tierAllowsFeature('', 'api_access')).toBe(false);
    expect(tierAllowsFeature('platinum', 'quickbooks_sync')).toBe(false);
  });

  it('names the plan that would unlock a feature', () => {
    expect(tierRequiredFor('api_access')).toBe('enterprise');
    expect(tierRequiredFor('quickbooks_sync')).toBe('professional');
  });

  it('lists only features the pricing page actually sells by tier', () => {
    for (const tier of Object.values(FEATURE_MIN_TIER)) {
      expect(TIER_ORDER).toContain(tier);
    }
    expect(Object.keys(FEATURE_MIN_TIER).length).toBeGreaterThan(0);
  });
});

describe('the client and server both consult it (US-335)', () => {
  it('the client no longer returns true for every subscribed company', () => {
    // The hook exposes this as canUseFeature.
    const client = strip('src/contexts/SubscriptionContext.tsx');
    const fn = client.slice(client.indexOf('const canUseFeature'));
    const body = fn.slice(0, fn.indexOf('}, ['));
    // The tier gate has to run BEFORE the good-standing shortcuts, or it never
    // runs at all for the accounts that have a plan.
    const gateAt = body.indexOf('tierAllowsFeature');
    const subscribedAt = body.indexOf('subscriptionData?.subscribed');
    expect(gateAt).toBeGreaterThan(-1);
    expect(gateAt).toBeLessThan(subscribedAt);
  });

  it('the server has an authoritative check, since the client one is bypassable', () => {
    const server = strip('supabase/functions/_shared/entitlements.ts');
    expect(server).toMatch(/export async function checkFeature/);
    expect(server).toMatch(/tierAllowsFeature\(tier, feature\)/);
  });

  it('the server check fails open on error and closed on an unknown tier', () => {
    // Never block legitimate work because the check broke; never hand out a
    // paid feature on a plan nobody recognises.
    const server = readFileSync('supabase/functions/_shared/entitlements.ts', 'utf8');
    const fn = server.slice(server.indexOf('export async function checkFeature'));
    expect(fn).toMatch(/catch \(_err\) \{\s*\n\s*return \{ allowed: true/);
    expect(strip('supabase/functions/_shared/tiers.ts'))
      .toMatch(/return i === -1 \? 0 : i;/);
  });

  it('still excludes client_portal users from seat counts', () => {
    // US-319 would otherwise have made every customer given portal access
    // consume a paid seat.
    expect(strip('supabase/functions/_shared/entitlements.ts'))
      .toMatch(/\.neq\("role", "client_portal"\)/);
  });
});
