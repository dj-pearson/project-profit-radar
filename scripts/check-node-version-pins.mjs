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
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Lowest Node this toolchain actually runs on, read from rolldown's engines in
 * the lockfile. Its range is a disjunction (`^20.19.0 || >=22.12.0`); we take
 * the HIGHEST branch minimum, so a single pin satisfies the constraint whatever
 * major it lands on. Falls back to a known-good floor if the shape changes.
 */
function rolldownFloor() {
  const FALLBACK = [22, 12, 0];
  try {
    const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
    const pkg = lock.packages?.['node_modules/rolldown'];
    const range = pkg?.engines?.node;
    if (!range) return FALLBACK;
    const mins = [...range.matchAll(/(\d+)\.(\d+)\.(\d+)/g)].map((m) => [+m[1], +m[2], +m[3]]);
    if (!mins.length) return FALLBACK;
    return mins.reduce((a, b) => (gte(a, b) ? a : b));
  } catch {
    return FALLBACK;
  }
}

const parse = (v) => v.trim().replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
const gte = (a, b) => {
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return true;
};

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
