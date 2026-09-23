/**
 * Build-time sitemap + robots.txt generator (US-382).
 *
 * The sitemap used to be a hand-kept list of 92 URLs, every <lastmod> stamped
 * with the build date, /auth and /setup included, guarded pages included,
 * five URLs nothing routed, and not one blog post. This version derives it:
 *
 *   1. Static URLs come from the route table in src/routes/*.tsx, read as
 *      text (a build script can't import TSX). A route is listed when it has
 *      no :params, its element is not a guard or a <Navigate>, it is not in
 *      NON_INDEXABLE, and it is not an alias: a second path rendering the same
 *      component, or a path whose page declares a canonicalUrl pointing at a
 *      different routed path.
 *   2. lastmod for a static URL is the last commit date of its page file.
 *      In a shallow clone that date is unknowable (the boundary commit
 *      "adds" every file), so lastmod is omitted rather than invented.
 *   3. Published blog_posts and pseo_pages are read from Supabase REST at
 *      build time with the anon key (both tables let anon read published
 *      rows), with updated_at as lastmod. Their URL shapes come from the
 *      route table too: the first route rendering LazyBlogPost, and the
 *      routes rendering LazyPSEOPageRenderer.
 *
 *   4. Blog topic pages (US-384) come from src/components/blog/blogCategories.json,
 *      at the URL shape of the route rendering ResourcesCategory. They are
 *      listed whether or not Supabase answers: each topic always carries at
 *      least one hand-written guide (a test holds that).
 *
 * If Supabase can't be reached the build still succeeds with a loud warning
 * and the static URLs only; set SITEMAP_REQUIRE_DB=1 to make that fatal.
 *
 * src/routes/__tests__/sitemap.test.tsx checks the output against the real
 * React route tree, so a parser miss here fails a test instead of shipping.
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

export const DOMAIN = 'https://brikly.net';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Route files in the order src/routes/index.tsx mounts them. Order matters:
 * when two paths render the same component, the first one is canonical.
 */
export const ROUTE_FILES = [
  'src/routes/appRoutes.tsx',
  'src/routes/marketingRoutes.tsx',
  'src/routes/projectRoutes.tsx',
  'src/routes/financialRoutes.tsx',
  'src/routes/peopleRoutes.tsx',
  'src/routes/operationsRoutes.tsx',
  'src/routes/adminRoutes.tsx',
];

/** Files that define lazy page components used by the route files. */
const COMPONENT_FILES = ['src/utils/lazyRoutes.ts', 'src/utils/lazyRoutes.tsx', ...ROUTE_FILES];

/** Same list src/routes/__tests__/routeGuards.test.tsx treats as guards. */
export const GUARD_NAMES = new Set(['RouteGuard', 'RoleGuard', 'SecureRoute', 'ProtectedRoute', 'AdminRoute']);

/**
 * Public routes that answer without auth but are not pages anyone should
 * land on from search: sign-in, OAuth/Stripe return pages, a
 * token-in-the-URL preference page.
 */
export const NON_INDEXABLE = new Set([
  '/auth',
  '/auth/callback',
  '/setup',
  '/unauthorized',
  '/checkout/success',
  '/payment-success',
  '/payment-cancelled',
  '/payment-center',
  '/email-preferences',
  '/unsubscribe',
]);

const BLOG_COMPONENT = 'LazyBlogPost';
const PSEO_COMPONENT = 'LazyPSEOPageRenderer';
const CATEGORY_COMPONENT = 'ResourcesCategory';
export const BLOG_CATEGORIES_FILE = 'src/components/blog/blogCategories.json';

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/**
 * Pull every <Route path="..." element={<X ...}> out of a route file. Handles
 * the multi-line form adminRoutes uses. Layout routes with no path are skipped.
 */
export function parseRoutes(source, file = '') {
  const routes = [];
  const chunks = source.split(/<Route\b/).slice(1);
  for (const chunk of chunks) {
    const pathMatch = chunk.match(/^[^>]*?\bpath=["']([^"']+)["']/s);
    if (!pathMatch) continue;
    const elementMatch = chunk.match(/\belement=\{\s*<\s*([A-Za-z_$][\w$]*)/);
    const component = elementMatch ? elementMatch[1] : null;
    // The page inside a guard: <RouteGuard><Page /></RouteGuard>
    let inner = component;
    if (component && GUARD_NAMES.has(component)) {
      const innerMatch = chunk.match(/\belement=\{\s*<\s*[\w$]+[^>]*>\s*<\s*([A-Za-z_$][\w$]*)/);
      inner = innerMatch ? innerMatch[1] : null;
    }
    routes.push({
      path: pathMatch[1],
      component,
      page: inner,
      guarded: component ? GUARD_NAMES.has(component) : false,
      redirect: component === 'Navigate',
      file,
    });
  }
  return routes;
}

/** Map lazy component name -> source file (relative to repo root). */
export function parseComponentFiles(sources) {
  const map = new Map();
  const re = /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*createLazyRoute\(\s*\(\)\s*=>\s*import\(\s*['"]([^'"]+)['"]/g;
  for (const src of sources) {
    for (const m of src.matchAll(re)) {
      if (map.has(m[1])) continue;
      const resolved = resolveModule(m[2]);
      if (resolved) map.set(m[1], resolved);
    }
  }
  return map;
}

function resolveModule(spec) {
  if (!spec.startsWith('@/')) return null;
  const base = path.join('src', spec.slice(2));
  for (const candidate of [`${base}.tsx`, `${base}.ts`, path.join(base, 'index.tsx'), path.join(base, 'index.ts')]) {
    if (fs.existsSync(path.join(ROOT, candidate))) return candidate.split(path.sep).join('/');
  }
  return null;
}

/** Every canonicalUrl="..." literal in a page file, as a path. */
export function declaredCanonicals(pageSource) {
  const out = [];
  for (const m of pageSource.matchAll(/canonicalUrl=["']([^"']+)["']/g)) {
    let p = m[1].replace(/^https?:\/\/[^/]+/, '');
    if (p === '') p = '/';
    if (p.length > 1) p = p.replace(/\/$/, '');
    out.push(p);
  }
  return out;
}

/**
 * Reduce the full route list to the indexable static paths.
 * `pageSourceFor(component)` returns the page file's text, or null.
 */
export function selectStaticRoutes(routes, pageSourceFor) {
  const candidates = routes.filter(
    (r) =>
      !r.path.includes(':') &&
      !r.path.includes('*') &&
      !r.guarded &&
      !r.redirect &&
      r.component &&
      !NON_INDEXABLE.has(r.path),
  );
  const candidatePaths = new Set(candidates.map((r) => r.path));

  const seenComponents = new Set();
  const seenPaths = new Set();
  const selected = [];
  for (const r of candidates) {
    if (seenPaths.has(r.path)) continue;
    // A second path onto the same component is an alias of the first.
    if (seenComponents.has(r.component)) continue;
    const src = pageSourceFor(r.component);
    const canon = src ? declaredCanonicals(src) : [];
    // The page says its canonical lives at another routed path: alias.
    if (canon.length && !canon.includes(r.path) && canon.some((c) => candidatePaths.has(c))) continue;
    seenComponents.add(r.component);
    seenPaths.add(r.path);
    selected.push(r);
  }
  return selected;
}

/** Route templates for DB-backed pages, taken from the route table. */
export function dynamicTemplates(routes) {
  const open = routes.filter((r) => !r.guarded && !r.redirect);
  const blog = open.find((r) => r.component === BLOG_COMPONENT && r.path.includes(':'));
  const pseo = open.filter((r) => r.component === PSEO_COMPONENT && r.path.includes(':')).map((r) => r.path);
  // The topic page itself, not its /page/:page continuation.
  const category = open.find((r) => r.component === CATEGORY_COMPONENT && /\/:[\w]+$/.test(r.path) && !/\/page\/:[\w]+$/.test(r.path));
  return { blog: blog ? blog.path : null, pseo, category: category ? category.path : null };
}

/** Does a concrete path match a react-router style pattern like /a/:b/:c? */
export function matchesPattern(pattern, concrete) {
  const p = pattern.split('/');
  const c = concrete.split('/');
  if (p.length !== c.length) return false;
  return p.every((seg, i) => (seg.startsWith(':') ? c[i].length > 0 : seg === c[i]));
}

export function blogPath(template, slug) {
  return template.replace(/:[\w]+/, encodeURIComponent(slug));
}

/**
 * Last commit date (YYYY-MM-DD) per file, from one `git log` pass.
 * Returns an empty map in a shallow clone or without git, which means
 * "omit lastmod", never "use today".
 */
export function gitLastModified(files) {
  const dates = new Map();
  try {
    const shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: ROOT, encoding: 'utf8' }).trim();
    if (shallow !== 'false') return dates;
    const out = execFileSync('git', ['log', '--format=@%cs', '--name-only', '--', ...files], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    let current = null;
    for (const line of out.split('\n')) {
      if (line.startsWith('@')) current = line.slice(1);
      else if (line && current && !dates.has(line)) dates.set(line, current);
    }
  } catch {
    // No git (tarball build): no lastmod.
  }
  return dates;
}

const xmlEscape = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** entries: [{ path, lastmod? }] */
export function buildSitemapXML(entries) {
  const body = entries
    .map((e) => {
      const lastmod = e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : '';
      return `  <url>\n    <loc>${xmlEscape(DOMAIN + e.path)}</loc>${lastmod}\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

/** Load the route table and derive everything that doesn't need the network. */
export function loadRouteTable() {
  const routes = ROUTE_FILES.flatMap((f) => parseRoutes(read(f), f));
  const componentSources = COMPONENT_FILES.filter((f) => fs.existsSync(path.join(ROOT, f))).map(read);
  const componentFiles = parseComponentFiles(componentSources);
  const pageSourceFor = (component) => {
    const file = componentFiles.get(component);
    return file ? read(file) : null;
  };
  const staticRoutes = selectStaticRoutes(routes, pageSourceFor);
  return { routes, staticRoutes, componentFiles, templates: dynamicTemplates(routes) };
}

/**
 * Static entries with real lastmod where git knows it.
 * `dates` is injectable for tests.
 */
export function staticEntries({ staticRoutes, componentFiles }, dates) {
  const files = staticRoutes.map((r) => componentFiles.get(r.component)).filter(Boolean);
  const lastMod = dates || gitLastModified(files);
  return staticRoutes.map((r) => {
    const file = componentFiles.get(r.component);
    const lastmod = file ? lastMod.get(file) || null : null;
    return lastmod ? { path: r.path, lastmod } : { path: r.path };
  });
}

/**
 * Turn DB rows into entries. Rows whose URL no route would answer are
 * dropped (and counted) instead of being advertised.
 */
export function dynamicEntries(templates, { blogPosts = [], pseoPages = [] }) {
  const entries = [];
  let dropped = 0;
  if (templates.blog) {
    for (const post of blogPosts) {
      if (!post.slug) {
        dropped++;
        continue;
      }
      entries.push({ path: blogPath(templates.blog, post.slug), lastmod: toDate(post.updated_at) });
    }
  } else {
    dropped += blogPosts.length;
  }
  for (const page of pseoPages) {
    const p = page.canonical_url;
    if (p && templates.pseo.some((t) => matchesPattern(t, p))) {
      entries.push({ path: p, lastmod: toDate(page.updated_at) });
    } else {
      dropped++;
    }
  }
  return { entries: entries.map((e) => (e.lastmod ? e : { path: e.path })), dropped };
}

/** One entry per blog topic in blogCategories.json, at the routed URL shape. */
export function categoryEntries(templates, categories = JSON.parse(read(BLOG_CATEGORIES_FILE))) {
  if (!templates.category) return [];
  return categories.filter((c) => c && c.slug).map((c) => ({ path: blogPath(templates.category, c.slug) }));
}

/** Static first; a DB row can't duplicate a static page. */
export function mergeEntries(staticList, dynamicList) {
  const seen = new Set(staticList.map((e) => e.path));
  const merged = [...staticList];
  for (const e of dynamicList) {
    if (seen.has(e.path)) continue;
    seen.add(e.path);
    merged.push(e);
  }
  return merged;
}

function loadDotEnv() {
  for (const f of ['.env', '.env.local']) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p) || typeof process.loadEnvFile !== 'function') continue;
    try {
      // loadEnvFile never overrides variables already set by the build env.
      process.loadEnvFile(p);
    } catch {
      // Unparseable .env: fall through to whatever the environment has.
    }
  }
}

async function fetchAll(baseUrl, key, table, query) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const res = await fetch(`${baseUrl}/rest/v1/${table}?${query}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Range: `${from}-${from + pageSize - 1}`,
        'Range-Unit': 'items',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status}`);
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < pageSize) return rows;
  }
}

export async function fetchContent(env = process.env) {
  const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || 'https://api.brikly.net').replace(/\/$/, '');
  const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!key) throw new Error('no Supabase anon key (SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY)');
  const [blogPosts, pseoPages] = await Promise.all([
    fetchAll(url, key, 'blog_posts', 'select=slug,updated_at&status=eq.published&order=updated_at.desc'),
    fetchAll(url, key, 'pseo_pages', 'select=canonical_url,updated_at&is_published=eq.true&order=updated_at.desc'),
  ]);
  return { blogPosts, pseoPages };
}

/** robots.txt. No build date in it: a changing comment is noise in every diff. */
export function generateRobotsTxt() {
  return `# Brikly robots.txt
# ${DOMAIN}
# Generated by scripts/generate-sitemap.js; edit there, not here.

# ===========================================
# AI SEARCH ENGINE CRAWLERS - ALLOW
# These bots retrieve content for AI-powered search results.
# ===========================================

User-agent: GPTBot
Allow: /
Crawl-delay: 1

User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ClaudeBot
Allow: /
Crawl-delay: 1

User-agent: PerplexityBot
Allow: /
Crawl-delay: 1

User-agent: Google-Extended
Allow: /

User-agent: Applebot
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Meta-ExternalAgent
Allow: /
Crawl-delay: 2

User-agent: cohere-ai
Allow: /
Crawl-delay: 2

User-agent: YouBot
Allow: /
Crawl-delay: 1

# ===========================================
# TRADITIONAL SEARCH ENGINE CRAWLERS - ALLOW
# ===========================================

User-agent: Googlebot
Allow: /

User-agent: Slurp
Allow: /

User-agent: DuckDuckBot
Allow: /

User-agent: Yandex
Allow: /

# ===========================================
# AI TRAINING-ONLY BOTS - BLOCK
# ===========================================

User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: FacebookBot
Disallow: /

User-agent: omgili
Disallow: /

User-agent: Diffbot
Disallow: /

User-agent: ImagesiftBot
Disallow: /

User-agent: Timpibot
Disallow: /

# ===========================================
# DEFAULT RULES - ALL OTHER CRAWLERS
# ===========================================

User-agent: *
Allow: /

# Authenticated/app pages. No trailing slash: "Disallow: /auth/" left
# /auth itself crawlable.
Disallow: /auth
Disallow: /dashboard
Disallow: /admin
Disallow: /setup
Disallow: /api
Disallow: /payment-center
Disallow: /settings

# URL parameters that create duplicate content
Disallow: /*?*refreshed=
Disallow: /*?*v=
Disallow: /*?*timestamp=
Disallow: /*?*cache=

# Testing/internal pages
Disallow: /testing/
Disallow: /test/
Disallow: /debug/
Disallow: /component-showcase

# Thin pages
Disallow: /404
Disallow: /not-found

# Marketing URL parameters
Allow: /*?utm_source=
Allow: /*?utm_medium=
Allow: /*?utm_campaign=
Allow: /*?ref=

Crawl-delay: 1

Sitemap: ${DOMAIN}/sitemap.xml
`;
}

async function main() {
  loadDotEnv();
  const table = loadRouteTable();
  const statics = [...staticEntries(table), ...categoryEntries(table.templates)];

  let dynamic = { entries: [], dropped: 0 };
  let dbNote;
  try {
    const content = await fetchContent();
    dynamic = dynamicEntries(table.templates, content);
    dbNote = `${content.blogPosts.length} blog posts, ${content.pseoPages.length} pSEO pages`;
  } catch (err) {
    const msg = `[sitemap] Could not read blog_posts/pseo_pages from Supabase: ${err.message}. The sitemap will list static pages only.`;
    if (process.env.SITEMAP_REQUIRE_DB === '1') {
      console.error(msg);
      process.exit(1);
    }
    console.warn(`\n*** ${msg}\n*** Set SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) in the build env; SITEMAP_REQUIRE_DB=1 makes this fatal.\n`);
    dbNote = 'unavailable';
  }

  const entries = mergeEntries(statics, dynamic.entries);
  const publicDir = path.join(ROOT, 'public');
  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), buildSitemapXML(entries), 'utf8');
  fs.writeFileSync(path.join(publicDir, 'robots.txt'), generateRobotsTxt(), 'utf8');

  const dated = statics.filter((e) => e.lastmod).length;
  console.log(
    `[sitemap] ${entries.length} URLs: ${statics.length} static (${dated} with git lastmod), ` +
      `${dynamic.entries.length} from Supabase (${dbNote})` +
      (dynamic.dropped ? `, ${dynamic.dropped} rows skipped with no matching route` : ''),
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
