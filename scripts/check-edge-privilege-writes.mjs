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

  // names derived from the request body, grown to a fixpoint through aliases
  const body = new Set();
  const seed = (n) => {
    if (ts.isVariableDeclaration(n) && n.initializer) {
      const t = n.initializer.getText(sf);
      if (/\b(?:req|request)\s*\.\s*json\s*\(\s*\)/.test(t) || /\bvalidateBody\s*\(/.test(t) || /\bparsed\s*\.\s*data\b/.test(t)) {
        if (ts.isIdentifier(n.name)) body.add(n.name.text);
        else if (ts.isObjectBindingPattern(n.name))
          for (const e of n.name.elements) if (ts.isIdentifier(e.name)) body.add(e.name.text);
      }
    }
    n.forEachChild(seed);
  };
  sf.forEachChild(seed);
  for (let grew = true; grew;) {
    grew = false;
    const alias = (n) => {
      if (ts.isVariableDeclaration(n) && n.initializer && ts.isIdentifier(n.name) && !body.has(n.name.text)) {
        const t = n.initializer;
        const derives = (ts.isIdentifier(t) && body.has(t.text))
          || (ts.isAsExpression(t) && ts.isIdentifier(t.expression) && body.has(t.expression.text))
          || (ts.isObjectLiteralExpression(t) && t.properties.some((p) =>
               ts.isSpreadAssignment(p) && ts.isIdentifier(p.expression) && body.has(p.expression.text)));
        if (derives) { body.add(n.name.text); grew = true; }
      }
      n.forEachChild(alias);
    };
    sf.forEachChild(alias);
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
