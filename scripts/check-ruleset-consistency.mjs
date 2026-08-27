#!/usr/bin/env node
/**
 * Ruleset/workflow consistency guard (US-213).
 *
 * A required status check that never runs blocks every merge into that branch,
 * forever, and it fails open-looking: the context sits in "Expected", which at a
 * glance resembles "pending". Two ways to cause it:
 *
 *   1. the required context does not match any job's `name:` in ci.yml;
 *   2. the protected branch is not in `on.pull_request.branches`, which filters
 *      on the BASE branch, so CI never runs on PRs into it.
 *
 * This checks both, from the files, so the mistake is caught before the ruleset
 * is applied rather than by a stuck PR afterwards.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const wf = join(root, '.github', 'workflows', 'ci.yml');
const rulesetDir = join(root, '.github', 'rulesets');

const yaml = readFileSync(wf, 'utf8');

// Job display names: the `name:` immediately under a top-level job key.
const jobNames = new Set();
const lines = yaml.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (/^ {2}[a-z0-9_-]+:\s*$/.test(lines[i])) {
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const m = lines[j].match(/^ {4}name:\s*(.+?)\s*$/);
      if (m) { jobNames.add(m[1].replace(/^['"]|['"]$/g, '')); break; }
      if (/^ {2}\S/.test(lines[j])) break;
    }
  }
}

// on.pull_request.branches — a flow list on one line, or a block list.
let prBranches = [];
const flow = yaml.match(/pull_request:[\s\S]*?branches:\s*\[([^\]]*)\]/);
if (flow) {
  prBranches = flow[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
}

const matchesFilter = (ref) =>
  prBranches.some((p) => {
    if (p === ref) return true;
    if (p.endsWith('/**')) return ref.startsWith(p.slice(0, -2));
    if (p.endsWith('*')) return ref.startsWith(p.slice(0, -1));
    return false;
  });

const problems = [];
let required = 0;
for (const f of readdirSync(rulesetDir).filter((f) => f.endsWith('.json'))) {
  const d = JSON.parse(readFileSync(join(rulesetDir, f), 'utf8'));
  const rule = (d.rules ?? []).find((r) => r.type === 'required_status_checks');
  if (!rule) continue;
  const contexts = rule.parameters.required_status_checks.map((c) => c.context);
  required += contexts.length;

  for (const c of contexts) {
    if (!jobNames.has(c)) {
      problems.push(`${f}: required context "${c}" matches no job name in ci.yml`);
    }
  }
  for (const ref of d.conditions?.ref_name?.include ?? []) {
    const branch = ref.replace(/^refs\/heads\//, '');
    if (!matchesFilter(branch)) {
      problems.push(`${f}: "${branch}" has required checks but is not in on.pull_request.branches — every merge into it would block`);
    }
  }
}

console.log('Ruleset/workflow consistency guard (US-213)');
console.log(`  ci.yml job names:            ${[...jobNames].join(', ')}`);
console.log(`  on.pull_request.branches:    ${prBranches.join(', ')}`);
console.log(`  required check entries:      ${required}`);

if (problems.length) {
  console.error('\n✖ Ruleset would block merges:');
  for (const p of problems) console.error(`    - ${p}`);
  console.error(`  Fix the context name, or add the branch to on.pull_request.branches in ${relative(root, wf)}.`);
  process.exit(1);
}

console.log('\n✔ Every required check names a real job, and every protected branch runs CI.');
