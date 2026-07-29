# SEO Prerendering (public marketing/blog routes)

Brikly's app is a Vite CSR SPA. Per-route `<title>`, meta, canonical,
OpenGraph, and JSON-LD are injected at runtime (Helmet / `PageSEO` /
`UnifiedSEOSystem`), so crawlers and link-unfurlers that don't run JS see only
the empty `index.html` shell. `scripts/prerender.mjs` fixes this by baking the
rendered HTML for every public route into static files.

## How it works

`npm run build:prerender` = `npm run build` then `node scripts/prerender.mjs`.
The prerender step:

1. Serves the freshly built `dist/` from an in-memory clean shell (so captures
   don't contaminate each other).
2. Reads the public route list from `dist/sitemap.xml` (single source of truth).
3. Boots each route in headless Chromium, waits for the route's SEO to apply
   (polls until `document.title` leaves the shell default, then a short flush),
   dedupes the static-vs-Helmet duplicate SEO tags, and writes the result to
   `dist/<route>/index.html`. `/` overwrites `dist/index.html`.

React still boots on top of the prerendered HTML (the module script is
preserved), so the interactive SPA and all authenticated routes are unchanged —
only the initial HTML seen by non-JS clients improves.

**Safe by design:** if Chromium or Playwright is unavailable, the script logs a
warning and exits 0 — it never fails a build. So it's opt-in per environment.

Verified locally: a full run prerenders all ~92 public routes with 0 failures
and no thin (<50 char) pages; `PageSEO` pages (e.g. `/pricing`, `/features`)
show the correct per-page `<title>`, single canonical, OpenGraph, and JSON-LD in
the raw HTML.

## Enabling it in the deploy (Cloudflare Pages)

Two requirements the prerender needs at build time:

1. **Chromium.** Add a browser install before the build, e.g. set the Pages
   build command to:
   ```
   npx playwright install --with-deps chromium && npm run build:prerender
   ```
   (or cache `~/.cache/ms-playwright`).
2. **Real Supabase env.** Backend-driven SEO (`UnifiedSEOSystem`, used by the
   `SEOMetaTags` pages and blog posts) fetches its metadata from Supabase. With
   only placeholder env it silently falls back to default meta, so the build
   must have the real `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (the
   same public values already configured for the normal build) for those pages
   — and for **blog posts**, whose content and meta come from the database — to
   prerender correctly.

## Verifying after deploy

- View-source (JS disabled) on `/`, `/pricing`, `/features`, and a blog post:
  the correct `<title>`, `<meta name="description">`, single
  `<link rel="canonical">`, OpenGraph tags, and JSON-LD must be present.
- Run a social-unfurl debugger (e.g. the platform's share-preview tool) on those
  URLs.
- Compare Lighthouse SEO before/after on the marketing routes.

## Known follow-ups

- A few marketing pages set `<title>`/description but rely on the default
  canonical/OG; audit `PageSEO`/`SEOMetaTags` props per page for full coverage.
- Consider wiring `build:prerender` into `cloudflare:install` once the browser
  install + env are confirmed in the Pages build environment.
