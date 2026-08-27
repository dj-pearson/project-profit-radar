# GitHub Branch Rulesets

Canonical, version-controlled definitions for the branch protections enforced on this repo. The JSON files here are the source of truth — GitHub's UI state should match them. If they ever drift, **the JSON wins**; re-apply.

These are **Rulesets** (the modern, layerable system under *Settings → Rules → Rulesets*), not classic Branch Protection Rules. Don't mix the two on the same branch.

## Branch → protections

| Ruleset file    | Targets             | Blocks delete | Blocks force-push | Requires PR to merge in | Notes |
|-----------------|---------------------|:-------------:|:-----------------:|:-----------------------:|-------|
| `main.json`     | `refs/heads/main`         | yes | yes | **yes** | Production. `dismiss_stale_reviews_on_push` + `required_review_thread_resolution` on. |
| `develop.json`  | `refs/heads/develop`      | yes | yes | **yes** | Integration. Looser review-thread requirements so iteration stays fast. |
| `release.json`  | `refs/heads/release/*`    | yes | yes | **yes** | Stabilization branches; protected so a stray push during App Store review can't break the candidate. |
| `hotfix.json`   | `refs/heads/hotfix/*`     | yes | yes | **no**  | Direct commits to the hotfix branch *itself* are fine — the actual gate is the PR `hotfix/* → main` (enforced by `main.json`). |

All four rulesets:

- `enforcement: "active"`
- Bypass actor: **repo admin role** (`actor_id: 5`, `actor_type: "RepositoryRole"`, `bypass_mode: "always"`) so you can override in genuine emergencies (e.g. force-push to recover from a corrupted history). Use sparingly; log it.

## Solo-friendly defaults (current state)

- `required_approving_review_count: 0` on `main`, `develop`, `release/*`. **GitHub will not let an author approve their own PR**, so requiring even 1 approval deadlocks a solo workflow. PR is still required — you just self-merge once CI is green. This is the intentional trade-off for solo dev: enforce *process* (PR + checks), not *peer review* (impossible solo).
- When a second human reviewer joins, bump `required_approving_review_count` to `1` in `main.json`, `develop.json`, `release.json` and re-apply. Consider also flipping `require_code_owner_review: true` on `main.json`.

## Status checks — required on main, develop and release/*

`main.json`, `develop.json` and `release.json` each require these five, locked to
GitHub Actions via `integration_id: 15368` so another app cannot post a
same-named green check:

| Context | Job | What it gates |
|---|---|---|
| `Lint` | `lint` | eslint over the repo |
| `Type Check` | `typecheck` | the TS error-budget ratchet, not raw `tsc` — see below |
| `Unit Tests` | `unit-test` | `npm run test:run` |
| `Build` | `build` | the production Vite build |
| `Security Smoke Tests` | `security` | the security unit suite, the dependency audit, the secret scan, and all twelve `scripts/check-*` guards |

`Security Smoke Tests` is required because every repo guard lives in that job —
CORS scoping, edge input validation, privilege writes, RLS write paths, audit
coverage, silent writes, migration hygiene. Leaving it optional would make all
of them decorative.

`hotfix.json` deliberately has **no** required checks: CLAUDE.md allows direct
commits to a hotfix branch, and the real gate is the PR into `main`, which
carries the full set.

**`Type Check` is safe to require even though `tsc` is red.** The job runs
`scripts/check-ts-error-budget.mjs` (US-258), which compares the error count
against `.github/ts-error-baseline.txt` and fails only on a regression. US-213's
original note that this had to wait for US-212 is out of date — the ratchet
removed that dependency.

**`strict_required_status_checks_policy`** is `true` on `main` and `release/*`
(a PR must be up to date with the base before merging) and `false` on `develop`,
so routine integration work is not forced to re-run on every unrelated merge.

### The trigger prerequisite

A required check that never runs blocks every merge into that branch, forever.
`on.pull_request.branches` in `ci.yml` filters on the **base** branch, so it
must list every branch carrying a required check. It currently lists `main`,
`develop` and `release/**` — matching the three rulesets above. **If you add
required checks to another ruleset, add its pattern to that filter in the same
change.**

### Verifying the gate actually works (US-213 AC3)

After applying, open a throwaway PR into `develop` with a deliberate lint error
and confirm GitHub reports the merge as blocked. A ruleset that is applied but
not verified is not a gate — the failure mode is a misnamed context sitting in
"Expected" forever, which looks similar to "pending" at a glance.

## Applying the rulesets (apply loop)

Run from a shell where you're authenticated as a repo admin. **Note for Git Bash on Windows:** paths to the GitHub API must have **no leading slash** (`repos/...`, not `/repos/...`) — Git Bash will path-translate the leading slash and you'll get 404s.

```bash
OWNER=dj-pearson
REPO=project-profit-radar

# 1. List existing rulesets so we don't duplicate
gh api "repos/$OWNER/$REPO/rulesets"

# 2. Apply each ruleset: find by name → PUT if exists else POST
for f in .github/rulesets/main.json .github/rulesets/develop.json .github/rulesets/release.json .github/rulesets/hotfix.json; do
  NAME=$(jq -r .name "$f")
  ID=$(gh api "repos/$OWNER/$REPO/rulesets" --jq ".[] | select(.name==\"$NAME\") | .id")
  if [ -n "$ID" ]; then
    echo "Updating ruleset $NAME (id=$ID)"
    gh api -X PUT "repos/$OWNER/$REPO/rulesets/$ID" --input "$f"
  else
    echo "Creating ruleset $NAME"
    gh api -X POST "repos/$OWNER/$REPO/rulesets" --input "$f"
  fi
done

# 3. Verify
gh api "repos/$OWNER/$REPO/rulesets" --jq '.[] | {id, name, target, enforcement}'
```

If `gh` isn't installed, equivalent `curl`:

```bash
curl -sS -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/$OWNER/$REPO/rulesets \
  -d @.github/rulesets/main.json
```

(The token needs `repo` + `admin:org` if the repo is in an org. For a personal repo, a fine-grained token with `Administration: Read and write` on this repo is enough.)

## Changing a ruleset

1. Edit the JSON here in a PR (so the change is reviewable and logged).
2. After the PR merges to `main`, re-run the apply loop above.
3. **Never** edit the ruleset in the GitHub UI without also updating the JSON — UI drift defeats the point of having this directory.

## Emergency bypass

You're listed via the repo-admin bypass actor. To override a rule in a real emergency (e.g. force-push to undo a bad merge):

1. Do the operation.
2. Open an issue titled `bypass-log: <date> <ruleset>` describing what you bypassed and why.
3. If the bypass exposed a gap in the rules, fix the JSON.
