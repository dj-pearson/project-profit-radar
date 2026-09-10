#!/usr/bin/env node
/**
 * Every URL in the sitemap must be answered by a public route.
 *
 * react-router's catch-all `<Route path="*">` answers anything, so a sitemap
 * entry for a page that was never built returns HTTP 200 with "Page not found"
 * in the body. Google calls that a soft 404: the URL is crawled, judged empty,
 * and the sitemap it came from loses trust for the URLs that are real. Nothing
 * in the build could see it - the generator's page list
 * (scripts/generate-sitemap.js) is hand-maintained and drifted 17 URLs away
 * from src/routes/ before anyone looked.
 *
 * Two failures are reported:
 *
 *   MISSING  no route matches the path at all -> soft 404.
 *   GUARDED  a route matches but it is wrapped in RouteGuard/SecureRoute, so a
 *            crawler gets the sign-in redirect and indexes nothing. An
 *            authenticated page does not belong in a public sitemap.
 *
 * Checked against both scripts/generate-sitemap.js (the source of truth the
 * build runs) and public/sitemap.xml (the artifact currently committed).
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROUTE_FILES = [
  ...readdirSync(join(root, 'src/routes'))
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => join(root, 'src/routes', f)),
  join(root, 'src/App.tsx'),
].filter(existsSync);

const GUARDS = /<(RouteGuard|SecureRoute)\b/;

/** @returns {Array<{path: string, guarded: boolean, file: string}>} */
function collectRoutes() {
  const routes = [];
  for (const file of ROUTE_FILES) {
    const src = readFileSync(file, 'utf8');
    // Each chunk runs from one <Route to the next, which is where that route's
    // element lives. Good enough to tell a guarded route from a public one.
    const chunks = src.split(/<Route\b/).slice(1);
    for (const chunk of chunks) {
      const m = chunk.match(/path=(?:"([^"]+)"|\{'([^']+)'\}|\{`([^`]+)`\})/);
      if (!m) continue;
      const path = m[1] ?? m[2] ?? m[3];
      if (path === '*') continue;
      routes.push({ path, guarded: GUARDS.test(chunk), file });
    }
  }
  return routes;
}

/** A route path with :params becomes a regex so /compare/:slug answers /compare/procore. */
function toMatcher(routePath) {
  const normalized = routePath.startsWith('/') ? routePath : `/${routePath}`;
  const source = normalized
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\/:[A-Za-z0-9_]+/g, '/[^/]+');
  return new RegExp(`^${source}/?$`);
}

function sitemapPathsFromGenerator() {
  const file = join(root, 'scripts/generate-sitemap.js');
  const src = readFileSync(file, 'utf8');
  return [...src.matchAll(/\{\s*path:\s*'([^']+)'/g)].map((m) => m[1]);
}

function sitemapPathsFromXml() {
  const file = join(root, 'public/sitemap.xml');
  if (!existsSync(file)) return [];
  const src = readFileSync(file, 'utf8');
  return [...src.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) =>
    m[1].replace(/^https?:\/\/[^/]+/, '') || '/'
  );
}

const routes = collectRoutes();
const matchers = routes.map((r) => ({ ...r, re: toMatcher(r.path) }));

/** @returns {'ok' | 'missing' | 'guarded'} */
function classify(path) {
  const hits = matchers.filter((r) => r.re.test(path));
  if (hits.length === 0) return 'missing';
  return hits.some((r) => !r.guarded) ? 'ok' : 'guarded';
}

const sources = [
  ['scripts/generate-sitemap.js', sitemapPathsFromGenerator()],
  ['public/sitemap.xml', sitemapPathsFromXml()],
];

const failures = [];
for (const [source, paths] of sources) {
  for (const path of [...new Set(paths)]) {
    const verdict = classify(path);
    if (verdict !== 'ok') failures.push({ source, path, verdict });
  }
}

if (failures.length > 0) {
  console.error('\nSitemap URLs that a crawler cannot index:\n');
  for (const kind of ['missing', 'guarded']) {
    const group = failures.filter((f) => f.verdict === kind);
    if (group.length === 0) continue;
    const why =
      kind === 'missing'
        ? 'no route answers these, so the catch-all returns 200 "Page not found" (soft 404)'
        : 'only a guarded route answers these, so a crawler gets the sign-in redirect';
    console.error(`  ${kind.toUpperCase()} - ${why}:`);
    for (const f of group) console.error(`    ${f.path}  (${f.source})`);
    console.error('');
  }
  console.error(
    'Fix by building the page, pointing the entry at the route that exists, or\n' +
      'removing the entry from scripts/generate-sitemap.js and regenerating\n' +
      '(npm run generate-sitemap).\n'
  );
  process.exit(1);
}

console.log(
  `check-sitemap-routes: ${sources[0][1].length} generator entries and ` +
    `${sources[1][1].length} sitemap.xml URLs all answered by a public route.`
);
