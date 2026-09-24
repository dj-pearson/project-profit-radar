/**
 * Static prerendering for public marketing/blog routes (US-222).
 *
 * The app is a Vite CSR SPA: crawlers and link unfurlers that don't run JS see
 * only the index.html shell, so the per-route title/meta/canonical/OpenGraph/
 * JSON-LD that Helmet injects at runtime is invisible to them. This script
 * serves the built dist/ locally, boots each public route in headless
 * Chromium, and writes the rendered HTML next to the shell:
 *
 *   /          -> dist/index.html
 *   /pricing   -> dist/pricing.html   (Cloudflare Pages serves /pricing from it
 *                                      without a trailing-slash redirect)
 *
 * React still boots on top (main.tsx uses createRoot, which replaces #root), so
 * the interactive SPA is unchanged. dist/404.html, which Cloudflare serves for
 * every unmatched (authenticated) route, stays the clean shell: copy-404.js
 * runs before this script and this script never touches it.
 *
 * Routes: dist/sitemap.xml (generate-sitemap.js already excludes guarded,
 * parameterised and non-indexable routes), minus NEVER_PRERENDER_PREFIXES.
 * A route is written only if validateRenderedHtml() passes: it must not have
 * redirected, must have its own title, a Helmet canonical pointing at itself,
 * description, og:title/og:url and parseable JSON-LD. Anything else is
 * skipped and keeps falling back to the shell, so the 404 page, auth
 * redirects and pages whose SEO never applied are not baked in as soft-404s.
 *
 * Environment:
 *   PRERENDER=0            skip entirely (e.g. CI jobs that only need a bundle)
 *   PRERENDER_STRICT=1     (or --strict) fail when Chromium is unavailable
 *                          (default: warn loudly, exit 0)
 *   PRERENDER_LIMIT=n      only the first n routes (debugging)
 *   PRERENDER_CONCURRENCY  pages rendered in parallel (default 4)
 *   PRERENDER_PORT         local server port (default 4180)
 *
 * Exit codes: 0 when done or skipped for lack of Chromium; 1 when Chromium ran
 * but / or /pricing failed validation (a real regression), or in strict mode
 * when Chromium is missing.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import {
  PRERENDER_MARKER_PREFIX, REQUIRED_ROUTES, isPrerenderable, outputFileFor,
  routesFromSitemap, shellScriptKeys, validateRenderedHtml,
} from './prerender-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(process.env.PRERENDER_DIST || path.join(__dirname, '../dist'));
const HOST = '127.0.0.1';
const PORT = Number(process.env.PRERENDER_PORT || 4180);
const LIMIT = process.env.PRERENDER_LIMIT ? Number(process.env.PRERENDER_LIMIT) : Infinity;
const CONCURRENCY = Math.max(1, Number(process.env.PRERENDER_CONCURRENCY || 4));
const STRICT = process.env.PRERENDER_STRICT === '1' || process.argv.includes('--strict');
const READY_TIMEOUT_MS = 20000;
const QUIET_CAP_MS = 6000;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json', '.map': 'application/json',
};

function skip(reason) {
  const msg = `[prerender] SKIPPED: ${reason}. Built pages keep the static shell metadata only.`;
  if (STRICT) {
    console.error(msg + ' (PRERENDER_STRICT=1, failing the build)');
    process.exit(1);
  }
  console.warn('\n' + '*'.repeat(78) + '\n' + msg + '\n' + '*'.repeat(78) + '\n');
}

/**
 * The clean SPA shell. Prefer 404.html (copy-404.js makes it from the fresh
 * index.html) so a second run doesn't mistake an already prerendered
 * index.html for the shell.
 */
function loadShell() {
  for (const name of ['404.html', 'index.html']) {
    const p = path.join(DIST, name);
    if (!fs.existsSync(p)) continue;
    const html = fs.readFileSync(p, 'utf8');
    if (!html.includes(PRERENDER_MARKER_PREFIX)) return html;
  }
  return null;
}

function startServer(shell) {
  const server = http.createServer((req, res) => {
    let urlPath;
    try {
      urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    } catch {
      urlPath = '/';
    }
    const filePath = path.join(DIST, urlPath);
    // Real static asset (has an extension, inside dist) -> serve it.
    if (filePath.startsWith(DIST + path.sep) && path.extname(filePath) && !filePath.endsWith('.html')
      && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.setHeader('Content-Type', MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
      fs.createReadStream(filePath).pipe(res);
      return;
    }
    // Every page route -> the clean shell held in memory, so captures never
    // boot on top of an earlier capture's HTML.
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(shell);
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, HOST, () => resolve(server));
  });
}

async function launchChromium() {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    try {
      ({ chromium } = await import('@playwright/test'));
    } catch {
      return { browser: null, why: 'playwright is not installed' };
    }
  }
  let firstError;
  try {
    return { browser: await chromium.launch() };
  } catch (err) {
    firstError = String(err.message).split('\n')[0];
  }
  // Playwright looks only for the exact browser revision it was released
  // with. A build image (or this repo's dev containers) may hold a different
  // revision; any recent Chromium renders these pages fine, so try those.
  for (const exe of chromiumCandidates()) {
    try {
      const browser = await chromium.launch({ executablePath: exe });
      console.log(`[prerender] using Chromium at ${exe}`);
      return { browser };
    } catch { /* try the next one */ }
  }
  return {
    browser: null,
    why: `Chromium could not launch (${firstError}); run "npx playwright install --with-deps chromium" before the build`,
  };
}

function chromiumCandidates() {
  const out = [];
  if (process.env.PRERENDER_CHROMIUM) out.push(process.env.PRERENDER_CHROMIUM);
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    process.env.HOME && path.join(process.env.HOME, '.cache', 'ms-playwright'),
  ].filter(Boolean);
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const dirs = fs.readdirSync(root).filter((d) => /^chromium(_headless_shell)?-\d+$/.test(d))
      .sort((a, b) => Number(b.split('-').pop()) - Number(a.split('-').pop()));
    for (const d of dirs) {
      for (const rel of ['chrome-linux/chrome', 'chrome-linux64/chrome',
        'chrome-headless-shell-linux64/chrome-headless-shell', 'chrome-linux/headless_shell']) {
        const exe = path.join(root, d, rel);
        if (fs.existsSync(exe)) out.push(exe);
      }
    }
  }
  return out;
}

/** Runs in the page: drop runtime-only nodes and static-vs-Helmet duplicates. */
function cleanDom([shellKeys, shellPreloads]) {
  const keep = new Set(shellKeys);
  // Scripts injected at runtime (analytics loaders, lazy chunks) would run a
  // second time when the prerendered file boots. Keep only the shell's own
  // scripts and JSON-LD data blocks.
  for (const s of [...document.querySelectorAll('script')]) {
    const type = (s.getAttribute('type') || '').toLowerCase();
    if (type === 'application/ld+json') continue;
    const src = s.getAttribute('src');
    const key = src ? `src:${src}` : `inline:${s.textContent}`;
    if (!keep.has(key)) s.remove();
  }
  // Vite's preload helper adds a <link rel="modulepreload"> to <head> for
  // every chunk a lazy import() pulls in. Capturing those (the page, the
  // sections mounted by the scroll below, the routes warmed on interaction)
  // put 227 of them in dist/index.html, and a phone fetched all of them before
  // the prerendered hero could paint: LCP 13.7 s (US-388). Keep only the
  // shell's own; the live app requests the rest when it needs them.
  const preloads = new Set(shellPreloads);
  for (const l of [...document.querySelectorAll('link[rel="modulepreload"]')]) {
    if (!preloads.has(l.getAttribute('href'))) l.remove();
  }
  // Portals, toasts, analytics iframes and other nodes appended to <body>
  // outside #root would be duplicated by the live app. The shell's body holds
  // only #root.
  for (const n of [...document.body.children]) {
    if (n.id !== 'root') n.remove();
  }
  document.querySelectorAll('iframe').forEach((n) => n.remove());
  // index.html ships static default SEO tags and Helmet adds data-rh ones.
  // Keep Helmet's so the page has one unambiguous canonical/description/OG.
  const dedupe = (selector, keyAttr) => {
    const byKey = new Map();
    for (const n of [...document.head.querySelectorAll(selector)]) {
      const key = keyAttr ? n.getAttribute(keyAttr) : selector;
      const prev = byKey.get(key);
      if (!prev) { byKey.set(key, n); continue; }
      if (n.hasAttribute('data-rh') && !prev.hasAttribute('data-rh')) {
        prev.remove(); byKey.set(key, n);
      } else {
        n.remove();
      }
    }
  };
  dedupe('title', null);
  dedupe('link[rel="canonical"]', null);
  dedupe('meta[name="description"]', null);
  dedupe('meta[name="keywords"]', null);
  dedupe('meta[name="robots"]', null);
  dedupe('meta[property^="og:"]', 'property');
  dedupe('meta[name^="twitter:"]', 'name');
}

async function renderRoute(context, base, route, shellTitle, shellKeys, shellPreloads) {
  const page = await context.newPage();
  // Count in-flight requests so the capture can wait for lazy sections below
  // the fold. Bounded (QUIET_CAP_MS), unlike networkidle, so a page holding a
  // socket open or polling still gets captured.
  let inflight = 0;
  let lastChange = Date.now();
  const bump = (d) => { inflight = Math.max(0, inflight + d); lastChange = Date.now(); };
  page.on('request', () => bump(1));
  page.on('requestfinished', () => bump(-1));
  page.on('requestfailed', () => bump(-1));
  try {
    await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Ready when the lazy page itself has rendered (an <h1> in #root and no
    // Suspense "Loading page..." fallback), Helmet has set this route's
    // canonical and, off the home page, replaced the shell title.
    // networkidle is not used: pages that poll or hold a Supabase socket
    // never go idle, which is what timed / and /features out before.
    await page.waitForFunction(
      ([r, def]) => {
        const root = document.getElementById('root');
        if (!root || !root.querySelector('h1')) return false;
        if (root.querySelector('[role="status"]') && /Loading page/.test(root.textContent || '')) return false;
        if (!document.head.querySelector('link[rel="canonical"][data-rh]')) return false;
        return r === '/' || document.title.trim() !== def;
      },
      [route, shellTitle], { timeout: READY_TIMEOUT_MS, polling: 100 },
    ).catch(() => {});
    // Scroll through the page so IntersectionObserver-gated sections mount,
    // then wait for the network to go quiet (or the cap to pass).
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 50));
      }
      window.scrollTo(0, 0);
    }).catch(() => {});
    const quietUntil = Date.now() + QUIET_CAP_MS;
    while (Date.now() < quietUntil && !(inflight === 0 && Date.now() - lastChange > 500)) {
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(300); // let trailing Helmet updates and JSON-LD flush
    const finalPath = new URL(page.url()).pathname;
    await page.evaluate(cleanDom, [shellKeys, shellPreloads]);
    const html = await page.content();
    return { html, finalPath };
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  if (process.env.PRERENDER === '0') {
    console.log('[prerender] PRERENDER=0, skipping.');
    return 0;
  }
  const shell = loadShell();
  if (!shell) {
    skip('dist/404.html / dist/index.html shell not found (run the vite build and copy-404 first)');
    return 0;
  }
  const sitemapPath = path.join(DIST, 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    skip('dist/sitemap.xml not found');
    return 0;
  }
  const all = routesFromSitemap(fs.readFileSync(sitemapPath, 'utf8'));
  const excluded = all.filter((r) => !isPrerenderable(r));
  if (excluded.length) console.warn(`[prerender] not prerendering (app/auth path): ${excluded.join(', ')}`);
  const routes = all.filter(isPrerenderable).slice(0, LIMIT);
  if (!routes.length) {
    skip('no public routes in the sitemap');
    return 0;
  }

  const { browser, why } = await launchChromium();
  if (!browser) {
    skip(why);
    return 0;
  }

  const shellTitle = (shell.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '').trim();
  const shellKeys = shellScriptKeys(shell);
  const shellPreloads = [...shell.matchAll(/<link\b[^>]*\brel="modulepreload"[^>]*>/gi)]
    .map((m) => m[0].match(/\bhref="([^"]*)"/i)?.[1])
    .filter(Boolean);
  const server = await startServer(shell);
  const base = `http://${HOST}:${PORT}`;
  // Service workers are blocked so a capture never comes from a SW cache.
  const context = await browser.newContext({ serviceWorkers: 'block' });

  const started = Date.now();
  const written = [];
  const skipped = [];
  const results = new Map();
  let next = 0;
  async function worker() {
    while (next < routes.length) {
      const route = routes[next++];
      try {
        const { html, finalPath } = await renderRoute(context, base, route, shellTitle, shellKeys, shellPreloads);
        const verdict = validateRenderedHtml(route, html, { shellTitle, finalPath });
        results.set(route, verdict);
        if (!verdict.ok) {
          skipped.push(`${route} (${verdict.problems.join('; ')})`);
          continue;
        }
        const out = path.join(DIST, outputFileFor(route));
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, `<!DOCTYPE html>\n${PRERENDER_MARKER_PREFIX} ${route} -->\n${html.replace(/^<!DOCTYPE html>\s*/i, '')}`);
        written.push(route);
      } catch (err) {
        skipped.push(`${route} (${String(err.message).split('\n')[0]})`);
      }
    }
  }
  try {
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, routes.length) }, worker));
  } finally {
    await browser.close().catch(() => {});
    server.close();
  }

  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`[prerender] ${written.length} of ${routes.length} routes written in ${secs}s, ${skipped.length} skipped.`);
  for (const s of skipped) console.warn(`[prerender]   skipped ${s}`);

  const broken = REQUIRED_ROUTES.filter((r) => routes.includes(r) && !written.includes(r));
  if (broken.length) {
    console.error(`[prerender] FAILED: required route(s) did not prerender: ${broken.join(', ')}`);
    return 1;
  }
  return 0;
}

main().then((code) => process.exit(code)).catch((err) => {
  console.error('[prerender] unexpected error:', err && err.stack ? err.stack : err);
  // A crash in the prerender step must not take the deploy down unless the
  // owner opted into strict mode; the shell still works without it.
  process.exit(STRICT ? 1 : 0);
});
