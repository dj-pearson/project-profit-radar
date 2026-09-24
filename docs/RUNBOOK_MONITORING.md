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

## Edge-function error reporting (Sentry, US-251)

The uptime check above says whether the service is up. It says nothing about a
webhook or cron job that answers 200 to the monitor and 500 to Stripe. For
that, every edge function reports its failures to Sentry:

- Each function's top-level `catch` calls `captureException(error, { fn, req })`
  from `supabase/functions/_shared/observability.ts`. Six handlers with no
  single outer try/catch (`change-password`, `health-check`,
  `data-subject-delete`, `data-subject-export`, `email-unsubscribe`,
  `process-dsar-fulfillment`) are wrapped in `withErrorReporting('<fn>', ...)`
  instead, which reports whatever escapes and rethrows it.
- `scripts/check-edge-error-reporting.mjs` (pre-commit and CI) fails if any
  function stops reporting, reports under another function's name, or has a
  handler shape the scanner cannot read. Its baseline is zero unreported.
- Events carry the tags `function`, `request_id` (from `sb-request-id`,
  `x-request-id`, `x-correlation-id`, `x-kong-request-id` or `cf-ray`),
  `method`, and `company_id` where the caller passes it, plus the request URL
  without its query string.
- Scrubbing runs over the whole event before it leaves: sensitive key names at
  any depth (authorization, cookie, anything containing token, secret,
  password, api key, signature, session, credential, card number, and more),
  and secret or PII shapes inside any string (JWTs, Stripe/AWS/GitHub/Slack/AI
  provider keys, bearer and basic credentials, `user:pass@` in URLs, sensitive
  query parameters, email addresses, phone numbers, Luhn-valid card numbers).
  No request header or body is ever read into an event.
- Reporting never throws and gives up after 2 seconds, so a Sentry outage can
  slow an error response by at most that and cannot change it.

### The secret

`EDGE_SENTRY_DSN` is a **Supabase secret**, not a Cloudflare build variable: it
is read at runtime through `Deno.env` and must not reach the web bundle. Use a
Sentry project separate from the web app's, so server alerts route on their
own. The DSN's public key is designed to be embedded in clients, but treat the
value like any other secret here: set it, never paste it into a doc or commit.

```bash
supabase secrets set EDGE_SENTRY_DSN='https://<public-key>@<org-ingest-host>/<project-id>'
```

On the self-hosted stack, set it in the functions service environment in
Coolify instead. Either way, redeploy or restart the functions afterwards, as
for any secret (see `docs/EDGE_SECRETS.md`, "Where values are set"). While it
is unset, `captureException` is a no-op and failures reach only the
Supabase function logs. `docs/EDGE_SECRETS.md` (generated by
`node scripts/check-edge-secrets.mjs --write`) lists it with every function
that reads it.

### Verifying an event arrives

1. **The DSN and scrubbing, automated.** Run the opt-in smoke test with the
   same DSN plus a Sentry auth token that has `event:read`:

   ```bash
   EDGE_SENTRY_DSN=... SENTRY_AUTH_TOKEN=... SENTRY_ORG=<org-slug> \
   SENTRY_PROJECT=<project-slug> \
     npx vitest run supabase/functions/_shared/observability.smoke.test.ts
   ```

   It sends one error through `captureException` (the path every function
   uses) with a fake Stripe key and an email address in the message, polls
   Sentry's API for that event id, and asserts the `function` and `request_id`
   tags and that neither the key nor the address was stored. Set
   `SENTRY_API_URL=https://de.sentry.io` for an EU-region org. Without those
   variables the test is skipped, which is why it does not run in CI.

2. **A deployed function, by hand.** Serve one function locally against the
   real Deno runtime with the DSN in an env file that stays out of git, add a
   temporary `throw new Error('US-251 deployed smoke')` as the first line of
   its top-level `try`, and call it:

   ```bash
   supabase functions serve quickbooks-sync --env-file supabase/.env.local
   curl -i -X POST http://localhost:54321/functions/v1/quickbooks-sync \
     -H "Authorization: Bearer <anon key>" -H 'Content-Type: application/json' -d '{}'
   ```

   An issue titled `Error: US-251 deployed smoke` should appear in Sentry
   within a minute, tagged `function: quickbooks-sync`. Revert the throw.

3. **Alerting.** In Sentry, add an alert rule on the edge project: "a new issue
   is created" plus "issue seen more than 10 times in 1 hour", routed to the
   same Slack channel as the uptime alert. Filter on the `function` tag to page
   harder for `stripe-webhook`, `quickbooks-sync`, `process-dunning` and
   `process-funnel-queue`, where a silent failure costs money or data.

## See also

- `docs/RUNBOOK_ROLLBACK.md` — recovering once an outage is confirmed.
