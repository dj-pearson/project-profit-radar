#!/usr/bin/env node
/**
 * Guard: a link like /projects/new must not be swallowed by /projects/:id.
 *
 * check-dead-links.mjs (US-312) asks whether some route answers a path. That
 * question has a structural blind spot: a path answered by the WRONG route
 * looks exactly like one answered correctly. /projects/new declares no route of
 * its own, but /projects/:projectId matches it, so the dead-link guard counts
 * it answered and says nothing - while the "New Project" button opens the
 * project DETAIL page for a project whose id is the string "new". The detail
 * page then queries a project with that id, gets a uuid parse error, and
 * renders its not-found branch. The user clicks Create and is told the thing
 * does not exist.
 *
 * This happened twice before it was noticed. /projects/new was offered by the
 * command palette, both keyboard-shortcut hooks, RoleDashboard and Dashboard;
 * /crm/leads/new by the CRM leads tab. Neither could be found by looking for
 * unanswered paths, because both were answered.
 *
 * The recognisable shape is narrow on purpose: the final segment is an action
 * word, and every route that matches the path has a :param in that position. A
 * real static route for the action (/projects/:id/tasks/new, say) clears it,
 * which is what makes this safe to enforce rather than advisory.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Known traps that survive only in code nothing imports. BusinessDashboard is
 * unreachable from src/main.tsx (US-314) and is a deletion candidate, so
 * repointing its buttons would be maintaining code that does not ship.
 */
const BASELINE = new Map([
  [
    '/projects/new',
    'Three buttons in components/dashboard/BusinessDashboard.tsx, which nothing imports - it is ' +
      'in the US-314 unreferenced set awaiting a delete-or-wire decision. Every reachable caller ' +
      'was repointed to /create-project; these are left because fixing unreachable code makes it ' +
      'look maintained.',
  ],
]);

const ACTION = /^(new|create|add|edit|import|export|settings|bulk)$/i;

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = walk(join(root, 'src')).filter(
  (f) => !f.includes('__tests__') && !f.includes('pentest.config'),
);

const routes = new Set();
for (const f of files.filter((f) => f.endsWith('.tsx'))) {
  for (const m of readFileSync(f, 'utf8').matchAll(/<Route\b((?:[^>]|\n)*?)\/?>/g)) {
    const pm = /path=\{?["'`]([^"'`]+)["'`]/.exec(m[1]);
    if (pm) routes.add(pm[1]);
  }
}
if (routes.size < 20) {
  console.error(`✖ Only ${routes.size} routes parsed - the <Route> matcher is broken. Fix it`);
  console.error('  before trusting a pass from this guard.');
  process.exit(1);
}
const shapes = [...routes].filter((r) => r !== '*').map((r) => ({ raw: r, seg: r.split('/') }));

const links = new Map();
for (const f of files) {
  readFileSync(f, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      for (const m of line.matchAll(
        /(?:navigate|href=|to=|(?:url|path|route|to)\s*:)\s*[({]?\s*['"`](\/[A-Za-z0-9/_-]*)['"`]/g,
      )) {
        const p = m[1];
        if (!links.has(p)) links.set(p, []);
        links.get(p).push(`${relative(root, f)}:${i + 1}`);
      }
    });
}

const traps = [];
for (const [path, sites] of links) {
  const parts = path.split('/');
  const last = parts[parts.length - 1];
  if (!ACTION.test(last)) continue;
  const matching = shapes.filter(
    (s) =>
      s.seg.length === parts.length &&
      s.seg.every((x, i) => x.startsWith(':') || x === '*' || x === parts[i]),
  );
  // No match at all is a plain dead link - check-dead-links.mjs owns that.
  if (matching.length === 0) continue;
  // A route naming the action segment literally is the correct answer.
  if (matching.some((s) => s.seg[s.seg.length - 1] === last)) continue;
  traps.push({ path, via: matching.map((s) => s.raw), sites });
}

const unexpected = traps.filter((t) => !BASELINE.has(t.path));
const stale = [...BASELINE.keys()].filter((p) => !traps.some((t) => t.path === p));

console.log('Param-route trap guard (US-312 follow-up)');
console.log(`  routes declared:            ${routes.size}`);
console.log(`  action paths a :param eats: ${traps.length} (baseline ${BASELINE.size})`);
for (const t of traps) {
  console.log(`    [${BASELINE.has(t.path) ? 'known' : 'NEW'}] ${t.path} -> ${t.via.join(', ')}`);
  for (const s of t.sites.slice(0, 3)) console.log(`        ${s}`);
}

if (unexpected.length) {
  console.error('\n✖ These links resolve to a route that was not meant to answer them:');
  for (const t of unexpected) {
    console.error(`    ${t.path} falls through to ${t.via.join(', ')}`);
    for (const s of t.sites) console.error(`        ${s}`);
  }
  console.error('\n  The page will load and be wrong, which is why no dead-link check finds it -');
  console.error('  the detail view renders for a record whose id is the literal word above.');
  console.error('  Point the link at the real page, or declare a route for the action segment.');
  process.exit(1);
}

if (stale.length) {
  console.error(`\n✖ ${stale.length} baselined trap(s) no longer exist: ${stale.join(', ')}`);
  console.error('  Remove them from BASELINE - a baseline that only shrinks has to be lowered');
  console.error('  by the change that earned it.');
  process.exit(1);
}

console.log(`\n✔ No new links swallowed by a :param route (${BASELINE.size} in the backlog).`);
