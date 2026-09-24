# Runbook: DoS protection and rate limiting

Brikly stops abusive traffic in two layers. Cloudflare absorbs floods before they
reach the Contabo box; the edge functions refuse what gets through, per IP and
per user, and log every refusal. There is no third layer. The old
`dos-protection` edge function and the client-side `utils/dosProtection.ts`
were never called by anything and were deleted (US-302, US-205).

## What is enforced where

| Layer | Where | What it does |
|-------|-------|--------------|
| Cloudflare rate limiting rules | Cloudflare dashboard, `brikly.net` zone | Blocks an IP that floods the functions host. Set by hand, see below; nothing in the repo applies them. |
| Cloudflare Bot Fight Mode | Cloudflare dashboard | Challenges known-automated clients zone-wide. |
| IP blocklist | `supabase/functions/_shared/ip-guard.ts` | Every anonymous edge function (the `PUBLIC_BY_DESIGN` list in `scripts/check-unauthenticated-edge-functions.mjs`, except `health-check`) looks the caller up in `ip_access_control` and answers **403** to an active, unexpired `blacklist` row matching the address or its `ip_range`. A matching `whitelist` row wins over a blacklist row. Decisions are cached per isolate for 30 seconds, so a new block takes up to 30s to apply. A failed lookup allows the request. |
| Per-IP ceiling | `supabase/functions/_shared/rate-limiter.ts` | Anonymous writers (sign-up, OTP, password reset, lead/demo/sales forms, referrals, SSO init, LDAP, create-root-admin, oauth-proxy authorize, email-unsubscribe, sitemap generation) allow `RATE_LIMITS.AUTH` = **10 requests/min per IP** and answer **429** with `Retry-After` past it. `webhook-verify` and `sitemap-generator` use `GENERAL` (100/min). `public-estimate` limits per estimate token instead. |
| Per-user ceiling | same file, `enforceRateLimit` | Functions that spend money per call (AI, SMS, email) limit per user id. `scripts/check-rate-limit-coverage.mjs` keeps them covered. |
| Violation log | `consume_rate_limit` (migration `20260827100000`) | Every 429 inserts a row in `rate_limit_violations`. The admin **Rate Limiting** page (`/rate-limiting`) lists them and manages `ip_access_control`. |

The OAuth and SAML callbacks take the blocklist but no per-IP ceiling: they are
entered by redirect from the identity provider, and an office behind one NAT
can produce a burst of them. `scripts/check-anonymous-writes.mjs` fails the
commit if an anonymous function writes without a ceiling (and is not on its
exempt list) or skips the blocklist.

The "Rules" tab on the admin page stores `rate_limit_rules` rows. Nothing reads
them to enforce anything; the page says so. The limits are the presets in
`rate-limiter.ts`.

### Legitimate traffic

10/min/IP on the anonymous endpoints is above what a person produces: a sign-up
is one `signup-with-otp`, one `verify-auth-otp`, and maybe one resend. The
case that can hit it is an office of several people signing up or resetting
passwords from one NAT address in the same minute. If that happens, whitelist
the office address on the admin page; that skips the blocklist, not the
ceiling, so the fix for a real NAT problem is raising `RATE_LIMITS.AUTH` for
that endpoint. Authenticated app traffic is not limited per IP at all.

## Cloudflare settings the owner applies

These live in the Cloudflare dashboard, not in the repo. Do them in this order.

### 1. Put the API hosts behind Cloudflare, and only Cloudflare

`getClientIP()` trusts `cf-connecting-ip` first. Cloudflare overwrites that
header on proxied traffic, so it is trustworthy **only if** requests cannot
reach the origin any other way. If `functions.brikly.net` or `api.brikly.net`
is DNS-only (grey cloud), or the Contabo box answers on its public IP, a caller
can send any `cf-connecting-ip` they like and walk around both the per-IP
ceiling and the blocklist.

- **DNS**: `functions.brikly.net` and `api.brikly.net` proxied (orange cloud).
- **Origin**: accept 80/443 only from Cloudflare's published ranges
  (https://www.cloudflare.com/ips/), or put Coolify behind a Cloudflare Tunnel
  and close 80/443 entirely.
- **Check**: `curl -sI https://functions.brikly.net/health-check` returns a
  `cf-ray` header; `curl -sk --resolve functions.brikly.net:443:<origin-ip> https://functions.brikly.net/health-check` from outside must time out or be refused.

### 2. Rate limiting rule: anonymous endpoints

Security > WAF > Rate limiting rules > Create rule.

- **Name**: `anon-edge-functions`
- **Expression** (Edit expression):

  ```
  (http.host eq "functions.brikly.net" and (
    http.request.uri.path contains "signup-with-otp" or
    http.request.uri.path contains "send-auth-otp" or
    http.request.uri.path contains "verify-auth-otp" or
    http.request.uri.path contains "reset-password-otp" or
    http.request.uri.path contains "capture-lead" or
    http.request.uri.path contains "handle-demo-request" or
    http.request.uri.path contains "handle-sales-contact" or
    http.request.uri.path contains "track-referral" or
    http.request.uri.path contains "process-referral-signup" or
    http.request.uri.path contains "sso-ldap-auth" or
    http.request.uri.path contains "create-root-admin" or
    http.request.uri.path contains "public-estimate"))
  ```

- **Characteristics**: IP
- **Rate**: 20 requests per 10 seconds
- **Action**: Block, duration 10 seconds on Free (longer on paid plans, 10 minutes is reasonable)

20 per 10 seconds is 120/min, twelve times the edge ceiling. It exists to stop
a flood from reaching Deno and Postgres at all; the edge limiter still does the
fine-grained 10/min. The Free plan allows one rate limiting rule with a
10-second period, which is why this one is the anonymous set.

### 3. Rate limiting rule: everything else on the functions host (paid plans)

Only if the plan allows a second rule.

- **Name**: `edge-functions-flood`
- **Expression**: `(http.host eq "functions.brikly.net")`
- **Characteristics**: IP
- **Rate**: 300 requests per 10 seconds
- **Action**: Block, 1 minute

This is deliberately loose: an office on one NAT address running the app all
day has to stay well under it. Signed-in traffic is limited per user where it
costs money.

### 4. Bot Fight Mode

Security > Bots > Bot Fight Mode: on.

On the Free plan it applies to the whole zone and cannot be skipped per path.
For 24 hours after turning it on, watch Security > Events filtered to
`functions.brikly.net` and `api.brikly.net` for challenges against:

- `stripe-webhook` and other provider webhooks (Stripe, Twilio, QuickBooks)
- `health-check` from the GitHub Actions uptime job
- the iOS app (user agent contains `Brikly`)

If any of those are challenged, turn Bot Fight Mode off. On Pro and above,
use Super Bot Fight Mode with "Definitely automated: Block" and a WAF skip rule
for the webhook paths instead.

## Demonstrating a throttled request

Automated: `npx vitest run supabase/functions/_shared/ip-guard.test.ts`. It
drives the real guard against a fake client: requests 1-10 from one IP pass,
11 and 12 get 429 with `Retry-After`, a second IP is unaffected, and a
blacklisted range gets 403 before the limiter is consulted.

Against a deployed stack (staging first; this writes limiter rows):

```bash
# create-root-admin without its secret header: no side effects, 10/min per IP.
# Expect ten 401s, then 429.
for i in $(seq 1 12); do
  curl -s -o /dev/null -w '%{http_code}\n' -X POST \
    -H "apikey: $SUPABASE_ANON_KEY" \
    https://functions.brikly.net/create-root-admin
done
```

Then, on `/rate-limiting`, the Violations tab shows the refusals.

Blocklist: on `/rate-limiting` > IP Access Control, blacklist your own address,
wait 30 seconds, and repeat one call: it returns 403 `Access denied`. Remove
the entry (or let `expires_at` pass) to undo it.

## When under attack

1. Cloudflare > Security > Events: find the source (IP, ASN, country, path).
2. A handful of IPs: blacklist them on `/rate-limiting`. Anonymous endpoints
   refuse them within 30 seconds.
3. Many IPs or a whole network: add a Cloudflare WAF custom rule blocking the
   ASN or country, or turn on Under Attack Mode (Security > Settings) for the
   zone while it lasts. Under Attack Mode challenges API clients too, so the
   iOS app and webhooks will fail until it is off again.
4. Afterwards, clear stale blocks on `/rate-limiting` or give them an
   `expires_at` so they lapse.
