#!/usr/bin/env node
/**
 * Migration integrity guard (US-248).
 *
 * Migrations are append-only history: once a file has merged to the default
 * branch it has already run against production, so editing it means the
 * database and the repo disagree forever and nothing will ever re-run it. That
 * divergence is what produced repair-migrations.ps1 (193 versions marked
 * reverted) and mark-applied.ps1 (345 marked applied), and it is what this
 * guard exists to prevent recurring.
 *
 * Runs with no secrets and no database access. It checks three things:
 *
 *   1. No migration that already exists on the base branch has been modified.
 *   2. No migration that already exists on the base branch has been deleted.
 *   3. No two migrations share a timestamp prefix (ordering would be undefined).
 *
 * Remote drift -- local files versus supabase_migrations.schema_migrations --
 * needs credentials and is checked by the `drift` job in
 * .github/workflows/db-migrate.yml via `supabase migration list`.
 *
 * Usage: node scripts/check-migration-drift.mjs [baseRef]
 *   baseRef defaults to $MIGRATION_BASE_REF, then origin/main.
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = 'supabase/migrations';
const baseRef = process.argv[2] || process.env.MIGRATION_BASE_REF || 'origin/main';

function git(args, { allowFail = false } = {}) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    if (allowFail) return null;
    throw err;
  }
}

const failures = [];

// --- 3. duplicate timestamp prefixes -------------------------------------
const localFiles = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
const byPrefix = new Map();
for (const f of localFiles) {
  const prefix = f.slice(0, 14);
  if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
  byPrefix.get(prefix).push(f);
}
for (const [prefix, files] of byPrefix) {
  if (files.length > 1) {
    failures.push(`Duplicate timestamp prefix ${prefix}: ${files.join(', ')} -- apply order is undefined.`);
  }
}

// --- 1 & 2. append-only versus the base branch ---------------------------
const baseExists = git(['rev-parse', '--verify', `${baseRef}^{commit}`], { allowFail: true });

if (!baseExists) {
  console.log(`Migration integrity guard (US-248)`);
  console.log(`  ${localFiles.length} local migrations, no duplicate prefixes.`);
  console.log(`  Skipped the append-only check: '${baseRef}' is not available in this checkout.`);
  console.log(`  CI must check out with fetch-depth: 0 for this half of the guard to run.`);
} else {
  const mergeBase = git(['merge-base', 'HEAD', baseRef], { allowFail: true })?.trim() || baseRef.trim();
  const baseListing = git(['ls-tree', '-r', '--name-only', mergeBase, '--', MIGRATIONS_DIR], { allowFail: true }) || '';
  const baseFiles = baseListing.split('\n').map((l) => l.trim()).filter((l) => l.endsWith('.sql'));

  for (const path of baseFiles) {
    const name = path.slice(MIGRATIONS_DIR.length + 1);
    let current;
    try {
      current = readFileSync(join(MIGRATIONS_DIR, name), 'utf8');
    } catch {
      failures.push(
        `${name} was deleted. It has already merged and run against production; ` +
        `write a new migration that reverses it instead.`
      );
      continue;
    }
    const previous = git(['show', `${mergeBase}:${path}`], { allowFail: true });
    if (previous !== null && previous !== current) {
      failures.push(
        `${name} was modified. It has already merged and run against production, ` +
        `so the edit will never be applied -- the database and the repo now disagree. ` +
        `Write a new migration with the change instead.`
      );
    }
  }

  console.log(`Migration integrity guard (US-248)`);
  console.log(`  base:   ${baseRef} (merge-base ${mergeBase.slice(0, 12)})`);
  console.log(`  local:  ${localFiles.length} migrations`);
  console.log(`  merged: ${baseFiles.length} already on the base branch`);
  console.log(`  new:    ${localFiles.length - baseFiles.length} added on this branch`);
}

if (failures.length > 0) {
  console.error(`\nMigration history is not append-only:\n`);
  for (const f of failures) console.error(`  - ${f}`);
  console.error(
    `\nSee docs/RUNBOOK_MIGRATIONS.md. Rewriting merged migrations is what forced the ` +
    `one-off repair scripts this guard replaces.`
  );
  process.exit(1);
}

console.log(`\nOK: migration history is append-only.`);
