# Health Monitoring & Uptime Alerting

This runbook covers how Brikly's web/backend health is checked and how to wire
external uptime alerting. It pairs with the `health-check` Supabase edge
function (`supabase/functions/health-check/index.ts`).

## The health-check endpoint

`GET https://<project>.functions.supabase.co/health-check`
(or `https://api.brikly.net/functions/v1/health-check`)

It probes three dependencies — **database**, **auth**, and **storage** — and
returns a JSON body plus a meaningful HTTP status:

```json
{
  "status": "healthy | degraded | unhealthy",
  "timestamp": "2026-06-13T11:59:00.000Z",
  "totalResponseTime": 142,
  "services": {
    "database": { "status": "healthy", "responseTime": 40 },
    "auth":     { "status": "healthy", "responseTime": 51 },
    "storage":  { "status": "healthy", "responseTime": 51 }
  },
  "version": "1.0.0"
}
```

### HTTP status semantics (important)

| Overall status | HTTP code | Meaning |
|----------------|-----------|---------|
| `healthy`      | **200**   | All dependencies responded normally. |
| `degraded`     | **503**   | At least one dependency returned an error. |
| `unhealthy`    | **503**   | At least one dependency threw / was unreachable. |

> Only a fully healthy service returns 200. Both `degraded` and `unhealthy`
> return **503** so that uptime monitors and load balancers alert on *partial*
> outages instead of treating a degraded service as fully up. A monitor that
> only checks for `200` will therefore catch degraded states automatically.

## Wiring an external uptime monitor

Pick one (any HTTP monitor works since the endpoint returns 503 on trouble):

### Option A — Cloudflare Health Checks (recommended; same platform as Pages)
1. Cloudflare dashboard → **Traffic → Health Checks** → *Create*.
2. URL: the `health-check` endpoint above. Method `GET`.
3. Expected codes: **200** only. Interval: 60s. Consecutive failures: 2.
4. Notifications → add an email/webhook destination (see alert routing below).

### Option B — UptimeRobot / BetterStack / Pingdom
1. New monitor → **HTTP(s)**, the `health-check` URL, interval 1–5 min.
2. Treat any non-200 as down (these tools do this by default).
3. Attach an alert contact (email / Slack / PagerDuty).

## Alert routing

Route monitor notifications to a channel the on-call sees:
- **Slack**: create an Incoming Webhook and paste it into the monitor's webhook
  notification field.
- **Email**: use the team distribution list.
- **PagerDuty/Opsgenie**: for true on-call escalation (optional).

## Verifying alerting (simulated failure test)

To confirm the alert path end-to-end without taking prod down:
1. Point a **staging** monitor at a URL that returns 503 (e.g. temporarily set
   an invalid `SUPABASE_SERVICE_ROLE_KEY` in a staging deploy of the function,
   or use a throwaway endpoint that returns 503).
2. Confirm the monitor flips to *down* within one interval and the alert
   reaches Slack/email.
3. Restore config and confirm recovery notification.

## Follow-ups (tracked in the PRD)

- Surface `degraded` distinctly (not just `healthy`/`critical`) in
  `src/components/monitoring/MonitoringDashboard.tsx`, which currently renders
  placeholder metrics rather than live `health-check` data.
- Optional: a scheduled self-ping edge function that records health history for
  trend dashboards.
