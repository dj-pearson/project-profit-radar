# Runbook - Uptime Monitoring & Alerting

How Brikly detects and escalates a production outage of its Supabase
dependencies (database, auth, storage).

## What monitors what

| Piece | Location | Role |
|-------|----------|------|
| `health-check` edge function | `supabase/functions/health-check/` | Probes the database (`companies` select), auth (GoTrue `/auth/v1/health`) and storage (`listBuckets`) in parallel, each under a 5s deadline. Returns **200** only when all three are healthy; **503** when any is `degraded` (answered with an error) or `unhealthy` (threw or timed out). Body: `{ success, status, services: { name: { status, responseTime } }, totalResponseTime, timestamp, version }`. Dependency error text goes to the function log only, never the public body (US-358). |
| Uptime workflow | `.github/workflows/uptime-health-check.yml` | GitHub Actions cron, about every 10 minutes. Runs `scripts/uptime-monitor.mjs`, carries the last up/down state between runs in the Actions cache, and fails the run only when it sends an alert or reminder. Job timeout 5 minutes. Not a required status check (it never runs on PRs). |
| Monitor logic | `scripts/uptime-monitor.mjs` | Calls the URL (3 attempts, 15s apart, 20s timeout each), parses the envelope, decides what to send, posts to Slack. Tested in `src/lib/__tests__/uptimeMonitor.test.ts`, which also covers `evaluate.ts`. |
| Status logic | `supabase/functions/health-check/evaluate.ts` | Pure `evaluateHealth()` (statuses to overall status + HTTP code), `runCheck()` (deadline per probe) and `toPublicChecks()` (strips error text). Also covered by `evaluate.test.ts` (`deno test`). |

## Required configuration (one-time)

The workflow skips with a notice ("HEALTH_CHECK_URL is not set - uptime
monitoring is inert") until these are set under **Settings > Secrets and
variables > Actions**:

- **Variable** `HEALTH_CHECK_URL` (a secret of the same name also works): the
  deployed function URL, e.g.
  `https://<project-ref>.supabase.co/functions/v1/health-check`, or the
  self-hosted equivalent on the Coolify stack.
- **Secret** `HEALTH_CHECK_ANON_KEY`: the project's anon key. `health-check`
  keeps the default `verify_jwt = true` (it is not in `supabase/config.toml`),
  so the gateway answers 401 without it. The monitor sends it as both `apikey`
  and `Authorization: Bearer`. It is the public anon key; it grants nothing the
  web bundle does not already carry.
- **Secret** `SLACK_WEBHOOK_URL`: an incoming-webhook URL for the channel
  on-call watches. Without it, the failed run's email is the only page.

Check it took: Actions > *Uptime Health Check* > *Run workflow* (leave
`simulate_failure` off). The *Probe and alert* step should log
`attempt 1/3: healthy` and `Health check OK`.

## Escalation path

The monitor compares each run with the state the previous run saved and sends
only on a change:

| Previous | This run | Slack | Run result |
|----------|----------|-------|------------|
| up or unknown | down | `:rotating_light: Brikly health check FAILING: HTTP 503, status=degraded (storage=degraded)` | failed (GitHub emails admins) |
| down | down, alerted < 6h ago | nothing | green, `::error::` annotation |
| down | down, alerted >= 6h ago | `STILL FAILING ... Down for 6h 10m` | failed |
| down | up | `:white_check_mark: ... RECOVERED after 42m down` | green |
| up | up | nothing | green |

"Down" is anything other than HTTP 200 with `status: "healthy"`: a 503, a 401
from the gateway, a body that is not the health envelope, a network error, or
no answer inside 20s. Each Slack message links the run.

State lives in the Actions cache under the key prefix `uptime-state-`; each run
saves a new entry and deletes the one it started from. If the cache is evicted
or deleted, the next run treats the state as unknown: a down result alerts
again, an up result stays quiet. If a Slack post fails, the state is saved as
"not yet delivered" and the next run tries again. The reminder interval is
`REMIND_AFTER_MINUTES` in the workflow (360).

On alert: open the linked run, read which dependency the message names, then
the `[health-check] <name> <status>: <error>` line in the Supabase function
logs for the detail, then the Supabase project status page and the
DB/auth/storage dashboards. Recovery from a confirmed outage:
`docs/RUNBOOK_ROLLBACK.md`.

## Testing it (synthetic check)

- **Alert routing:** Actions > *Uptime Health Check* > *Run workflow* > set
  `simulate_failure = true`. This posts a `[SIMULATED]` FAILING message to
  Slack and fails the run, without probing and without touching the saved
  state, so the next scheduled run behaves as if nothing happened.
- **Alert, dedupe and recovery logic:** `npx vitest run
  src/lib/__tests__/uptimeMonitor.test.ts` runs the monitor against a fake
  fetch: one alert on the way down, silence while down, a reminder after 6h,
  one recovery, a skip when `HEALTH_CHECK_URL` is unset, a clean result on
  timeout.
- **503-on-dependency-down:** the same file runs `runCheck` and
  `evaluateHealth` from `evaluate.ts` and asserts that a dependency that errors,
  throws or hangs past its deadline yields HTTP 503, and that the monitor
  classifies that body as down. `deno test supabase/functions/health-check/`
  runs `evaluate.test.ts` with the same cases where deno is installed.

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

- `docs/RUNBOOK_ROLLBACK.md` - recovering once an outage is confirmed.
