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

## Status checks — intentionally NOT set yet

We do **not** include `required_status_checks` in any ruleset right now. Here's why and how to add them later.

**Why not now:** required check names that don't exist on a PR block all merges. The CI workflow today (`.github/workflows/ci.yml`) runs `lint`, `typecheck`, `unit-test`, `build`, `e2e-test`, `security`. But:

1. CI currently only triggers on `push: branches: [main]` and `pull_request: branches: [main]`. PRs into `develop` / `release/*` / `hotfix/*` won't run CI yet → required check would be "expected" forever → no merge possible.
2. Required check names must match exactly. Adding them before CI is verified on every protected target is a footgun.

**How to add them once CI runs on PRs to all protected branches:**

1. Update `.github/workflows/ci.yml` so `on.pull_request.branches` includes `main`, `develop`, `release/**`, `hotfix/**` (and same for `on.push` if you want post-merge runs).
2. Open one PR per protected branch and confirm the check names that show up. The names you'll see are the job `name:` fields: `Lint`, `Type Check`, `Unit Tests`, `Build`, `E2E Tests`, `Security Smoke Tests`.
3. Add a `required_status_checks` rule to the appropriate JSON files. Use `integration_id: 15368` (GitHub Actions) so the source app is locked. Example for `main.json`:

   ```json
   {
     "type": "required_status_checks",
     "parameters": {
       "strict_required_status_checks_policy": true,
       "required_status_checks": [
         { "context": "Lint",            "integration_id": 15368 },
         { "context": "Type Check",      "integration_id": 15368 },
         { "context": "Unit Tests",      "integration_id": 15368 },
         { "context": "Build",           "integration_id": 15368 },
         { "context": "E2E Tests",       "integration_id": 15368 },
         { "context": "Security Smoke Tests", "integration_id": 15368 }
       ]
     }
   }
   ```

4. Re-apply via the apply loop below. Watch the next PR; if a name is wrong, fix it immediately — required-check misnames brick merges.

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
