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
 *
 * Empty since US-406, and it stays empty: a new dead link fails this guard
 * rather than joining a list. The last 25 were each given a build-or-delete
 * call - admin nav entries repointed at the routes that already serve them
 * (/admin/leads, /admin/demos, /admin/seo-management, /admin/funnels) or taken
 * out of the menu, marketing slugs pointed at their real pages, free tools and
 * templates that were never built stopped being offered, and the one tool that
 * was built (/tools/schedule-builder) got its public route. Adding an entry
 * back needs a reason of at least a sentence, and
 * src/lib/__tests__/deadLinks.test.ts will ask why the list grew.
 */
const BASELINE = new Map([]);

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

    // `url: '/x'` and friends, i.e. a destination held in an object rather than
    // written at a navigation site. Global search results, nav config entries
    // and quick-action sheets are all built this way, and matching only on
    // navigate/to=/href= could not see any of them. That blind spot was real:
    // the dashboard search returned contacts pointing at /crm-contacts and
    // documents pointing at /document-management, neither of which is a route,
    // and this guard reported the tree clean the whole time.
    // Two files hold `path:` values that are not links and never will be.
    // utils/lazyRoutes.tsx is a preload table keyed by route path - it declares
    // destinations rather than navigating to them - and config/pentest.config.ts
    // documents externally reachable endpoints for security testing. Reading
    // either as navigation produces noise, and a guard that cries wolf is one
    // people learn to skip. (pages/admin/ApiDocumentation.tsx was a third,
    // listing edge function endpoints; it was deleted as an unrouted duplicate
    // of the developer portal in US-296.)
    const declaresRatherThanLinks =
      /src[/\\](utils[/\\]lazyRoutes\.tsx|config[/\\]pentest\.config\.ts)$/.test(file);
    for (const m of declaresRatherThanLinks
      ? []
      : line.matchAll(/\b(?:url|path|href|route|to)\s*:\s*['"`](\/[A-Za-z0-9/_-]*)['"`]/g)) {
      const path = m[1];
      // Server endpoints are not react-router paths. These appear in API docs,
      // the pentest config and fetch() calls, and no <Route> will ever answer
      // them - flagging them would be noise that trains people to ignore this.
      if (/^\/(api|rest|functions|auth\/v1|storage\/v1)\//.test(path)) continue;
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
