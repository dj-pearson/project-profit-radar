#!/usr/bin/env node
/**
 * US-258: TypeScript error-budget ratchet.
 *
 * The strict-mode backlog (US-212) isn't zero yet, so a gate that requires a
 * fully-green `tsc` is red on every push and trains everyone to ignore CI.
 * Instead we ratchet: run tsc, count errors, and require the count to MATCH a
 * committed baseline. New regressions fail; the existing backlog doesn't.
 *
 * The baseline has to be exact, not a ceiling. It sat at 1860 while the real
 * count was 669, so the gate had been quietly permitting 1191 new errors -
 * every fix since then widened the hole instead of closing it, because a
 * count below the ceiling only printed a suggestion nobody had to act on
 * (US-212). Requiring equality means the one-line update is part of the change
 * that earned it, which is the same rule every other baseline in scripts/
 * follows.
 *
 * Note for anyone running tsc by hand: use `-p tsconfig.app.json`. The root
 * tsconfig.json is a solution file - `"files": []` plus project references - so
 * `tsc --noEmit -p tsconfig.json` compiles zero source files and reports zero
 * errors no matter what is in src/.
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
    `::error::TypeScript errors (${count}) exceed the baseline (${baseline}) - a regression. ` +
      `Fix the new errors, or (if the increase is genuinely intended) raise ` +
      `.github/ts-error-baseline.txt and say why in the commit.`,
  );
  process.exit(1);
}

if (count < baseline) {
  console.error(
    `::error::TypeScript errors (${count}) are BELOW the baseline (${baseline}) by ` +
      `${baseline - count}. That is progress, and it has to be locked in: set ` +
      `.github/ts-error-baseline.txt to ${count}. A ceiling nobody lowers stops being a ` +
      `gate - this one drifted to 1860 against a real count of 669 and was permitting ` +
      `1191 new errors.`,
  );
  process.exit(1);
}

console.log(`✅ TypeScript errors match the baseline exactly (${count}).`);
