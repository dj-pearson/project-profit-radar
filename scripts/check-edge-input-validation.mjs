#!/usr/bin/env node
/**
 * Edge-function input-validation guard (US-241).
 *
 * CLAUDE.md's Security rule 2: validate all inputs with Zod. A function that
 * reads req.json() without a schema hands unvalidated attacker-controlled JSON
 * to Postgres.
 *
 * This counts functions that call req.json() but never run it through a Zod
 * schema, and fails if the count grows or a new name appears. VALIDATED is the
 * set already converted — it only ever grows. UNVALIDATED is the backlog — it
 * only ever shrinks.
 *
 * Converting a function means:
 *   const parsed = await validateBody(req, MySchema, { name: 'my-fn' });
 *   if (!parsed.ok) return parsed.response;
 * See supabase/functions/_shared/validate-body.ts for the report/enforce
 * staging — schemas ship in report mode first so an older client that sends an
 * unexpected shape is logged rather than rejected.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fnDir = join(root, 'supabase', 'functions');

const READS_BODY = /\b(?:req|request)\s*\.\s*json\s*\(\s*\)/;
const READS_FORM = /\b(?:req|request)\s*\.\s*formData\s*\(\s*\)/;
const USES_HELPER = /\bvalidateBody\s*\(|\bvalidateRequest\s*\(/;
const HAS_SCHEMA = /\bz\s*\.\s*object\s*\(|\bz\s*\.\s*discriminatedUnion\s*\(|\bz\s*\.\s*union\s*\(/;

const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

// A function is validated if it routes its body through a helper or parses it
// with a Zod schema. A converted function stops calling req.json() directly —
// validateBody() reads it — so the backlog is "still reads the body raw".
const validated = [];
const unvalidated = [];
const formReaders = [];
for (const d of readdirSync(fnDir, { withFileTypes: true })) {
  if (!d.isDirectory() || d.name === '_shared') continue;
  const idx = join(fnDir, d.name, 'index.ts');
  if (!existsSync(idx)) continue;
  const src = stripComments(readFileSync(idx, 'utf8'));
  if (READS_FORM.test(src)) formReaders.push(d.name);
  const takesBody = READS_BODY.test(src) || USES_HELPER.test(src);
  if (!takesBody) continue;
  if (USES_HELPER.test(src) || HAS_SCHEMA.test(src)) validated.push(d.name);
  else unvalidated.push(d.name);
}
const reads = [...validated, ...unvalidated];

// Functions already converted. Never remove a name from here.
const VALIDATED = new Set([
  // 2026-09-23 batch 2. data-subject-delete and data-subject-export use
  // validateBody's allowEmpty option, because the iOS app calls
  // data-subject-delete with no body at all. Seven of these also stopped a
  // body-chosen id reaching a service-role read or write: image-processor,
  // process-behavioral-triggers, enhanced-blog-ai-fixed, sync-analytics-data,
  // social-webhook-deployer, generate-timeline-optimization, ml-lead-scoring.
  'api-management', 'apply-seo-fixes', 'blog-ai-automation', 'blog-ai',
  'blog-social-integration', 'blog-social-webhook', 'blog_social_webhook',
  'calculate-bid-analytics', 'check-core-web-vitals', 'check-keyword-positions',
  'crm-email-automation', 'data-subject-delete', 'data-subject-export',
  'detect-duplicate-content', 'detect-redirect-chains', 'email-sync',
  'enhanced-blog-ai-fixed', 'enhanced-blog-ai-simple', 'enhanced-blog-ai',
  'export-seo-report', 'generate-blog-content', 'generate-custom-report',
  'generate-performance-benchmarks', 'generate-predictive-analytics',
  'generate-risk-assessment', 'generate-scaling-plan', 'generate-sitemap',
  'generate-timeline-optimization', 'get-audit-history', 'get-crawl-results',
  'get-keyword-history', 'gsc-sync-data', 'image-processor', 'ml-lead-scoring',
  'optimize-resources', 'process-behavioral-triggers', 'process-voice-command',
  'risk-prediction', 'run-scheduled-audit', 'send-seo-notification',
  'seo-analytics', 'seo-file-generator', 'smart-data-analyzer',
  'social-post-scheduler', 'social-webhook-deployer', 'sync-analytics-data',
  'sync-backlinks', 'track-serp-features', 'voice-to-text',
  // 2026-09-23 batch, money and integrations first. failed-payment-recovery
  // and send-payment-reminder also moved their settings upsert onto a column
  // allowlist (a body company_id chose which tenant's row a service-role
  // upsert overwrote). apply-timeline-optimization's optimization_id is
  // optional because its only caller never sends one.
  'calculate-proration', 'convert-trial-to-paid', 'enhanced-create-checkout',
  'failed-payment-recovery', 'generate-1099s', 'payment-reminders',
  'send-payment-reminder', 'usage-billing', 'generate-cash-flow-forecast',
  'quickbooks-connect', 'quickbooks-disconnect', 'quickbooks-callback',
  'quickbooks-route-transactions', 'quickbooks-sync',
  'google-calendar-auth', 'outlook-calendar-auth', 'sync-calendar', 'verify-domain',
  'webhook-trigger', 'webhook-verify', 'webhook-delivery',
  'daily-reports', 'validate-time-entry', 'apply-timeline-optimization',
  'auto-scheduling', 'workflow-execution', 'manage-alert-rules', 'manage-schedules',
  'send-safety-notification', 'save-llms-txt', 'save-meta-settings', 'save-robots-txt',
  'send-email',
  // The twelve SEO functions that fetch a URL out of the request body. Their
  // schemas share _shared/audit-url.ts, so what counts as a fetchable target is
  // defined once rather than twelve times.
  'analyze-content',
  'analyze-images',
  'analyze-internal-links',
  'analyze-semantic-keywords',
  'check-broken-links',
  'check-mobile-first',
  'check-security-headers',
  'crawl-site',
  'monitor-performance-budget',
  'optimize-page-content',
  'seo-audit',
  'validate-structured-data',
  // The four anonymous marketing forms, converted as one set so they agree on
  // what fits in the `leads` row all four write.
  'capture-lead',
  'handle-demo-request',
  'handle-sales-contact',
  'track-referral',
  'analyze-support-ticket',
  'schedule-trial-emails',
  'track-usage',
  'billing-automation',
  'manage-complimentary-subscription',
  'process-referral-signup',
  'handle-chargeback',
  'change-orders', 'change-subscription', 'create-stripe-checkout', 'disable-mfa',
  'execute-workflow', 'generate-invoice', 'geofencing',
  'invite-team-member', 'process-invoice-payment', 'projects', 'reset-password-otp',
  'send-auth-otp', 'send-notification', 'setup-mfa', 'signup-with-otp',
  'sso-ldap-auth', 'sso-manage', 'sso-oauth-init', 'sso-saml-init',
  'time-tracking', 'verify-auth-otp', 'verify-mfa-login', 'verify-mfa-setup',
  // 2026-09-23 batch 4, the last 21. twilio-calling validates its JSON
  // actions; its form-data recording callback is listed in FORM_DATA_READERS.
  // trigger-expo-build belongs to the archived Expo app and is validated
  // rather than exempted, since it is still deployed and spends EAS minutes.
  'ai-content-generator', 'ai-estimating', 'analytics-oauth-google',
  'bing-search-api', 'bing-webmaster-api', 'calculate-lead-score',
  'customer-portal', 'document-classifier', 'google-analytics-api',
  'google-indexing-api', 'google-search-console-api',
  'send-booking-confirmation', 'send-intervention-email',
  'send-renewal-notification', 'send-support-notification', 'send-usage-alert',
  'seo-backend-integration', 'smart-procurement', 'test-ai-configuration',
  'trigger-expo-build', 'twilio-calling',
]);
const BASELINE = 0;

// Request bodies that are form data, not JSON, so a Zod-over-JSON schema does
// not apply. Each entry names why. A function that starts reading
// req.formData() has to be added here with a reason, and an entry whose
// function stops reading form data has to be removed, so the list cannot rot.
const FORM_DATA_READERS = {
  'twilio-calling':
    "Twilio's RecordingStatusCallback posts application/x-www-form-urlencoded " +
    'with ?action=recording_callback; the fields read (CallSid, RecordingSid, ' +
    'RecordingUrl, RecordingDuration) are Twilio-defined. Every JSON action goes ' +
    'through validateBody.',
  'sso-saml-callback':
    'The SAML HTTP-POST binding delivers SAMLResponse/RelayState as form fields ' +
    'from the IdP. The endpoint answers 503 before reading them while ' +
    'SAML_AVAILABLE is false (_shared/saml-availability.ts, US-340), because ' +
    'signatures are not yet verified.',
};

console.log('Edge-function input-validation guard (US-241)');
console.log(`  functions taking a JSON body:  ${reads.length}`);
console.log(`  with a Zod schema:            ${validated.length}`);
console.log(`  backlog (baseline ${BASELINE}):     ${unvalidated.length}`);

const unlistedForm = formReaders.filter((n) => !(n in FORM_DATA_READERS));
if (unlistedForm.length) {
  console.error(
    `\nx These read req.formData() with no entry in FORM_DATA_READERS: ${unlistedForm.join(', ')}.\n` +
      '  Validate the fields, then add the function there with the reason form data is expected.',
  );
  process.exit(1);
}
const staleForm = Object.keys(FORM_DATA_READERS).filter((n) => !formReaders.includes(n));
if (staleForm.length) {
  console.error(`\nx FORM_DATA_READERS lists functions that no longer read form data: ${staleForm.join(', ')}. Remove them.`);
  process.exit(1);
}

const regressed = [...VALIDATED].filter((n) => unvalidated.includes(n));
if (regressed.length) {
  console.error(`\n✖ These lost their input schema: ${regressed.join(', ')}`);
  process.exit(1);
}

if (unvalidated.length > BASELINE) {
  const added = unvalidated.filter((n) => !VALIDATED.has(n)).slice(-(unvalidated.length - BASELINE));
  console.error(`\n✖ New function(s) read req.json() with no Zod schema. Use validateBody() from _shared/validate-body.ts:`);
  for (const n of added) console.error(`    - ${n}`);
  process.exit(1);
}

if (unvalidated.length < BASELINE) {
  console.error(
    `\n✖ ${BASELINE - unvalidated.length} converted since the baseline, and that has to be ` +
      `locked in: set BASELINE to ${unvalidated.length} in ` +
      `${relative(root, fileURLToPath(import.meta.url))} and add them to VALIDATED.`,
  );
  console.error(
    '  A baseline nobody lowers stops being a gate. US-212 let one drift to 1860 against a real ' +
      'count of 669 - permitting 1191 new errors - precisely because a count below it only ' +
      'printed a suggestion.',
  );
  process.exit(1);
}

console.log(`\n✔ No new unvalidated request bodies (${unvalidated.length} in the backlog).`);
