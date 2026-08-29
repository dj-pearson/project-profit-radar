#!/usr/bin/env node
/**
 * US-241: every edge function must verify its own caller.
 *
 * check-edge-function-auth.mjs only inspects the functions set to
 * verify_jwt = false, on the stated reasoning that "Supabase enforces a valid
 * JWT for functions with verify_jwt = true (the default)". That reasoning has a
 * hole, and it is the reason this second guard exists.
 *
 * verify_jwt = true means the request carries a validly-SIGNED project JWT. It
 * does not mean the caller is a user, and it does not say which user. THE
 * PUBLISHABLE ANON KEY IS A VALIDLY-SIGNED PROJECT JWT, and it ships in the
 * client bundle. So a handler with verify_jwt = true and no auth of its own is
 * reachable by anyone who has ever loaded the app.
 *
 * Two functions were in exactly that state when this was written:
 *
 *   webhook-trigger    took tenant_id from the body, with a service-role
 *                      client, and read + fired every webhook_endpoint for that
 *                      tenant. Enumerate any customer's webhook URLs, then post
 *                      arbitrary data into their downstream systems.
 *   send-usage-alert   took companyId from the body, with a service-role
 *                      client, and read every admin email address for that
 *                      company before emailing them. Harvest admin addresses
 *                      per company, and send them Brikly-branded mail.
 *
 * Neither had a live caller. Both now require an internal caller.
 *
 * "Verifies its caller" means one of: initializeAuthContext / withAuth /
 * requireSystemOrAdmin / requireInternalCaller, an explicit auth.getUser(token),
 * or a webhook-signature check.
 */
import ts from 'typescript';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FN = join(root, 'supabase', 'functions');

const VERIFIES_CALLER =
  /initializeAuthContext|withAuth|requireSystemOrAdmin|requireInternalCaller|requireAuth|auth\s*\.\s*getUser\s*\(|constructEvent|verifyStripeSignature|validateWebhookSignature|verifyWebhookSignature|validateApiRequest|validateApiKey/;

/**
 * Functions that are anonymous BY DESIGN - a visitor with no account has to be
 * able to reach them. Each verifies whatever it can (an OTP, an OAuth state, a
 * signature) inside its own flow.
 */
const PUBLIC_BY_DESIGN = new Set([
  'capture-lead', 'handle-demo-request', 'handle-sales-contact',
  'signup-with-otp', 'send-auth-otp', 'verify-auth-otp', 'reset-password-otp',
  'email-unsubscribe', 'track-referral', 'process-referral-signup',
  'google-calendar-callback', 'outlook-calendar-callback', 'gsc-oauth-callback',
  'sso-oauth-callback', 'sso-saml-callback', 'sso-oauth-init', 'sso-saml-init',
  'sso-ldap-auth', 'verify-mfa-login', 'webhook-verify', 'api-auth',
  'health-check', 'oauth-proxy', 'generate-sitemap-file', 'sitemap-generator',
  'verify-domain', 'webhook-delivery', 'create-root-admin',
]);

/**
 * Known-unverified functions that predate this guard. Each still needs the
 * decision: public by design, internal-only, or user-authenticated. This list
 * must only ever shrink.
 */
/**
 * Handlers that verify the caller inside a function they delegate to, rather
 * than in the handler body. Named explicitly, and the named function must
 * actually contain the check - a blanket "one level of delegation is fine" rule
 * would have accepted the two real misplacements this check was written for
 * (a guard sitting in social-content-generator's getRecentFormats, which the
 * handler reaches only conditionally and deep in generation logic).
 */
const DELEGATES = new Map([
  // api-management dispatches on pathname to seven route functions, and this
  // entry vouches for the whole file on the strength of ONE of them. That was
  // too generous, and the comment here used to assert something false: that
  // "every route function validates the caller's hashed API key". Two did not.
  // /api-management/webhook/trigger looked a webhook up by id with no tenant
  // scoping and POSTed a caller-supplied payload to its URL, behind nothing but
  // an IP rate limit, and /webhook/test delegated straight to it (US-241).
  //
  // Both now call requireInternalCaller, so the claim is true as of 2026-08-29:
  // /api/* routes call validateApiRequest, create-key does its own
  // auth.getUser, and the two webhook routes are internal-only. The limitation
  // is still real though - a delegation entry proves one named function checks,
  // not that every reachable route does. Anyone adding a route here must add
  // its own check; this guard will not notice if they do not.
  ['api-management', 'handleProjectsApi'],
]);

const BASELINE = new Set([
  // Empty: every edge function now verifies its caller, inside its handler.
  // Adding a name here should be a deliberate, argued exception.
]);

/**
 * A guard call has to be IN the request handler, not merely somewhere in the
 * file. Adding these by script, I put two of them inside helper functions
 * (social-content-generator's getRecentFormats, blog_social_webhook's
 * getInstagramMediaFromStorage) - they compiled, because `req` was in scope
 * through the closure, and a name-only scan reported both as covered. A check
 * that runs in the wrong function is worse than none, because it reads as done.
 *
 * So: find the handler passed to serve() / assigned to `handler` / default
 * exported, and require the guard call to be lexically inside it.
 */
function verifiesCallerInHandler(text, file) {
  if (!VERIFIES_CALLER.test(text)) return false;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);

  const handlers = [];
  const findHandlers = (n) => {
    // serve(async (req) => { ... })
    const isServe = ts.isCallExpression(n) && (
      (ts.isIdentifier(n.expression) && n.expression.text === 'serve') ||
      (ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'serve')
    );
    if (isServe) {
      const arg = n.arguments[0];
      if (arg && (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg))) handlers.push(arg);
      else if (arg && ts.isIdentifier(arg)) handlers.push({ __name: arg.text });
    }
    // const handler = async (req) => { ... }   /   export default async (req) => {}
    if (ts.isVariableDeclaration(n) && n.initializer && ts.isIdentifier(n.name)
        && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))) {
      handlers.push({ __named: n.name.text, node: n.initializer });
    }
    if (ts.isExportAssignment(n) && n.expression
        && (ts.isArrowFunction(n.expression) || ts.isFunctionExpression(n.expression))) {
      handlers.push(n.expression);
    }
    n.forEachChild(findHandlers);
  };
  sf.forEachChild(findHandlers);

  // Resolve `serve(handlerName)` to the declaration of that name.
  const named = new Map(handlers.filter((h) => h.__named).map((h) => [h.__named, h.node]));
  const nodes = [];
  for (const h of handlers) {
    if (h.__name) { if (named.has(h.__name)) nodes.push(named.get(h.__name)); }
    else if (h.__named) { /* only counted when serve() names it, or nothing does */ }
    else nodes.push(h);
  }
  if (nodes.length === 0) nodes.push(...named.values());
  if (nodes.length === 0) return VERIFIES_CALLER.test(text); // shape we do not model

  if (nodes.some((fn) => VERIFIES_CALLER.test(fn.getText(sf)))) return true;

  // Delegation, only where it is declared and only to the named function.
  const fnName = file.split('/').slice(-2)[0];
  const delegate = DELEGATES.get(fnName);
  if (!delegate) return false;
  if (!nodes.some((fn) => new RegExp(`\\b${delegate}\\s*\\(`).test(fn.getText(sf)))) return false;

  let ok = false;
  const findDelegate = (n) => {
    if (ok) return;
    const isDecl =
      (ts.isFunctionDeclaration(n) && n.name?.text === delegate) ||
      (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === delegate);
    if (isDecl && VERIFIES_CALLER.test(n.getText(sf))) ok = true;
    n.forEachChild(findDelegate);
  };
  sf.forEachChild(findDelegate);
  return ok;
}

const unverified = [];
const misplaced = [];
for (const d of readdirSync(FN, { withFileTypes: true })) {
  if (!d.isDirectory() || d.name === '_shared') continue;
  const p = join(FN, d.name, 'index.ts');
  if (!existsSync(p)) continue;
  const text = readFileSync(p, 'utf8');
  if (verifiesCallerInHandler(text, p)) continue;
  if (VERIFIES_CALLER.test(text)) misplaced.push(d.name);
  if (PUBLIC_BY_DESIGN.has(d.name)) continue;
  unverified.push(d.name);
}

const fresh = unverified.filter((f) => !BASELINE.has(f));
const fixed = [...BASELINE].filter((b) => !unverified.includes(b));

console.log('Unauthenticated edge-function guard (US-241)');
console.log(`  verify no caller:        ${unverified.length}`);
console.log(`  public by design:        ${PUBLIC_BY_DESIGN.size}`);
console.log(`  grandfathered:           ${BASELINE.size}`);
if (misplaced.length) {
  console.error('\n\u2716 Guard call present but NOT inside the request handler:');
  for (const m of misplaced) console.error(`    ${m}`);
  console.error('  A check that runs in the wrong function reads as done and is not.');
}
for (const f of unverified.filter((x) => BASELINE.has(x))) console.log(`    ${f}`);

if (fixed.length) {
  console.log(
    `\n  ${fixed.length} baseline entr${fixed.length === 1 ? 'y' : 'ies'} now verify a caller` +
      ` - remove from BASELINE in ${relative(root, fileURLToPath(import.meta.url))}: ${fixed.join(', ')}`,
  );
}

if (fresh.length) {
  console.error('\n✖ Edge function(s) that verify no caller:');
  for (const f of fresh) console.error(`    ${f}`);
  console.error(
    '\nverify_jwt = true is NOT authentication: it checks that a validly-signed project',
  );
  console.error(
    'JWT is present, and the publishable anon key is one, and it ships in the client',
  );
  console.error(
    'bundle. Use initializeAuthContext for a user endpoint, requireInternalCaller for',
  );
  console.error(
    'a cron/internal one, or add the name to PUBLIC_BY_DESIGN if a signed-out visitor',
  );
  console.error('genuinely has to reach it.');
  process.exit(1);
}

console.log('\n✔ No new edge functions without caller verification.');
