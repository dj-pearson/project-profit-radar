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
 * The floor is not arbitrary: it is the oldest Node that can run this repo's
 * own test tooling. package.json engines has to agree, so a developer on an
 * older Node fails at `npm install` with a version message rather than at
 * `vitest run` with a SyntaxError about node:util.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Lowest Node that exports node:util styleText, which vitest 4 requires. */
const FLOOR = [20, 12, 0];

const parse = (v) => v.trim().replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
const gte = (a, b) => {
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return true;
};

const problems = [];

const nvmrc = parse(readFileSync(join(root, '.nvmrc'), 'utf8'));
if (!gte(nvmrc, FLOOR)) {
  problems.push(`.nvmrc pins ${nvmrc.join('.')}, below the ${FLOOR.join('.')} vitest 4 needs`);
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
