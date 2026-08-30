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
 *
 * Second way to count nothing, and the reason for the config-diagnostic check
 * below: if tsc rejects the CONFIG it exits before compiling a single file, and
 * the run still produces one `error TS` line to count. TypeScript 6 makes
 * `baseUrl` a hard error (TS5101) and tsconfig.app.json uses baseUrl, so any
 * route to a TS6 binary turns this whole gate into a single diagnostic. The
 * easiest such route is having no node_modules at all: `npx tsc` then finds no
 * local install and fetches the latest TypeScript from the registry, which is
 * how this was found. Counting that naively gives 1, which is BELOW any real
 * baseline, and the message this script used to print in that case told the
 * reader to set the baseline to 1 - one copy-paste from disabling the gate
 * permanently while looking like the biggest cleanup in the project's history.
 * A config diagnostic is not a count, so it aborts with its own message instead
 * of being compared to the baseline at all.
 *
 * Classify those by WHERE the diagnostic is anchored, not by error code. The
 * first version of this check matched the code ranges TS5xxx and TS6xxx, which
 * is wrong: TS6xxx is a mixed range holding both config errors (TS6053 file not
 * found) and ordinary source diagnostics, and TS6133 "declared but never read"
 * alone accounts for 136 errors in this tree. That check aborted on every run.
 * A config diagnostic is instead one that is anchored to a tsconfig file, or to
 * no file at all - a source diagnostic always carries a `path(line,col):`
 * prefix naming a .ts/.tsx file, because it was found while compiling one.
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

// Config-level diagnostics mean tsc never compiled anything - see the header.
// Anchoring decides it: a source diagnostic names the source file it was found
// in, so anything anchored to a tsconfig or to no file at all was raised before
// compilation started, and the error count from that run is meaningless.
const DIAGNOSTIC = /^(?:(.*?)\((\d+),(\d+)\): )?error (TS\d+):/;
const sourceErrors = [];
const configProblems = [];
for (const line of out.split('\n')) {
  const m = DIAGNOSTIC.exec(line.trim());
  if (!m) continue;
  const [, file, , , code] = m;
  if (file && /\.(ts|tsx|mts|cts|js|jsx)$/i.test(file)) sourceErrors.push(code);
  else configProblems.push(file ? `${code} in ${file}` : code);
}

if (configProblems.length) {
  console.error(
    `::error::tsc rejected the configuration (${[...new Set(configProblems)].join(', ')}), so it exited ` +
      `before compiling any source file. The error count from this run is not a measurement ` +
      `and has NOT been compared to the baseline - do not "lock in" whatever number it shows.`,
  );
  console.error('');
  console.error(out.trim().split('\n').slice(0, 10).join('\n'));
  console.error('');
  console.error(
    '  Usually this means dependencies are not installed, so `npx` fetched the latest ' +
      'TypeScript instead of the version package-lock.json pins. Run `npm ci` and try again.',
  );
  process.exit(1);
}

const count = sourceErrors.length;
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
