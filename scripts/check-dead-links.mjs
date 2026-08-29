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
  // /deals, /deals/new, /calls, /meetings and /bookings were all here. Every one
  // was linked from src/components/crm/CRMDashboard.tsx, an unreachable duplicate
  // of the routed pages/CRMDashboard, deleted in the US-314 burn-down. Their
  // baselined reasons deferred to US-276 (deals vs opportunities); that question is
  // still open, it just no longer has a link pointing at it from dead code.
  ['/demo', 'Five "Schedule a Demo" CTAs (Implementation, StickyDemoCTA, PSEOPageRenderer and two more). There is no demo booking page; /contact is a general contact form and /admin/demos is the internal admin view. Sending demo intent to the contact form is a funnel decision, not a repoint.'],
  ['/demo-request', 'The exit-intent modal. Same decision as /demo, and the two should land in the same place once it is made.'],
  ['/finance/bank-reconciliation', 'FinanceHub tile. Every other tile on that page has a route; this feature was never built.'],
  ['/admin/search-traffic-dashboard/settings', 'A settings link on the search-traffic dashboard, with no settings page behind it.'],
  ['/tools/budget-calculator', 'Linked from the construction budgeting guide. /tools exists as an index; this specific calculator does not.'],
  ['/tools/roi-calculator', 'Linked from the QuickBooks integration hub. Same as the budget calculator.'],
  ['/templates/budget-template', 'A downloadable template offered by the budgeting guide. No template delivery route exists.'],
  ['/templates/incident-report', 'Offered by the OSHA compliance guide. Same as above.'],
  ['/templates/safety-checklist', 'Offered by the OSHA compliance guide. Same as above.'],
  ['/topics/cost-and-profit-management', 'A topic hub linked from ConstructionManagementBasics. Two topic hubs exist (/topics/construction-management-basics, /topics/safety-and-osha-compliance); this one was linked before it was written.'],
  ['/topics/field-tracking-and-management', 'Linked from two topic pages. Same as above.'],
  // Found 2026-08-29 when this guard learned to read `url:`/`path:` object
  // literals (US-312). Every one predates that change - they were always dead,
  // and matching only navigate/to=/href= could not see them. Two clusters stand
  // out: MobileQuickActionsSheet, where all seven actions point at nothing, and
  // RoleDashboard, where six of its tiles do. Recorded rather than repointed -
  // several have two or three plausible destinations and picking one is a
  // product decision.
  ['/mobile/camera', 'The camera action in MobileQuickActionsSheet. No camera route exists at all - photo capture lives inside the daily-report and expense forms, so this action has never had a destination.'],
  ['/daily-reports/new', 'MobileQuickActionsSheet. /daily-reports is the list page and creation happens in a dialog on it; no /new route was ever added.'],
  ['/crew', 'MobileQuickActionsSheet. Three crew routes exist - /crew-checkin, /crew-presence and /crew-scheduling - and which one a bare Crew action means is a product decision, not a repoint.'],
  ['/expenses/new', 'MobileQuickActionsSheet. /expenses exists; the create flow is a dialog on it, same shape as /daily-reports/new.'],
  ['/gps', 'MobileQuickActionsSheet. The closest route is /admin/gps-tracking, which is an admin surface rather than the field-user action this button offers.'],
  ['/safety/new', 'MobileQuickActionsSheet. /safety exists; no create route. Same shape as the other /new paths in this sheet.'],
  ['/schedule', 'MobileQuickActionsSheet. /project-schedule, /schedule-builder and /schedule-management all exist and mean different things; picking one here would bake in an answer.'],
  ['/daily-reports/create', 'RoleDashboard and Dashboard. Same missing create route as /daily-reports/new, spelled differently again.'],
  ['/crew-management', 'RoleDashboard. Same ambiguity as /crew in the mobile sheet - three crew routes exist and none is named this.'],
  ['/reports/financial', 'RoleDashboard. No /reports/* route exists; financial reporting lives under /finance/*.'],
  ['/invoices/new', 'useNavigationShortcuts, a keyboard shortcut. /invoices exists and creation is a dialog on it.'],
  ['/admin/lead-management', 'Navigation.tsx admin menu. No such route; lead surfaces are under /crm/*.'],
  ['/admin/demo-management', 'Navigation.tsx admin menu. /admin/demos exists as the internal demo view; this is a different name for it.'],
  ['/admin/seo-manager', 'Navigation.tsx admin menu. The SEO admin surface is reached elsewhere; no route answers this path.'],
  ['/admin/funnel-manager', 'Navigation.tsx admin menu. No funnel admin route exists.'],
  ['/admin/complimentary', 'NavigationConfig and HierarchicalNavigationConfig, so it is offered by the live sidebar config. No route answers it.'],
  ['/admin/customer-service', 'NavigationConfig and HierarchicalNavigationConfig, offered by the live sidebar config. No route answers it.'],
  ['/tools/schedule-builder', 'Tools page and ToolsFooter. /tools is an index and /schedule-builder exists at the top level; the nested path does not.'],
  ['/tools/bid-estimator', 'Tools page. Same shape as the other /tools/* entries - the index exists, the individual tool route does not.'],
  ['/tools/crew-calculator', 'Tools page. Same as /tools/bid-estimator.'],
  ['/finance/bank-accounts', 'FinanceHub tile. Thirteen /finance/* routes exist and this is not among them; the feature was never built.'],
  ['/finance/credit-memos', 'FinanceHub tile. Same as /finance/bank-accounts.'],
  ['/api-management/create-key', 'ApiDocumentation. This documents an API endpoint rather than an in-app route, and reads as navigation only because it is written as a path literal.'],
  ['/api-management/validate-key', 'ApiDocumentation. Same as /api-management/create-key - documentation of an endpoint, not a link.'],
  ['/about', 'seoConfig sitemap entry. No /about route exists; company information lives on the marketing index.'],
  ['/brikly', 'seoConfig sitemap entry. Not a route - this looks like a brand slug that was never a page.'],
  ['/compare', 'PSEOPageRenderer link. Comparison pages exist under specific slugs (/brikly-vs-buildertrend); no bare /compare index does.'],
  ['/software', 'PSEOPageRenderer link. No /software route; the software landing pages have specific slugs.'],
  ['/construction-scheduling', 'EnterpriseSeOService generated link. A marketing slug with no page behind it.'],
  ['/project-management', 'EnterpriseSeOService generated link. Same as /construction-scheduling.'],
  ['/knowledge-base/article/getting-started-complete-setup-guide', 'InternalLinking. The knowledge base routes by a different path shape; these article slugs resolve to nothing.'],
  ['/knowledge-base/article/mobile-app-field-guide', 'InternalLinking. Same as the getting-started article slug.'],
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
    // people learn to skip.
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
