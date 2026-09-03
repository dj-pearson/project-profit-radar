/**
 * US-325: send, view, accept.
 *
 * "Send to Client" ran update({ status: 'sent' }) and stopped. No email, no
 * link, no estimate_communications row - though that table was created for
 * exactly this and had never been written by anything. The customer was never
 * told a proposal existed, and the estimator could not tell whether it had
 * been seen, let alone agreed to.
 *
 * The public page is the one surface an unauthenticated stranger can reach, so
 * most of what is asserted here is about that boundary: what the token can do,
 * what it cannot, and what the page is allowed to return.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const strip = (path: string) =>
  readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('--'))
    .join('\n');

const migration = strip('supabase/migrations/20260903090000_estimate_send_and_accept.sql');
const sendFn = strip('supabase/functions/send-estimate/index.ts');
const publicFn = strip('supabase/functions/public-estimate/index.ts');
const table = strip('src/components/estimates/EstimatesTable.tsx');

describe('sending an estimate (US-325)', () => {
  it('goes through an edge function instead of flipping a status', () => {
    expect(table).toMatch(/invoke\('send-estimate'/);
    // The bare status update that shipped.
    expect(table).not.toMatch(/from\("estimates"\)\s*\n\s*\.update\(\{\s*\n\s*status: "sent"/);
  });

  it('writes the estimate_communications rows the table exists for', () => {
    expect(sendFn).toMatch(/estimate_communications/);
    expect(sendFn).toMatch(/communication_type: "sent"/);
    expect(publicFn).toMatch(/communication_type: "viewed"/);
    expect(publicFn).toMatch(/communication_type: "accepted"/);
  });

  it('only marks the estimate sent once the email is away', () => {
    const sendIndex = sendFn.indexOf('sendEmail(');
    const statusIndex = sendFn.indexOf('status: estimate.status === "draft"');
    expect(sendIndex).toBeGreaterThan(-1);
    expect(statusIndex).toBeGreaterThan(sendIndex);
  });

  it('revokes the live link when a new one is sent', () => {
    // A customer must never be able to accept a price that was withdrawn.
    expect(sendFn).toMatch(/revoked_at: new Date\(\)\.toISOString\(\)/);
    expect(sendFn).toMatch(/\.is\("revoked_at", null\)/);
  });

  it('revokes the link it just made if the email fails', () => {
    // Otherwise a live credential exists that nobody was given.
    const failBranch = sendFn.slice(sendFn.indexOf('if (!delivery.success)'));
    expect(failBranch).toMatch(/revoked_at/);
  });

  it('refuses to re-send an estimate that has been accepted', () => {
    expect(sendFn).toMatch(/already been accepted/);
  });
});

describe('the public page boundary (US-325)', () => {
  it('treats the token as a credential', () => {
    expect(sendFn).toMatch(/crypto\.getRandomValues/);
    expect(sendFn).toMatch(/new Uint8Array\(32\)/);
    // Exact-match lookup, and a shape check before it is ever used.
    expect(publicFn).toMatch(/regex\(\/\^\[a-f0-9\]\{64\}\$\//);
    expect(publicFn).toMatch(/\.eq\("token", token\)/);
  });

  it('refuses an expired, revoked or superseded link', () => {
    expect(publicFn).toMatch(/link\.revoked_at \|\| new Date\(link\.expires_at\) < new Date\(\)/);
    expect(publicFn).toMatch(/estimate\.version_number !== link\.version_number/);
  });

  it('rate limits an anonymous caller on the only identity it has', () => {
    expect(publicFn).toMatch(/checkRateLimit/);
    expect(publicFn).toMatch(/identifier: token/);
  });

  it('returns only what a prospect needs to decide', () => {
    // Not internal costs, not the client's other jobs.
    const select = publicFn.slice(publicFn.indexOf('.from("estimate_line_items")'));
    expect(select).toMatch(/item_name, description, quantity, unit, unit_cost, total_cost/);
    expect(select).not.toMatch(/labor_cost|material_cost|cost_code_id/);
  });

  it('does not accept a contract on a plain page fetch', () => {
    // A link preview crawler must not be able to sign anything.
    expect(publicFn).toMatch(/action: z\.literal\("accept"\)/);
    expect(publicFn).toMatch(/req\.method !== "POST"/);
  });

  it('is allowlisted as public with a written reason, not left in the backlog', () => {
    const guard = readFileSync('scripts/check-edge-function-auth.mjs', 'utf8');
    expect(guard).toMatch(/'public-estimate'/);
    expect(guard).toMatch(/token in the body is the credential/);
  });
});

describe('acceptance is evidence (US-325)', () => {
  it('freezes what was agreed, not just that it was', () => {
    expect(migration).toMatch(/accepted_total NUMERIC\(14,2\) NOT NULL/);
    expect(migration).toMatch(/version_number INTEGER/);
    expect(publicFn).toMatch(/accepted_total: estimate\.total_amount/);
  });

  it('records who, when and from where', () => {
    expect(migration).toMatch(/accepted_by_name TEXT NOT NULL/);
    expect(migration).toMatch(/ip_address TEXT/);
    expect(publicFn).toMatch(/x-forwarded-for/);
  });

  it('cannot be edited or deleted by the party that benefits', () => {
    // Read policies only. Evidence the interested party can rewrite is not
    // evidence.
    expect(migration).toMatch(/Staff read their company acceptances/);
    expect(migration).not.toMatch(/estimate_acceptances FOR UPDATE/);
    expect(migration).not.toMatch(/estimate_acceptances FOR DELETE/);
  });

  it('is the only thing that sets accepted', () => {
    expect(migration).toMatch(/CREATE TRIGGER trg_estimate_accepted/);
    expect(migration).toMatch(/SET status = 'accepted'/);
  });

  it('spends every other live link once accepted', () => {
    // A second acceptance at a different version would be a second contract.
    expect(migration).toMatch(/SET revoked_at = now\(\)/);
  });

  it('constrains the status ladder', () => {
    expect(migration).toMatch(/estimates_status_check/);
    expect(migration).toMatch(/'draft','sent','viewed','accepted','rejected','expired','converted'/);
  });
});

describe('what acceptance unlocks (US-325)', () => {
  it('only offers Convert to Project once the customer has accepted', () => {
    expect(table).toMatch(/!estimate\.project && estimate\.status === "accepted"/);
  });

  it('lets an admin override, deliberately and labelled', () => {
    // A customer who agreed by phone is a real situation.
    expect(table).toMatch(/Convert without acceptance/);
    expect(table).toMatch(/isAdmin/);
  });

  it('deletes the mock e-signature page', () => {
    // 100% hardcoded data, no Supabase import, routed by nothing - it made
    // US-041 look delivered.
    expect(existsSync('src/pages/ESignature.tsx')).toBe(false);
  });
});
