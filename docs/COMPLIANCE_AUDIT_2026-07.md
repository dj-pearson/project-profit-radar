# Brikly Compliance Audit — Legal Documents, ADA/WCAG, GDPR/CCPA

**Audit date:** July 23, 2026
**Scope:** Required legal/policy documents & public pages; ADA / WCAG 2.1 Level AA accessibility; GDPR & US state-privacy (CCPA/CPRA) operational mechanisms.
**Method:** Static source review of the React/TypeScript web app, Supabase edge functions and migrations, routing, and the existing accessibility/legal component libraries, plus execution of the committed accessibility test suite. Findings below are grounded in `file:line` evidence.
**Result of "are we fully compliant?":** **No — but the foundation is strong.** Brikly has a genuinely-built compliance stack (13 legal docs, a real opt-in consent store with GPC honoring, working DSAR export/erasure edge functions, a real accessibility component library). Full compliance is blocked by a small number of concrete, fixable defects — one of which (analytics firing before consent) is high-stakes and should be treated as urgent.

> **Disclaimer:** This is an engineering compliance audit, not legal advice. Several fixes require business inputs Claude cannot supply (a real registered address, a named DPO / EU Art. 27 representative, confirmation of live external services). Have counsel review the privacy/DPA/DMCA language before publishing corrected versions.

---

## 1. Executive summary — verdict by domain

| Domain | Verdict | Headline |
|---|---|---|
| **Legal document coverage** | 🟡 Strong, with defects | All 13 required docs exist, are routed publicly, and are substantive — but a **placeholder physical address** appears in 6 files, the **GDPR "Privacy Center" is auth-gated** (consumers can't reach it), and legal docs link to **routes that 404** (`/legal/security`, `/contact`). |
| **ADA / WCAG 2.1 AA** | 🟡 Partial — "Supports with significant exceptions" | Real accessible-component library, but **thin adoption** (5–28 of 314 pages), a **dead "Skip to navigation" link**, a **broken focus-trap hook**, and a **VPAT that over-claims** (51 "Supports" / 1 "Partially" / 0 "Does Not") while axe-core never actually runs and page-level a11y tests don't even load. |
| **GDPR / CCPA mechanisms** | 🟠 One critical gap, otherwise solid | Consent is correctly **opt-in**, GPC is honored, and DSAR **export/erasure are really wired to backends** — but **PostHog analytics initializes and captures on page load with no consent gate**, directly contradicting the opt-in banner. Two subprocessors (Twilio, AWS SES) are used but undisclosed. |

**The single most urgent item in this entire audit:** non-essential analytics (PostHog) fires regardless of the cookie banner. See §4.1.

---

## 2. Priority-ranked remediation roadmap

Ranked by legal exposure × ease of fix. Each item links to its detailed finding below.

### P0 — Urgent (active legal exposure, ship this week)
1. **Gate PostHog (and web-vitals/Sentry) on consent.** Analytics collects before opt-in — a GDPR/ePrivacy consent-before-collection problem *and* a misrepresentation vs. the app's own opt-in banner and CCPA opt-out toggle. (§4.1)
2. **Replace the placeholder company & DMCA-agent address** in 6 files. A fake postal address undermines CAN-SPAM, the DMCA designated-agent registration, and state-privacy contact disclosures. (§3.2)

### P1 — High (fix within the release)
3. **Fix the public data-subject-rights path.** Privacy Policy and "Do Not Sell" send consumers to `/gdpr-compliance`, which is behind a `RouteGuard` → `/auth`. Either build a public DSAR request page or repoint those links to the working `PrivacyControls` surface / a `mailto:`. (§3.3)
4. **Create `/legal/security` (or remove the references).** The DPA and Subprocessors pages contractually point customers to a security page that 404s. (§3.4)
5. **Disclose Twilio and AWS SES** as subprocessors. (§4.4)
6. **Fix or remove the dead "Skip to navigation" skip link** (`id="main-navigation"` exists nowhere) and the broken `AccessibilityUtils.useFocusTrap`. (§5.2)

### P2 — Medium (correctness & credibility)
7. **Add a `/contact` page** — referenced by "Do Not Sell" and the AUP. (§3.4)
8. **Right-size the VPAT.** Downgrade unverified "Supports" ratings to "Partially Supports" until evidence exists; remove claims of ESLint heading-order enforcement and axe/Lighthouse testing that aren't wired. (§5.4)
9. **Wire axe-core into the test harness** and fix the `@capacitor/haptics` import so page-level a11y tests run in a clean checkout. (§5.3)
10. **Name a DPO / EU Art. 27 representative** or remove the "will be assigned" language; resolve the two "coming soon" stubs in the GDPR console; confirm `status.brikly.net` is live before the SLA relies on it. (§3.5)
11. **De-duplicate `<SkipLinks>`** (rendered up to 3× on authenticated pages) and add accessible-name coverage for icon-only buttons. (§5.2, §5.5)

---

## 3. Legal & policy document coverage

**Bottom line:** Coverage is excellent. All 13 required documents for a US-based B2B SaaS that also serves EU users exist, are substantive (not stubs), are lazy-loaded on public routes in `src/routes/marketingRoutes.tsx`, and are reachable from the footer. Product naming ("Brikly Inc.") and domain (`brikly.net`) are consistent; contact emails are role-appropriate (`privacy@`, `legal@`, `dmca@`, `security@`, `abuse@`, `accessibility@`, etc.) and consistent across docs. Effective dates are present on every document.

### 3.1 Document inventory

| Document | File | Public route | In footer | Lines | Status |
|---|---|---|---|---|---|
| Privacy Policy | `src/pages/PrivacyPolicy.tsx` | `/privacy-policy`, `/privacy` | ✅ | 318 | Substantive |
| Terms of Service | `src/pages/TermsOfService.tsx` | `/terms-of-service`, `/terms` | ✅ | 344 | Substantive |
| Cookie Policy | `src/pages/legal/CookiePolicy.tsx` | `/cookie-policy`, `/cookies` | ✅ | 102 | Substantive |
| Acceptable Use Policy | `src/pages/legal/AcceptableUsePolicy.tsx` | `/acceptable-use-policy`, `/aup` | ✅ | 153 | Substantive |
| Refund & Cancellation | `src/pages/legal/RefundPolicy.tsx` | `/refund-policy`, `/cancellation-policy` | ✅ | 147 | Substantive |
| DMCA Policy | `src/pages/legal/DMCAPolicy.tsx` | `/dmca` | ✅ | 121 | Substantive |
| Service Level Agreement | `src/pages/legal/ServiceLevelAgreement.tsx` | `/sla` | ✅ | 163 | Substantive |
| Data Processing Agreement | `src/pages/legal/DataProcessingAgreement.tsx` | `/dpa` | ✅ | 177 | Substantive |
| Subprocessors | `src/pages/legal/Subprocessors.tsx` | `/subprocessors` | ✅ | 150 | Substantive |
| AI Disclosure | `src/pages/legal/AIDisclosure.tsx` | `/ai-disclosure` | ✅ | 141 | Substantive |
| Do Not Sell / Your Privacy Choices | `src/pages/legal/DoNotSell.tsx` | `/do-not-sell`, `/your-privacy-choices` | ✅ | 88 | Substantive |
| Email Preferences | `src/pages/legal/EmailPreferences.tsx` | `/email-preferences`, `/unsubscribe` | ✅ | 247 | Substantive + functional |
| Accessibility Statement | `src/pages/AccessibilityStatement.tsx` | `/accessibility-statement` | ✅ | 538 | Substantive |
| GDPR "Privacy Center" | `src/pages/GDPRCompliance.tsx` | `/gdpr-compliance` **(auth-gated)** | ❌ | 899 | Internal admin DSAR console — **not** a public rights page |

### 3.2 Placeholder physical address (P0)

The fake address **"123 Construction Way, Suite 100, Builder City, BC 12345, USA"** appears in:
`PrivacyPolicy.tsx:288`, `TermsOfService.tsx:339`, `legal/DMCAPolicy.tsx:70`, `legal/DoNotSell.tsx:58`, `legal/RefundPolicy.tsx:142`, and `components/Footer.tsx:126-128`.

Why it matters: CAN-SPAM requires a valid physical postal address in commercial email; the DMCA page claims the agent is registered with the US Copyright Office (an inaccurate agent address undermines safe-harbor); and state privacy laws require accurate contact disclosures. **Replace with the real registered business address** everywhere.

### 3.3 GDPR/DSAR path is broken for consumers (P1)

`PrivacyPolicy.tsx:226` and `legal/DoNotSell.tsx:55` route data subjects to `/gdpr-compliance` as a self-service "Privacy Center," but `operationsRoutes.tsx:44` wraps that route in `<RouteGuard>`, which redirects unauthenticated visitors to `/auth` (`src/components/ProtectedRoute.tsx:71-78`). A prospective EU/California consumer following the Privacy Policy cannot exercise their rights via this link.

Note: the **working** self-service controls do exist for logged-in users — `src/components/legal/PrivacyControls.tsx`, surfaced at `UserProfile.tsx:459` — and they are wired to real export/delete backends (§4.2). The fix is to point the public policy links there (or to a `mailto:privacy@brikly.net` intake) rather than at the auth-gated admin console.

### 3.4 Broken cross-links legal docs depend on (P1/P2)

- **`/legal/security` 404s** but is referenced by `DataProcessingAgreement.tsx:22` (related links) and `:92` (body: "make Security Measures available… at Security"), and `Subprocessors.tsx:93`. The DPA contractually points customers to a security page that doesn't exist. Create the page or remove the references. A public security/vulnerability-disclosure page (and a `security.txt`) is also independently advisable — the footer shows a "SOC 2 In Progress" badge.
- **`/contact` 404s** but is referenced by `DoNotSell.tsx:20` ("Contact Us") and `AcceptableUsePolicy.tsx:22` ("Report Abuse"). Add a contact/imprint page; the footer currently only offers a `mailto:`.

### 3.5 Lower-severity legal items (P2)

- **No named DPO / EU Art. 27 representative** — `PrivacyPolicy.tsx:290-293` says one "will be assigned where required." For a product explicitly serving EU users, name one or remove the placeholder language.
- **Two "coming soon" stubs** inside the GDPR console: `GDPRCompliance.tsx:668` (retention management) and `:686` (processing-activities register).
- **External status page unverified** — `ServiceLevelAgreement.tsx:21,59,157` promise real-time status and post-mortems at `https://status.brikly.net`; confirm it's live.
- **Effective dates** are all "April 13, 2026" (Accessibility Statement 2026-01-12) — plausibly current; refresh on the next substantive edit.

---

## 4. GDPR / CCPA operational mechanisms

**Bottom line:** This is a genuinely-implemented privacy stack, not policy theater — real edge functions, real DB tables with RLS, real Global Privacy Control honoring. There is **one material contradiction** (analytics not consent-gated) and one **medium** gap (undisclosed subprocessors).

### 4.1 🔴 CRITICAL — analytics fires before consent (P0)

The cookie banner is correctly **opt-in**: the consent store defaults to `ALL_DENIED` (`src/lib/consent/consentStore.ts:51-56`, `112-119`), offers granular categories (essential/analytics/marketing/preferences), gives "Reject all" equal prominence to "Accept all" (`CookieConsentBanner.tsx:134-139`), maps the X button to reject (`:150-157`), and persists a versioned, revocable, server-audited (`consent_ledger`) record. **Google Analytics is correctly gated** via Google Consent Mode v2 defaults set to `denied` in `index.html:324-333` before GTM loads, synced by `syncToGoogleConsentMode()` (`consentStore.ts:200-220`).

**But PostHog is not gated.** `src/lib/analytics.ts:542` runs `Analytics.init()` unconditionally on module import; that calls `initPostHog()` (`analytics.ts:42-62`) with `autocapture: true, capture_pageview: true` and **no reference to the consent store anywhere in the file** (confirmed: `consentStore` is imported only by `Footer.tsx`, `CookieConsentBanner.tsx`, and `PrivacyControls.tsx` — never by `analytics.ts`). PostHog therefore captures pageviews and autocapture events regardless of the banner choice and regardless of the "Do Not Sell" analytics toggle. Web-vitals telemetry (`analytics.ts:516-538`) and Sentry init (`src/lib/sentry.ts:29`) ride the same ungated path.

This is doubly serious because `consentStore.ts:7` **documents** a "PostHog bootstrap (reads consent)" that does not exist in code — so the app misrepresents its own behavior.

**Fix:** gate `initPostHog()` / `Analytics.track` on a `mayLoadAnalytics()` check against `getEffectiveConsent()`, and subscribe to consent changes so opt-in/opt-out takes effect live (mirror the Google Consent Mode pattern already in place). Treat Sentry/web-vitals the same, or justify them explicitly as strictly-necessary.

### 4.2 DSAR / data-subject rights — mostly IMPLEMENTED

Backed by real tables (`supabase/migrations/20260414000000_legal_compliance_tables.sql`: `data_subject_requests`, `consent_ledger`, `email_preferences`, all with RLS).

| Right | Status | Evidence |
|---|---|---|
| Access / Export | ✅ Implemented | `supabase/functions/data-subject-export/index.ts` — auth-scoped multi-table read, rate-limited, machine-readable JSON (`format_version: 1`), writes audit row. Wired at `PrivacyControls.tsx:79`. |
| Portability | ✅ Implemented (partial) | Same JSON export; large-account signed-URL path is a documented TODO (`data-subject-export/index.ts:180-184`) — adequate for typical records. |
| Erasure | ✅ Implemented | `data-subject-delete/index.ts` records a deletion request with a 30-day grace `due_at` and bans the account; `process-dsar-fulfillment/index.ts` (service-role cron, fails closed at `:70-81`) deletes past `due_at` via `admin.auth.admin.deleteUser` (FK CASCADE). |
| Rectification | 🟡 Manual only | No self-service correction; `PrivacyControls.tsx:341-356` routes to `privacy@brikly.net`; cron flags for human review. Legally permissible; not automated. |

The `PrivacyControls` handlers degrade gracefully to logging a request row if the edge function is unavailable (`:92-105, 144-155`), so the audit trail survives a deploy gap. These are **real, wired controls**, not dead UI.

### 4.3 CCPA "Do Not Sell" + GPC — functional

**GPC is honored, continuously.** `isGlobalPrivacyControlActive()` (`consentStore.ts:69-73`) is enforced in `getEffectiveConsent()` (force-denies analytics+marketing even over stored consent, `:115-118`), auto-persists a reject-all record on banner mount (`CookieConsentBanner.tsx:51-57`), and drives a live status banner in `PrivacyControls.tsx:209-217`. The `DoNotSell.tsx` page is prose but correctly directs users to two-plus working mechanisms (GPC, Cookie Preferences center, email/Privacy Center) — satisfying CCPA's multi-method requirement **once the §4.1 analytics-gating gap is fixed** (today the analytics opt-out the page promises is partially undermined by ungated PostHog).

### 4.4 Subprocessor list — accurate but incomplete (P1)

`Subprocessors.tsx` correctly names Supabase, Cloudflare, Stripe, Sentry, PostHog, Anthropic, Google, and Intuit/QuickBooks — matching real integrations. **Missing but in use:**
- **Twilio** — `supabase/functions/twilio-calling/index.ts:37-39` (calling/SMS; processes phone numbers).
- **AWS SES** — `supabase/functions/send-email/index.ts:5` → `_shared/ses-email-service.ts` (email delivery; processes email addresses/content).

Add both to keep the disclosure accurate.

### 4.5 Accountability, retention & breach — present

Audit logging exists (`supabase/migrations/20250202000012_audit_logging_compliance.sql`, `audit_logs` exported in DSARs). Breach notification is committed at "within 72 hours" (`DataProcessingAgreement.tsx:123-127`, GDPR Art. 33-aligned). Retention is documented (30-day grace + 90-day backup rollout, statutory carve-outs for tax/payroll) though concrete per-data-type periods live in prose rather than enforced in code.

---

## 5. ADA / WCAG 2.1 Level AA accessibility

**Bottom line:** Honest conformance is **"Partially Supports"** — not the blanket "Supports" the VPAT claims. The infrastructure is real and several components are correct, but adoption is thin, a few concrete defects exist, and the automated testing story is overstated.

### 5.1 Infrastructure — genuinely built, mostly correct

`src/components/accessibility/` is real and non-trivial:
- **`AccessibleModal.tsx`** — correct: scoped focus trap (from `useAccessibilityHelpers.ts`), `role="dialog"` + `aria-modal`, labelledby/describedby, Escape, click-outside, scroll-lock, focus restoration. Tests pass (13/13).
- **`AccessibleForm.tsx`** — strong: label association, `aria-invalid`/`aria-required`/`aria-describedby`, `role="alert"`, assertive live region, focus-first-error.
- **`AccessiblePageWrapper.tsx`** — correct landmarks, `main#main-content` with `tabIndex={-1}`, route-change announcer.
- **`useAccessibility` + `AccessibilityPanel`** — real reduced-motion / high-contrast / font-size prefs, persisted and applied via document classes.
- **Global CSS** (`src/index.css`) — real `:focus-visible`, reduced-motion media query + toggle, high-contrast, `.sr-only`, skip-link styles. **`html lang="en"`** present (`index.html:2`); zoom allowed. **ESLint `jsx-a11y`** is configured with 31 rules and `alt-text` runs as an error in the pre-commit hook — a meaningful guardrail.

### 5.2 Defects (P1)

- **Dead "Skip to navigation" link.** `SkipLinks.tsx` targets `getElementById('main-navigation')`, but **`id="main-navigation"` exists nowhere in `src/`** (verified: 0 occurrences). This is a demonstrable partial failure of WCAG 2.4.1 — the exact criterion the VPAT marks "Supports." Only "Skip to main content" reliably works.
- **Broken focus-trap hook.** `AccessibilityUtils.tsx` `useFocusTrap` (lines 32-66) queries `document.querySelectorAll` across the **whole page**, not a scoped container — any consumer of *this* hook (there are two same-named hooks; the good one lives in `useAccessibilityHelpers.ts`) gets a non-functional trap. A footgun.
- **Duplicate `<SkipLinks>`** rendered by `AccessibilityProvider` (app-wide) *and* `DashboardLayout` *and* `AccessiblePageWrapper` — authenticated pages can show two sets of skip links.

### 5.3 Adoption reality vs. the checklist

314 files live under `src/pages`. Actual accessible-component usage:

| Component | Real usage | Checklist exec-summary said | Target |
|---|---|---|---|
| `AccessiblePageWrapper` | **28** | "0" | All |
| `AccessibleModal` | **7** | "2" | 67 |
| `AccessibleForm` | **5** | "1" | 17 |
| `AccessibleTable` | **10** (15 incl. components) | "0" | 14 |

The internal checklist **contradicts itself** — its exec summary ("2 pages") and its tracking table ("47/125+ ≈ 38%, P1–P4 = 100%") measure different things. Reconciliation: **"UPDATED" ≠ "uses the accessible library."** Most "remediated" pages had ARIA hand-sprinkled onto existing shadcn `Dialog`/`Table`/forms; only `MyTasks.tsx` is a full reference implementation. **174 files still use shadcn `DialogContent`** and **36 files use raw `<table>`**. In fairness, Radix/shadcn `Dialog` ships its own focus trap + `aria-modal` + Escape, so "not on AccessibleModal" ≠ "inaccessible" — but per-instance ARIA correctness is unverified at that scale.

### 5.4 Testing story is overstated (P2)

- **axe-core never runs.** `src/test/accessibility-utils.ts` exports `expectNoA11yViolations` and `axe-core`/`vitest-axe` are dependencies, but **0 test files import them** (verified). Every a11y test only asserts basic role/attribute presence.
- **Page-level a11y tests don't load** in a clean checkout: all 5 (`Dashboard/Financial/Invoices/Projects/Settings.a11y.test.tsx`) fail with `Failed to resolve import "@capacitor/haptics" from src/hooks/useHaptics.ts` — **`@capacitor/haptics` is not in `package.json`** (verified).
- Component-level tests that do run pass (`SkipLinks` 6/6, `AccessibleModal` 13/13).
- The VPAT claims axe-core/Lighthouse/Playwright evaluation and ESLint-enforced heading order; **no `heading-order` ESLint rule exists** and axe isn't wired. The VPAT marks **51 criteria "Supports," 1 "Partially," 0 "Does Not"** — over-claiming given the defects above.

### 5.5 Top WCAG 2.1 AA risk areas (prioritized)

1. **Icon-only controls without accessible names** (2.4.4 / 4.1.2) — ~71 `size="icon"` buttons; `jsx-a11y` can't see missing `aria-label` on the custom `<Button>` wrapper, so they escape lint. Highest-volume real risk.
2. **Un-remediated modals/tables at scale** (1.3.1 / 2.1.1) — 174 shadcn dialogs + 36 raw tables depend on inconsistent per-instance ARIA.
3. **Dead skip-to-nav link** (2.4.1) — see §5.2.
4. **Heading hierarchy unverified** (1.3.1 / 2.4.6) — claimed ESLint enforcement doesn't exist.
5. **Color contrast unverified** (1.4.3) — VPAT asserts 4.5:1 but no automated check runs.

---

## 6. What's already good (don't re-do)

To avoid re-litigating solved problems, these are genuinely in good shape: the full set of 13 legal documents and their public routing; the opt-in consent architecture with granular categories, reject-all parity, versioning, and server-side audit; **Global Privacy Control honoring** (better than many mature SaaS products); Google Consent Mode v2 gating; **working DSAR export and erasure edge functions** with grace periods and fail-closed cron auth; breach-notification and retention commitments in the DPA; a real accessible-component library with correct modal/form/landmark implementations; `lang` attribute, focus-visible styling, reduced-motion support, and a `jsx-a11y` pre-commit guardrail.

---

## 7. Suggested next step

Most P0/P1 fixes are code changes I can implement on this branch now (consent-gating analytics, fixing the skip-link target and broken hook, adding Twilio/AWS SES to the subprocessor list, repointing the DSAR links, creating `/legal/security` and `/contact` pages, right-sizing the VPAT). The items I **cannot** complete without business input are: the real registered address, a named DPO/EU representative, and confirming `status.brikly.net`. Tell me which fixes to make and I'll open them as a follow-up on this branch.
