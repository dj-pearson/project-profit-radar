# Self-Hosted Supabase Migration Audit

**Generated**: 2025-12-18
**Last Updated**: 2025-12-18
**Purpose**: Track migration from cloud Supabase (supabase.co) to self-hosted infrastructure

## Infrastructure Endpoints

| Service | Self-Hosted URL | Purpose |
|---------|----------------|---------|
| Main API (Kong) | `https://api.build-desk.com` | Auth, REST, Storage, Realtime |
| Edge Functions | `https://functions.build-desk.com` | 154+ serverless functions |

---

## Migration Status: COMPLETED

All critical source code files have been updated to use self-hosted Supabase infrastructure.

### Files Updated (Priority 1 - Critical)

| File | Issue | Status |
|------|-------|--------|
| `supabase/config.toml` | Changed `project_id` to `builddesk` | FIXED |
| `src/config/sessionConfig.ts` | Changed token prefix to `sb-builddesk-auth-token` | FIXED |
| `src/config/__tests__/sessionConfig.test.ts` | Updated test expectations | FIXED |
| `mobile-app/src/services/supabase.ts` | Removed hardcoded fallbacks, requires env vars | FIXED |
| `mobile-app/scripts/setup.sh` | Updated example .env to use self-hosted URLs | FIXED |
| `package.json` | Changed MCP project-id to `builddesk` | FIXED |
| `.mcprc.example` | Updated to use self-hosted URLs | FIXED |
| `src/contexts/AuthContext.tsx` | Made auth token cleanup pattern generic | FIXED |
| `src/hooks/__tests__/useSessionRefresh.test.ts` | Updated test token references | FIXED |
| `supabase/functions/generate-scaling-plan/index.ts` | Removed hardcoded credentials | FIXED |

### Storage URL Updates (SEO & Logo Components)

| File | Status |
|------|--------|
| `src/components/SEOMetaTags.tsx` | Updated to `api.build-desk.com` | FIXED |
| `src/components/seo/UnifiedSEOSystem.tsx` | Updated to `api.build-desk.com` | FIXED |
| `src/components/seo/PageSEO.tsx` | Updated to `api.build-desk.com` | FIXED |
| `src/components/ui/smart-logo.tsx` | Updated to `api.build-desk.com` | FIXED |
| `src/components/ui/responsive-logo.tsx` | Updated to `api.build-desk.com` | FIXED |

### Files Already Correctly Configured

| File | Status | Notes |
|------|--------|-------|
| `src/integrations/supabase/client.ts` | OK | Uses `VITE_SUPABASE_URL`, `VITE_EDGE_FUNCTIONS_URL` |
| `wrangler.toml` | OK | Already configured for `api.build-desk.com` |
| `ENV_SETUP_SELFHOSTED.md` | OK | Documentation for self-hosted setup |

### Documentation Files (Not Runtime Critical)

60+ documentation files still reference the old cloud project ID. These are not runtime critical and can be updated as needed:
- CLAUDE.md
- README-MCP.md
- Various setup guides and migration docs
- Backup files

---

## Environment Variables Reference

### Web Application (Vite - prefix: VITE_)

```env
# REQUIRED - Supabase Connection
VITE_SUPABASE_URL=https://api.build-desk.com
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-from-self-hosted
VITE_EDGE_FUNCTIONS_URL=https://functions.build-desk.com

# OPTIONAL - Project Identification
VITE_SUPABASE_PROJECT_ID=builddesk

# OPTIONAL - Analytics
VITE_POSTHOG_API_KEY=your-posthog-key
VITE_POSTHOG_HOST=https://app.posthog.com

# OPTIONAL - Error Tracking
VITE_SENTRY_DSN=your-sentry-dsn
```

### Mobile Application (Expo - prefix: EXPO_PUBLIC_)

```env
# REQUIRED - Supabase Connection
EXPO_PUBLIC_SUPABASE_URL=https://api.build-desk.com
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-from-self-hosted
EXPO_PUBLIC_EDGE_FUNCTIONS_URL=https://functions.build-desk.com
EXPO_PUBLIC_API_BASE_URL=https://api.build-desk.com

# OPTIONAL - App Configuration
EXPO_PUBLIC_APP_NAME=BuildDesk
EXPO_PUBLIC_APP_VERSION=1.0.0

# OPTIONAL - Third-Party Services
EXPO_PUBLIC_MIXPANEL_TOKEN=your-mixpanel-token
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
EXPO_PUBLIC_WEATHER_API_KEY=your-weather-api-key
```

### Edge Functions (Deno - Supabase Secrets)

```bash
# Core Supabase (REQUIRED - set in edge function environment)
SUPABASE_URL=https://api.build-desk.com
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# AI Services
CLAUDE_API_KEY                  # Anthropic Claude API key
OPENAI_API_KEY                  # OpenAI API key
GEMINI_API_KEY                  # Google Gemini API key

# Payment Processing
STRIPE_SECRET_KEY               # Stripe secret key
STRIPE_WEBHOOK_SECRET           # Stripe webhook signing secret
STRIPE_PUBLISHABLE_KEY          # Stripe publishable key (for some functions)

# Email Services
RESEND_API_KEY                  # Resend email service
SENDGRID_API_KEY                # SendGrid email service
FROM_EMAIL                      # Default sender email address

# Google Services
GOOGLE_OAUTH_CLIENT_ID          # Google OAuth client ID
GOOGLE_OAUTH_CLIENT_SECRET      # Google OAuth client secret
GOOGLE_OAuth_CLIENT_SECRET      # Alternate naming (used in some functions)
GOOGLE_CLIENT_EMAIL             # Service account email
GOOGLE_PRIVATE_KEY              # Service account private key
GOOGLE_CLIENT_ID                # Client ID for OAuth
GOOGLE_CLIENT_SECRET            # Client secret for OAuth
GOOGLE_REDIRECT_URI             # OAuth redirect URI
GA4_PROPERTY_ID                 # Google Analytics 4 property ID
PAGESPEED_INSIGHTS_API_KEY      # PageSpeed Insights API key
Google_Search_Console_API       # Search Console API key

# Microsoft Services
MICROSOFT_CLIENT_SECRET         # Microsoft OAuth client secret
Microsoft_Bing_API              # Bing Webmaster API key
BING_SEARCH_API_KEY             # Bing Search API key

# QuickBooks Integration
QUICKBOOKS_CLIENT_ID            # QuickBooks OAuth client ID
QUICKBOOKS_CLIENT_SECRET        # QuickBooks OAuth client secret

# Twilio (SMS/Voice)
TWILIO_ACCOUNT_SID              # Twilio account SID
TWILIO_AUTH_TOKEN               # Twilio auth token
TWILIO_PHONE_NUMBER             # Twilio phone number

# SEO Tools
SERP_API_KEY                    # SERP API for keyword tracking
AHREFS_API_KEY                  # Ahrefs backlink data
MOZ_ACCESS_ID                   # Moz API access ID
MOZ_SECRET_KEY                  # Moz API secret key
SEARCH_CONSOLE_SITE_URL         # Your site URL for search console

# Webhooks & Notifications
SLACK_WEBHOOK_URL               # Slack incoming webhook
CUSTOM_WEBHOOK_URL              # Custom webhook endpoint

# Admin & Security
ADMIN_CREATION_SECRET           # Secret for root admin creation
ADMIN_EMAIL                     # Default admin email
ADMIN_PASSWORD                  # Default admin password (initial setup only)
BLOG_AUTOMATION_API_KEY         # Blog automation endpoint protection
CRON_SECRET                     # Cron job authentication
```

### Cloudflare (CI/CD & CDN)

```env
CLOUDFLARE_ZONE_ID              # Cloudflare zone ID for cache purging
CLOUDFLARE_API_TOKEN            # Cloudflare API token
```

### MCP Server Configuration

```env
SUPABASE_ACCESS_TOKEN           # Personal access token for MCP server
SUPABASE_PROJECT_ID=builddesk   # Project ID for MCP commands
UPSTASH_REDIS_REST_URL          # Upstash Redis URL (for context7)
UPSTASH_REDIS_REST_TOKEN        # Upstash Redis token
```

---

## Edge Function URL Patterns

Edge functions correctly use environment variables. The pattern is:

```typescript
// In edge functions - uses SUPABASE_URL from environment
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  { auth: { persistSession: false } }
);
```

**Important**: Ensure these environment variables are set in your self-hosted edge function runtime:
- `SUPABASE_URL=https://api.build-desk.com`
- `SUPABASE_ANON_KEY=your-anon-key`
- `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`

### Functions with Internal Calls

These edge functions call other edge functions and rely on `SUPABASE_URL`:

| Function | Internal Call Target |
|----------|---------------------|
| `cron-social-scheduler` | `social-post-scheduler` |
| `webhook-trigger` | `webhook-delivery` |
| `sso-oauth-init` | `sso-oauth-callback` |
| `sso-saml-init` | `sso-saml-callback` |
| `gsc-oauth-init` | `gsc-oauth-callback` |
| `google-calendar-auth` | `google-calendar-callback` |
| `outlook-calendar-auth` | `outlook-calendar-callback` |
| `twilio-calling` | `twilio-calling` (callback) |

---

## Testing Checklist

After deployment, verify:

- [ ] Web app connects to `https://api.build-desk.com`
- [ ] Edge functions route to `https://functions.build-desk.com`
- [ ] Authentication works (login/logout/signup)
- [ ] Database queries work
- [ ] File uploads to storage work
- [ ] Real-time subscriptions work
- [ ] Edge function calls work
- [ ] Mobile app connects correctly (if applicable)
- [ ] OAuth flows work (Google, QuickBooks, etc.)
- [ ] Stripe webhooks are received
- [ ] Email sending works (Resend/SendGrid)
- [ ] Logo images load from new storage URL

---

## Important Notes

1. **Session Tokens**: The session token prefix changed from `sb-ilhzuvemiuyfuxfegtlv-auth-token` to `sb-builddesk-auth-token`. Existing users will need to re-authenticate.

2. **Storage URLs**: Logo and asset URLs now point to `api.build-desk.com/storage/v1/object/public/`. Ensure these assets are available in your self-hosted storage.

3. **Edge Functions**: All edge functions use environment variables correctly. Just configure the environment properly.

4. **Mobile App**: Now requires environment variables - no more hardcoded fallbacks. This is intentional for security.

5. **OAuth Callbacks**: OAuth redirect URIs need to be updated in your OAuth provider settings (Google, Microsoft, QuickBooks) to use the new self-hosted URLs.

---

## Files Changed in This Migration

```
# Core Configuration
supabase/config.toml
package.json
.mcprc.example
mcp-server-config.json
index.html

# Web Application
src/config/sessionConfig.ts
src/config/__tests__/sessionConfig.test.ts
src/contexts/AuthContext.tsx
src/hooks/__tests__/useSessionRefresh.test.ts
src/components/SEOMetaTags.tsx
src/components/seo/UnifiedSEOSystem.tsx
src/components/seo/PageSEO.tsx
src/components/ui/smart-logo.tsx
src/components/ui/responsive-logo.tsx

# Mobile Application
mobile-app/src/services/supabase.ts
mobile-app/scripts/setup.sh

# Edge Functions
supabase/functions/generate-scaling-plan/index.ts
supabase/functions/send-renewal-notification/index.ts
edge-functions-template/functions/generate-scaling-plan/index.ts

# Tests
tests/e2e/smoke.spec.ts
```

## New Environment Variable Added

- `APP_URL` - Used by `send-renewal-notification` edge function for email links (defaults to `https://builddesk.com`)
