#!/usr/bin/env node
/**
 * US-312: every in-app path the UI navigates to must be answered by a route.
 *
 * react-router has a catch-all `<Route path="*">` at the end of the tree, so a
 * link to a path nothing declares does not throw, does not warn, and does not
 * show up in any test. It renders "Brikly / Page not found". Nothing in the
 * build can tell that apart from a page the user genuinely should not find,
 * which is why 34 of them accumulated - including the redirect SecureRoute
 * makes when it refuses a page, the sign-in redirect on the admin health page,
 * the upgrade CTA, and the page QuickBooks sends the user to two seconds after
 * telling them the connection succeeded.
 *
 * Only in-app paths are checked: anything starting with http, mailto, tel, #,
 * or a template placeholder is somebody else's to answer.
 *
 * Known limit: this counts <Route> elements wherever they are declared, not
 * where they are mounted. A route exported from src/routes/ and never composed
 * into allRoutes would still look answered here. Deciding that statically means
 * evaluating the JSX tree, so instead the test in
 * src/lib/__tests__/deadLinks.test.ts asserts that every route group, and the
 * access-denied route in particular, is actually inside allRoutes.
 *
 * BASELINE holds the paths that still have no route, each with why it is not a
 * one-line repoint. It only shrinks.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src');

/**
 * Paths the UI navigates to that no route answers. Each needs a decision about
 * whether the page should exist, not a different target, so none of them is a
 * repoint someone can just make.
 */
const BASELINE = new Map([
  ['/demo', 'Five "Schedule a Demo" CTAs (Implementation, StickyDemoCTA, PSEOPageRenderer and two more). There is no demo booking page; /contact is a general contact form and /admin/demos is the internal admin view. Sending demo intent to the contact form is a funnel decision, not a repoint.'],
  ['/demo-request', 'The exit-intent modal. Same decision as /demo, and the two should land in the same place once it is made.'],
  ['/deals', 'CRM dashboard "View All". The closest routes are /crm/opportunities and /crm/pipeline, and which one "deals" means is exactly the question US-276 (deals vs opportunities) exists to settle. Repointing now would bake in an answer.'],
  ['/deals/new', 'CRM dashboard. Same as /deals, and no route creates a deal - the closest pages open a dialog instead.'],
  ['/calls', 'CRM dashboard activity link. No calls page exists; the three CRM activity tables US-276 covers are where this belongs.'],
  ['/meetings', 'CRM dashboard activity link. Same as /calls.'],
  ['/bookings', 'CRM dashboard activity link. Same as /calls.'],
  ['/finance/bank-reconciliation', 'FinanceHub tile. Every other tile on that page has a route; this feature was never built.'],
  ['/admin/search-traffic-dashboard/settings', 'A settings link on the search-traffic dashboard, with no settings page behind it.'],
  ['/tools/budget-calculator', 'Linked from the construction budgeting guide. /tools exists as an index; this specific calculator does not.'],
  ['/tools/roi-calculator', 'Linked from the QuickBooks integration hub. Same as the budget calculator.'],
  ['/templates/budget-template', 'A downloadable template offered by the budgeting guide. No template delivery route exists.'],
  ['/templates/incident-report', 'Offered by the OSHA compliance guide. Same as above.'],
  ['/templates/safety-checklist', 'Offered by the OSHA compliance guide. Same as above.'],
  ['/topics/cost-and-profit-management', 'A topic hub linked from ConstructionManagementBasics. Two topic hubs exist (/topics/construction-management-basics, /topics/safety-and-osha-compliance); this one was linked before it was written.'],
  ['/topics/field-tracking-and-management', 'Linked from two topic pages. Same as above.'],
]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const FILES = walk(SRC).filter((f) => !f.includes('__tests__') && !f.includes(`${'/'}test${'/'}`));

// Every path a <Route> answers, including the multi-line form.
const routes = new Set();
for (const file of FILES.filter((f) => f.endsWith('.tsx'))) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/<Route\b((?:[^>]|\n)*?)\/?>/g)) {
    const pm = /path=\{?["'`]([^"'`]+)["'`]/.exec(m[1]);
    if (pm) routes.add(pm[1]);
  }
}

/** A route's segments, with :params and * as wildcards. */
const routeShapes = [...routes]
  .filter((r) => r !== '*')
  .map((r) => r.split('/').map((p) => (p.startsWith(':') || p === '*' ? '*' : p)));

function answered(path) {
  const parts = path.split('/');
  return routeShapes.some(
    (shape) => shape.length === parts.length && shape.every((p, i) => p === '*' || p === parts[i]),
  );
}

const links = new Map(); // path -> [ "file:line", ... ]
for (const file of FILES) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    // navigate('/x'), to="/x", href="/x". Only absolute in-app paths: a
    // template literal, an anchor, or an external URL is not ours to answer.
    for (const m of line.matchAll(/(?:navigate|href=|to=)\s*[({]?\s*['"`](\/[A-Za-z0-9/_-]*)['"`]/g)) {
      const path = m[1];
      if (!links.has(path)) links.set(path, []);
      links.get(path).push(`${relative(root, file)}:${i + 1}`);
    }
  });
}

const dead = [...links.keys()].filter((p) => !answered(p)).sort();
const unexpected = dead.filter((p) => !BASELINE.has(p));
const stale = [...BASELINE.keys()].filter((p) => !dead.includes(p)).sort();

console.log('Dead-link guard (US-312)');
console.log(`  in-app paths linked:  ${links.size}`);
console.log(`  routes declared:      ${routes.size}`);
console.log(`  no route answers:     ${dead.length} (baseline ${BASELINE.size})`);
for (const p of dead) {
  const mark = BASELINE.has(p) ? 'known' : 'NEW';
  console.log(`    [${mark}] ${p} - ${links.get(p).length} site(s): ${links.get(p).slice(0, 2).join(', ')}`);
}
console.log('');

if (stale.length) {
  console.error('❌ BASELINE lists paths that a route now answers, or that nothing links to:');
  for (const p of stale) console.error(`   - ${p}`);
  console.error('');
  console.error('The baseline only shrinks. Delete these entries from');
  console.error('scripts/check-dead-links.mjs so the guard keeps them fixed.');
  process.exit(1);
}

if (unexpected.length) {
  console.error(`❌ ${unexpected.length} path(s) linked from the UI that no route answers:`);
  for (const p of unexpected) {
    console.error(`   - ${p}`);
    for (const site of links.get(p)) console.error(`       ${site}`);
  }
  console.error('');
  console.error('react-router has a catch-all at the end of the tree, so this does');
  console.error('not throw or warn - it renders the 404 page, which reads as a');
  console.error('missing page rather than a broken link. Point the link at a route');
  console.error('that exists, or add the route.');
  process.exit(1);
}

console.log(`✅ ${links.size} in-app path(s) linked; all answered by a route or baselined (${BASELINE.size}).`);
