# ⚠️ OBSOLETE — Archived rollback docs

**Do not follow any procedure in this folder.** These documents describe a one-time rollback of the
abandoned `site_id` multi-tenant migration on a **self-hosted SSH/Docker Supabase box**. That is not
Brikly's production topology.

Brikly runs on **Cloudflare Pages + hosted Supabase + `company_id`-scoped multi-tenancy**. There is no
server to SSH into, and the `site_id` schema these docs roll back is not the current schema.

➡️ **The one authoritative rollback procedure is [`docs/RUNBOOK_ROLLBACK.md`](../../RUNBOOK_ROLLBACK.md).**

These files are retained only for historical/audit context. Any server IPs and project ids in them have
been redacted (`<REDACTED_SERVER_IP>`, `<REDACTED_PROJECT_ID>`).
