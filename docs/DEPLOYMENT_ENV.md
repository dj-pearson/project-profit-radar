# Deployment Environment Variables

Runtime configuration is injected per environment via the **Cloudflare Pages
dashboard** (Settings → Environment variables), not committed to
`wrangler.toml`. This keeps environment-specific config out of source, lets keys
rotate without a code change, and prevents a production build from accidentally
shipping staging/test values.

Only `VITE_*`-prefixed variables are exposed to the client bundle (Vite
convention). The Supabase **service_role** key must **never** appear in any
`VITE_*` variable or anywhere in client-side code — it belongs only in Supabase
Edge Function secrets.

## Required (build fails fast if missing in production)

The production build (`vite.config.ts`) throws a clear error if any of these is
missing, so a misconfigured environment is caught at build time rather than
shipping a broken app.

| Variable                        | Where set                          | Notes                                              |
|---------------------------------|------------------------------------|----------------------------------------------------|
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Cloudflare Pages env (Prod+Preview)| Supabase anon/public JWT. Public-by-design; rotate as hygiene. |

## Stable public config (kept in `wrangler.toml [vars]`)

These are stable, non-secret public endpoints and may stay in `wrangler.toml`.
They can still be overridden per environment in the dashboard if needed.

| Variable                  | Default (`wrangler.toml`)         |
|---------------------------|-----------------------------------|
| `VITE_SUPABASE_URL`       | `https://api.brikly.net`          |
| `VITE_EDGE_FUNCTIONS_URL` | `https://functions.brikly.net`    |

## Optional

| Variable                 | Purpose                                              |
|--------------------------|------------------------------------------------------|
| `VITE_SUPABASE_PROJECT_ID` | Supabase project id (diagnostics)                  |
| `VITE_POSTHOG_API_KEY`   | PostHog analytics                                    |
| `VITE_POSTHOG_HOST`      | PostHog host URL                                     |
| `VITE_SENTRY_DSN`        | Sentry error tracking (strongly recommended in prod) |
| `VITE_APP_VERSION`       | Release tag for Sentry                               |

## Stripe price / product IDs

The Stripe **price** and **product** IDs previously committed to `wrangler.toml`
were not consumed by the client bundle (no `VITE_` prefix, no runtime reader).
They have been removed. If a runtime needs them (e.g. an Edge Function), set them
as **Supabase Edge Function secrets**, not as committed config. Reference values
live in `scripts/stripe-config-output.ts`.

## Setup checklist for a new environment

1. In Cloudflare Pages → the Brikly project → Settings → Environment variables,
   add `VITE_SUPABASE_PUBLISHABLE_KEY` for **both** Production and Preview.
2. (Optional) Add any of the optional vars above.
3. Trigger a deploy. If a required var is missing, the build fails with a clear
   `[build] Missing required environment variable(s): …` message.
4. Verify the app authenticates (login succeeds) on the preview URL before
   promoting to production.

## Anon key rotation (operational hygiene)

The Supabase anon/publishable key is public-by-design, but rotating it after
moving it out of source is good hygiene. Rotation is a Supabase-dashboard action
(Project Settings → API → rotate anon key), followed by updating
`VITE_SUPABASE_PUBLISHABLE_KEY` in the Cloudflare Pages environment. No code
change is required.
