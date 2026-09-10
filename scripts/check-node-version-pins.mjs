#!/usr/bin/env node
/**
 * One source of truth for the Node version: .nvmrc.
 *
 * Every workflow used to hardcode `node-version: 18` while .nvmrc said
 * 20.18.0. Nothing reconciled them, so CI ran Node 18 against vitest 4, whose
 * rolldown dependency imports `styleText` from node:util - added in Node
 * 20.12. Unit Tests and Security Smoke Tests died at import in under a second
 * on every push to main, which is not a signal anyone reads as "the tests
 * failed".
 *
 * The floor is not arbitrary and it is not hardcoded: it is read from
 * rolldown's own `engines` in package-lock.json, because rolldown is the
 * strictest link in the chain and it fails in the least obvious way.
 *
 * The first version of this guard hardcoded 20.12.0, reasoning from
 * `node:util.styleText` alone, and .nvmrc was pinned to 20.18.0. rolldown 1.1.5
 * declares `^20.19.0 || >=22.12.0`, so 20.18.0 satisfies neither branch - and
 * its native binding is an OPTIONAL dependency, which npm SKIPS on an engine
 * mismatch rather than failing. `npm ci` therefore succeeded, and vitest died
 * at run time with "Cannot find module '../rolldown-binding.linux-x64-gnu.node'".
 * Local runs on Node 22 were unaffected, so it only showed up in CI.
 *
 * Deriving the floor means the next rolldown bump moves this guard with it
 * instead of silently reopening the same hole.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export const parse = (v) =>
  v.trim().replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);

export const gte = (a, b) => {
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return true;
};

/**
 * The lowest version a single semver comparator admits, or null if it sets no
 * lower bound.
 *
 * Upper bounds must not be read as minimums. Matching every version triplet in
 * the range and taking the largest looks right against `^20.19.0 || >=22.12.0`
 * and is wrong the moment rolldown publishes a range with a ceiling: for
 * `>=20.19.0 <23.0.0` it yields 23.0.0, so the guard would reject Node 22.12.0,
 * which satisfies that range perfectly, and block CI until someone edited this
 * file. Caught in review on #200 before it could happen.
 *
 * Hand-rolled rather than pulling in semver: this runs in the pre-commit hook
 * on every commit, and semver is only present transitively here - not declared
 * in package.json - so depending on it would make the hook hostage to an
 * unrelated lockfile change. The comparator grammar in an `engines` field is
 * small enough to read directly.
 */
export function comparatorMinimum(comparator) {
  const m = /^(>=|>|\^|~|<=|<|=)?\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(comparator.trim());
  if (!m) return null;
  const [, op, major, minor, patch] = m;
  // `<` and `<=` cap the range; they say nothing about how low it goes.
  if (op === '<' || op === '<=') return null;
  return [+major, +(minor ?? 0), +(patch ?? 0)];
}

/**
 * Lowest Node this toolchain actually runs on, read from rolldown's engines in
 * the lockfile.
 *
 * The range is a disjunction (`^20.19.0 || >=22.12.0`). Each branch is ANDed
 * comparators, so a branch's minimum is the highest lower bound it carries;
 * across branches we then take the HIGHEST of those, which is stricter than
 * semver requires on purpose. A pin chosen that way satisfies the range no
 * matter which major it lands on, and it matches the single `>=` floor
 * package.json declares - one number for a human to reason about rather than a
 * disjunction. Falls back to a known-good floor if the shape changes.
 */
export function rolldownFloor(rangeOverride) {
  const FALLBACK = [22, 12, 0];
  try {
    const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
    const range =
      rangeOverride ?? lock.packages?.['node_modules/rolldown']?.engines?.node;
    if (!range) return FALLBACK;

    const branchMinimums = range
      .split('||')
      .map((branch) =>
        branch
          .trim()
          .split(/\s+/)
          .map(comparatorMinimum)
          .filter(Boolean)
          .reduce((a, b) => (a === null || gte(b, a) ? b : a), null)
      )
      .filter(Boolean);

    if (!branchMinimums.length) return FALLBACK;
    return branchMinimums.reduce((a, b) => (gte(a, b) ? a : b));
  } catch {
    return FALLBACK;
  }
}

/**
 * Only runs when this file is executed, not when it is imported. The parser
 * above is unit-tested (src/lib/__tests__/nodeVersionPins.test.ts), and an
 * import that exited the process would take the test runner with it.
 */
function main() {
  const FLOOR = rolldownFloor();

  const problems = [];

  const nvmrc = parse(readFileSync(join(root, '.nvmrc'), 'utf8'));
  if (!gte(nvmrc, FLOOR)) {
    problems.push(
      `.nvmrc pins ${nvmrc.join('.')}, below the ${FLOOR.join('.')} rolldown declares. ` +
        `npm skips its optional native binding on an engine mismatch, so install succeeds and ` +
        `vitest dies at run time on a missing rolldown-binding.`
    );
  }

  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const engines = pkg.engines?.node ?? '';
  const enginesFloor = parse(engines.replace(/^[^\d]*/, ''));
  if (!gte(enginesFloor, FLOOR)) {
    problems.push(
      `package.json engines.node is "${engines}", which permits a Node older than ${FLOOR.join('.')}`
    );
  }
  if (!gte(nvmrc, enginesFloor)) {
    problems.push(`.nvmrc (${nvmrc.join('.')}) is below engines.node ("${engines}")`);
  }

  const wfDir = join(root, '.github', 'workflows');
  for (const file of readdirSync(wfDir).filter((f) => /\.ya?ml$/.test(f))) {
    const lines = readFileSync(join(wfDir, file), 'utf8').split('\n');
    lines.forEach((line, i) => {
      // `node-version:` hardcodes a version; `node-version-file:` reads .nvmrc.
      if (/^\s*node-version:/.test(line)) {
        problems.push(
          `.github/workflows/${file}:${i + 1} hardcodes ${line.trim()} - use ` +
            `node-version-file: '.nvmrc' instead`
        );
      }
    });
  }

  if (problems.length) {
    console.error('::error::Node version pins disagree:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }

  console.log(`Node version pins agree (.nvmrc ${nvmrc.join('.')}, engines "${engines}", workflows read .nvmrc).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
