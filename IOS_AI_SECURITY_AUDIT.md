# iOS App + AI Abuse Security Audit — Brikly

**Date:** 2026-06-23
**Scope:** iOS/mobile client auth & token handling; how clients invoke AI edge functions; usage-limit & abuse prevention; edge-function auth/RBAC/CORS/RLS.
**Method:** Static review of `src/`, `Brikly-iOS/`, `mobile-app/`, `capacitor.config.ts`, `supabase/functions/**`, and `supabase/migrations/**`. Every finding below cites `file:line` and the most severe ones were re-verified by hand.

> TL;DR — Three things the request specifically asked for are **not currently true**:
> 1. **Hard limits on AI usage** — there are none. No per-tier AI/token quota exists anywhere, and the only throttle (the rate limiter) is a no-op that can never fire.
> 2. **No way to bypass/spoof** — a normal authenticated user can self-upgrade to the `enterprise`/`complimentary` tier with one direct write, spoof another user's identity into AI/MFA functions via body-supplied `userId`/`company_id`, and self-assign the `admin` role at signup.
> 3. **Secure auth on device** — the iOS app stores the access + refresh JWT in plaintext `UserDefaults`/`localStorage` (not the Keychain), and biometric "login"/"app-lock" is cosmetic dead code.

---

## Severity legend
- **CRITICAL** — directly exploitable for account takeover, tenant-data access, MFA bypass, or unbounded cost/free-tier escalation. Fix before next release.
- **HIGH** — exploitable with a low bar or compounds a Critical.
- **MEDIUM / LOW** — hardening, defense-in-depth, or correctness that undermines a control.

---

## CRITICAL

### CR-1 — AI usage has no hard limit, and the rate limiter is a no-op
**`supabase/functions/_shared/rate-limiter.ts:68-113`**, plus every AI function.

The limiter counts rows in `rate_limit_violations` for the window (`:68-73`) and allows when `requestCount < maxRequests` (`:87`) — but it only **inserts** a row inside `if (!allowed)` (`:100-108`). Normal/allowed requests are never recorded, so the windowed count never grows and `allowed` is effectively always `true`. It also **fails open** on any DB error (`:77-83`, `:121-130`).

There is additionally **no AI/token quota anywhere**: `_shared/entitlements.ts:17-31` only covers `projects`/`teamMembers`/`storage`, and a grep for `track-usage|checkEntitlement|usage_tracking|monthly|token` across all 12 AI functions returns zero matches. AI endpoints run the model first and never check or record consumption.

**Impact:** a single authenticated user can call paid AI endpoints (OpenAI Whisper/GPT-4.1, Claude) without any ceiling → unbounded provider spend, no tier enforcement.

**Status (update):** The per-minute limiter is fixed (Phase 0, `rate-limiter.ts` rewrite). A real **per-tier monthly AI quota** now also exists for the Phase-0-hardened paid-AI endpoints:
- New **additive** infra (no change to existing tables/RLS): `ai_usage_counters` table + atomic `increment_ai_usage` RPC — migration `20260624000000_create_ai_usage_counters.sql`. The table has **no client write policy**; only the service role / SECURITY DEFINER RPC can write, so the count is unspoofable (contrast `usage_metrics`, H-1).
- New shared helper `_shared/ai-quota.ts` (`enforceAiQuota` pre-flight + `recordAiUsage` atomic increment), wired into `process-voice-command`, `voice-to-text`, and `document-classifier` (the latter degrades to free rule-based classification when the quota is exhausted instead of erroring).
- Limits in `AI_TIER_MONTHLY_LIMITS`: starter 250, professional 2500, enterprise/complimentary unlimited. Fails open on ambiguity (cost backstop, not sole control).
- **Still open:** the heavier LLM endpoints from H-6 (`ai-content-generator`, `generate-risk-assessment`, `generate-predictive-analytics`, `smart-data-analyzer`) are **not** yet quota-wired — they first need the CR-6-style JWT-derived identity (they currently trust body `company_id`/`user_id`, H-2/H-6), otherwise a quota keyed on a spoofable company would itself be spoofable. That is Phase 1 work.

### CR-2 — Any user can self-upgrade their plan (subscriber/company tier is client-writable)
**`supabase/migrations/20250703133020_...sql:23-30`** and **`supabase/migrations/20260209100000_bootstrap_foundational_schema.sql:653-660`**.

`subscribers` RLS:
```sql
CREATE POLICY "update_own_subscription" ON public.subscribers FOR UPDATE USING (true);   -- any row
CREATE POLICY "insert_subscription"     ON public.subscribers FOR INSERT WITH CHECK (true);
```
`USING (true)` with no row predicate and no `WITH CHECK` lets any authenticated user (anon key) UPDATE/INSERT **any** subscriber row — set their own `is_complimentary=true` or `subscription_tier='enterprise'`, or tamper with another tenant's row.

`companies` admin-update policy (`bootstrap_companies_update_admin`) has **no `WITH CHECK` and no column restriction**, so a company `admin` (self-serve signup makes the creator an admin) can `UPDATE companies SET subscription_tier='enterprise'`. RLS is row-level and cannot restrict columns. The server-side gate `entitlements.ts:82-88` reads exactly this column → `enterprise` maps to unlimited (`entitlements.ts:20`) with no Stripe charge. The legitimate writer is the Stripe webhook only (`stripe-webhook/index.ts:254-258`, service role).

**Impact:** free unlimited tier + overage-billing bypass; cross-tenant subscription tampering.

### CR-3 — MFA bypass: `verify-mfa-login` trusts a body-supplied `userId`
**`supabase/functions/verify-mfa-login/index.ts:55-59, 77, 92, 138, 157`.**

Uses the **service-role** client (RLS off, `:57`), takes `userId` from the request body (`:92`,`:138`), and verifies the TOTP/backup code against that user. The requester's identity is never bound to a verified JWT (no `auth.getUser()` on the caller). The function is also absent from `config.toml` (see CR-5).

**Impact:** an attacker who has a victim's password (step 1) POSTs `{action:"verify", userId:"<victim>", code:...}` — the second factor is defeated because the server trusts the client's claim of "who I am." `action:"check"` (`:85-128`) also lets anyone enumerate whether any `userId` has MFA enabled. Backup codes are stored/compared in plaintext (`:268-274`).

### CR-4 — `signup-with-otp` lets the client self-assign `admin`/`root_admin`
**`supabase/functions/signup-with-otp/index.ts:28, 70, 135`.**

`role: z.string().optional().default('admin')` — client-supplied `role` is written verbatim to `user_profiles.role` (`:135`) via the service-role client (RLS bypassed). Default is `admin`; nothing constrains it to a safe self-service role.

**Impact:** sign up with `{"role":"root_admin"}`, verify your own email, become a platform super-admin. Chains with CR-3 (a `root_admin` can then disable any user's MFA, `disable-mfa/index.ts:80-100`).

### CR-5 — System/cron functions fail OPEN; `config.toml` is not the real gate
**`supabase/functions/_shared/system-auth.ts:35-42`** + **`supabase/config.toml:36-98`**.

`requireSystemOrAdmin` returns `null` (= allow) when `CRON_SECRET` is unset (`:36-42`) — a "staged rollout" that leaves every dependent function **completely unauthenticated until an operator sets the secret**. The `verify_jwt=false` cron set (`config.toml:36-98`: `send-scheduled-emails`, `send-intervention-email`, `payment-reminders`, `process-dunning`, `trial-management`, `enhanced-blog-ai-fixed`, …) uses the service role and performs bulk mutations / email sends.

Compounding this: there are **192 function directories but only ~145 entries in `config.toml`**, and several functions use the self-hosted `export default handler` pattern. The public auth flows (`verify-mfa-login`, `signup-with-otp`, `send-auth-otp`, `sso-*`, `oauth-proxy`, `invite-team-member`) are **absent from `config.toml`**, so `verify_jwt` is not a trustworthy enforcement boundary here — each function must self-authenticate, and several don't (CR-3).

**Impact:** until `CRON_SECRET` is set, anonymous callers can trigger mass email/billing logic (spam + cost amplification).

### CR-6 — Voice/AI endpoints do no in-code auth and trust the body
**`process-voice-command/index.ts:30-37`**, **`voice-to-text/index.ts:48-57`**, **`document-classifier/index.ts:37`**.

No `initializeAuthContext`/`getUser`; identity (`user_id`, `company_id`, `project_id`) is read straight from the JSON body and trusted. No rate limit, no input-size cap on base64 `audio_data` / `text`, wildcard CORS. These are `verify_jwt=true` at the gateway (`config.toml:189-214`) — but that only proves *some* valid JWT exists, **not** that it matches the body's `user_id`. So any authenticated user can spoof another user's/company's identity and drive unbounded Whisper/Claude/GPT cost. `document-classifier` also concatenates untrusted `text` into the LLM prompt unescaped (`:72-121`) → prompt injection into a value downstream code trusts.

### CR-7 — `analyze-support-ticket`: service-role + IDOR on `ticketId`
**`supabase/functions/analyze-support-ticket/index.ts:49-72, 326-414, 498-526`.**

No user auth; builds a service-role client (`:55-57`) and fetches **any** ticket by body `ticketId` (RLS bypassed), then pulls cross-company user/company/health context and writes back. Rate limit is keyed on client **IP** (`:60-64`), trivially rotated.

**Impact:** enumerate `ticketId`s to read other tenants' support context and trigger AI/DB writes.

---

## HIGH

### H-1 — `usage_metrics` is fully client-writable and metering is non-atomic
`supabase/migrations/20250703170531_...sql:25-27` defines `"System can manage usage metrics" FOR ALL USING (true)` — any authenticated user can read/UPDATE/DELETE any tenant's usage rows (reset consumption to 0, forge another tenant's). `track-usage/index.ts:83-95` and `usage-billing/index.ts:198-217` do an application-level read-modify-write (no atomic SQL increment, no `increment_usage` RPC), and the amount (`metric_value`) is unvalidated client input (`track-usage:38`) — negative values, zero, or simply never calling it all under-report. Overage invoices are computed from this poisoned table (`usage-billing:301-345, 484-497`).

### H-2 — `verifyCompanyAccess` is defined but never called; service-role functions trust body `company_id`
`_shared/auth-helpers.ts:139-165` (and the single-tenant twin) — grep shows **zero call sites** across all 192 functions. ~95 files build a service-role client (`SUPABASE_SERVICE_ROLE_KEY`), and ~40 read `company_id` from the body. Any function that is service-role + body-`company_id` without re-deriving the company from the JWT has **no tenant-isolation backstop** (e.g. `smart-procurement:33`, `generate-risk-assessment:35`, `generate-predictive-analytics:35`, `smart-data-analyzer:196-207`).

### H-3 — Mobile auth tokens stored in plaintext (not the Keychain)
`src/lib/supabaseStorage.ts:82-145` mirrors `sb-api-auth-token` (access **+ refresh** token) into `@capacitor/preferences` (iOS `NSUserDefaults`) and `src/lib/safeStorage.ts:15` into WebView `localStorage` — both plaintext, both survive unencrypted backups. The native shell relies on the Supabase Swift SDK's UserDefaults persistence too (`Brikly-iOS/Brikly/PrivacyInfo.xcprivacy:14`). The `keychain-access-groups` entitlement is declared but unused. (Note: the Expo app does this correctly with `expo-secure-store` — `mobile-app/src/services/supabase.ts:21-50` — a ready reference.)

**Impact:** on a jailbroken/compromised device or via backup, extract the refresh token → mint access tokens indefinitely from any machine. With no force-update/revocation gate (H-5), there's no fleet-wide remediation path.

### H-4 — Biometric login & app-lock are cosmetic
`src/services/BiometricAuthService.ts:280-331` — `performBiometricLogin()` just calls `getSession()` after the biometric prompt; the session is already valid regardless of the prompt result. "Stored credentials" are written to plaintext Preferences (`:215-218`) despite headers claiming Keychain. `shouldTriggerAppLock`/`recordBackgroundTime`/`unlockApp` exist but have **zero call sites** at the app root (`App.tsx`, `main.tsx`, `ProtectedRoute.tsx`) — only referenced from the settings toggle. Backgrounding never records a time; resuming never prompts. The native shell auto-restores the session with no biometric gate (`Brikly-iOS/.../ContentView.swift:36-38`, `AuthService.swift:109-112`).

### H-5 — No force-update / minimum-version gate exists
Confirmed: searches for `force.?update`/`MIN_SUPPORTED`/`minVersion` return only docs, no implementation in any of the three clients. There is no way to revoke or force-upgrade clients holding the plaintext tokens from H-3, and no safe path to make a backward-incompatible auth change.

### H-6 — Uncapped AI input / client-chosen model
`ai-content-generator/index.ts:38` (no length cap on `prompt`/`system_prompt`; client supplies `model_alias` → can select the most expensive model). `generate-risk-assessment:137-145` and `generate-predictive-analytics:141-149` call GPT-4.1 with **no `max_tokens`** → unbounded output per call. `smart-data-analyzer:100-170` sends uncapped CSV-derived content. Combined with CR-1 (no working throttle) these are realistic cost-amplification vectors.

---

## MEDIUM

- **M-1 — Wildcard CORS in 80+ functions.** `_shared/cors.ts:1-4` and inline `'*'` (incl. auth endpoints `verify-mfa-setup`, `api-auth`, `oauth-proxy`). Tempered because **no function sets `Access-Control-Allow-Credentials`** and auth is bearer-token, not cookies — but it violates the project's own `secure-cors.ts` allowlist standard. AI/usage functions (`track-usage`, `change-subscription`, `manage-subscription`) also return `error.message` verbatim (info leak).
- **M-2 — `api-auth` scope logic.** `api-auth/index.ts:303-341` — `determineRequiredScope` returns `read`/`write` before the admin branch, so `/admin/` GETs only need a `read` key; `'*'`/`'all'`/`'admin'` are god-mode scopes.
- **M-3 — `oauth-proxy` unsigned state.** `oauth-proxy/index.ts:47-51` — service-role magic-link minting with base64 (`btoa`) state carrying the PKCE verifier; tamperable (PKCE mitigates code interception, but sign/encrypt the state).
- **M-4 — OTP brute-force surface.** `verify-auth-otp/index.ts:91-119` relies on a 10/min **IP** cap over a 6-digit code with 5–15 min validity; per-OTP attempt cap depends on the DB `verify_otp_code` RPC (verify it enforces single-use + hard attempt limit). MFA backup codes stored plaintext (`verify-mfa-login:268-274`).
- **M-5 — SSRF in `analyze-images`.** `analyze-images/index.ts:46-52` fetches a client-supplied URL with no allowlist (root_admin-gated, so reduced).
- **M-6 — Android cert pins are placeholders.** `android/app/src/main/res/xml/network_security_config.xml:14-28` pins are commented "update with actual production certificate pins" and pin the unused `supabase.co`. iOS has no pinning.
- **M-7 — Native iOS hardcoded anon JWT with year-2125 expiry.** `Brikly-iOS/.../AppConfiguration.swift:33` — anon role (RLS-enforced, acceptable) but never expires, so unrotatable; the "safe to commit" comment trains a risky habit.

---

## LOW

- **L-1 — `.env_backup` committed** (placeholder values only — no real secret leaked, but `.gitignore` all `.env*`).
- **L-2 — Tier-limit tables disagree** across `entitlements.ts` (projects 10/50), `track-usage` (3/25/100), `usage-billing` (10/50) — enforcement depends on which function runs.
- **L-3 — Duplicate/dead function variants** (`*-N-DPEARSON.ts`, `enhanced-blog-ai-simple/-fixed`, `blog_social_webhook` vs `blog-social-webhook`) increase attack surface.
- **L-4 — `entitlements.ts` fails open** on every ambiguity (unknown tier, missing row, any error — `:91-94,118-121`). A deliberate business choice, but combined with CR-2 the gate gives little assurance.
- **L-5 — OAuth callback URL logged with `privacy: .public`** (`Brikly-iOS/BriklyApp.swift:43`) — tokens land in device console logs.

---

## Positive controls (already correct — keep these patterns)
- `data-subject-delete/index.ts:47-89` derives identity from the JWT and ignores body `company_id` for the decision — the model others should follow.
- `disable-mfa/index.ts:55-94` verifies the JWT and checks `requester == target || isAdmin`.
- `create-root-admin/index.ts:19-25` is secret-gated and **fails closed** — the correct contrast to CR-5.
- PKCE flow (`src/integrations/supabase/client.ts:55`), `limitsNavigationsToAppBoundDomains` + `WKAppBoundDomains`, `webContentsDebuggingEnabled` gated to non-prod, signed-out sentinel scrub (`supabaseStorage.ts:193-232`), Expo `expo-secure-store` usage.

---

## Remediation status

- ✅ **Phase 0 — IMPLEMENTED on `claude/ios-security-audit-37q45j`** (edge-function fixes only, no DB/RLS changes). See the per-item checklist below and the commit history.
- ✅ **Monthly AI quota (additive slice of Phase 1 item 6) — IMPLEMENTED on the same branch.** New `ai_usage_counters` table + `increment_ai_usage` RPC are **additive only** (CREATE TABLE/FUNCTION — "always safe" per `CLAUDE.md`); no existing table or RLS policy is touched or tightened. Wired into the three Phase-0-hardened paid-AI endpoints. The migration file does not reach production until merged through the normal release flow into `main` — the human merge gate is unchanged.
- ⛔ **Phases 1–3 (remainder) — NOT yet done.** The risky part of Phase 1 (tightening `subscribers`/`usage_metrics`/`companies` RLS, CR-2/H-1) touches live production RLS/tables and must be staged per the backward-compatibility rules in `CLAUDE.md`; Phase 2 native pieces must ride a `release/*` train.

## Recommended remediation order

**Phase 0 — stop the bleeding (small, high-impact, low-risk):** ✅ done
1. CR-3: bind `verify-mfa-login` (and every `userId`-from-body function) to the JWT subject — reject if `jwt.sub !== userId`.
2. CR-4: replace `signup-with-otp` `role` default with a server-forced safe role; allowlist permitted self-service roles.
3. CR-5: make `requireSystemOrAdmin` fail **closed** (require `CRON_SECRET` in prod).
4. CR-6: add `initializeAuthContext` + derive identity from JWT + input-size caps + real rate limit to `process-voice-command`, `voice-to-text`, `document-classifier`; gate `analyze-support-ticket` (CR-7) to the ticket's company.

**Phase 1 — close the spoofing/limit gaps (touches production DB — needs care + backward-compat per CLAUDE.md):**
5. CR-2 / H-1: rewrite `subscribers` and `usage_metrics` RLS to `user_id = auth.uid()` / `company_id`-scoped, remove `USING(true)` ALL policies; block client writes to `companies.subscription_tier`/`subscription_status` via a `BEFORE UPDATE` trigger (RLS can't do column scoping).
6. CR-1 / H-6: fix the rate limiter to record every request (or move to an atomic counter) ✅ done (Phase 0); add a real server-side **pre-flight** AI quota tied to tier ✅ done for the 3 Phase-0 paid-AI endpoints via the additive `ai_usage_counters` counter (see CR-1 status); **remaining:** wire the quota into the heavier endpoints (`ai-content-generator`, `generate-risk-assessment`, `generate-predictive-analytics`, `smart-data-analyzer`) after giving them CR-6-style JWT-derived identity, cap input size + `max_tokens`, and stop trusting client `model_alias`.
7. H-2: wire JWT-derived company scoping into all service-role functions that accept body `company_id`.

**Phase 2 — device hardening (rides a `release/*` train; native changes):**
8. H-3/H-4: move the token blob to Keychain/Keystore-backed secure storage; make biometric a true gate (encrypt session at rest, release key via `LocalAuthentication`); wire app-lock at the root.
9. H-5: implement the force-update/min-version gate so compromised tokens can be revoked fleet-wide.

**Phase 3 — hardening:** M-1…M-7, L-1…L-5.

> ⚠️ Phase 1 changes RLS on live production tables. Per `CLAUDE.md`, tightening RLS is a "never do in a single release" operation without a migration path — an older client (or a row that doesn't satisfy the new predicate) can start getting permission-denied with no UX recovery. These must be staged and tested against the existing data, not shipped blind.
