# SEO Prerendering (public marketing/blog routes)

Brikly's web app is a Vite CSR SPA. Per-route `<title>`, meta, canonical,
OpenGraph and JSON-LD are injected at runtime (Helmet / `PageSEO` /
`UnifiedSEOSystem`), so crawlers and link unfurlers that don't run JS would see
only the `index.html` shell. `npm run build` now ends with
`scripts/prerender.mjs` (US-222), which bakes the rendered HTML for every
public route into static files.

## How it works

1. Routes come from `dist/sitemap.xml` (`generate-sitemap.js` already leaves
   out guarded, parameterised and non-indexable routes). App and auth prefixes
   in `NEVER_PRERENDER_PREFIXES` (`scripts/prerender-lib.mjs`) are dropped even
   if they leak in.
2. `dist/` is served from a local Node server that answers every page route
   with the clean shell, and each route is opened in headless Chromium (4 at a
   time). The capture waits for the lazy page's `<h1>`, the Helmet canonical
   and the page title, scrolls once so viewport-gated sections mount, then
   waits for the network to go quiet (capped at 6s; `networkidle` is not used
   because some pages never go idle).
3. Runtime-only nodes are removed (injected analytics scripts, portals outside
   `#root`, iframes) and static-vs-Helmet duplicate tags are collapsed, so the
   file keeps the shell's own scripts byte-for-byte (the CSP hashes in
   `public/_headers` still match) plus one canonical/description/OG set.
4. A page is written only if `validateRenderedHtml()` passes: no redirect,
   its own title, one Helmet canonical pointing at itself, description,
   og:title, og:url, an `<h1>`, and parseable JSON-LD. Anything else (the 404
   page, auth redirects, alias URLs whose canonical points elsewhere) is
   skipped and keeps the plain shell, so no soft-404s get baked in.
5. Output: `/` -> `dist/index.html`, `/pricing` -> `dist/pricing.html`,
   `/features/job-costing` -> `dist/features/job-costing.html`. The `.html`
   form matters on Cloudflare Pages: `pricing/index.html` would make Pages
   308-redirect `/pricing` to `/pricing/`, away from the canonical URL.

`dist/404.html` stays the clean shell (`copy-404.js` runs first and the
prerender never touches it). `public/_redirects` points the SPA catch-all at
`/404.html`, not `/index.html`, because `index.html` now holds the rendered
home page. React boots with `createRoot`, which replaces `#root`, so the app
behaves as before on every route.

## Commands

```bash
npm run build                 # prerenders when Chromium is available
npm run prerender             # re-run the prerender on an existing dist/
npm run check:prerender       # guard: / and /pricing carry title, description,
                              # canonical, OG and JSON-LD in the built HTML
npm run build:prerender       # build, then fail unless / and /pricing were prerendered
```

Environment: `PRERENDER=0` skips it (CI jobs that only need a bundle),
`PRERENDER_STRICT=1` (or `--strict`) fails the build when Chromium is missing,
`PRERENDER_CHROMIUM=/path/to/chrome` picks a browser binary,
`PRERENDER_CONCURRENCY`, `PRERENDER_LIMIT`, `PRERENDER_PORT`.

Without Chromium the step prints a boxed `[prerender] SKIPPED` warning and
exits 0, so the deploy still ships the plain SPA. If Chromium runs but `/` or
`/pricing` fails validation, the build fails: that is a regression, not an
environment gap.

Unit tests for the selection and validation rules:
`src/lib/seo/__tests__/prerender.test.ts`.

## Cloudflare Pages setup (owner)

The Pages build image does not ship Chromium, so until this is configured
production keeps getting the plain shell (with the warning in the build log).

1. Build command:
   ```
   npx playwright install --with-deps chromium && npm run build:prerender
   ```
   `build:prerender` fails the deploy if prerendering silently stopped
   working. If `--with-deps` fails for lack of root in the image, use
   `npx playwright install chromium && npm run build:prerender`; if Chromium
   then can't start for missing system libraries, the log says so.
2. Real Supabase env at build time. Blog posts and pSEO pages only enter the
   sitemap when `generate-sitemap.js` can read them, and `UnifiedSEOSystem`
   pages fetch their metadata from Supabase; with placeholder env they
   prerender with default meta (for example `/blog` gets the generic title).
3. After the first deploy, view-source on `/`, `/pricing`, `/features` and one
   blog post, and run a share-preview debugger on the same URLs.

## Known gaps

- `/resources/best-construction-software-small-business-2025` is in the
  sitemap but its page declares the canonical
  `/resources/best-construction-management-software-small-business-2025`, so it
  is skipped. The sitemap generator should drop it as an alias.
- `public/sw.js` answers a 404 navigation with the cached `/index.html`. With
  a prerendered home page that briefly paints the home hero before an app
  route renders; the fallback should use `/404.html`.
- `vite preview` falls back to `index.html` for unknown routes, so locally
  (and in the E2E job) app routes boot from the prerendered home file. Cloudflare
  serves `404.html` instead.
