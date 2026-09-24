#!/usr/bin/env node
/**
 * Copy the one tier definition into somewhere the web build can import it.
 *
 * TIER_LIMITS was declared twice, with a comment on one copy asking whoever
 * changed it to remember the other. A comment is not a mechanism, and the two
 * had already drifted in spirit: the marketing copy advertises 25 projects for
 * Professional while both code copies enforced 50.
 *
 * Deno cannot import from src/ (an edge function importing it would not
 * deploy), and tsconfig.app.json includes only src/, so the web side cannot
 * import the shared file directly either. The direction is forced. What is not
 * forced is having two hand-maintained copies, so this generates one from the
 * other and check-tiers-in-sync.mjs fails when they diverge.
 *
 *   node scripts/generate-tiers.mjs          # write the generated file
 *   node scripts/generate-tiers.mjs --check  # fail if it is stale
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(root, 'supabase', 'functions', '_shared', 'tiers.ts');
const TARGET = join(root, 'src', 'lib', 'tiers.generated.ts');

const HEADER = `/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Source: supabase/functions/_shared/tiers.ts
 * Regenerate: node scripts/generate-tiers.mjs
 *
 * Edit the source. scripts/check-tiers-in-sync.mjs fails if this copy has
 * drifted, so an edit here is reverted by the next run rather than kept.
 */
`;

function generate() {
  const source = readFileSync(SOURCE, 'utf8');
  // Strip the source's own docblock: it explains why the source exists, which
  // is not what a reader of the generated copy needs.
  const body = source.replace(/^\/\*\*[\s\S]*?\*\/\n/, '');
  return HEADER + body;
}

/**
 * SQL mirrors (US-335). A storage policy cannot import TypeScript, so a few
 * values from tiers.ts are restated in SQL functions. Each migration is
 * append-only history, so the check reads the LATEST migration that defines
 * each function: changing a limit means a new migration in the same commit.
 */
function sqlMirrorProblems(source) {
  const problems = [];
  const num = (re, what) => {
    const m = source.match(re);
    if (!m) problems.push(`tiers.ts: could not find ${what}`);
    return m ? m[1] : null;
  };
  const storage = {};
  for (const tier of ['starter', 'professional', 'enterprise']) {
    storage[tier] = num(new RegExp(`${tier}:\\s*\\{[^}]*storage:\\s*(-?\\d+)`), `TIER_LIMITS.${tier}.storage`);
  }
  const grace = num(/GRACE_PERIOD_DAYS\s*=\s*(\d+)/, 'GRACE_PERIOD_DAYS');
  const trial = num(/TRIAL_LENGTH_DAYS\s*=\s*(\d+)/, 'TRIAL_LENGTH_DAYS');

  const dir = join(root, 'supabase', 'migrations');
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const latestBody = (fn) => {
    for (const f of [...files].reverse()) {
      const sql = readFileSync(join(dir, f), 'utf8');
      const at = sql.search(new RegExp(`CREATE OR REPLACE FUNCTION public\\.${fn}\\(`));
      if (at === -1) continue;
      const end = sql.indexOf('$$;', at);
      return { file: f, body: sql.slice(at, end === -1 ? undefined : end) };
    }
    return null;
  };

  const expect = (fn, needles) => {
    const found = latestBody(fn);
    if (!found) {
      problems.push(`no migration defines public.${fn}`);
      return;
    }
    for (const [needle, what] of needles) {
      if (!found.body.includes(needle)) {
        problems.push(`${found.file}: public.${fn} does not contain ${needle} (${what})`);
      }
    }
  };

  expect('tier_storage_limit_gb', Object.entries(storage).map(([tier, gb]) =>
    [`WHEN '${tier}' THEN ${gb}`, `TIER_LIMITS.${tier}.storage`]));
  expect('company_account_read_only', [[`interval '${grace} days'`, 'GRACE_PERIOD_DAYS']]);
  expect('prevent_billing_state_self_service', [[`interval '${trial} days'`, 'TRIAL_LENGTH_DAYS']]);
  return problems;
}

const wanted = generate();
const check = process.argv.includes('--check');

if (check) {
  let actual = '';
  try {
    actual = readFileSync(TARGET, 'utf8');
  } catch {
    console.error('\n❌ src/lib/tiers.generated.ts is missing. Run: node scripts/generate-tiers.mjs\n');
    process.exit(1);
  }
  if (actual !== wanted) {
    console.error(
      '\n❌ src/lib/tiers.generated.ts has drifted from ' +
      'supabase/functions/_shared/tiers.ts.\n' +
      '   Edit the source, then run: node scripts/generate-tiers.mjs\n' +
      '   Two copies of what a plan includes is how a customer gets billed for ' +
      'one thing and given another.\n'
    );
    process.exit(1);
  }
  const problems = sqlMirrorProblems(readFileSync(SOURCE, 'utf8'));
  if (problems.length) {
    console.error(
      '\n❌ A SQL mirror of supabase/functions/_shared/tiers.ts disagrees with it:\n' +
      problems.map((p) => `   - ${p}`).join('\n') +
      '\n   Add a migration that redefines the function with the new value.\n'
    );
    process.exit(1);
  }
  console.log('✔ Tier definition is in sync (one source, one generated copy, SQL mirrors match).');
} else {
  writeFileSync(TARGET, wanted);
  console.log(`✔ Wrote ${TARGET.replace(root + '/', '')} from the shared source.`);
}
