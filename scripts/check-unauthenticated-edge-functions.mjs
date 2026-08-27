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
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FN = join(root, 'supabase', 'functions');

const VERIFIES_CALLER =
  /initializeAuthContext|withAuth|requireSystemOrAdmin|requireInternalCaller|requireAuth|auth\s*\.\s*getUser\s*\(|constructEvent|verifyStripeSignature|validateWebhookSignature|verifyWebhookSignature/;

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
const BASELINE = new Set([
  'analyze-support-ticket', 'blog-ai-automation', 'blog_social_webhook',
  'create-missing-content', 'document-classifier', 'enhanced-blog-ai-simple',
  'send-notification', 'send-safety-notification', 'send-seo-notification',
  'send-support-notification', 'seo-backend-integration', 'seo-file-generator',
  'social-content-generator', 'social-post-scheduler', 'social-webhook-deployer',
  'trigger-expo-build',
]);

const unverified = [];
for (const d of readdirSync(FN, { withFileTypes: true })) {
  if (!d.isDirectory() || d.name === '_shared') continue;
  const p = join(FN, d.name, 'index.ts');
  if (!existsSync(p)) continue;
  if (VERIFIES_CALLER.test(readFileSync(p, 'utf8'))) continue;
  if (PUBLIC_BY_DESIGN.has(d.name)) continue;
  unverified.push(d.name);
}

const fresh = unverified.filter((f) => !BASELINE.has(f));
const fixed = [...BASELINE].filter((b) => !unverified.includes(b));

console.log('Unauthenticated edge-function guard (US-241)');
console.log(`  verify no caller:        ${unverified.length}`);
console.log(`  public by design:        ${PUBLIC_BY_DESIGN.size}`);
console.log(`  grandfathered:           ${BASELINE.size}`);
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
