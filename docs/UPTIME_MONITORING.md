# Uptime & Health Monitoring (US-208)

Brikly exposes a synthetic health endpoint and an automated monitor that alerts
when the platform is degraded or down.

## Health endpoint

`supabase/functions/health-check` probes database, auth, and storage and returns:

- **HTTP 200** — every dependency is `healthy`.
- **HTTP 503** — any dependency is `degraded` (returned an error) or `unhealthy`
  (threw). The JSON body is still returned on 503:

  ```json
  {
    "status": "degraded",
    "timestamp": "…",
    "totalResponseTime": 145,
    "services": { "database": { "status": "degraded", "responseTime": 42, "error": "…" }, … },
    "version": "1.0.0"
  }
  ```

Because a degraded service returns 503, load balancers and uptime monitors that
key off the status code will alert instead of treating a partial outage as "up".

## Automated monitor

`.github/workflows/uptime-health-check.yml` runs on a schedule (~every 10
minutes) and on demand. It:

1. Pings the health endpoint up to **3 times, 15s apart**, and only alerts if it
   is *consistently* not healthy — this debounces transient latency so the
   monitor does not flap on a single slow response.
2. On consistent failure it **fails the workflow run** (GitHub emails repository
   admins on failed scheduled runs) and, if a Slack webhook is configured, posts
   an alert there.

### Configuration

Set these in **Settings → Secrets and variables → Actions**:

| Name | Kind | Required | Purpose |
|------|------|----------|---------|
| `HEALTH_CHECK_URL` | Variable | Yes (to enable) | Full URL of the deployed `health-check` function. Until set, the monitor logs a notice and no-ops. |
| `HEALTH_CHECK_ANON_KEY` | Secret | Optional | Sent as the `apikey` header if your gateway requires it. |
| `SLACK_WEBHOOK_URL` | Secret | Optional | Incoming-webhook URL for Slack alert routing. |

### Alert routing

- **Email** — GitHub notifies repository admins whenever the scheduled run fails.
- **Slack** — when `SLACK_WEBHOOK_URL` is set, a `:rotating_light:` message with a
  link to the failing run is posted.

### Testing the alert path (simulated failure)

Run the workflow manually with the **`simulate_failure`** input set to `true`
(Actions → *Uptime Health Check* → *Run workflow*). This forces the alert path
end-to-end — Slack message (if configured) plus a failed run — without needing a
real outage, so alert routing can be verified on demand.

## Dashboard

`src/pages/admin/SystemHealth.tsx` calls the live `health-check` function (parsing
the JSON body even on a 503) and renders each service with a distinct status:
**Healthy** (green / check), **Degraded** (yellow / warning), **Unhealthy**
(red / x), refreshing every 30s.
