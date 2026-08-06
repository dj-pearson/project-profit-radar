# Code Review — verified against `prd.json`

**Date:** 2026-08-06
**Scope:** Full-repo review, with every claim checked against the 287 stories in `prd.json`
(198 marked `passes: true`, 89 open).
**Method:** Ran the real toolchain (`npm ci`, `eslint`, `vitest`, `tsc`, the pre-commit guards),
queried GitHub Actions run history, and grepped the code for each claim rather than trusting
story notes.

**Headline:** the PRD's status flags are broadly honest about *what is left*, but they miss that
**CI has been failing on every run since at least 2026-06-28** — including every run on `main`.
Three of the six CI jobs fail for environmental reasons that have nothing to do with code quality,
and one of them silently disables the entire security guard suite.

---

## P0 — Fix now

### 1. CI is red on 100% of runs, and has been for ~5 weeks
**Not tracked by any story.** US-213 covers "make CI a merge gate" but assumes CI is otherwise green.

Last 30 `ci.yml` runs: **26 `failure`, 4 `cancelled`, 0 successes** — every `main` run included.
Latest `main` run ([30716178758](https://github.com/dj-pearson/project-profit-radar/actions/runs/30716178758)):

| Job | Result | Duration | Cause |
|---|---|---|---|
| Lint | ❌ fail | 40s | 220 real ESLint errors |
| Unit Tests | ❌ fail | **1s** | vitest can't start |
| Security Smoke Tests | ❌ fail | **0s** | vitest can't start |
| Build | ❌ fail | **0s** | missing env var |
| Type Check | ✅ pass | 48m | ratchet at baseline 2100 |
| E2E Tests | ⏭ skipped | — | depends on Build |

Three distinct root causes, all independently fixable:

**(a) Node 18 vs vitest 4** — every workflow pins `node-version: 18`, but the installed
`vitest@4.1.10` declares `engines.node: "^20.0.0 || ^22.0.0 || >=24.0.0"`. vitest exits
immediately, which is why Unit Tests and Security Smoke Tests both die in ~1 second.
`package.json` still declares `engines.node: ">=18.0.0"` and CLAUDE.md still says "Node 18+" —
both are now wrong.
→ Bump all 11 `node-version:` occurrences across `.github/workflows/*.yml` to 20 or 22, and
update `package.json` engines + CLAUDE.md.

**(b) Security guards never run.** Because the Security Smoke Tests job fails at step 5
(`npm run test:security`), steps 6–15 are **skipped** — the dependency audit, secret scanning,
CSP check, edge-function auth guard, migration filename guard, stray-copy guard, RLS
permissive-policy guard, tracked-cruft guard, migration back-compat guard, and index
CONCURRENTLY guard. Ten guards that the PRD counts as shipped protection (US-198, US-235,
US-237, US-239, US-249, US-250, US-255, US-261) have **never executed in CI**. They do still run
in the pre-commit hook, so this is a defence-in-depth loss rather than a total gap.
→ Fixed by (a), but also reorder so the guards run before the test step, or split them into
their own job so one failure can't mask ten.

**(c) Build fails on a missing env var.** `vite.config.ts:20-26` hard-throws when
`VITE_SUPABASE_PUBLISHABLE_KEY` is unset. `ci.yml`'s Build job never sets it. Reproduced locally:

```
error during build:
Error: [build] Missing required environment variable(s): VITE_SUPABASE_PUBLISHABLE_KEY.
```
→ Add the var to the Build job env (a dummy value is fine for a compile check), or make the
guard skip when `CI=true`.

> **Note on the Type Check job:** it passes, but takes **48 minutes** — it runs `tsc` twice-over on
> a 41,282-line `src/integrations/supabase/types.ts`. That's most of the CI bill for the weakest
> signal. Worth caching or narrowing.

### 2. INCIDENT (US-286) is still live — production DB dump remains committed
US-286 is correctly marked `passes: false`, but the exposure is **larger than the story describes**
and is still in the working tree today:

`backup/db_cluster-11-12-2025@04-13-16.backup.gz` — 1.4 MB compressed, **19.8 MB uncompressed**,
tracked by git. Contents:
- a full `pg_dumpall` cluster dump, **537 `COPY` table blocks**
- **`COPY auth.users`** — real user rows
- **3 bcrypt password hashes** (`$2a$10$…`)
- **28 distinct email addresses**, including personal Gmail accounts
- role definitions and grants

US-286's title says "purge committed production DB dump from git history" — but the file is not
merely in history, it is **currently tracked at HEAD**. Rotation of the affected user credentials
is required regardless of the git-history rewrite.

**Two guard gaps let this through and will let it happen again:**
- `scripts/check-no-tracked-cruft.sh` matches `\.backup$` — which does **not** match
  `.backup.gz`. Its patterns also miss `.sql.gz`, `.dump`, and the `backup/` directory.
- `.gitignore` covers `*.backup`, `backup_*.sql`, `backups/` (plural) — but **not** `backup/`
  (singular) or `*.backup.gz`.

Both guards currently report ✅ on a repo containing a production dump with password hashes in it.

> **Related:** US-261 is marked `passes: true` with a note claiming the tracked cruft was purged.
> It purged `tsc-output.txt`, `package.json.backup`, and the 0-byte `backup_*.sql` files — but
> missed this one, which is the only one that actually contained data.

### 3. Runtime crash: conditional React hooks in `InvoiceList`
**Not tracked by any story.** Introduced by US-037 (marked `passes: true`).

`src/components/invoices/InvoiceList.tsx`:
- line 215: `if (loading) { return (<Card>…Loading invoices…</Card>); }`
- line 409: `const parentRef = useRef<HTMLDivElement>(null);`
- line 410: `const virtualizer = useVirtualizer({…});`

On first render `loading` is `true`, so the component returns before those two hooks run. When
`loading` flips to `false`, React sees more hooks than the previous render and throws
*"Rendered more hooks than during the previous render."* This is the **normal** load path for the
invoice list, not an edge case.

→ Move both hooks above the `if (loading)` early return. `useVirtualizer` already takes
`enabled: displayInvoices.length > VIRTUALIZE_THRESHOLD`, so hoisting it is safe.

Three more `react-hooks/rules-of-hooks` errors exist (`useTemplate` called inside callbacks in
`src/components/templates/IndustryWorkflowTemplates.tsx:282` and
`src/pages/WorkflowAutomation.tsx:458`) — same rule, lower blast radius.

### 4. Unauthenticated public endpoints with no rate limit, validation, or captcha
Partly covered by US-241/US-243 (both open), but the *public* subset deserves separate priority —
these need no credentials at all.

Of the 13 functions on the `PUBLIC_ALLOWLIST` in `scripts/check-edge-function-auth.mjs`, four do
unbounded DB writes with zero protection:

| Function | Rate limit | Zod | Captcha | DB inserts |
|---|---|---|---|---|
| `handle-demo-request` | ❌ | ❌ | ❌ | 4 |
| `handle-sales-contact` | ❌ | ❌ | ❌ | 4 |
| `track-referral` | ❌ | ❌ | ❌ | 1 |
| `process-referral-signup` | ❌ | ❌ | ❌ | 2 |

(`capture-lead` and `email-unsubscribe` do have rate limiting — so the pattern exists and just
wasn't applied here.) Anyone can flood the CRM tables or forge referral attributions.

---

## P1 — Structural risk

### 5. Branch-protection rulesets can't gate on CI
US-213 is open, but the committed rulesets won't satisfy it as written. `.github/rulesets/main.json`
declares `deletion`, `non_fast_forward`, and `pull_request` rules — but **no `required_status_checks`
rule**, and no `"context"` entries appear in any of the four ruleset files. Applied as-is, PRs can
merge with CI red (which, per finding #1, is every PR).
→ Add a `required_status_checks` rule naming the job contexts once they're green. Sequence
matters: fix CI first, or merges deadlock.

### 6. No database backups exist at all (US-246)
Correctly open, and worse than "the `backup_*.sql` are 0 bytes" implies: there is **no backup
tooling of any kind** — no scripts matching `*backup*` in `scripts/`, no scheduled workflow, no
documented procedure. Combined with US-247 (no staging project) and US-248 (migrations applied via
`repair-migrations.ps1` / `mark-applied.ps1` / `rename-migrations.ps1`, all three still in the repo
root), the current posture is: **untested migrations applied by hand to a production database with
no recovery path.** These three stories should be treated as one workstream and done together.

### 7. Migration schema drift — duplicate `CREATE TABLE` definitions
US-244's note flags 3 competing `audit_logs` definitions and is `BLOCKED` on it. The problem is
much broader than audit_logs:

| Table | `CREATE TABLE` definitions |
|---|---|
| `time_entries` | 7 |
| `materials`, `material_usage`, `financial_snapshots`, `documents`, `document_categories`, `client_portal_access` | 6 each |
| `projects`, `supplier_catalog`, `report_schedules`, `report_history`, `purchase_recommendations` | 5 each |
| `audit_logs` | 3 |

Across 393 migrations, the true shape of a table is whatever the last-applied file said. This is
what actually blocks US-244, and it will block any future work touching these tables.
→ Needs a schema-reconciliation pass (dump live prod schema, diff against migration replay) before
US-244, US-262, US-275, US-276, or US-277 can proceed safely.

---

## P2 — Confirmed-accurate open items (no re-litigation needed)

Spot-checked and the PRD's numbers hold up:

| Story | Claim | Verified |
|---|---|---|
| US-240 | wildcard CORS in ~140 functions | **137** of 193 ✓ |
| US-241 | Zod on 17 of ~193 | **16** of 150 mutating ✓ |
| US-244 | ~3 of 148 write-functions log audit | **2** of 150 ✓ |
| US-202 | CSP still has `script-src 'unsafe-inline'` | ✓ (`public/_headers:24`) |
| US-212 | strict-mode backlog | baseline **2100** errors |
| US-270 | react-virtual used in 2 files | ✓ exactly 2 |
| US-262 | ad-hoc SQL at root | **21** `.sql` files |
| US-130/193 | iOS never submitted | ✓ `DEVELOPMENT_TEAM = ""`, v1.0.0 build 1 |

US-242 is worth re-opening: marked `passes: true` for "7 CRUD functions", but **8** functions use
`safeErrorResponse` against **170** that still reference `error.message` — ~4% coverage on a story
whose title is "Stop leaking raw DB/internal error messages."

---

## P2 — PRD bookkeeping errors

Two stories have **swapped statuses**, apparently from notes written into the wrong record:

- **US-269** ("Lazy-load heavy export libraries (xlsx/jspdf)") — marked `passes: true` with note
  *"ALREADY SATISFIED … uptime-health-check.yml already polls the health-check edge function…"*.
  That note describes US-280, not US-269. In fact `xlsx`/`jspdf` are **still statically imported**
  in 6 files (`WipReport.tsx`, `lib/export-formats.ts`, `lib/pdfGenerator.ts`,
  `utils/invoicePDFGenerator.ts`, `utils/pdfExportUtils.ts`). **US-269 is not done.**
- **US-280** ("Wire an uptime monitor + alerting") — marked `passes: false`, but
  `.github/workflows/uptime-health-check.yml` exists and polls every ~10 min with 3x retry and
  Slack escalation. **US-280 is done.**

Additionally, **40 of the 198 passing stories** carry notes hedging their own completion
("COMPLETED (partial)", "SUBSTANTIALLY COMPLETE; 4 tables deferred", "COMPLETED (mostly)",
"deferred to US-XXX"). The `passes: true` flag is being used for "the story was worked on" rather
than "the acceptance criteria are met" — which is why the 95%-complete framing in the PRD
description overstates readiness.

*I have not modified `prd.json` — flipping status flags affects what the Ralph agent picks up next,
so that's your call.*

---

## P3 — Quality backlog (measured)

ESLint across the repo: **220 errors, 4,458 warnings**.

| Rule | Count | Note |
|---|---|---|
| `@typescript-eslint/no-explicit-any` | 1,160 | US-009/021/027 fixed batches; backlog remains |
| `react-hooks/exhaustive-deps` | 389 | stale-closure risk |
| `@typescript-eslint/no-unused-vars` | 332 | |
| `jsx-a11y/label-has-associated-control` | 128 | ↓ |
| `jsx-a11y/no-static-element-interactions` | 51 | ↓ accessibility |
| `no-case-declarations` | 65 (errors) | ↓ |
| `no-useless-escape` | 49 (errors) | regex bugs likely hiding here |
| `unused-imports/no-unused-imports` | 44 (errors) | auto-fixable |
| `prefer-const` | 34 (errors) | auto-fixable |

**~78 of the 220 errors are auto-fixable** (`eslint --fix` reports 75). That's a third of the Lint
job's failures cleared in one commit.

Accessibility (218 a11y warnings total) confirms CLAUDE.md's "Known Gaps" entry; note that **no
automated a11y scanning runs in CI** despite US-215 — no `axe`/`pa11y` reference in any workflow.

**Repo sprawl:** 212 `.md` and 21 `.sql` files at the repo root, 3,171 tracked files. Many root
docs are superseded (multiple overlapping `PHASE*`, `SECURITY_*`, `EXPO_*`, `SEO*` files). Not a
correctness issue, but it's why audits keep rediscovering the same facts.

---

## Test suite

`npx vitest run` locally: **2,394 tests passed, 0 failures**, then the run **hangs** — no output
for 11+ minutes with the process still alive, stalling after
`src/components/help/__tests__/HelpLauncher.test.tsx`. Worth isolating (likely an unclosed timer or
open handle); a hanging suite will burn the full CI job timeout once finding #1(a) is fixed and
vitest actually starts running in CI.

101 unit test files in `src`, 9 E2E specs, 16 skipped tests (US-214 open, accurate). Coverage
thresholds are set at 60% in `vitest.config.ts` but aren't enforced as a CI gate.

---

## Suggested sequence

1. **Unblock CI** — Node 20 bump, `VITE_SUPABASE_PUBLISHABLE_KEY` in Build env, `eslint --fix`
   for the 78 auto-fixable errors. Gets 3 of 6 jobs green cheaply and reactivates 10 security guards.
2. **Close the incident** — `git rm --cached` the dump, widen the cruft guard regex and
   `.gitignore`, rotate the exposed credentials, then rewrite history (US-286).
3. **Fix the InvoiceList hook crash** — one-file change, user-visible.
4. **Rate-limit + validate the 4 public endpoints.**
5. **Fix the remaining lint errors, then add `required_status_checks`** to the rulesets (US-213).
6. **Backup/staging/migration-pipeline workstream** (US-246/247/248) + schema reconciliation,
   which unblocks US-244/262/275/276/277.
7. **Correct the PRD** — US-269 → open, US-280 → done, US-242 → re-open, and tighten what
   `passes: true` means for the 40 hedged stories.
