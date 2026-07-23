# Runbook — Uptime Monitoring & Alerting

How Brikly detects and escalates a production outage of its Supabase
dependencies (database, auth, storage).

## What monitors what

| Piece | Location | Role |
|-------|----------|------|
| `health-check` edge function | `supabase/functions/health-check/` | Probes DB, auth, and storage on each request. Returns **200** only when all three are healthy; **503** when any dependency is `degraded` (returned an error) or `unhealthy` (threw). Body: `{ status, services, totalResponseTime, timestamp, version }`. |
| Uptime workflow | `.github/workflows/uptime-health-check.yml` | GitHub Actions cron (~every 10 min) that pings the deployed health-check URL, retries 3× (15s apart) to debounce transient latency, and **fails the run** when the endpoint is not `200 healthy`. |
| Status logic | `supabase/functions/health-check/evaluate.ts` | Pure `evaluateHealth()` mapping dependency statuses → overall status + HTTP code. Unit-tested in `evaluate.test.ts` (`deno test`). |

## Required configuration (one-time)

The workflow is inert until these are set under **Settings → Secrets and
variables → Actions**:

- **Variable** `HEALTH_CHECK_URL` — the deployed function URL, e.g.
  `https://<project-ref>.functions.supabase.co/health-check`.
- **Secret** `HEALTH_CHECK_ANON_KEY` — sent as the `apikey` header (optional,
  depending on the function's gateway config).
- **Secret** `SLACK_WEBHOOK_URL` — routes alerts to the on-call Slack channel
  (optional; without it, alerting falls back to the email path below).

## Escalation path

When the endpoint is unhealthy after 3 attempts, the workflow:

1. **Posts to Slack** (`:rotating_light: Brikly health check FAILING …`) if
   `SLACK_WEBHOOK_URL` is configured — this is the channel on-call watches.
2. **Fails the workflow run**, which GitHub emails to repo admins
   (Actions failure notifications). Keep at least one admin subscribed.

On alert: open the linked run, read the `services` block in the health-check
body to see which dependency is `degraded`/`unhealthy`, then check the Supabase
project status page and the DB/auth/storage dashboards.

## Testing it (synthetic check)

- **Alert routing:** run the workflow manually — Actions → *Uptime Health
  Check* → *Run workflow* → set `simulate_failure = true`. This forces the
  alert path (Slack + run failure) without a real outage, verifying the
  escalation wiring end-to-end.
- **503-on-dependency-down logic:** `deno test supabase/functions/health-check/`
  runs `evaluate.test.ts`, which asserts a degraded or unhealthy dependency
  yields HTTP 503 (and all-healthy yields 200). This is the synthetic check for
  the function's contract, runnable in CI without a live outage.

## See also

- `docs/RUNBOOK_ROLLBACK.md` — recovering once an outage is confirmed.
