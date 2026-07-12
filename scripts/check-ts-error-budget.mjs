#!/usr/bin/env node
/**
 * US-258: TypeScript error-budget ratchet.
 *
 * The strict-mode backlog (US-212) isn't zero yet, so a gate that requires a
 * fully-green `tsc` is red on every push and trains everyone to ignore CI.
 * Instead we ratchet: run tsc, count errors, and fail only if the count EXCEEDS
 * a committed baseline. New regressions fail; the existing backlog doesn't. As
 * US-212 burns errors down, lower .github/ts-error-baseline.txt so the ratchet
 * tightens. When it reaches 0, the gate becomes a real "tsc passes" gate.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const baselineFile = join(root, '.github', 'ts-error-baseline.txt');
const baseline = parseInt(readFileSync(baselineFile, 'utf8').trim(), 10);

let out = '';
try {
  out = execSync('npx tsc --noEmit -p tsconfig.app.json', { cwd: root, encoding: 'utf8' });
} catch (e) {
  out = `${e.stdout || ''}${e.stderr || ''}`;
}

const count = (out.match(/error TS\d+/g) || []).length;
console.log(`TypeScript errors: ${count} (baseline ${baseline})`);

if (count > baseline) {
  console.error(
    `::error::TypeScript errors (${count}) exceed the baseline (${baseline}) — a regression. ` +
      `Fix the new errors, or (if the increase is intentional) raise .github/ts-error-baseline.txt.`,
  );
  process.exit(1);
}

if (count < baseline) {
  console.log(
    `::notice::Nice — ${baseline - count} fewer errors than baseline. ` +
      `Lower .github/ts-error-baseline.txt to ${count} to lock in the progress (US-212).`,
  );
}
console.log(`✅ within TypeScript error budget.`);
