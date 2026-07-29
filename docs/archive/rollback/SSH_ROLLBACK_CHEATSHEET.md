# ⚠️ OBSOLETE — SSH Rollback Cheatsheet (archived)

**Do not use.** This described a self-hosted Docker/Supabase box rollback of the abandoned `site_id`
multi-tenant migration via direct server shell access. That is not Brikly's production topology
(Cloudflare Pages + hosted Supabase + `company_id` multi-tenancy).

The original server-shell commands (redacted server IP `<REDACTED_SERVER_IP>` and project id
`<REDACTED_PROJECT_ID>`) have been removed. The full historical content remains in git history if
needed for audit.

➡️ Authoritative rollback procedure: [`docs/RUNBOOK_ROLLBACK.md`](../../RUNBOOK_ROLLBACK.md).
