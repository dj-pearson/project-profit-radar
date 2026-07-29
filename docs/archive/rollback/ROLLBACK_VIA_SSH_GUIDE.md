# ⚠️ OBSOLETE — Multi-Tenant Rollback via SSH (archived)

**Do not use.** This was the long-form guide for rolling back the abandoned `site_id` multi-tenant
migration by shelling directly into a self-hosted Docker/Supabase server. Brikly's production topology
is Cloudflare Pages + hosted Supabase + `company_id` multi-tenancy — there is no server to shell into.

The original server-shell/upload commands (redacted server IP `<REDACTED_SERVER_IP>` and project id
`<REDACTED_PROJECT_ID>`) have been removed. The full historical content remains in git history if
needed for audit.

➡️ Authoritative rollback procedure: [`docs/RUNBOOK_ROLLBACK.md`](../../RUNBOOK_ROLLBACK.md).
