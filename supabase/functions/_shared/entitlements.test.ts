/**
 * US-335: storage, trial expiry and the refusal envelope.
 *
 * The rules are in tiers.ts (pure) and the reads in entitlements.ts; the flag
 * gates are tested with a stub client that answers each table the way
 * PostgREST would.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import {
  accountAccess, storageLimitBytes, BYTES_PER_GB, GRACE_PERIOD_DAYS, TIER_LIMITS,
} from './tiers';
import {
  checkEntitlement, checkAccountStanding, entitlementDeniedResponse, limitDenial,
  refuseIfReadOnly, refuseIfFeatureNotInPlan, suspendCompanyOfSubscriber,
} from './entitlements';
import { FEATURE_FLAGS } from './feature-flags';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-09-23T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY).toISOString();

type Rows = Record<string, unknown>;

/**
 * A stand-in for supabase-js: `tables` answers from(...).select().eq()...
 * (single rows via maybeSingle, lists when awaited), `rpc` answers rpc().
 */
function stubClient(tables: Record<string, Rows | Rows[] | null>, rpc: Record<string, unknown> = {}) {
  const updates: Array<{ table: string; values: unknown }> = [];
  const builder = (table: string) => {
    const data = tables[table] ?? null;
    const q: Record<string, unknown> = {};
    const self = () => q;
    Object.assign(q, {
      select: self, eq: self, neq: self, in: self, is: self,
      update: (values: unknown) => { updates.push({ table, values }); return q; },
      maybeSingle: async () => ({ data: Array.isArray(data) ? data[0] ?? null : data, error: null }),
      then: (resolve: (v: unknown) => unknown) =>
        resolve({ data: Array.isArray(data) ? data : data ? [data] : [], error: null, count: 0 }),
    });
    return q;
  };
  return {
    client: {
      from: builder,
      rpc: async (name: string) =>
        name in rpc ? { data: rpc[name], error: null } : { data: null, error: { message: 'no such function' } },
    },
    updates,
  };
}

const flagRow = (key: string, enabled = true) => ({ feature_flags: [{ company_id: null, enabled, flag_key: key }] });

describe('accountAccess (US-335 AC4)', () => {
  const at = (status: string | null, trialEnd: string | null, extra = {}) =>
    accountAccess({ subscriptionStatus: status, trialEndDate: trialEnd, now: NOW, ...extra });

  it('a running trial is full access', () => {
    expect(at('trial', daysAgo(-3))).toBe('full');
  });

  it('a trial that ended is in grace for GRACE_PERIOD_DAYS, then read-only', () => {
    expect(at('trial', daysAgo(1))).toBe('grace');
    expect(at('trial', daysAgo(GRACE_PERIOD_DAYS - 1))).toBe('grace');
    expect(at('trial', daysAgo(GRACE_PERIOD_DAYS + 1))).toBe('read_only');
  });

  it('reads the date, so a trial the cron never reached is still read-only', () => {
    expect(at('trial', daysAgo(60))).toBe('read_only');
  });

  it('suspended is read-only whoever wrote it', () => {
    expect(at('suspended', null)).toBe('read_only');
    expect(at('suspended', daysAgo(-10))).toBe('read_only');
  });

  it('grace_period is never read-only by date: it is also the past_due state of a paying company', () => {
    expect(at('grace_period', daysAgo(400))).toBe('grace');
  });

  it('never locks a trial that has a Stripe subscription attached (webhook not landed yet)', () => {
    expect(at('trial', daysAgo(60), { hasStripeSubscription: true })).toBe('full');
  });

  it('never locks a complimentary account', () => {
    expect(at('suspended', null, { isComplimentary: true })).toBe('full');
  });

  it('treats statuses it does not know as full access', () => {
    for (const s of ['active', 'pending', 'converting', 'something_new', null]) {
      expect(at(s, daysAgo(400))).toBe('full');
    }
  });
});

describe('storage (US-335 AC2)', () => {
  it('converts the plan allowance to bytes and keeps unlimited as -1', () => {
    expect(storageLimitBytes('starter')).toBe(TIER_LIMITS.starter.storage * BYTES_PER_GB);
    expect(storageLimitBytes('enterprise')).toBe(-1);
  });

  it('checkEntitlement measures storage in bytes from the usage RPC', async () => {
    const { client } = stubClient(
      { subscribers: null, companies: { subscription_tier: 'starter' } },
      { company_storage_used_bytes: 9.5 * BYTES_PER_GB },
    );
    const ok = await checkEntitlement(client, 'c1', 'storage', { additionalCount: 0.4 * BYTES_PER_GB });
    expect(ok.allowed).toBe(true);
    const over = await checkEntitlement(client, 'c1', 'storage', { additionalCount: 1 * BYTES_PER_GB });
    expect(over.allowed).toBe(false);
    expect(over.reason).toMatch(/10 GB/);
    expect(over.upgradeTo).toBe('professional');
  });

  it('fails open when the usage RPC is missing (migration not applied yet)', async () => {
    const { client } = stubClient({ subscribers: null, companies: { subscription_tier: 'starter' } });
    const r = await checkEntitlement(client, 'c1', 'storage', { additionalCount: 50 * BYTES_PER_GB });
    expect(r.allowed).toBe(true);
  });
});

describe('the refusal envelope', () => {
  it('is a 403 with success, error, timestamp, and an additive code', async () => {
    const res = entitlementDeniedResponse(
      limitDenial('projects', { allowed: false, limit: 10, currentUsage: 10, tier: 'starter', reason: 'full', upgradeTo: 'professional' }),
      { 'Access-Control-Allow-Origin': 'https://brikly.net' },
    );
    expect(res.status).toBe(403);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://brikly.net');
    const body = await res.json();
    expect(body).toMatchObject({
      success: false, error: 'full', code: 'plan_limit_reached',
      entitlement: { tier: 'starter', limit: 10, currentUsage: 10, upgradeTo: 'professional', upgradePath: '/subscription-settings' },
    });
    expect(typeof body.timestamp).toBe('string');
  });

  it('names storage refusals separately from row limits', () => {
    const d = limitDenial('storage', { allowed: false, limit: 1, currentUsage: 2, tier: 'starter' });
    expect(d.code).toBe('storage_quota_exceeded');
  });
});

describe('flag-gated refusals', () => {
  const expired = { subscription_status: 'trial', trial_end_date: daysAgo(60), stripe_subscription_id: null };

  it('every entitlement flag is dark by default and on a read error', () => {
    for (const key of ['entitlements.plan_features', 'entitlements.trial_expiry', 'entitlements.storage_quota'] as const) {
      expect(FEATURE_FLAGS[key].default, key).toBe(false);
      expect(FEATURE_FLAGS[key].onReadError, key).toBe(false);
    }
  });

  it('read-only is not enforced while entitlements.trial_expiry is off', async () => {
    const { client } = stubClient({ feature_flags: [], companies: expired, subscribers: null });
    expect(await refuseIfReadOnly(client, 'c1', {})).toBeNull();
  });

  it('read-only is enforced once the flag is on', async () => {
    const { client } = stubClient({ ...flagRow('entitlements.trial_expiry'), companies: expired, subscribers: null });
    const res = await refuseIfReadOnly(client, 'c1', {});
    expect(res?.status).toBe(403);
    expect(await res?.json()).toMatchObject({ success: false, code: 'account_read_only' });
  });

  it('a company in good standing passes with the flag on', async () => {
    const { client } = stubClient({
      ...flagRow('entitlements.trial_expiry'),
      companies: { subscription_status: 'active', trial_end_date: daysAgo(400) },
      subscribers: null,
    });
    expect(await refuseIfReadOnly(client, 'c1', {})).toBeNull();
  });

  it('checkAccountStanding fails open when the company cannot be read', async () => {
    const { client } = stubClient({ companies: null });
    expect((await checkAccountStanding(client, 'c1')).access).toBe('full');
  });

  it('plan features are not enforced while entitlements.plan_features is off', async () => {
    const { client } = stubClient({ feature_flags: [], companies: { subscription_tier: 'starter' } });
    expect(await refuseIfFeatureNotInPlan(client, 'c1', 'quickbooks_sync', {})).toBeNull();
  });

  it('a Starter company is refused QuickBooks sync once the flag is on', async () => {
    const { client } = stubClient({ ...flagRow('entitlements.plan_features'), companies: { subscription_tier: 'starter' } });
    const res = await refuseIfFeatureNotInPlan(client, 'c1', 'quickbooks_sync', {});
    expect(res?.status).toBe(403);
    expect(await res?.json()).toMatchObject({ code: 'feature_not_in_plan', entitlement: { upgradeTo: 'professional' } });
  });

  it('a feature no plan sells is never refused, and the flag is not even read', async () => {
    const { client } = stubClient({ ...flagRow('entitlements.plan_features'), companies: { subscription_tier: 'starter' } });
    expect(await refuseIfFeatureNotInPlan(client, 'c1', 'view_projects', {})).toBeNull();
  });
});

describe('dunning suspends the company (US-335 AC4)', () => {
  it('walks subscriber -> user -> company and writes suspended', async () => {
    const { client, updates } = stubClient({
      subscribers: { user_id: 'u1' },
      user_profiles: { company_id: 'c1' },
    });
    await expect(suspendCompanyOfSubscriber(client, 's1')).resolves.toEqual({ companyId: 'c1' });
    expect(updates).toEqual([
      { table: 'companies', values: expect.objectContaining({ subscription_status: 'suspended' }) },
    ]);
  });

  it('both dunning functions and trial-management use the shared rules', () => {
    const read = (fn: string) => readFileSync(join('supabase/functions', fn, 'index.ts'), 'utf8');
    expect(read('process-dunning')).toContain('suspendCompanyOfSubscriber(');
    expect(read('failed-payment-recovery')).toContain('suspendCompanyOfSubscriber(');
    const tm = read('trial-management');
    // It used to select only 'trial', so a company it moved to grace_period
    // was never seen again and never suspended.
    expect(tm).toMatch(/\.in\("subscription_status", \["trial", "grace_period"\]\)/);
    // ...and only unconverted trials: grace_period is also a paying company's
    // past_due state, and its trial_end_date is long past.
    expect(tm).toMatch(/\.is\("stripe_subscription_id", null\)/);
    expect(tm).toContain('GRACE_PERIOD_DAYS');
  });
});

describe('server-side enforcement is wired where billable things are created', () => {
  const read = (fn: string) => readFileSync(join('supabase/functions', fn, 'index.ts'), 'utf8');

  it('projects: read-only gate before the limit check, and the limit uses the envelope', () => {
    const src = read('projects');
    const create = src.slice(src.indexOf('path === "create"'));
    expect(create.indexOf('refuseIfReadOnly(')).toBeGreaterThan(-1);
    expect(create.indexOf('refuseIfReadOnly(')).toBeLessThan(create.indexOf("checkEntitlement("));
    expect(create).toContain("entitlementDeniedResponse(limitDenial('projects'");
  });

  it('invite-team-member: client_portal invitees do not need a seat', () => {
    const src = read('invite-team-member');
    expect(src).toMatch(/if \(payload\.role !== "client_portal"\) \{\s*\n\s*const entitlement = await checkEntitlement\(/);
    expect(src).toContain('refuseIfReadOnly(');
  });

  it('quickbooks-sync and api-management check the plan', () => {
    expect(read('quickbooks-sync')).toContain("refuseIfFeatureNotInPlan(supabaseClient, company_id, 'quickbooks_sync'");
    const api = read('api-management');
    expect(api).toContain("refuseIfFeatureNotInPlan(supabase, profile.company_id, 'api_access'");
    expect(api).toContain("checkEntitlement(supabase, validation.company_id!, 'projects')");
  });

  it('uploads are gated by a restrictive storage policy', () => {
    const dir = 'supabase/migrations';
    const file = readdirSync(dir).find((f) => f.endsWith('_entitlement_enforcement.sql'))!;
    const sql = readFileSync(join(dir, file), 'utf8');
    expect(sql).toMatch(/ON storage\.objects\s+AS RESTRICTIVE\s+FOR INSERT\s+TO authenticated\s+WITH CHECK \(public\.storage_upload_allowed\(bucket_id\)\)/);
    // Fails open: a broken check must not refuse uploads.
    expect(sql).toMatch(/EXCEPTION WHEN OTHERS THEN\s+-- Never refuse an upload because the check itself broke\.\s+RETURN true;/);
  });
});

describe('the SQL mirrors are checked against tiers.ts', () => {
  it('generate-tiers --check covers the SQL mirrors and passes on the tree', () => {
    const src = readFileSync('scripts/generate-tiers.mjs', 'utf8');
    for (const fn of ['tier_storage_limit_gb', 'company_account_read_only', 'prevent_billing_state_self_service']) {
      expect(src).toContain(`expect('${fn}'`);
    }
    const ok = spawnSync('node', ['scripts/generate-tiers.mjs', '--check'], { encoding: 'utf8' });
    expect(ok.status).toBe(0);
    expect(ok.stdout).toMatch(/SQL mirrors match/);
  });
});
