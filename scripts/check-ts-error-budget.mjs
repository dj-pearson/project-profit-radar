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
 * A config diagnostic is not a count, so it now aborts with its own message
 * instead of being compared to the baseline at all.
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
// TS5xxx is the command-line/config range, TS6xxx covers missing files and bad
// project references, and TS18003 is "no inputs found". Any of them makes the
// error count meaningless rather than low.
const CONFIG_DIAGNOSTIC = /error (TS5\d{3}|TS6\d{3}|TS18003)\b/g;
const configProblems = [...new Set(out.match(CONFIG_DIAGNOSTIC) || [])];
if (configProblems.length) {
  console.error(
    `::error::tsc rejected the configuration (${configProblems.join(', ')}), so it exited ` +
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
