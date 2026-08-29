#!/usr/bin/env node
/**
 * US-311: every table the code reads or writes must be created by a migration.
 *
 * The migrations are the only description of this database that anyone can
 * read. A table that exists solely because someone typed CREATE TABLE into the
 * production SQL editor is invisible here: nothing says what its columns are,
 * nothing says whether RLS is on, and a fresh project built from
 * supabase/migrations does not have it. That is what makes a staging
 * environment (US-247) impossible to trust and what US-248 exists to prevent.
 *
 * The failure mode in the app is worse than an error, because supabase-js
 * returns the error rather than throwing it. A select against a table that is
 * not there comes back `{ data: null, error }`, and the common shape
 * `setThings(res.data || [])` turns that into an empty list. The screen renders
 * "no payments", "no incidents", "no results" and looks like it worked.
 *
 * Two things are deliberately not flagged:
 *   - supabase.storage.from(...) names a storage bucket, not a table. Buckets
 *     have their own creation path.
 *   - Commented-out code. Two of the first findings here were inside /* ... *␟/
 *     blocks under a `TODO: create this table first` note, which is a developer
 *     doing the right thing, not a bug.
 *
 * BASELINE carries the known-missing tables with what each one does when the
 * table is absent. It only shrinks: a name not in it, and not created by a
 * migration, fails the build.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS = join(root, 'supabase', 'migrations');
const SCAN_ROOTS = [join(root, 'src'), join(root, 'supabase', 'functions')];

/**
 * Tables the code uses that no migration creates, and what happens without
 * them. Every entry is a real defect; the note is the triage, not an excuse.
 * Settling these needs the live schema, which is US-247 (staging) and US-263
 * (regenerated types); until then the guard stops the list growing.
 */
const BASELINE = new Map([
  ['payments', 'Read by src/components/financial/ProjectFinancialDashboard.tsx and src/pages/FinancialOverview.tsx. Both financial screens show every project as having received nothing when the read fails. The only "payments" in any migration are contractor_payments and bill_payments.'],
  ['stripe_keys', 'Read by supabase/functions/calculate-revenue-metrics/index.ts for a Stripe SECRET key, and written by supabase/functions/store-stripe-keys. A table holding live payment credentials with no migration also has no RLS policy anyone can review. Highest priority of this list.'],
  ['incident_reports', 'Read by src/components/compliance/OSHACompliance.tsx, cast `as any`. An OSHA compliance screen showing no incidents is the worst possible way for this to fail.'],
  ['safety_trainings', 'Read by src/components/compliance/OSHACompliance.tsx, cast `as any`. Same screen, same failure.'],
  ['lead_scores', 'Read by src/components/crm/LeadScoring.tsx with a join onto leads.'],
  ['workflow_steps', 'Written by src/components/crm/WorkflowBuilder.tsx. This one throws on error, so a workflow with steps cannot be saved at all rather than saving wrong.'],
  ['geofence_breach_alerts', 'Written by supabase/functions/geofencing. The function answers breach_detected: true whether or not the alert row was stored.'],
  ['intervention_logs', 'Written by supabase/functions/send-intervention-email in both the sent and the suppressed-by-opt-out paths. The opt-out record is the one that matters for consent evidence.'],
  ['project_notes', 'Written by src/services/estimateToProjectConversion.ts when carrying an estimate\'s notes onto the new project.'],
  ['user_announcements', 'Read and written by src/components/announcements/FeatureAnnouncementSystem.tsx, which already logs "table not available" on the read and degrades. The dismissal write is the half that silently does nothing.'],
  ['user_tour_progress', 'Written by src/components/onboarding/FeatureTour.tsx. Its try/catch never fires because supabase-js returns the error, so a finished tour is never recorded and reappears on the next visit.'],
  ['reviews', 'Read by src/components/seo/AggregateRatingSchema.tsx, which says "if it exists" and renders no rating schema when the read fails. Deliberate and correct: emitting star ratings without review data would be deceptive. Listed for completeness, not as a bug.'],
]);

/** Blank comment bodies, keeping line numbers. A guard must not forbid naming what it guards against. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .split('\n')
    .map((line) => {
      const i = line.search(/(^|[^:])\/\//);
      if (i === -1) return line;
      return line.slice(0, line.indexOf('//', i));
    })
    .join('\n');
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

// Everything any migration creates: tables, views, materialized views, and
// anything renamed into place.
const defined = new Set();
for (const f of readdirSync(MIGRATIONS).filter((n) => n.endsWith('.sql'))) {
  const sql = readFileSync(join(MIGRATIONS, f), 'utf8');
  const create = /CREATE\s+(?:TABLE|(?:OR\s+REPLACE\s+)?(?:MATERIALIZED\s+)?VIEW)\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?public"?\s*\.\s*)?"?([a-zA-Z0-9_]+)"?/gi;
  const rename = /RENAME\s+TO\s+(?:"?public"?\s*\.\s*)?"?([a-zA-Z0-9_]+)"?/gi;
  let m;
  while ((m = create.exec(sql))) defined.add(m[1].toLowerCase());
  while ((m = rename.exec(sql))) defined.add(m[1].toLowerCase());
}

const used = new Map(); // table -> [ "path:line", ... ]
for (const scanRoot of SCAN_ROOTS) {
  try {
    statSync(scanRoot);
  } catch {
    continue;
  }
  for (const file of walk(scanRoot)) {
    // Scanned as one string rather than line by line, because the storage form
    // is usually split across two:  await supabase.storage\n  .from('avatars')
    const src = stripComments(readFileSync(file, 'utf8'));
    const re = /\.from\(\s*['"`]([a-z][a-z0-9_]*)['"`]/g;
    let m;
    while ((m = re.exec(src))) {
      // storage.from('bucket') names a bucket, not a table.
      if (/\.storage\s*$/.test(src.slice(Math.max(0, m.index - 40), m.index))) continue;
      const name = m[1].toLowerCase();
      const line = src.slice(0, m.index).split('\n').length;
      if (!used.has(name)) used.set(name, []);
      used.get(name).push(`${relative(root, file)}:${line}`);
    }
  }
}

const missing = [...used.keys()].filter((t) => !defined.has(t)).sort();
const unexpected = missing.filter((t) => !BASELINE.has(t));
const stale = [...BASELINE.keys()].filter((t) => !missing.includes(t)).sort();

console.log('Table-definition guard (US-311)');
console.log(`  tables used by code:     ${used.size}`);
console.log(`  created by a migration:  ${used.size - missing.length}`);
console.log(`  created by none:         ${missing.length} (baseline ${BASELINE.size})`);
for (const t of missing) {
  const mark = BASELINE.has(t) ? 'known' : 'NEW';
  console.log(`    [${mark}] ${t} - ${used.get(t).length} site(s): ${used.get(t).slice(0, 2).join(', ')}${used.get(t).length > 2 ? ', ...' : ''}`);
}
console.log('');

if (stale.length) {
  console.error('❌ BASELINE lists tables that a migration now creates, or that no code uses:');
  for (const t of stale) console.error(`   - ${t}`);
  console.error('');
  console.error('The baseline only shrinks. Delete these entries from');
  console.error('scripts/check-table-definitions.mjs so the guard keeps them fixed.');
  process.exit(1);
}

if (unexpected.length) {
  console.error(`❌ ${unexpected.length} table(s) used by code that no migration creates:`);
  for (const t of unexpected) {
    console.error(`   - ${t}`);
    for (const site of used.get(t)) console.error(`       ${site}`);
  }
  console.error('');
  console.error('supabase-js returns this as `{ data: null, error }` rather than');
  console.error('throwing, and `res.data || []` turns that into an empty list, so');
  console.error('the screen renders as if there were simply nothing to show. Add the');
  console.error('migration, or drop the call site.');
  process.exit(1);
}

console.log(`✅ ${used.size} table(s) referenced; all created by a migration or baselined (${BASELINE.size}).`);
