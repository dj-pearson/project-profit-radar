# BuildDesk Environment Variables Reference

**Last Updated**: 2025-12-27
**Purpose**: Master reference for all environment variables required by the BuildDesk platform

This document lists every environment variable used across the platform, organized by environment type and where each variable should be configured.

---

## Table of Contents

1. [Vite/Frontend Variables](#1-vitefrontend-variables)
2. [Expo/Mobile Variables](#2-expomobile-variables)
3. [Supabase Edge Function Secrets](#3-supabase-edge-function-secrets)
4. [Node.js Script Variables](#4-nodejs-script-variables)
5. [Cloudflare Deployment Variables](#5-cloudflare-deployment-variables)
6. [MCP Server Configuration](#6-mcp-server-configuration)
7. [Test Environment Variables](#7-test-environment-variables)
8. [Quick Setup Checklist](#8-quick-setup-checklist)

---

## 1. Vite/Frontend Variables

**Location**: Set in `.env` file at project root, Cloudflare Pages dashboard, or `wrangler.toml`
**Prefix**: `VITE_`
**Runtime**: Browser (bundled at build time)
**Format**: Plain text values

### Core Supabase Connection (REQUIRED)

| Variable | Description | Example | Used In |
|----------|-------------|---------|---------|
| `VITE_SUPABASE_URL` | Supabase API endpoint | `https://api.build-desk.com` | `src/integrations/supabase/client.ts` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key | `eyJ...` (JWT) | `src/integrations/supabase/client.ts` |
| `VITE_SUPABASE_ANON_KEY` | Alias for publishable key | `eyJ...` (JWT) | `src/contexts/AuthContext.tsx` |
| `VITE_EDGE_FUNCTIONS_URL` | Edge functions base URL | `https://functions.build-desk.com` | `src/integrations/supabase/client.ts` |

### Optional Configuration

| Variable | Description | Example | Used In |
|----------|-------------|---------|---------|
| `VITE_SUPABASE_PROJECT_ID` | Project identifier | `builddesk` | Documentation only |
| `VITE_POSTHOG_API_KEY` | PostHog analytics key | `phc_...` | `src/lib/analytics.ts` |
| `VITE_POSTHOG_HOST` | PostHog host URL | `https://app.posthog.com` | `src/lib/analytics.ts` |
| `VITE_SENTRY_DSN` | Sentry error tracking DSN | `https://...@sentry.io/...` | `src/lib/sentry.ts` |

### Built-in Vite Variables (Automatic)

| Variable | Description | Values |
|----------|-------------|--------|
| `import.meta.env.DEV` | Development mode | `true`/`false` |
| `import.meta.env.PROD` | Production mode | `true`/`false` |
| `import.meta.env.MODE` | Current mode | `development`/`production` |

---

## 2. Expo/Mobile Variables

**Location**: Set in `.env` file in mobile app directory or EAS secrets
**Prefix**: `EXPO_PUBLIC_`
**Runtime**: Mobile app (bundled at build time)
**Format**: Plain text values

### Core Supabase Connection (REQUIRED)

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase API endpoint | `https://api.build-desk.com` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | `eyJ...` (JWT) |
| `EXPO_PUBLIC_EDGE_FUNCTIONS_URL` | Edge functions base URL | `https://functions.build-desk.com` |
| `EXPO_PUBLIC_API_BASE_URL` | API base URL | `https://api.build-desk.com` |

### App Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `EXPO_PUBLIC_APP_NAME` | Application display name | `BuildDesk` |
| `EXPO_PUBLIC_APP_VERSION` | App version string | `1.0.0` |

### Feature Flags

| Variable | Description | Default |
|----------|-------------|---------|
| `EXPO_PUBLIC_ENABLE_BIOMETRIC_AUTH` | Enable fingerprint/Face ID | `true` |
| `EXPO_PUBLIC_ENABLE_OFFLINE_MODE` | Enable offline support | `true` |
| `EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS` | Enable push notifications | `true` |
| `EXPO_PUBLIC_ENABLE_BACKGROUND_SYNC` | Enable background sync | `true` |
| `EXPO_PUBLIC_ENABLE_GEOFENCING` | Enable GPS geofencing | `true` |

### Analytics & Monitoring

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_GOOGLE_ANALYTICS_ID` | Google Analytics tracking ID | `G-XXXXXXXXXX` |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry error tracking DSN | `https://...@sentry.io/...` |
| `EXPO_PUBLIC_MIXPANEL_TOKEN` | Mixpanel analytics token | `abc123...` |

### Third-Party Integrations

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key | `AIza...` |
| `EXPO_PUBLIC_WEATHER_API_KEY` | Weather service API key | `abc123...` |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public key | `pk_live_...` |

### Push Notifications

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_FCM_SENDER_ID` | Firebase Cloud Messaging sender ID | `123456789` |
| `EXPO_PUBLIC_VAPID_KEY` | VAPID key for web push | `BPL...` |

### Social Authentication

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID | `xxx.apps.googleusercontent.com` |
| `EXPO_PUBLIC_APPLE_CLIENT_ID` | Apple Sign-In client ID | `com.builddesk.app` |
| `EXPO_PUBLIC_MICROSOFT_CLIENT_ID` | Microsoft OAuth client ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |

### Development Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `EXPO_PUBLIC_DEBUG_MODE` | Enable debug logging | `false` |
| `EXPO_PUBLIC_LOG_LEVEL` | Log verbosity level | `info` |
| `EXPO_PUBLIC_MOCK_DATA` | Use mock data for testing | `false` |

---

## 3. Supabase Edge Function Secrets

**Location**: Set via Supabase Dashboard → Settings → Edge Functions → Secrets, or via CLI
**Format**: Secrets (encrypted at rest)
**Runtime**: Deno (server-side)

### Setting Secrets via CLI

```bash
# Set a single secret
supabase secrets set SECRET_NAME=value

# Set from .env file
supabase secrets set --env-file ./supabase/.env

# List all secrets
supabase secrets list
```

### Core Supabase (REQUIRED - Auto-injected)

| Secret | Description | Auto-Set |
|--------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (full access) | Yes |
| `SUPABASE_ANON_KEY` | Anonymous/public key | Yes |

### AI Services

| Secret | Description | Used By |
|--------|-------------|---------|
| `CLAUDE_API_KEY` | Anthropic Claude API key | Blog AI, Social content, Voice commands |
| `OPENAI_API_KEY` | OpenAI API key | Voice-to-text, Data analysis, Risk assessment |
| `OpenAI_API_KEY` | OpenAI (alternate casing) | Predictive analytics, Resource optimization |

### Payment Processing (Stripe)

| Secret | Description | Used By |
|--------|-------------|---------|
| `STRIPE_SECRET_KEY` | Stripe secret API key | All payment operations |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `stripe-webhook` function |
| `STRIPE_PUBLISHABLE_KEY` | Stripe public key | Some checkout functions |
| `STRIPE_ENCRYPTION_KEY` | Key for encrypting stored Stripe data | `store-stripe-keys` |

### Stripe Price IDs (Set after running setup script)

Run `scripts/setup-stripe-products.sh` (or `.ps1` on Windows) to create products and get these IDs.

| Secret | Description | Amount | Used By |
|--------|-------------|--------|---------|
| `STRIPE_PRICE_STARTER_MONTHLY` | Starter plan monthly price ID | $149/month | `create-stripe-checkout` |
| `STRIPE_PRICE_STARTER_ANNUAL` | Starter plan annual price ID | $1,490/year | `create-stripe-checkout` |
| `STRIPE_PRICE_PROFESSIONAL_MONTHLY` | Professional plan monthly price ID | $299/month | `create-stripe-checkout` |
| `STRIPE_PRICE_PROFESSIONAL_ANNUAL` | Professional plan annual price ID | $2,990/year | `create-stripe-checkout` |
| `STRIPE_PRICE_ENTERPRISE_MONTHLY` | Enterprise plan monthly price ID | $599/month | `create-stripe-checkout` |
| `STRIPE_PRICE_ENTERPRISE_ANNUAL` | Enterprise plan annual price ID | $5,990/year | `create-stripe-checkout` |

### Email Services

| Secret | Description | Used By |
|--------|-------------|---------|
| `RESEND_API_KEY` | Resend email service API key | Safety, booking, intervention, trial emails |
| `SENDGRID_API_KEY` | SendGrid API key | Scheduled emails, SEO notifications |
| `FROM_EMAIL` | Default sender email address | SEO notifications |

### Google Services

| Secret | Description | Used By |
|--------|-------------|---------|
| `GOOGLE_OAUTH_CLIENT_ID` | Google OAuth 2.0 client ID | Analytics OAuth |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google OAuth 2.0 client secret | Analytics OAuth |
| `GOOGLE_OAUTH_REDIRECT_URI` | OAuth redirect URI | Analytics OAuth |
| `GOOGLE_OAuth_CLIENT_ID` | Google OAuth (calendar auth) | Calendar integration |
| `GOOGLE_OAuth_CLIENT_SECRET` | Google OAuth (calendar auth) | Calendar integration |
| `GOOGLE_CLIENT_ID` | General Google client ID | GSC OAuth, Calendar |
| `GOOGLE_CLIENT_SECRET` | General Google client secret | GSC OAuth, Calendar |
| `GOOGLE_REDIRECT_URI` | OAuth redirect URL | GSC OAuth |
| `GOOGLE_CLIENT_EMAIL` | Service account email | SEO analytics, GA API |
| `GOOGLE_PRIVATE_KEY` | Service account private key | SEO analytics, GA API |
| `GA4_PROPERTY_ID` | Google Analytics 4 property ID | SEO analytics |
| `PAGESPEED_INSIGHTS_API_KEY` | PageSpeed Insights API | Core Web Vitals checking |
| `SEARCH_CONSOLE_SITE_URL` | Site URL for Search Console | SEO analytics |

### Microsoft Services

| Secret | Description | Used By |
|--------|-------------|---------|
| `MICROSOFT_CLIENT_ID` | Microsoft OAuth client ID | Outlook calendar |
| `MICROSOFT_CLIENT_SECRET` | Microsoft OAuth client secret | Outlook calendar |

### QuickBooks Integration

| Secret | Description | Used By |
|--------|-------------|---------|
| `QUICKBOOKS_CLIENT_ID` | QuickBooks OAuth client ID | QuickBooks sync |
| `QUICKBOOKS_CLIENT_SECRET` | QuickBooks OAuth client secret | QuickBooks sync |
| `QUICKBOOKS_ENVIRONMENT` | `sandbox` or `production` | QuickBooks API routing |

### Twilio (SMS/Voice)

| Secret | Description | Used By |
|--------|-------------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID | Calling functionality |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | Calling functionality |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | Calling functionality |

### SEO & Search Tools

| Secret | Description | Used By |
|--------|-------------|---------|
| `SERP_API_KEY` | SERP API for keyword tracking | Keyword positions, SERP features |
| `AHREFS_API_KEY` | Ahrefs API for backlinks | Backlink syncing |
| `MOZ_ACCESS_ID` | Moz API access ID | Backlink data |
| `MOZ_SECRET_KEY` | Moz API secret key | Backlink data |

### Webhooks & Notifications

| Secret | Description | Used By |
|--------|-------------|---------|
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL | SEO notifications |
| `CUSTOM_WEBHOOK_URL` | Custom webhook endpoint | SEO notifications |

### Application URLs

| Secret | Description | Default |
|--------|-------------|---------|
| `SITE_URL` | Main application URL | `https://build-desk.com` |
| `APP_URL` | Application URL (alt) | `https://builddesk.com/subscription` |

### Admin & Security

| Secret | Description | Used By |
|--------|-------------|---------|
| `ADMIN_CREATION_SECRET` | Secret for root admin creation | `create-root-admin` |
| `ADMIN_EMAIL` | Default admin email | Initial setup |
| `ADMIN_PASSWORD` | Default admin password | Initial setup only |
| `BLOG_AUTOMATION_API_KEY` | API key for blog automation | `blog-ai-automation` |
| `CRON_SECRET` | Secret for cron job auth | Scheduled functions |

### Mobile Build

| Secret | Description | Used By |
|--------|-------------|---------|
| `Expo_Access_Token` | Expo access token for builds | `trigger-expo-build` |

---

## 4. Node.js Script Variables

**Location**: Set in shell environment or `.env` file
**Format**: Plain text
**Runtime**: Node.js (server-side scripts)

### Build & Deployment Scripts

| Variable | Description | Used By |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | `scripts/create-missing-content.js` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | `scripts/create-missing-content.js` |
| `CLOUDFLARE_ZONE_ID` | Cloudflare zone ID | `scripts/purge-cloudflare-cache.js` |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token | `scripts/purge-cloudflare-cache.js` |

### Test Scripts

| Variable | Description | Used By |
|----------|-------------|---------|
| `TEST_USER_EMAIL` | Test user email | `test-script.js` |
| `TEST_USER_PASSWORD` | Test user password | `test-script.js` |

---

## 5. Cloudflare Deployment Variables

**Location**: Cloudflare Pages dashboard or `wrangler.toml`
**Format**: Plain text (built into bundle)

### wrangler.toml Configuration

```toml
[vars]
VITE_SUPABASE_URL = "https://api.build-desk.com"
VITE_SUPABASE_PUBLISHABLE_KEY = "eyJ..."
VITE_EDGE_FUNCTIONS_URL = "https://functions.build-desk.com"
```

### Cloudflare Dashboard Variables

| Variable | Description | Where to Set |
|----------|-------------|--------------|
| `CLOUDFLARE_ZONE_ID` | Zone ID for cache purging | Dashboard → Zone → Overview |
| `CLOUDFLARE_API_TOKEN` | API token with cache purge permission | Dashboard → API Tokens |

---

## 6. MCP Server Configuration

**Location**: `.mcprc` or environment variables
**Format**: Plain text

| Variable | Description | Used By |
|----------|-------------|---------|
| `SUPABASE_ACCESS_TOKEN` | Personal access token | Supabase MCP server |
| `SUPABASE_PROJECT_ID` | Project ID (`builddesk`) | Supabase MCP commands |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL | Context7 MCP |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token | Context7 MCP |

---

## 7. Test Environment Variables

**Location**: Set in `src/test/setup.ts` or shell environment
**Format**: Plain text

### Playwright E2E Tests

| Variable | Description | Default |
|----------|-------------|---------|
| `PLAYWRIGHT_BASE_URL` | Base URL for E2E tests | `http://localhost:8080` |
| `CI` | Running in CI environment | `false` |
| `TEST_USER_EMAIL` | Test user credentials | `test@example.com` |
| `TEST_USER_PASSWORD` | Test user password | `testpassword` |

### Vitest Unit Tests

| Variable | Description | Set By |
|----------|-------------|--------|
| `VITE_SUPABASE_URL` | Mock Supabase URL | `src/test/setup.ts` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Mock key | `src/test/setup.ts` |
| `NODE_ENV` | Environment mode | Vitest |

---

## 8. Quick Setup Checklist

### Minimum Required for Development

```bash
# .env (project root)
VITE_SUPABASE_URL=https://api.build-desk.com
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_EDGE_FUNCTIONS_URL=https://functions.build-desk.com
```

### Minimum Required for Production

**Cloudflare Pages:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_EDGE_FUNCTIONS_URL`

**Supabase Edge Functions (Essential):**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`

**Stripe Product/Price Setup:**
1. Run `scripts/setup-stripe-products.sh` (or `.ps1` on Windows)
2. Set the following secrets in Supabase:
   - `STRIPE_PRICE_STARTER_MONTHLY`
   - `STRIPE_PRICE_STARTER_ANNUAL`
   - `STRIPE_PRICE_PROFESSIONAL_MONTHLY`
   - `STRIPE_PRICE_PROFESSIONAL_ANNUAL`
   - `STRIPE_PRICE_ENTERPRISE_MONTHLY`
   - `STRIPE_PRICE_ENTERPRISE_ANNUAL`

### Full Feature Set

**AI Features:**
- `CLAUDE_API_KEY`
- `OPENAI_API_KEY`

**Email Notifications:**
- `RESEND_API_KEY` or `SENDGRID_API_KEY`

**QuickBooks Integration:**
- `QUICKBOOKS_CLIENT_ID`
- `QUICKBOOKS_CLIENT_SECRET`

**Calendar Integrations:**
- `GOOGLE_OAuth_CLIENT_ID`
- `GOOGLE_OAuth_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`

**Analytics & Monitoring:**
- `VITE_POSTHOG_API_KEY`
- `VITE_SENTRY_DSN`

**SEO Tools:**
- `SERP_API_KEY`
- `AHREFS_API_KEY`
- Google service account credentials

---

## Variable Naming Conventions

| Prefix/Pattern | Environment | Access |
|----------------|-------------|--------|
| `VITE_*` | Frontend (Vite) | Public (bundled in client) |
| `EXPO_PUBLIC_*` | Mobile (Expo) | Public (bundled in app) |
| No prefix | Edge Functions | Secret (server-side only) |
| `process.env.*` | Node.js scripts | Server-side |

---

## Security Notes

1. **Never commit secrets**: Add `.env` to `.gitignore`
2. **Use appropriate prefixes**: `VITE_` and `EXPO_PUBLIC_` variables are PUBLIC
3. **Rotate keys regularly**: Especially after any suspected breach
4. **Use different keys per environment**: Dev, staging, production
5. **Service role key**: Only use in trusted server-side code

---

## Troubleshooting

### Variable Not Found

1. Check the correct prefix (`VITE_` for frontend, none for edge functions)
2. Restart the dev server after changing `.env`
3. For edge functions, verify secrets are set: `supabase secrets list`
4. Check variable spelling and casing (some are case-sensitive)

### Variable Not Working in Production

1. Ensure variables are set in Cloudflare Pages dashboard
2. Rebuild and redeploy after changing variables
3. Check `wrangler.toml` for hardcoded values that might override

### Edge Function Secrets Not Working

1. Verify secrets are set: `supabase secrets list`
2. Check function logs for errors: `supabase functions logs <function-name>`
3. Ensure service role key has necessary permissions

---

*This document should be updated whenever new environment variables are added to the platform.*
