#!/usr/bin/env node
/**
 * Privilege-write guard for edge functions (US-297).
 *
 * RLS in this repo checks tenancy and ownership. No policy constrains WHICH
 * columns a role may write. So wherever a handler writes caller-supplied data:
 *
 *   - a decision column (approval_status, approved_by, verified, ...) lets the
 *     subject of a decision make it — time-tracking let a worker clock in
 *     already-approved, straight past timesheet review;
 *   - a tenancy or provenance column (company_id, site_id, id, created_by)
 *     lets a caller write outside their own scope — api-management could put a
 *     project in another tenant's site, on the service role, with no RLS to
 *     stop it;
 *   - a money or entitlement column (subscription_tier, rate_limit_per_hour)
 *     lets a caller grant themselves something they have not paid for.
 *
 * This walks the TypeScript AST of every function and reports two things:
 *   1. writes that SPREAD a request body into insert/update/upsert, which set
 *      every column at once — these are never allowed, use a column allowlist
 *      from _shared/writable-columns.ts;
 *   2. writes that set a named privilege column from a body-derived value —
 *      allowed only after review, recorded in REVIEWED below with the reason.
 *
 * Adding a name to REVIEWED is a security decision. Say why it is safe.
 */
import ts from 'typescript';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FN = join(root, 'supabase', 'functions');

const PRIV = /^(approval_status|approved_by|approved_at|approval_notes|rejected_by|rejected_at|rejection_reason|submitted_at|reviewed_by|reviewed_at|verified|is_verified|verified_by|verified_at|role|is_admin|permissions|subscription_tier|subscription_status|is_active|total_hours|credit_limit|commission_rate|trial_end_date|expires_at|rate_limit_per_hour|company_id|site_id|tenant_id|created_by)$/;

// site -> why it is safe. Reviewed 2026-08-27.
const REVIEWED = new Map([
  ['api-management:expires_at',
   'a company admin setting the expiry of a key they are minting for their own company'],
  ['change-subscription:subscription_tier',
   'Stripe is updated with the real price first; the row mirrors what the user was actually billed, scoped .eq(user_id)'],
  ['manage-alert-rules:is_active',
   'a root_admin enabling/disabling a platform SEO alert rule'],
  ['manage-schedules:is_active',
   'a root_admin enabling/disabling a platform SEO schedule'],
  ['blog-social-integration:company_id',
   'social_media_posts RLS is FOR ALL TO authenticated USING (company_id IN the caller profile company); no WITH CHECK, so Postgres applies USING to the new row and a foreign id is rejected'],
  ['quickbooks-callback:company_id',
   'quickbooks_integrations RLS is FOR ALL USING (company_id = get_user_company(auth.uid()) AND admin role); user-JWT client, and the OAuth state is verified against that same row'],
  ['quickbooks-disconnect:company_id',
   'same quickbooks_integrations policy; a foreign company_id matches no rows'],

  // Reviewed 2026-08-27, after the taint analysis below was rewritten to follow
  // shorthand properties and destructures of already-tainted variables. Each of
  // these writes with a USER-JWT client to a table whose policies are scoped, so
  // RLS rejects a foreign id — the value is caller-supplied but not caller-honoured.
  ['auto-scheduling:tenant_id', 'user-JWT client; auto_schedules is RLS-scoped'],
  ['calculate-proration:subscription_tier',
   'mirrors the tier Stripe was billed for; companies/subscribers are RLS-scoped and the client carries the user JWT'],
  ['convert-trial-to-paid:subscription_tier',
   'set after the Stripe conversion succeeds; companies is RLS-scoped'],
  ['generate-performance-benchmarks:company_id',
   'user-JWT client; performance_benchmarks is RLS-scoped'],
  ['optimize-resources:company_id',
   'user-JWT client; the three resource_optimization_* tables are RLS-scoped'],
  ['quickbooks-connect:company_id',
   'user-JWT client; quickbooks_integrations is FOR ALL USING (company_id = get_user_company(auth.uid()) AND admin role)'],
  ['quickbooks-sync:company_id',
   'user-JWT client; quickbooks_sync_logs is company-scoped'],
  ['risk-prediction:tenant_id', 'user-JWT client; risk_predictions is RLS-scoped'],
  ['twilio-calling:company_id', 'user-JWT client; call_logs is RLS-scoped'],
  ['verify-domain:tenant_id', 'user-JWT client; audit_logs is RLS-scoped'],
  ['process-referral-signup:company_id',
   'referee_company_id is checked against the referee profile earlier in the handler and throws on mismatch (US-297) — an imperative guard the AST check cannot see'],
]);

const files = readdirSync(FN, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== '_shared')
  .map((d) => ({ name: d.name, path: join(FN, d.name, 'index.ts') }))
  .filter((f) => existsSync(f.path));

const spreadHits = [];
const privHits = [];

for (const { name, path } of files) {
  const text = readFileSync(path, 'utf8');
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const lineOf = (n) => sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;

  // Names derived from the request body, grown to a fixpoint. Every form below
  // has hidden a real finding from an earlier version of this guard, so keep
  // them all: a body read, a destructure of the body, a destructure of a
  // variable already derived from it, a plain alias, a cast, a property read.
  const body = new Set();
  const READS = /\b(?:req|request)\s*\.\s*json\s*\(\s*\)|\bvalidateBody\s*\(|\bparsed\s*\.\s*data\b/;
  const bindAll = (name) => {
    if (ts.isIdentifier(name)) { body.add(name.text); return true; }
    if (ts.isObjectBindingPattern(name)) {
      let added = false;
      for (const e of name.elements) if (ts.isIdentifier(e.name)) { added = body.add(e.name.text) || added; }
      return added;
    }
    return false;
  };
  for (let grew = true; grew;) {
    grew = false;
    const seed = (n) => {
      if (ts.isVariableDeclaration(n) && n.initializer) {
        const init = n.initializer;
        const text = init.getText(sf);
        let derives = READS.test(text);
        if (!derives) {
          let e = init;
          while (ts.isAsExpression(e) || ts.isParenthesizedExpression(e) || ts.isAwaitExpression(e)) e = e.expression;
          if (ts.isIdentifier(e)) derives = body.has(e.text);
          else if (ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression)) derives = body.has(e.expression.text);
        }
        if (derives) {
          const before = body.size;
          bindAll(n.name);
          if (body.size > before) grew = true;
        }
      }
      n.forEachChild(seed);
    };
    sf.forEachChild(seed);
  }
  if (!body.size) continue;

  const tainted = (n) => {
    if (!n) return false;
    if (ts.isIdentifier(n)) return body.has(n.text);
    if (ts.isPropertyAccessExpression(n)) return ts.isIdentifier(n.expression) && body.has(n.expression.text);
    if (ts.isBinaryExpression(n)) return tainted(n.left) || tainted(n.right);
    if (ts.isConditionalExpression(n)) return tainted(n.whenTrue) || tainted(n.whenFalse);
    if (ts.isAsExpression(n) || ts.isParenthesizedExpression(n)) return tainted(n.expression);
    return false;
  };

  const walk = (n) => {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)
        && ['insert', 'update', 'upsert'].includes(n.expression.name.text) && n.arguments.length) {
      const objects = [];
      const gather = (a) => {
        if (ts.isObjectLiteralExpression(a)) objects.push(a);
        else if (ts.isArrayLiteralExpression(a)) a.elements.forEach(gather);
        else if (ts.isIdentifier(a) && body.has(a.text)) spreadHits.push({ name, line: lineOf(n), via: a.text });
      };
      gather(n.arguments[0]);
      for (const o of objects) {
        for (const p of o.properties) {
          if (ts.isSpreadAssignment(p) && tainted(p.expression)) {
            spreadHits.push({ name, line: lineOf(p), via: p.expression.getText(sf) });
          } else if (ts.isPropertyAssignment(p)) {
            const col = ts.isIdentifier(p.name) ? p.name.text
              : ts.isStringLiteral(p.name) ? p.name.text : null;
            if (col && PRIV.test(col) && tainted(p.initializer)) {
              privHits.push({ name, line: lineOf(p), col, key: `${name}:${col}` });
            }
          } else if (ts.isShorthandPropertyAssignment(p)) {
            // `{ company_id }` is the same risk as `{ company_id: company_id }`
            // and is how sync-calendar hid a cross-tenant write from the first
            // version of this guard.
            const col = p.name.text;
            if (PRIV.test(col) && body.has(col)) {
              privHits.push({ name, line: lineOf(p), col, key: `${name}:${col}` });
            }
          }
        }
      }
    }
    n.forEachChild(walk);
  };
  sf.forEachChild(walk);
}

const unreviewed = privHits.filter((h) => !REVIEWED.has(h.key));

console.log('Edge-function privilege-write guard (US-297)');
console.log(`  functions scanned:              ${files.length}`);
console.log(`  body-spread writes:             ${spreadHits.length}`);
console.log(`  privilege columns from input:   ${privHits.length} (${privHits.length - unreviewed.length} reviewed)`);

const stale = [...REVIEWED.keys()].filter((k) => !privHits.some((h) => h.key === k));
if (stale.length) {
  console.log(`\n  No longer present — drop from REVIEWED in ${relative(root, fileURLToPath(import.meta.url))}:`);
  for (const k of stale) console.log(`    - ${k}`);
}

let failed = false;
if (spreadHits.length) {
  console.error('\n✖ Request body spread into a write. Use a column allowlist from _shared/writable-columns.ts:');
  for (const h of spreadHits) console.error(`    - ${h.name} line ${h.line} (via ${h.via})`);
  failed = true;
}
if (unreviewed.length) {
  console.error('\n✖ Privilege/decision column written from request input, not reviewed:');
  for (const h of unreviewed) console.error(`    - ${h.name} line ${h.line}: ${h.col}`);
  console.error('  Derive it server-side, or add it to REVIEWED with the reason it is safe.');
  failed = true;
}
if (failed) process.exit(1);

console.log('\n✔ No unreviewed privilege writes and no body-spread writes.');
