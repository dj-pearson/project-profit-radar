# Self-Hosted Supabase Authentication Setup Guide

This guide documents the authentication setup requirements for self-hosted Supabase deployments.

## Prerequisites

- Self-hosted Supabase instance (Kong, Auth, Database, Storage)
- Edge Functions deployment (Deno runtime)
- Amazon SES for email delivery (or compatible SMTP)
- Cloudflare Pages (or similar) for frontend hosting

---

## Environment Variables

### Frontend (Cloudflare Pages)

Set these in your Cloudflare Pages dashboard under Settings > Environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Your Kong API gateway URL (e.g., `https://api.yourdomain.com`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anonymous/public key |
| `VITE_EDGE_FUNCTIONS_URL` | Optional | Edge functions URL if separate from main API |
| `VITE_POSTHOG_API_KEY` | Optional | PostHog analytics key |
| `VITE_POSTHOG_HOST` | Optional | PostHog host URL |

### Edge Functions (Supabase/Deno)

Set these in your edge functions deployment:

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Your Supabase API URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (full access) |
| `ENVIRONMENT` | Recommended | Set to `production` or `development` |
| `ALLOWED_CORS_ORIGINS` | Recommended | Comma-separated list of allowed CORS origins |

#### CORS Origins Example
```
ALLOWED_CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://app.yourdomain.com
```

---

## Database Setup

### Required Migrations

Ensure these migrations have been applied to your database:

1. **User Management**
   - `user_profiles` table with role-based access
   - `user_security` table for login attempt tracking
   - `user_roles` table for RBAC

2. **OTP Authentication** (Migration: `20260103000001_fix_otp_functions_single_tenant.sql`)
   - `auth_otp_codes` table for storing OTP tokens
   - `create_otp_token()` function (single-tenant version)
   - `verify_otp_code()` function (single-tenant version)

3. **Security Logging**
   - `security_logs` table for audit trail
   - `log_security_event()` RPC function

### Required RPC Functions

Verify these functions exist in your database:

```sql
-- Check if functions exist
SELECT proname FROM pg_proc WHERE proname IN (
    'get_user_primary_role',
    'create_otp_token',
    'verify_otp_code',
    'log_security_event',
    'cleanup_expired_otp_tokens'
);
```

---

## Authentication Flow

### 1. Signup Flow

1. User enters email, password, name
2. Frontend calls `signup-with-otp` edge function
3. Edge function creates user (email unconfirmed)
4. OTP code generated and stored in `auth_otp_codes`
5. Email sent via Amazon SES with 6-digit OTP
6. User enters OTP on verification screen
7. Frontend calls `verify-auth-otp` edge function
8. User email is confirmed, account activated

### 2. Login Flow

1. User enters email and password
2. Frontend checks for account lockout (brute force protection)
3. Supabase Auth validates credentials
4. Failed attempts tracked in `user_security` table
5. After 5 failures: account locked with exponential backoff
6. On success: failed attempts cleared

### 3. Password Reset Flow

1. User requests password reset
2. Frontend calls `reset-password-otp` edge function
3. OTP sent to email (10-minute expiry)
4. User enters OTP and new password
5. Password updated via Admin API

---

## Security Features

### Brute Force Protection

- **Max attempts**: 5 failed logins
- **Lockout duration**: 5-60 minutes (exponential backoff)
- **Reset window**: 15 minutes of no failures resets counter

### OTP Security

- **6-digit codes**: Cryptographically random
- **Expiry times**:
  - Signup: 15 minutes
  - Password reset: 10 minutes
  - Magic link: 10 minutes
  - Reauthentication: 5 minutes
- **Max attempts**: 5 per OTP token
- **Single use**: Token invalidated after verification

### Session Management

- **Inactivity timeout**: 30 minutes
- **Session validation**: Every 5 minutes
- **Token refresh**: Automatic with Supabase client
- **Profile caching**: sessionStorage (cleared on tab close)

---

## Edge Function Deployment

### Required Edge Functions

| Function | Purpose |
|----------|---------|
| `signup-with-otp` | User registration with OTP verification |
| `verify-auth-otp` | OTP verification for all auth flows |
| `send-auth-otp` | Send OTP for various purposes |
| `reset-password-otp` | Password reset flow |
| `sso-manage` | SSO configuration management |
| `setup-mfa` | MFA/TOTP setup |
| `verify-mfa-setup` | MFA verification |
| `verify-mfa-login` | MFA login verification |
| `disable-mfa` | Disable MFA for user |

### Shared Modules

Located in `supabase/functions/_shared/`:

- `auth-helpers.ts` - Authentication context and helpers
- `secure-cors.ts` - CORS configuration
- `ses-email-service.ts` - Amazon SES email delivery
- `auth-email-templates.ts` - Email templates with OTP codes

---

## Email Configuration

### Amazon SES Setup

1. Verify your sending domain in SES
2. Configure DKIM and SPF records
3. Set up bounce/complaint handlers
4. Configure edge function environment:

```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
SES_FROM_EMAIL=noreply@yourdomain.com
```

### Email Templates

Emails are branded with BuildDesk styling and include:
- 6-digit OTP codes (large, easy to read)
- Expiration time warnings
- Security notices
- Support contact information

---

## Deployment Checklist

### Pre-Deployment

- [ ] Supabase instance running and accessible
- [ ] Kong API gateway configured
- [ ] Database migrations applied
- [ ] Edge functions deployed
- [ ] Amazon SES configured and verified

### Frontend (Cloudflare Pages)

- [ ] `VITE_SUPABASE_URL` set to Kong URL
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` set
- [ ] Build command: `npm ci && npm run build`
- [ ] Output directory: `dist`
- [ ] Node.js version: 18+

### Edge Functions

- [ ] `SUPABASE_URL` set
- [ ] `SUPABASE_ANON_KEY` set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set
- [ ] `ENVIRONMENT` set to `production`
- [ ] `ALLOWED_CORS_ORIGINS` includes your domain(s)
- [ ] Amazon SES credentials configured

### Database

- [ ] `auth_otp_codes` table created with nullable `site_id`
- [ ] OTP functions use single-tenant signature (no `site_id` parameter)
- [ ] `user_profiles` table with RLS policies
- [ ] `user_security` table for login tracking
- [ ] `security_logs` table for audit

### Security Verification

- [ ] HTTPS enforced everywhere
- [ ] CORS only allows your domains
- [ ] Rate limiting at Kong/proxy level
- [ ] Service role key never exposed to frontend
- [ ] RLS enabled on all tables

---

## Troubleshooting

### Authentication Fails

1. Check browser console for errors
2. Verify `VITE_SUPABASE_URL` points to Kong
3. Check edge function logs for errors
4. Verify database functions exist

### OTP Not Sending

1. Check Amazon SES logs
2. Verify email domain is verified
3. Check edge function logs
4. Verify `create_otp_token` function signature

### CORS Errors

1. Check `ALLOWED_CORS_ORIGINS` includes your domain
2. Verify Kong is not blocking preflight
3. Check edge function CORS headers

### Session Issues

1. Check browser storage for auth tokens
2. Verify token refresh is working
3. Check for clock skew between client/server

---

## Support

For issues, check:
- Edge function logs (Deno runtime)
- Browser developer console
- Supabase dashboard logs
- Kong/API gateway logs

---

*Last Updated: 2026-01-03*
