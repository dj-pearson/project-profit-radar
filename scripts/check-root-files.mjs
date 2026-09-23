#!/usr/bin/env node
/**
 * Repo-root and stray-SQL guard (US-396).
 *
 * The root held 285 loose files before US-396: ~150 status reports, debug SQL
 * (one hardcoding a production user id), throwaway HTML, captured console
 * output, history-rewriting PowerShell and a dead Cloudflare proxy. None of it
 * reached dist/, so nothing failed, and each new one made the next look normal.
 *
 * Two rules:
 *   1. Every file at the repo root is on ROOT_ALLOWLIST. Docs go in docs/
 *      (retired ones in docs/archive/, listed in docs/archive/INDEX.md), images
 *      in media/ or public/, one-off scripts in scripts/ or nowhere.
 *   2. No *.sql outside supabase/, except the few reviewed scripts in
 *      SQL_OUTSIDE_SUPABASE. The root FIX_/HOTFIX_ files duplicated later
 *      migrations: a fix that lives in a loose file is either already a
 *      migration (so the file is noise) or never ran through one (so the
 *      schema drifted and the repo does not say so). Either way it belongs in
 *      supabase/migrations/.
 *
 * Checks tracked files plus untracked, non-ignored ones, so a new file fails
 * here before `git add` rather than after. Paths missing from disk are skipped
 * (a deletion in progress is the fix, not the problem).
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

/** Files the toolchain, deploy or agents need at the root. Keep it short. */
const ROOT_ALLOWLIST = new Set([
  // dotfiles
  '.dockerignore',
  '.easignore',
  '.gitignore',
  '.infisical.json',
  '.mcprc.example',
  '.npmrc',
  '.nvmrc',
  '.prettierignore',
  '.prettierrc',
  // docs that must stay at the root
  'CLAUDE.md',
  'README.md',
  'START_HERE.md',
  // build, test and deploy config
  'Dockerfile',
  'capacitor.config.ts',
  'components.json',
  'deno.lock',
  'env.example',
  'eslint.config.js',
  'index.html',
  'lighthouserc.cjs',
  'package-lock.json',
  'package.json',
  'playwright.config.ts',
  'playwright.screenshots.config.ts',
  'postcss.config.js',
  'tailwind.config.ts',
  'tsconfig.app.json',
  'tsconfig.json',
  'tsconfig.node.json',
  'vite.config.mobile.ts',
  'vite.config.ts',
  'vitest.config.ts',
  'wrangler.toml',
  // Ralph agent loop state (scripts/ralph reads these from the root)
  'prd-additions.json',
  'prd.json',
  'progress.txt',
]);

/** Reviewed SQL that is not a migration. Adding here needs a reason. */
const SQL_OUTSIDE_SUPABASE = new Set([
  'scripts/rollback-sql/ROLLBACK_multi_tenant.sql',
  'scripts/rollback-sql/ROLLBACK_multi_tenant_CLEANUP.sql',
  'scripts/test-company-creation-rls.sql',
  'scripts/test-multi-tenant-rls.sql',
  'scripts/test-onboarding-rls.sql',
  'scripts/verify-tenant-isolation.sql',
]);

function list(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
      .split('\n')
      .filter(Boolean);
  } catch (e) {
    console.error(`::error::check-root-files: '${cmd}' failed: ${e.message}`);
    process.exit(1);
  }
}

const files = [
  ...new Set([
    ...list('git ls-files'),
    ...list('git ls-files --others --exclude-standard'),
  ]),
].filter((f) => existsSync(f));

const strayRoot = files.filter((f) => !f.includes('/') && !ROOT_ALLOWLIST.has(f));
const straySql = files.filter(
  (f) => /\.sql$/i.test(f) && !f.startsWith('supabase/') && !SQL_OUTSIDE_SUPABASE.has(f),
);

let failed = false;

if (strayRoot.length) {
  failed = true;
  console.error('FAIL: Files at the repo root that are not on the allowlist:');
  for (const f of strayRoot) console.error(`   - ${f}`);
  console.error(
    '\n  Docs go in docs/ (retired ones in docs/archive/ with a line in docs/archive/INDEX.md),',
  );
  console.error('  images in media/ or public/, scripts in scripts/. If a tool genuinely needs the');
  console.error('  file at the root, add it to ROOT_ALLOWLIST in scripts/check-root-files.mjs.');
}

if (straySql.length) {
  failed = true;
  if (strayRoot.length) console.error('');
  console.error('FAIL: SQL outside supabase/:');
  for (const f of straySql) console.error(`   - ${f}`);
  console.error('\n  Schema changes are migrations: supabase/migrations/YYYYMMDDHHMMSS_name.sql.');
  console.error('  A debug query you ran once does not need committing. A reviewed non-migration');
  console.error('  script goes in scripts/ and on SQL_OUTSIDE_SUPABASE in scripts/check-root-files.mjs.');
}

if (failed) process.exit(1);

console.log(
  `OK: Repo root holds only allowlisted files (${files.filter((f) => !f.includes('/')).length}); no stray SQL outside supabase/.`,
);
