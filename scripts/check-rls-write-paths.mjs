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
//
// NOT here yet: workflow_executions, workflow_analytics, calendar_events and
// webhook_events. Those four keep their permissive FOR ALL USING (true), so a
// user-JWT write still works; 20260827023111 adds a RESTRICTIVE company scope
// instead, which closes the cross-tenant hole without removing that write path.
// Whoever eventually scopes those permissive policies to service_role must add
// the table here first and run this check — workflow-execution and sync-calendar
// both write them with a user-JWT client today.
const SERVICE_ROLE_ONLY = [
  'job_costing_summary', 'usage_metrics', 'document_signatures',
  'project_predictions', 'prediction_performance', 'incident_metrics',
  'affiliate_referrals', 'affiliate_rewards', 'workflow_step_executions',
  'automated_workflow_executions', 'resource_availability_patterns',
  'weather_forecasts',
  // Scoped by 20260827030000. These hold SSO pending state, including the PKCE
  // code_verifier, and no client may touch them at all.
  'saml_pending_requests', 'oauth_pending_states',
  // Denied to client roles by 20260827090000 (US-306 follow-up). These are
  // append-only telemetry and security state: nothing the browser writes, and
  // a client that can write them can forge the record of its own behaviour or
  // reset the counters meant to throttle it.
  'data_access_logs', 'security_metrics', 'security_logs',
  'document_access_logs', 'sensitive_data_access_log', 'api_request_logs',
  'rate_limit_state', 'ddos_detection_logs', 'affiliate_codes',
  // NOT rate_limit_violations: _shared/rate-limiter.ts writes it with whatever
  // client checkRateLimit is handed, and most callers pass a user-JWT one.
  // Denying it would stop the limit tripping at all, since checkRateLimit
  // decides `allowed` by counting those rows.
];

const WRITES = ['insert', 'update', 'upsert', 'delete'];

// Helpers in _shared/ that write a service-role-only table on the caller's
// behalf. Moving a write behind a helper hides it from the .from('<table>')
// scan above, so the check moves with it: the helper's FIRST argument is the
// client, and it has to be a service-role one. Without this, converting 19
// security_logs inserts to writeSecurityLog() would have quietly removed them
// from this guard's view.
const SERVICE_CLIENT_HELPERS = new Map([
  ['writeSecurityLog', 'security_logs'],
  ['writeAuditLog', 'audit_logs'],
]);
const hits = [];

// _shared/ is scanned too. It was skipped originally, and that blind spot is
// how rate_limit_violations nearly got denied to client roles while
// _shared/rate-limiter.ts was still writing it with whatever client
// checkRateLimit was handed. A helper that takes the client as a parameter
// cannot be classified here - the caller decides - so those are reported
// separately as sites to audit by hand rather than as failures.
const targets = [];
for (const d of readdirSync(FN, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  if (d.name === '_shared') {
    for (const f of readdirSync(join(FN, '_shared'))) {
      if (f.endsWith('.ts') && !f.endsWith('.test.ts')) {
        targets.push({ name: `_shared/${f}`, path: join(FN, '_shared', f), shared: true });
      }
    }
    continue;
  }
  targets.push({ name: d.name, path: join(FN, d.name, 'index.ts'), shared: false });
}

for (const d of targets) {
  const p = d.path;
  if (!existsSync(p)) continue;
  const text = readFileSync(p, 'utf8');
  const mentionsTable = SERVICE_ROLE_ONLY.some(
    (t) => text.includes(`'${t}'`) || text.includes(`"${t}"`),
  );
  const callsHelper = [...SERVICE_CLIENT_HELPERS.keys()].some((h) => text.includes(`${h}(`));
  if (!mentionsTable && !callsHelper) continue;
  const sf = ts.createSourceFile(p, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const lineOf = (n) => sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;

  const service = new Set();
  const userJwt = new Set();

  // First pass: variables holding the service-role key. It is usually read
  // once into a module constant (const SERVICE_ROLE = Deno.env.get(...)), so
  // looking for SERVICE_ROLE_KEY inside the createClient call itself misses
  // it and reports a correct call site as a user-JWT one.
  const serviceKeyVars = new Set();
  const collectKeys = (n) => {
    if (ts.isVariableDeclaration(n) && n.initializer && ts.isIdentifier(n.name)
        && /SERVICE_ROLE_KEY/.test(n.initializer.getText(sf))) {
      serviceKeyVars.add(n.name.text);
    }
    n.forEachChild(collectKeys);
  };
  sf.forEachChild(collectKeys);

  const usesServiceKey = (t) =>
    /SERVICE_ROLE_KEY/.test(t) ||
    [...serviceKeyVars].some((v) => new RegExp(`\\b${v}\\b`).test(t));

  const classify = (n) => {
    if (ts.isVariableDeclaration(n) && n.initializer && ts.isIdentifier(n.name)) {
      const t = n.initializer.getText(sf);
      if (/createServiceClient\s*\(/.test(t)) service.add(n.name.text);
      else if (/createClient\s*\(/.test(t)) {
        (usesServiceKey(t) ? service : userJwt).add(n.name.text);
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
    // A helper call that takes the client as its first argument.
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)
        && SERVICE_CLIENT_HELPERS.has(n.expression.text) && !d.shared) {
      const table = SERVICE_CLIENT_HELPERS.get(n.expression.text);
      const arg = n.arguments[0];
      const inline = arg && ts.isCallExpression(arg) && ts.isIdentifier(arg.expression)
        && arg.expression.text === 'createServiceClient';
      const named = arg && ts.isIdentifier(arg) && service.has(arg.text);
      if (arg && !inline && !named) {
        hits.push({
          fn: d.name, shared: false, table, op: n.expression.text, line: lineOf(n),
          client: ts.isIdentifier(arg) && userJwt.has(arg.text)
            ? `${arg.getText(sf)} (user JWT)`
            : `${arg.getText(sf).slice(0, 40)} (unrecognised)`,
        });
      }
    }

    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)
        && WRITES.includes(n.expression.name.text)) {
      let cur = n.expression.expression, table = null, rootName = null, inlineService = false;
      while (cur) {
        if (ts.isCallExpression(cur)) {
          if (ts.isPropertyAccessExpression(cur.expression) && cur.expression.name.text === 'from'
              && cur.arguments[0] && ts.isStringLiteral(cur.arguments[0])) table = cur.arguments[0].text;
          // createServiceClient().from(...) — the established convention in
          // this repo (data-subject-delete, voice-to-text, signup-with-otp and
          // the rate-limit call sites all use it inline). Without this the
          // chain bottoms out on the function identifier and reads as
          // "unrecognised", which would push an author to introduce a variable
          // for no reason, or worse, to exempt the table.
          if (ts.isIdentifier(cur.expression) && cur.expression.text === 'createServiceClient') {
            inlineService = true;
          }
          cur = cur.expression;
        } else if (ts.isPropertyAccessExpression(cur)) cur = cur.expression;
        else { if (ts.isIdentifier(cur)) rootName = cur.text; break; }
      }
      if (table && SERVICE_ROLE_ONLY.includes(table) && !inlineService && rootName && !service.has(rootName)) {
        hits.push({
          fn: d.name, shared: d.shared, table, op: n.expression.name.text, line: lineOf(n),
          client: userJwt.has(rootName) ? `${rootName} (user JWT)` : `${rootName} (caller-supplied)`,
        });
      }
    }
    n.forEachChild(walk);
  };
  sf.forEachChild(walk);
}

const sharedHits = hits.filter((h) => h.shared);
const fnHits = hits.filter((h) => !h.shared);

console.log('RLS write-path guard (US-237 follow-up)');
console.log(`  service_role-only tables watched: ${SERVICE_ROLE_ONLY.length}`);
console.log(`  non-service-role writes:          ${fnHits.length}`);
console.log(`  _shared helpers to audit by hand: ${sharedHits.length}`);

for (const h of sharedHits) {
  console.log(
    `    ${h.fn} line ${h.line}: ${h.op} on ${h.table} via ${h.client} — the caller decides ` +
      'which client this is; check every call site before adding this table to SERVICE_ROLE_ONLY.',
  );
}

if (fnHits.length) {
  console.error('\n✖ These tables have no user-JWT write policy once 20260712120000 lands.');
  console.error('  Authorise the caller in the handler, then write with createServiceClient()');
  console.error('  from _shared/service-client.ts:');
  for (const h of fnHits) {
    console.error(`    - ${h.fn} line ${h.line}: ${h.op} on ${h.table} via ${h.client}`);
  }
  process.exit(1);
}

console.log('\n✔ Every write to a service_role-only table uses a service-role client.');
