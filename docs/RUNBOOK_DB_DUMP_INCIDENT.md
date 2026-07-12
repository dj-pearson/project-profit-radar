# Runbook — Committed Production DB Dump Incident (US-286)

**Severity: Critical.** A full PostgreSQL cluster dump was committed to this repo.
US-261 removed the files from the working tree, but the data is **still in git
history** and every credential it contains must be treated as compromised.

## 1. What was exposed

Three tracked blobs (removed from the tree in commit `62e0769`, still in history):

```
backups/db_cluster-17-12-2025.backup       (20.6 MB, plaintext SQL)
backups/db_cluster-17-12-2025.backup.gz     (1.5 MB)
backups/db_cluster-15-12-2025@04-32-12.backup.gz (1.5 MB)
```

Contents span **538 tables**, including:

- **`auth.users`, `auth.identities`, `auth.sessions`, `auth.refresh_tokens`,
  `auth.mfa_factors`** — full authentication state (~24,000 JWTs present).
- **`pgsodium.key`** — database column-encryption keys.
- Application tables containing **`service_role` references, Stripe keys
  (`stripe_keys`), API keys (`ai_model_configurations`)**, and all customer/company
  PII, financials, and documents.

Assume anyone who could clone the repo while these blobs were present has all of
the above. **Do not delay rotation.**

## 2. Immediate containment (do first, minutes matter)

1. **Rotate the Supabase `service_role` key and the JWT secret** (Supabase
   dashboard → Project Settings → API → "Reset"/"Roll"). Rolling the JWT secret
   **invalidates every existing access & refresh token**, forcing all users to
   re-authenticate — this neutralizes the ~24k leaked JWTs. Update the new
   `service_role` key wherever it is configured (Supabase function secrets,
   Cloudflare Pages env, CI secrets).
2. **Rotate Stripe API keys** (Stripe dashboard → Developers → API keys → Roll)
   and update `stripe_keys` / the Stripe function secret.
3. **Re-key `pgsodium`** — rotate the column-encryption key(s) and re-encrypt
   affected columns per Supabase Vault/pgsodium docs. The leaked keys can decrypt
   any ciphertext also present in the dump.
4. **Rotate any other API keys stored in dumped tables** (PostHog,
   `ai_model_configurations`, integration tokens, SMTP/SES creds).

## 3. Purge the blobs from git history

Requires [`git-filter-repo`](https://github.com/newren/git-filter-repo)
(`pip install git-filter-repo` or `brew install git-filter-repo`). **Coordinate
first** — this rewrites history and force-pushes protected branches.

```bash
# 0. Announce a freeze; make sure no PRs are mid-merge. Take a full backup clone:
git clone --mirror git@github.com:dj-pearson/project-profit-radar.git ppr-mirror.git

# 1. In a fresh clone, strip the blobs from ALL refs/history:
git clone git@github.com:dj-pearson/project-profit-radar.git ppr-clean
cd ppr-clean
git filter-repo --force \
  --path backups/db_cluster-17-12-2025.backup \
  --path backups/db_cluster-17-12-2025.backup.gz \
  --path "backups/db_cluster-15-12-2025@04-32-12.backup.gz" \
  --invert-paths
# (or simply: git filter-repo --path backups/ --invert-paths  — removes the whole dir)

# 2. Re-add the remote (filter-repo drops it) and force-push every branch + tags:
git remote add origin git@github.com:dj-pearson/project-profit-radar.git
git push --force --all origin
git push --force --tags origin
```

Because this touches `main`, `develop`, `release/*`, `hotfix/*` (all
force-push-protected per the rulesets), a **repo admin must temporarily allow the
force-push** (or run it via the admin bypass), then re-lock.

## 4. After the rewrite

1. **Every collaborator must re-clone** (or hard-reset to the new history) — old
   local clones still contain the blobs and can reintroduce them.
2. **GitHub caches**: opened PRs, forks, and the GitHub blob cache may retain the
   objects. Open a GitHub Support ticket to purge cached views of the removed
   commits, and delete/rebase any fork that has them.
3. **Delete the mirror backup** (`ppr-mirror.git`) once you're confident the
   rewrite is good — it still contains the secrets.

## 5. Access review & breach assessment

- Pull the repo's **clone/access audit** (GitHub → Insights / audit log) for the
  window the blobs were present (first added in a commit reachable from
  `4f3dc1d`, PR #145 era, through `62e0769` on 2026-07-12). Identify every actor
  who could have cloned.
- Assess **breach-notification obligations** for the exposed customer PII
  (GDPR/CCPA/state laws) with legal/compliance — `auth.users` + company data for
  real customers is in scope.

## 6. Verify & prevent recurrence

```bash
# Confirm nothing secret-bearing remains in the rewritten history:
gitleaks detect --source . --log-opts="--all"          # full-history scan
git rev-list --all --objects | grep -i backups         # should return nothing
```

- The **`scripts/check-no-tracked-cruft.sh`** guard (added in US-261, wired into
  CI + pre-commit) already blocks re-committing `*.backup`, `backup_*.sql`,
  `Crash/`, and `.env_backup`. Keep it.
- Real backups belong in **Supabase-managed PITR / off-repo storage**, never in
  git (see US-246).

## 7. Sign-off checklist

- [ ] service_role key + JWT secret rotated; all sessions invalidated
- [ ] Stripe keys rotated; `stripe_keys` updated
- [ ] pgsodium re-keyed; affected columns re-encrypted
- [ ] Other API keys in dumped tables rotated
- [ ] History purged on all branches + tags; force-pushed
- [ ] Collaborators re-cloned; forks/PRs cleaned; GitHub cache purge requested
- [ ] Access log reviewed; breach assessment completed with legal
- [ ] gitleaks full-history scan clean; mirror backup destroyed
