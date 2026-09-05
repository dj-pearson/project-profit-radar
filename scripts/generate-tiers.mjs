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
import { readFileSync, writeFileSync } from 'node:fs';
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
  console.log('✔ Tier definition is in sync (one source, one generated copy).');
} else {
  writeFileSync(TARGET, wanted);
  console.log(`✔ Wrote ${TARGET.replace(root + '/', '')} from the shared source.`);
}
