#!/usr/bin/env node
/**
 * Guard: src/ may only query tables the LIVE schema actually has.
 *
 * check-table-definitions.mjs (US-311) already checks queried tables against
 * supabase/migrations. This checks them against the other source of truth -
 * src/integrations/supabase/types.ts, which `supabase gen types` produces by
 * reading the running database. The two disagree, and the gap is where this
 * class of bug lives.
 *
 * Worked example, which is why this exists. LeadDetailView queried a table
 * named `activities`. Migration 20250710170611 creates public.activities, so
 * the migration-based guard passed it - but the live database has no such
 * table (it has crm_activities and lead_activities). PostgREST answers with an
 * error, the queryFn rethrows, and the page renders its "Lead not found"
 * branch. Nothing in CI could see it: the migration exists, the code compiles,
 * and the failure only appears against the real database.
 *
 * Direction matters. A table in the migrations but not in the live schema is
 * not automatically an unapplied migration - it can equally be a table created
 * and later dropped, one superseded by a rename, or a migration that never
 * shipped. The absences here span the whole migration history rather than
 * clustering after one date, so no single explanation covers them, and this
 * guard deliberately does not try to assign one. What it asserts is narrower
 * and is the part that decides whether the app works: if code queries it, the
 * live schema has to have it.
 *
 * When the baseline shrinks because types.ts was regenerated (US-263 AC2),
 * lower BASELINE in the same commit - same rule as every other guard here.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = join(root, 'src', 'integrations', 'supabase', 'types.ts');

// Known to be missing from the live schema as of the 2026-06-29-or-later
// types.ts. Each is a real query that cannot succeed today.
const EDGE_BASELINE = new Set([
  'ai_estimates', 'auth_otp_codes', 'campaign_enrollments', 'chargebacks',
  'disposable_email_domains', 'email_automations', 'estimate_predictions', 'expo_builds',
  'failed_payment_recovery_settings', 'financial_records', 'geofence_breach_alerts',
  'image_processing_queue', 'intervention_logs', 'lead_scoring_rules', 'market_pricing_data',
  'oauth_pending_states', 'payment_reminder_logs', 'payment_reminder_settings',
  'project_team_assignments', 'proration_history', 'push_subscriptions', 'quickbooks_expenses',
  'quickbooks_payments', 'quickbooks_routing_history', 'quickbooks_routing_rules',
  'quickbooks_unrouted_transactions', 'refunds', 'saml_pending_requests', 'stripe_keys',
  'system_settings', 'teams', 'usage_billing_records',
]);

const BASELINE = new Set([
  'ai_environment_config', 'api_key_rate_limits', 'consent_ledger',
  'disposable_email_domains', 'estimate_templates', 'financial_records',
  'generated_content', 'image_processing_queue', 'invoice_payments', 'line_item_library',
  'payments', 'processed_images', 'project_videos',
  'real_time_notifications', 'reviews',
  'saved_filter_presets', 'sensitive_data_access_log', 'seo_page_configs',
  'user_announcements', 'user_tour_progress', 'workflow_steps',
]);

function walk(dir, out = []) {
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist'].includes(d.name)) continue;
    const p = join(dir, d.name);
    if (d.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(d.name)) out.push(p);
  }
  return out;
}

const types = readFileSync(TYPES, 'utf8');
const section = (name) => {
  const m = new RegExp(`\\n    ${name}: \\{\\n([\\s\\S]*?)\\n    \\}\\n`).exec(types);
  return m ? new Set([...m[1].matchAll(/^      (\w+): \{$/gm)].map((x) => x[1])) : new Set();
};
const tables = section('Tables');
const views = section('Views');
const known = new Set([...tables, ...views]);

if (tables.size === 0) {
  console.error('✖ Could not read any tables out of types.ts - check-generated-types.mjs covers');
  console.error('  a truncated file; this means the shape changed. Fix the parser before trusting');
  console.error('  a pass from this guard.');
  process.exit(1);
}

// `.storage.from('bucket')` is a storage bucket, not a table.
const QUERY = /(?<!storage\s*\n?\s*)\.from\(\s*["'`]([a-z_0-9]+)["'`]\s*\)/g;
const STORAGE = /\.storage\s*[\s\S]{0,40}?\.from\(\s*["'`]([a-z_0-9]+)["'`]\s*\)/g;

function scan(dir) {
  const out = new Map();
  for (const file of walk(dir)) {
    if (/\.(test|spec)\.tsx?$|__tests__/.test(file)) continue;
    const src = readFileSync(file, 'utf8');
    const buckets = new Set([...src.matchAll(STORAGE)].map((m) => m[1]));
    for (const m of src.matchAll(QUERY)) {
      const t = m[1];
      if (known.has(t) || buckets.has(t)) continue;
      const line = src.slice(0, m.index).split('\n').length;
      if (!out.has(t)) out.set(t, []);
      out.get(t).push(`${relative(root, file)}:${line}`);
    }
  }
  return out;
}

const found = scan(join(root, 'src'));
const edgeFound = scan(join(root, 'supabase', 'functions'));

// Split what is found by root cause, because the two halves need opposite
// fixes and lumping them together hides that. A table a migration creates but
// the live database lacks is a deploy problem (US-248) - the code is right and
// the schema never arrived. A table no migration mentions at all is a code
// problem (US-311) - the query names something that was never designed.
const createdBy = new Map();
for (const f of readdirSync(join(root, 'supabase', 'migrations')).sort()) {
  if (!f.endsWith('.sql')) continue;
  const sql = readFileSync(join(root, 'supabase', 'migrations', f), 'utf8');
  for (const m of sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?([a-z_0-9]+)/gi)) {
    if (!createdBy.has(m[1])) createdBy.set(m[1], basename(f));
  }
}
const unapplied = [...found.keys()].filter((t) => createdBy.has(t)).sort();
const undesigned = [...found.keys()].filter((t) => !createdBy.has(t)).sort();

const edgeNew = [...edgeFound.keys()].filter((t) => !EDGE_BASELINE.has(t)).sort();
const edgeFixed = [...EDGE_BASELINE].filter((t) => !edgeFound.has(t)).sort();

const isNew = [...found.keys()].filter((t) => !BASELINE.has(t)).sort();
const fixed = [...BASELINE].filter((t) => !found.has(t)).sort();

console.log('Live-schema table guard (US-311 follow-up)');
console.log(`  live schema:            ${tables.size} tables, ${views.size} views`);
console.log(`  queried by src/, not there:              ${found.size} (baseline ${BASELINE.size})`);
console.log(`  queried by supabase/functions/, not there: ${edgeFound.size} (baseline ${EDGE_BASELINE.size})`);
console.log(`    a migration creates it, prod does not have it (US-248): ${unapplied.length}`);
for (const t of unapplied) console.log(`      ${t.padEnd(26)} ${createdBy.get(t)}`);
console.log(`    no migration creates it at all (US-311):                ${undesigned.length}`);
for (const t of undesigned) console.log(`      ${t}`);

if (edgeNew.length) {
  console.error('\n\u2716 These tables are queried by an edge function and are not in the live schema:');
  for (const t of edgeNew) {
    console.error(`    ${t}`);
    for (const site of edgeFound.get(t).slice(0, 4)) console.error(`        ${site}`);
  }
  console.error('\n  Edge functions run on the service role, so there is no RLS error to notice -');
  console.error('  the query just returns { data: null, error } and the handler usually carries on.');
  process.exit(1);
}

if (edgeFixed.length) {
  console.error(`\n\u2716 ${edgeFixed.length} baselined edge table(s) now exist: ${edgeFixed.join(', ')}`);
  console.error('  Remove them from EDGE_BASELINE to lock the win in.');
  process.exit(1);
}

if (isNew.length) {
  console.error('\n✖ These tables are queried by src/ but do not exist in the live schema:');
  for (const t of isNew) {
    console.error(`    ${t}`);
    for (const s of found.get(t).slice(0, 4)) console.error(`        ${s}`);
  }
  console.error('\n  supabase-js returns { data: null, error } for these - it does not throw - so');
  console.error('  `res.data || []` renders the failure as an empty list and the feature looks');
  console.error('  merely empty. Point the query at a table that exists, or add the migration');
  console.error('  AND apply it, then regenerate types (npm run db:types).');
  process.exit(1);
}

if (fixed.length) {
  console.error(`\n✖ ${fixed.length} baselined table(s) now exist in the live schema:`);
  for (const t of fixed) console.error(`    ${t}`);
  console.error('\n  That is progress and it has to be locked in: remove them from BASELINE in');
  console.error('  scripts/check-live-schema-tables.mjs. A baseline nobody lowers stops being a gate.');
  process.exit(1);
}

console.log(
  `\n✔ No new queries against tables the live schema lacks ` +
    `(${BASELINE.size} in src/, ${EDGE_BASELINE.size} in edge functions).`,
);
