#!/usr/bin/env node
/**
 * US-315: every static route has a way in.
 *
 * This is the mirror of check-dead-links.mjs (US-312). That guard asks whether
 * every path the UI links to is answered by a route; this one asks whether
 * every route is linked to by something. react-router cares about neither
 * direction, so a page can be built, routed, and then sit there reachable only
 * by typing its URL. Ten of them were found that way once the hand-written
 * AppSidebar.tsx was deleted (US-314) and nothing else named them.
 *
 * A route counts as linked when its exact path appears as a string literal
 * anywhere under src/ outside the files that declare routes rather than link
 * to them (see NOT_LINKS), or after a template placeholder, as in
 * `${window.location.origin}/payment-success` - which is how OAuth and Stripe
 * return URLs are built.
 *
 * Skipped by design:
 *   - :param and * routes. A detail page is reached from its list with the id
 *     filled in at run time, and matching `/projects/${id}` against
 *     /projects/:projectId is the param-route guard's job, not this one's.
 *   - <Navigate> routes. A redirect is not a page; it exists for an old
 *     bookmark or a shipped deep link, and it is counted and printed so the
 *     number stays visible.
 *
 * Everything else nothing links to must be in EXEMPT with the place a user
 * actually arrives from. "Exempt" on its own is not an entry point.
 *
 * Known limits: a string literal in a comment counts as a link, and a link
 * from a component nothing renders still counts (the unreferenced-component
 * guard is what catches that component).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src');
const ROUTES_DIR = join(SRC, 'routes');

/**
 * Routes nothing in the app links to, each with its real entry point. The
 * list is exact: a route that gains a link, or stops being a route, has to be
 * taken off it, and a new unlinked route has to be put on it with a reason.
 */
const EXEMPT = new Map([
  // Return URLs: a third party sends the browser here.
  ['/auth/callback', 'OAuth/SSO return: supabase/functions/oauth-proxy redirects to FRONTEND_URL/auth/callback with the session token after the provider round trip.'],
  ['/checkout/success', 'Stripe Checkout return page. No function in this repo names it as success_url any more (create-stripe-checkout returns to /setup), so the only possible sender is a Payment Link or session configured in the Stripe dashboard; check there before deleting it.'],

  // Email entry points.
  ['/unsubscribe', 'Unsubscribe link in outgoing email: crm-email-automation builds https://brikly.net/unsubscribe?email=..., and send-scheduled-emails falls back to https://brikly.net/unsubscribe. Not a redirect because Navigate would drop the ?email= query.'],

  // Legal short aliases. Each renders the same page as a footer-linked
  // canonical path and is listed with it in docs/COMPLIANCE_AUDIT_2026-07.md.
  ['/aup', 'Short alias of /acceptable-use-policy (footer), for quoting in contracts and order forms.'],
  ['/cookies', 'Short alias of /cookie-policy (footer and cookie banner).'],
  ['/cancellation-policy', 'Alias of /refund-policy (footer), the name billing disputes and card networks ask for.'],
  ['/your-privacy-choices', 'Alias of /do-not-sell under the CCPA "Your Privacy Choices" link name, for opt-out requests that use that wording.'],
  ['/security', 'Short alias of /legal/security (footer), the URL security questionnaires and vendor reviews are pointed at.'],

  // Search entry points: listed in public/sitemap.xml, linked from no page.
  ['/resources/buildertrend-alternative-complete-guide', 'Search: listed in public/sitemap.xml. Not in CURATED_SECTIONS (src/components/blog/blogListing.ts) or any seoConfig relatedPages, so no page links it.'],
  ['/resources/construction-financial-management-ultimate-guide', 'Search: listed in public/sitemap.xml. Not in CURATED_SECTIONS (src/components/blog/blogListing.ts) or any seoConfig relatedPages, so no page links it.'],
]);

/**
 * Files that name paths without linking to them: the route declarations, the
 * access table, the lazy-route preload table, and two configs that enumerate
 * routes for testing. Counting any of them would make every route look linked.
 */
const NOT_LINKS = [
  /^src\/routes\//,
  /^src\/config\/routeConfig\.ts$/,
  /^src\/config\/pentest\.config\.ts$/,
  /^src\/utils\/lazyRoutes\.tsx$/,
  /^src\/tools\/automated-testing\//,
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const rel = (f) => relative(root, f).split('\\').join('/');
const isTest = (f) => /__tests__|[/\\]test[/\\]|\.test\.tsx?$/.test(f);

// Routes, from the files src/routes/index.tsx mounts.
const statics = new Map(); // path -> "file:line"
const redirects = new Set();
for (const file of walk(ROUTES_DIR).filter((f) => f.endsWith('.tsx') && !isTest(f))) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/<Route\b((?:[^>]|\n)*?)\/?>/g)) {
    const pm = /path=\{?["'`]([^"'`]+)["'`]/.exec(m[1]);
    if (!pm) continue;
    const path = pm[1];
    if (path.includes(':') || path.includes('*')) continue;
    // The element sits after the opening tag's attributes; look a little past it.
    const after = src.slice(m.index, m.index + m[0].length + 80);
    if (/element=\{\s*<Navigate\b/.test(after)) {
      redirects.add(path);
      continue;
    }
    const line = src.slice(0, m.index).split('\n').length;
    if (!statics.has(path)) statics.set(path, `${rel(file)}:${line}`);
  }
}

// Links: exact string literals, and paths appended to a template placeholder.
const linked = new Set();
for (const file of walk(SRC)) {
  const r = rel(file);
  if (isTest(file) || NOT_LINKS.some((re) => re.test(r))) continue;
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/['"`](\/[A-Za-z0-9/_.-]*?)\/?(?=['"`?#])/g)) linked.add(m[1] || '/');
  for (const m of src.matchAll(/\}(\/[A-Za-z0-9/_.-]+?)\/?(?=[`?#$])/g)) linked.add(m[1]);
}

const orphans = [...statics.keys()].filter((p) => !linked.has(p)).sort();
const unexpected = orphans.filter((p) => !EXEMPT.has(p));
const stale = [...EXEMPT.keys()].filter((p) => !orphans.includes(p)).sort();
const vague = [...EXEMPT.entries()].filter(([, why]) => why.trim().length < 30).map(([p]) => p);

console.log('Orphan-route guard (US-315)');
console.log(`  static routes:            ${statics.size}`);
console.log(`  redirects (not pages):    ${redirects.size}`);
console.log(`  linked from nothing:      ${orphans.length} (exempt ${EXEMPT.size})`);
for (const p of orphans) console.log(`    [${EXEMPT.has(p) ? 'exempt' : 'NEW'}] ${p}  ${statics.get(p)}`);
console.log('');

let failed = false;
if (vague.length) {
  failed = true;
  console.error('FAIL: EXEMPT entries must name the real entry point, not just that they are exempt:');
  for (const p of vague) console.error(`   - ${p}`);
  console.error('');
}
if (stale.length) {
  failed = true;
  console.error('FAIL: EXEMPT lists paths that are now linked, or are no longer static routes:');
  for (const p of stale) console.error(`   - ${p}`);
  console.error('');
  console.error('Take them off EXEMPT in scripts/check-orphan-routes.mjs so the list stays exact.');
  console.error('');
}
if (unexpected.length) {
  failed = true;
  console.error(`FAIL: ${unexpected.length} route(s) that nothing in the app links to:`);
  for (const p of unexpected) console.error(`   - ${p}  (${statics.get(p)})`);
  console.error('');
  console.error('A page only reachable by typing its URL is a page nobody finds. Either');
  console.error('link it (a nav config entry in src/components/navigation/, a hub tile, a');
  console.error('button), delete the route, or - if something outside the app sends people');
  console.error('there (an OAuth or payment return, an email, search) - add it to EXEMPT');
  console.error('with that entry point.');
}
if (failed) process.exit(1);

console.log(`OK: ${statics.size - orphans.length} of ${statics.size} static routes linked from the app; ${orphans.length} entered from outside, each named in EXEMPT.`);
