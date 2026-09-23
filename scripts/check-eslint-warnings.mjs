#!/usr/bin/env node
/**
 * US-400: ESLint error gate plus a warning ratchet.
 *
 * `npm run lint` printed 2,051 problems for weeks, 79 of them errors, and the
 * Lint job was red on main the whole time. Nobody read it, which is how
 * react-hooks/rules-of-hooks sat on the InvoiceList crash (US-363) unseen.
 * The errors are now at 0. The warnings are a backlog, not a signal, but a
 * backlog nobody counts only grows.
 *
 * So this runs `eslint .` once (the same scope as `npm run lint`), fails on
 * any error, and requires the warning count to MATCH
 * .github/eslint-warning-baseline.txt. Exact, not a ceiling, for the reason
 * check-ts-error-budget.mjs gives: a ceiling left at an old number quietly
 * permits every warning the fixes since then made room for. Up means new code
 * added warnings; down means someone fixed some and the baseline should be
 * lowered in the same change.
 *
 * A run that did not finish is not a count. ESLint exits 0 (clean), 1 (lint
 * errors) or 2 (config error / crash); anything else, a signal, an unreadable
 * report, or a report covering zero files aborts instead of being compared.
 *
 * Usage:
 *   node scripts/check-eslint-warnings.mjs            # run eslint, then check
 *   node scripts/check-eslint-warnings.mjs <report>   # check an existing
 *                                                     # `eslint -f json` report
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const baselineFile = join(root, '.github', 'eslint-warning-baseline.txt');
const baseline = parseInt(readFileSync(baselineFile, 'utf8').trim(), 10);

function abort(msg) {
  console.error(`\nFAIL: ${msg}`);
  console.error('  This is not a warning count; the baseline was not compared.');
  process.exit(1);
}

if (!Number.isInteger(baseline) || baseline < 0) {
  abort(`${relative(root, baselineFile)} does not hold a non-negative integer.`);
}

let reportPath = process.argv[2];
let tmp = null;
if (!reportPath) {
  tmp = mkdtempSync(join(tmpdir(), 'eslint-report-'));
  reportPath = join(tmp, 'report.json');
  const r = spawnSync('npx', ['eslint', '.', '-f', 'json', '-o', reportPath], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (r.signal || r.status === null) {
    abort(`eslint did not complete (killed by ${r.signal || 'unknown signal'}).`);
  }
  if (r.status !== 0 && r.status !== 1) {
    process.stderr.write(r.stdout || '');
    process.stderr.write(r.stderr || '');
    abort(`eslint did not complete (exit ${r.status}; 2 means a config error or crash).`);
  }
}

let report;
try {
  report = JSON.parse(readFileSync(reportPath, 'utf8'));
} catch (e) {
  abort(`could not read the eslint report at ${reportPath}: ${e.message}`);
} finally {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}
if (!Array.isArray(report) || report.length === 0) {
  abort('the eslint report covers zero files.');
}

let errors = 0;
let warnings = 0;
const errorLines = [];
const perRule = new Map();
const perFile = new Map();
for (const file of report) {
  const rel = relative(root, file.filePath).split('\\').join('/');
  for (const m of file.messages || []) {
    if (m.severity === 2) {
      errors++;
      errorLines.push(`  ${rel}:${m.line ?? 0}:${m.column ?? 0}  ${m.message}  ${m.ruleId || ''}`);
    } else if (m.severity === 1) {
      warnings++;
      const rule = m.ruleId || '(no rule)';
      perRule.set(rule, (perRule.get(rule) || 0) + 1);
      perFile.set(rel, (perFile.get(rel) || 0) + 1);
    }
  }
}

console.log('ESLint gate (US-400)');
console.log(`  files linted: ${report.length}`);
console.log(`  errors: ${errors}`);
console.log(`  warnings: ${warnings} (baseline ${baseline})`);

let failed = false;
if (errors > 0) {
  failed = true;
  console.error(`\nFAIL: ${errors} eslint error(s). Errors are never baselined:`);
  for (const l of errorLines) console.error(l);
}

const top = (map, n) => [...map].sort((a, b) => b[1] - a[1]).slice(0, n);
if (warnings > baseline) {
  failed = true;
  console.error(`\nFAIL: ${warnings - baseline} new eslint warning(s) above the baseline.`);
  console.error('  Fix them in the change that added them; run `npx eslint <file>` to see where.');
  console.error('\n  Warnings by rule:');
  for (const [rule, n] of top(perRule, 15)) console.error(`    ${String(n).padStart(5)}  ${rule}`);
  console.error('\n  Files with the most warnings:');
  for (const [rel, n] of top(perFile, 10)) console.error(`    ${String(n).padStart(5)}  ${rel}`);
} else if (warnings < baseline) {
  failed = true;
  console.error(`\nFAIL: warnings dropped to ${warnings}; set ${relative(root, baselineFile)}`);
  console.error(`  to ${warnings} in this change to lock the win in.`);
}

if (failed) process.exit(1);
console.log('\nOK: 0 errors, and warnings match the baseline exactly.');
