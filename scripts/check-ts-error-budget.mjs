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
 * Third way to count nothing, found the hard way: the OS kills tsc. On a
 * memory-limited runner the compiler needs well over a gigabyte for this tree,
 * and when the kernel takes it the entire output is the word "Killed" - no
 * diagnostics, no config error, both lists empty, count 0. That run once
 * printed "BELOW the baseline by 1660 ... set it to 0". So the exit status is
 * checked as well as the output: tsc exits 0 clean and 1 with errors, and
 * anything else, or a signal, means the number is not a measurement.
 *
 * Classify config problems by WHERE the diagnostic is anchored, not by error code. The
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
// tsc's exit codes: 0 clean, 1 a CLI/internal failure, 2 diagnostics reported
// (the ordinary "your code has errors" case), 3 a project-reference config
// problem. Anything outside that set, or death by signal, means it did not
// finish - see the third-way-to-count-nothing note.
let status = 0;
let signal = null;
try {
  out = execSync('npx tsc --noEmit -p tsconfig.app.json', { cwd: root, encoding: 'utf8' });
} catch (e) {
  out = `${e.stdout || ''}${e.stderr || ''}`;
  status = typeof e.status === 'number' ? e.status : null;
  signal = e.signal || null;
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

// Third way to count nothing, and the one that actually happened: the OS kills
// tsc. On a memory-limited runner it needs well over a gigabyte for a tree this
// size, and when the kernel takes it the output is the single word "Killed" -
// no diagnostics, no config error. Both lists above come back empty, the count
// is 0, and the message below would have told the reader to set the baseline to
// 0. A run that did not finish is not a measurement.
//
// Be careful what counts as "did not finish": tsc exits 2, not 1, when it
// reports diagnostics, so a set that only allowed 0 and 1 rejected every
// ordinary failing run and would have failed the Type Check job on every push.
const RAN_TO_COMPLETION = new Set([0, 1, 2, 3]);
const finishedCleanly = signal === null && RAN_TO_COMPLETION.has(status);
// A nonzero status means tsc had something to say. Parsing none of it means the
// output was truncated or swallowed, which is not a clean tree either.
if (!finishedCleanly || (status !== 0 && count === 0)) {
  console.error(
    `::error::tsc did not complete (${signal ? `killed by ${signal}` : `exit status ${status}`}), ` +
      `so its output is not a measurement and has NOT been compared to the baseline - ` +
      `do not "lock in" whatever number it shows.`,
  );
  console.error('');
  console.error(out.trim().split('\n').slice(-10).join('\n') || '(no output)');
  console.error('');
  console.error(
    '  A bare "Killed" is the out-of-memory killer. Give the compiler more room, e.g. ' +
      'NODE_OPTIONS=--max-old-space-size=6144, and run it again.',
  );
  process.exit(1);
}

console.log(`TypeScript errors: ${count} (baseline ${baseline})`);

if (count > baseline) {
  console.error(
    `::error::TypeScript errors (${count}) exceed the baseline (${baseline}) - a regression. ` +
      `Fix the new errors, or (if the increase is genuinely intended) raise ` +
      `.github/ts-error-baseline.txt and say why in the commit.`,
  );
  // Name them. A count on its own sends the reader off to reproduce a 35-minute
  // compile just to find out WHICH file moved, and this tree is slow enough
  // that doing so locally is not always possible. Grouping by file puts the
  // likely culprit first: a regression is nearly always concentrated in the
  // handful of files the change touched.
  const byFile = new Map();
  for (const line of out.split('\n')) {
    const m = /^(.*?)\((\d+),(\d+)\): error (TS\d+): (.*)$/.exec(line.trim());
    if (!m) continue;
    const [, file, lineNo, , code, message] = m;
    if (!byFile.has(file)) byFile.set(file, []);
    byFile.get(file).push(`    ${file}:${lineNo}  ${code}  ${message.slice(0, 140)}`);
  }
  const ranked = [...byFile.entries()].sort((a, b) => a[1].length - b[1].length);
  console.error('');
  console.error(`  ${byFile.size} file(s) carry errors. Fewest-first, because a new`);
  console.error('  regression usually sits alone in a file the change touched:');
  console.error('');
  for (const [, lines] of ranked.slice(0, 15)) console.error(lines.slice(0, 3).join('\n'));
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
