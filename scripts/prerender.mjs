/**
 * Static prerendering for public marketing/blog routes (US-222).
 *
 * The app is a Vite CSR SPA: crawlers and link unfurlers that don't run JS see
 * only the empty index.html shell, so the per-route title/meta/canonical/
 * OpenGraph/JSON-LD that Helmet injects at runtime is invisible to them. This
 * script boots the built app in headless Chromium for each public route, waits
 * for render, and writes the fully-rendered HTML to dist/<route>/index.html so
 * the initial response contains the correct metadata. React still boots on top
 * (the module script is preserved), so the interactive SPA is unchanged.
 *
 * Routes come from the generated sitemap (dist/sitemap.xml) — the single source
 * of truth for public URLs. Authenticated/app routes are not in the sitemap and
 * are left as the SPA shell.
 *
 * Safe by design: if Chromium is unavailable (e.g. a build env without the
 * Playwright browser), it logs a warning and exits 0 so it never breaks a build.
 * Enable in the deploy pipeline via `npm run build:prerender`.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '../dist');
const HOST = '127.0.0.1';
const PORT = Number(process.env.PRERENDER_PORT || 4180);
const LIMIT = process.env.PRERENDER_LIMIT ? Number(process.env.PRERENDER_LIMIT) : Infinity;

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json', '.map': 'application/json',
};

function loadRoutes() {
  const sitemap = path.join(DIST, 'sitemap.xml');
  if (!fs.existsSync(sitemap)) {
    console.warn('[prerender] dist/sitemap.xml not found — run the build first. Skipping.');
    return [];
  }
  const xml = fs.readFileSync(sitemap, 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const paths = new Set();
  for (const loc of locs) {
    try {
      paths.add(new URL(loc).pathname.replace(/\/$/, '') || '/');
    } catch {
      // Non-URL <loc> (relative path) — use as-is.
      paths.add(loc.replace(/\/$/, '') || '/');
    }
  }
  return [...paths];
}

function startServer() {
  // Cache the ORIGINAL shell in memory so SPA-fallback boots stay clean even
  // as we overwrite dist/index.html and dist/<route>/index.html during the run.
  const cleanShell = fs.readFileSync(path.join(DIST, 'index.html'));
  return http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    let filePath = path.join(DIST, urlPath);
    // Real static asset (has an extension) → serve it if present.
    if (path.extname(filePath) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
      fs.createReadStream(filePath).pipe(res);
      return;
    }
    // Any route (extensionless or unknown) → the clean SPA shell, so React
    // routes client-side and Helmet renders fresh, uncontaminated metadata.
    res.setHeader('Content-Type', 'text/html');
    res.end(cleanShell);
  }).listen(PORT, HOST);
}

async function resolveChromium() {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.warn('[prerender] playwright not installed — skipping prerender (build unaffected).');
    return null;
  }
  // Prefer Playwright's own resolution; fall back to a discovered binary.
  const candidates = [];
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (root && fs.existsSync(root)) {
    for (const d of fs.readdirSync(root)) {
      if (d.startsWith('chromium-')) {
        candidates.push(path.join(root, d, 'chrome-linux', 'chrome'));
      }
    }
  }
  for (const exe of candidates) {
    if (fs.existsSync(exe)) {
      try { return await chromium.launch({ executablePath: exe }); } catch { /* try next */ }
    }
  }
  try {
    return await chromium.launch();
  } catch (err) {
    console.warn(`[prerender] could not launch Chromium (${err.message}) — skipping prerender.`);
    return null;
  }
}

async function main() {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    console.warn('[prerender] dist/index.html missing — run `npm run build` first. Skipping.');
    return;
  }
  const routes = loadRoutes().slice(0, LIMIT);
  if (routes.length === 0) {
    console.warn('[prerender] no routes to prerender.');
    return;
  }
  const browser = await resolveChromium();
  if (!browser) return;

  const server = startServer();
  const base = `http://${HOST}:${PORT}`;
  const page = await browser.newPage();
  // The shell's default <title>; used to detect when a route's own SEO has
  // applied (Helmet is synchronous; backend-driven SEO applies a beat later).
  const shellTitle = (fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
    .match(/<title>([^<]*)<\/title>/)?.[1] || '').trim();
  let ok = 0, failed = 0, thin = 0;

  for (const route of routes) {
    try {
      await page.goto(base + route, { waitUntil: 'networkidle', timeout: 30000 });
      // Wait (up to 4s) for the route's SEO to replace the shell title, then a
      // short flush. Root '/' legitimately keeps a title close to the shell, so
      // it just uses the flush delay.
      if (route !== '/') {
        await page.waitForFunction(
          (def) => document.title && document.title.trim() !== def,
          shellTitle, { timeout: 4000 },
        ).catch(() => {});
      }
      await page.waitForTimeout(600); // let remaining Helmet tags flush
      // Dedupe singleton SEO tags: index.html ships static defaults AND Helmet
      // injects page-specific ones (data-rh="true"). Keep Helmet's, drop the
      // static duplicate so crawlers get one unambiguous canonical/OG per page.
      await page.evaluate(() => {
        const dedupe = (selector, keyAttr) => {
          const nodes = [...document.head.querySelectorAll(selector)];
          const byKey = new Map();
          for (const n of nodes) {
            const key = keyAttr ? n.getAttribute(keyAttr) : selector;
            const isHelmet = n.hasAttribute('data-rh');
            const prev = byKey.get(key);
            if (!prev) { byKey.set(key, n); continue; }
            // Prefer the Helmet-managed tag; remove the other.
            if (isHelmet) { prev.remove(); byKey.set(key, n); }
            else { n.remove(); }
          }
        };
        dedupe('link[rel="canonical"]', null);
        dedupe('meta[name="description"]', null);
        dedupe('meta[property="og:title"]', 'property');
        dedupe('meta[property="og:description"]', 'property');
        dedupe('meta[property="og:url"]', 'property');
        dedupe('meta[property="og:image"]', 'property');
        dedupe('meta[name="twitter:title"]', 'name');
        dedupe('meta[name="twitter:description"]', 'name');
      });
      const html = await page.content();
      const rootText = await page.$eval('#root', (el) => el.innerText).catch(() => '');
      if (rootText.trim().length < 50) thin++;
      const outPath = route === '/' ? path.join(DIST, 'index.html')
        : path.join(DIST, route, 'index.html');
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, '<!doctype html>\n' + html);
      ok++;
    } catch (err) {
      failed++;
      console.warn(`[prerender] ${route}: ${err.message}`);
    }
  }

  await browser.close();
  server.close();
  console.log(`[prerender] done: ${ok} prerendered, ${failed} failed, ${thin} thin (<50 chars) of ${routes.length}.`);
}

main().catch((err) => {
  // Never fail the build on a prerender error.
  console.warn('[prerender] unexpected error, skipping:', err.message);
  process.exit(0);
});
