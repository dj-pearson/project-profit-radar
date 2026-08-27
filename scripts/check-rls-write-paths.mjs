#!/usr/bin/env node
/**
 * RLS write-path guard (US-237 follow-up).
 *
 * Migration 20260712120000 scopes the permissive "System can manage ..."
 * FOR ALL USING (true) policies to service_role. Each of those tables is then
 * left with a company-scoped SELECT policy and NOTHING ELSE — so a client
 * carrying a user's JWT has no write path to them at all.
 *
 * That premise was checked against the frontend, but not against edge functions
 * that build their client from initializeAuthContext(). Three did:
 * track-usage and usage-billing wrote usage_metrics, workflow-execution wrote
 * workflow_step_executions. All of them discarded the error, so once the
 * migration lands the writes would have failed silently — usage would simply
 * stop being billed and workflow step history would stop being recorded.
 *
 * This guard fails when a function writes one of those tables with anything
 * other than a service-role client. Using the service role means RLS is off for
 * that query, so the handler must authorise the caller itself: authenticate the
 * JWT, derive company_id from the caller's own profile, never from the body.
 * check-edge-privilege-writes.mjs enforces that second half.
 */
import ts from 'typescript';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FN = join(root, 'supabase', 'functions');

// The safe_tables array in 20260712120000_harden_permissive_rls_service_role.sql.
// Keep in step with that migration if more tables are scoped later.
const SERVICE_ROLE_ONLY = [
  'job_costing_summary', 'usage_metrics', 'document_signatures',
  'project_predictions', 'prediction_performance', 'incident_metrics',
  'affiliate_referrals', 'affiliate_rewards', 'workflow_step_executions',
  'automated_workflow_executions', 'resource_availability_patterns',
  'weather_forecasts',
];

const WRITES = ['insert', 'update', 'upsert', 'delete'];
const hits = [];

for (const d of readdirSync(FN, { withFileTypes: true })) {
  if (!d.isDirectory() || d.name === '_shared') continue;
  const p = join(FN, d.name, 'index.ts');
  if (!existsSync(p)) continue;
  const text = readFileSync(p, 'utf8');
  if (!SERVICE_ROLE_ONLY.some((t) => text.includes(`'${t}'`) || text.includes(`"${t}"`))) continue;
  const sf = ts.createSourceFile(p, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const lineOf = (n) => sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;

  const service = new Set();
  const userJwt = new Set();
  const classify = (n) => {
    if (ts.isVariableDeclaration(n) && n.initializer && ts.isIdentifier(n.name)) {
      const t = n.initializer.getText(sf);
      if (/createServiceClient\s*\(/.test(t)) service.add(n.name.text);
      else if (/createClient\s*\(/.test(t)) {
        (/SERVICE_ROLE_KEY/.test(t) ? service : userJwt).add(n.name.text);
      }
    }
    if (ts.isVariableDeclaration(n) && n.initializer && ts.isObjectBindingPattern(n.name)
        && /authContext/.test(n.initializer.getText(sf))) {
      for (const e of n.name.elements) {
        if (ts.isIdentifier(e.name) && /supabase/i.test((e.propertyName ?? e.name).getText(sf))) {
          userJwt.add(e.name.text);
        }
      }
    }
    n.forEachChild(classify);
  };
  sf.forEachChild(classify);

  const walk = (n) => {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)
        && WRITES.includes(n.expression.name.text)) {
      let cur = n.expression.expression, table = null, rootName = null;
      while (cur) {
        if (ts.isCallExpression(cur)) {
          if (ts.isPropertyAccessExpression(cur.expression) && cur.expression.name.text === 'from'
              && cur.arguments[0] && ts.isStringLiteral(cur.arguments[0])) table = cur.arguments[0].text;
          cur = cur.expression;
        } else if (ts.isPropertyAccessExpression(cur)) cur = cur.expression;
        else { if (ts.isIdentifier(cur)) rootName = cur.text; break; }
      }
      if (table && SERVICE_ROLE_ONLY.includes(table) && rootName && !service.has(rootName)) {
        hits.push({
          fn: d.name, table, op: n.expression.name.text, line: lineOf(n),
          client: userJwt.has(rootName) ? `${rootName} (user JWT)` : `${rootName} (unrecognised)`,
        });
      }
    }
    n.forEachChild(walk);
  };
  sf.forEachChild(walk);
}

console.log('RLS write-path guard (US-237 follow-up)');
console.log(`  service_role-only tables watched: ${SERVICE_ROLE_ONLY.length}`);
console.log(`  non-service-role writes:          ${hits.length}`);

if (hits.length) {
  console.error('\n✖ These tables have no user-JWT write policy once 20260712120000 lands.');
  console.error('  Authorise the caller in the handler, then write with createServiceClient()');
  console.error('  from _shared/service-client.ts:');
  for (const h of hits) {
    console.error(`    - ${h.fn} line ${h.line}: ${h.op} on ${h.table} via ${h.client}`);
  }
  process.exit(1);
}

console.log('\n✔ Every write to a service_role-only table uses a service-role client.');
