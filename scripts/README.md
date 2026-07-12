# Brikly Scripts

This directory contains all automation, maintenance, and tooling scripts for the Brikly platform.

---

## Quick Reference

| Script | npm command | Description |
|--------|-------------|-------------|
| `ralph/ralph.mjs` | `npm run ralph` | Autonomous AI agent loop |
| `generate-sitemap.js` | `npm run generate-sitemap` | SEO sitemap generator |
| `performance-audit.js` | `npm run performance:audit` | Lighthouse performance audit |
| `check-bundle-budget.mjs` | `npm run performance:budget` | Enforce gzipped bundle budget (US-259) |
| `convert-images-to-webp.js` | `npm run images:optimize` | Convert images to WebP/AVIF |
| `analyze-bundle.js` | `npm run analyze` | Analyze production bundle sizes |
| `purge-cloudflare-cache.js` | `npm run cache:purge` | Purge Cloudflare CDN cache |
| `copy-404.js` | *(runs in build)* | SPA routing fix for Cloudflare Pages |
| `update-sw-version.js` | *(runs in build)* | Inject build version into service worker |
| `security-check.ps1` | `npm run security-check` | Pre-commit secrets scanner |
| `verify-ios-setup.js` | `npm run ios:verify` | iOS App Store setup verification |
| `count-ts-errors.sh` | `bash scripts/count-ts-errors.sh` | Count remaining TypeScript suppressions |
| `find-duplicates.cjs` | `node scripts/find-duplicates.cjs` | Find duplicate/redundant source files |
| `audit-edge-functions.cjs` | `node scripts/audit-edge-functions.cjs` | Audit Supabase Edge Functions |
| `optimize-fonts.sh/.ps1` | `npm run optimize:fonts` | Self-host Google Fonts |
| `setup-stripe-products.sh/.ps1` | *(run manually)* | Create Stripe products and prices |
| `rollback-multi-tenant-frontend.js` | *(run manually)* | Revert multi-tenant frontend changes |
| `execute-rollback.sh` | *(run manually)* | Database rollback for multi-tenant migration |
| `mobile/build-mobile.sh` | *(run manually)* | Build iOS/Android apps for app stores |
| `mobile/bump-version.sh` | *(run manually)* | Bump version across all platform configs |
| `mobile/app-store-checklist.js` | `npm run mobile:checklist` | Pre-submission app store checklist |
| `mobile/capture-screenshots.ts` | `npm run mobile:screenshots` | Capture app store screenshots |

---

## AI Agent

### `ralph/` — Ralph Autonomous Agent Loop

Ralph is an autonomous AI coding loop powered by Claude Code. It reads `scripts/ralph/prd.json`, picks the highest-priority incomplete user story, implements it, runs quality checks, commits the result, and loops until all stories are done.

**Key files:**

| File | Purpose |
|------|---------|
| `ralph/ralph.mjs` | The main loop runner (Node.js, cross-platform) |
| `ralph/prd.json` | Task list — 51 user stories with `passes: true/false` status |
| `ralph/progress.txt` | Append-only learnings log across all iterations |
| `ralph/CLAUDE.md` | Prompt template fed to Claude Code each iteration |
| `ralph/ralph.sh` | Original bash version (kept for reference) |

**Usage:**

```powershell
# Run with defaults (Claude Code, 10 iterations)
node scripts/ralph/ralph.mjs --tool claude

# npm shorthand
npm run ralph

# Limit iterations
node scripts/ralph/ralph.mjs --tool claude 5

# Use Amp instead of Claude Code
node scripts/ralph/ralph.mjs --tool amp
npm run ralph:amp
```

**How it works:**

1. Reads `prd.json` and finds the next story where `passes: false`
2. Feeds `CLAUDE.md` as a prompt to Claude Code via stdin
3. Claude Code implements the story, runs `npm run build` + `npm run lint`, commits, and marks the story `passes: true`
4. Ralph checks `prd.json` for remaining stories and loops
5. Exits when all stories are complete or max iterations reached

**Current status:** 20/51 stories complete, 31 remaining. Next: `US-009 - Fix critical any types in core modules`.

**Prerequisites:** `jq` installed, Claude Code CLI installed (`npm install -g @anthropic-ai/claude-code`).

---

## Build Pipeline

These scripts run automatically as part of `npm run build` and do not need to be called manually in most cases.

### `copy-404.js`
Copies `dist/index.html` to `dist/404.html` after every build. Cloudflare Pages serves `404.html` for unknown routes, which allows React Router to handle client-side routing correctly for all deep-linked URLs.

### `update-sw-version.js`
Injects a unique build timestamp into the service worker file during each build. This forces browsers to pick up the new service worker on deployment, ensuring users are never stuck on a stale cached version of the app.

### `generate-sitemap.js`
```bash
npm run generate-sitemap
```
Generates `public/sitemap.xml` and `public/robots.txt` from the centralized SEO configuration in the codebase. Runs automatically at the start of every production build to keep the sitemap in sync with all 262+ pages.

---

## Performance

### `performance-audit.js`
```bash
npm run performance:audit
```
Runs Lighthouse against the production build and generates a detailed performance report. Checks Core Web Vitals (LCP, FID, CLS), Time to Interactive, and bundle loading. Used in CI to catch regressions.

### `check-performance-budget.js`
```bash
npm run performance:budget
```
Enforces hard limits on production bundle sizes. Fails the build if any chunk exceeds the configured thresholds (400KB warning, 1MB total). Run as part of `npm run performance:ci`.

### `analyze-bundle.js`
```bash
npm run analyze
```
Parses the Vite production build stats and prints a breakdown of bundle sizes by chunk, highlights the largest dependencies, and flags optimization opportunities. Useful when investigating bundle bloat.

---

## Assets & CDN

### `convert-images-to-webp.js`
```bash
npm run images:optimize
```
Scans `public/` for `.jpg`, `.jpeg`, and `.png` files and converts them to WebP and AVIF format using Sharp. Replaces originals in-place. Run this when adding new image assets before committing.

### `optimize-fonts.sh` / `optimize-fonts.ps1`
```bash
npm run optimize:fonts          # Windows (PowerShell)
npm run optimize:fonts:unix     # macOS / Linux
```
Downloads the Google Fonts used in the app and self-hosts them in `public/fonts/`. Self-hosting eliminates the Google Fonts DNS lookup and removes a third-party dependency, improving both performance and privacy.

### `purge-cloudflare-cache.js`
```bash
npm run cache:purge
```
Calls the Cloudflare API to purge all cached assets for the `brikly.net` zone. Run this after a deployment when users are reporting stale content. Requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID` environment variables.

---

## Code Quality

### `security-check.ps1`
```bash
npm run security-check
```
Scans the codebase for accidentally committed secrets before a git push. Checks for patterns matching API keys, JWT tokens, private keys, and Supabase credentials. Run this manually or wire it into a pre-commit hook.

### `count-ts-errors.sh`
```bash
bash scripts/count-ts-errors.sh
```
Counts remaining `@ts-expect-error` suppression comments in `src/`. Used to track progress on the TypeScript strict mode migration (US-009 onward in the PRD). A lower number means fewer type-safety gaps.

### `find-duplicates.cjs`
```bash
node scripts/find-duplicates.cjs
```
Scans `src/` for duplicate or near-duplicate component files, redundant re-exports, and files with identical content. Helps identify dead code and consolidation opportunities as the codebase grows.

### `audit-edge-functions.cjs`
```bash
node scripts/audit-edge-functions.cjs
```
Audits all 166+ Supabase Edge Functions in `supabase/functions/`. Reports on missing auth checks, functions without error handling, inconsistent response formats, and missing CORS headers. Run before any Edge Function deployment.

---

## iOS / Mobile

### `verify-ios-setup.js`
```bash
npm run ios:verify
```
Pre-flight check for iOS App Store submission. Verifies that `capacitor.config.ts` is correct, the iOS native project exists, all required GitHub Secrets are documented, and `ExportOptions.plist` is in place. Run this before triggering the `ios-release` GitHub Actions workflow.

### `mobile/build-mobile.sh`
```bash
bash scripts/mobile/build-mobile.sh ios      # iOS only
bash scripts/mobile/build-mobile.sh android  # Android only
bash scripts/mobile/build-mobile.sh both     # Both platforms
```
Builds the Vite web assets and syncs them to the Capacitor native projects. Handles the full build pipeline: web build → `cap sync` → native archive. Requires Xcode (iOS) or Android Studio (Android) on the host machine.

### `mobile/bump-version.sh`
```bash
bash scripts/mobile/bump-version.sh 1.0.2
```
Bumps the version number across all platform configuration files simultaneously: `package.json`, `mobile-app/package.json`, `app.config.js` (Expo), `android/app/build.gradle`, and `ios/App/App/Info.plist`. Pass the new version as an argument.

### `mobile/app-store-checklist.js`
```bash
npm run mobile:checklist
```
Interactive pre-submission checklist for App Store and Google Play Store. Steps through all required metadata, screenshots, privacy strings, entitlements, and compliance requirements. Prints a pass/fail report with links to relevant documentation.

### `mobile/capture-screenshots.ts`
```bash
npm run mobile:screenshots
```
Uses Playwright to capture screenshots of the running app at all required sizes for the Apple App Store (6.7", 6.1", 5.5", iPad Pro 12.9") and Google Play Store. Saves to `screenshots/` organized by device size.

---

## Stripe

### `setup-stripe-products.sh` / `setup-stripe-products.ps1`
```bash
bash scripts/setup-stripe-products.sh        # macOS / Linux
powershell -File scripts/setup-stripe-products.ps1  # Windows
```
Creates all Stripe products and prices for the Brikly subscription tiers ($199/mo Starter, $350/mo Pro, $799/mo Enterprise) using the Stripe CLI. Run once when setting up a new Stripe account or environment. Requires `STRIPE_SECRET_KEY` environment variable.

---

## Database / Rollback

> These scripts are emergency tools. Do not run them without understanding the impact.

### `rollback-multi-tenant-frontend.js`
Reverts frontend code changes introduced during the multi-tenant migration. Scans `src/` for `site_id` references and replaces them with `company_id`. Used if the multi-tenant rollback is executed and the frontend needs to be restored to single-tenant state.

### `execute-rollback.sh`
Full rollback script for the multi-tenant Supabase database migration. Drops multi-tenant tables, restores RLS policies, and re-seeds foundational data. **Destructive — irreversible without a backup.** Requires Supabase CLI and a confirmed backup before running.

---

## Environment Variables

Scripts that require environment variables will fail gracefully and print a helpful error if they are missing. Never hardcode credentials — always set them via:

- **Local development:** `.env` file in the project root
- **CI/CD:** GitHub Actions Secrets
- **Production:** Cloudflare Pages environment variables
- **Edge Functions:** Supabase project secrets

| Variable | Used by |
|----------|---------|
| `CLOUDFLARE_API_TOKEN` | `purge-cloudflare-cache.js` |
| `CLOUDFLARE_ZONE_ID` | `purge-cloudflare-cache.js` |
| `STRIPE_SECRET_KEY` | `setup-stripe-products.sh/.ps1` |
| `SUPABASE_ACCESS_TOKEN` | `mcp:supabase` npm script |
| `VITE_SUPABASE_URL` | All Supabase-connected scripts |
| `VITE_SUPABASE_ANON_KEY` | All Supabase-connected scripts |
