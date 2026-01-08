# Authentication Setup Documentation
## Self-Hosted Supabase + Edge Functions Architecture

**Last Updated:** January 7, 2026  
**Project:** EatPal (Munch Maker Mate)  
**Status:** ✅ Working in Production

---

## Table of Contents

1. [Infrastructure Overview](#infrastructure-overview)
2. [Environment Variables](#environment-variables)
3. [Self-Hosted Supabase Configuration](#self-hosted-supabase-configuration)
4. [Edge Functions Service](#edge-functions-service)
5. [Frontend Authentication Flow](#frontend-authentication-flow)
6. [Database Setup](#database-setup)
7. [Security Implementations](#security-implementations)
8. [OAuth Configuration](#oauth-configuration)
9. [Deployment Checklist](#deployment-checklist)
10. [Testing & Verification](#testing--verification)
11. [Troubleshooting](#troubleshooting)

---

## Infrastructure Overview

### Architecture Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                            │
│                  (https://tryeatpal.com)                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE PAGES                             │
│              (Vite React App + Static Assets)                   │
│                                                                 │
│  Environment Variables:                                         │
│  - VITE_SUPABASE_URL                                           │
│  - VITE_SUPABASE_ANON_KEY                                      │
│  - VITE_FUNCTIONS_URL                                          │
└───────────┬──────────────────────────┬──────────────────────────┘
            │                          │
            │                          │
            ▼                          ▼
┌──────────────────────┐    ┌──────────────────────────┐
│  SELF-HOSTED         │    │  SELF-HOSTED             │
│  SUPABASE            │    │  EDGE FUNCTIONS          │
│  (Coolify)           │    │  (Separate Service)      │
│                      │    │                          │
│  https://api.        │    │  https://functions.      │
│  tryeatpal.com       │    │  tryeatpal.com           │
│                      │    │                          │
│  - Auth Service      │    │  - 77 Deno Functions     │
│  - PostgreSQL DB     │    │  - AI Services           │
│  - Storage           │    │  - Email Services        │
│  - Realtime          │    │  - Webhooks              │
└───────────┬──────────┘    └──────────────────────────┘
            │
            ▼
┌──────────────────────────┐
│   PostgreSQL Database    │
│   209.145.59.219:5434    │
│                          │
│  - User Auth Data        │
│  - Profiles              │
│  - Application Data      │
└──────────────────────────┘
```

### Key Differences from Hosted Supabase

| Aspect | Hosted Supabase | Self-Hosted Setup |
|--------|----------------|-------------------|
| **Auth API** | `<project>.supabase.co` | `https://api.tryeatpal.com` |
| **Edge Functions** | Same domain | **Separate** `https://functions.tryeatpal.com` |
| **Database** | Managed | Self-managed PostgreSQL (port 5434) |
| **Configuration** | Supabase Dashboard | `supabase/config.toml` + ENV vars |
| **JWT Secret** | Auto-generated | **Custom JWT secret required** |
| **RLS Policies** | Same | Same (maintained in migrations) |

---

## Environment Variables

### Critical Environment Variables

These MUST be set in all deployment environments:

#### 1. **Cloudflare Pages** (Production Web)

Navigate to: `Dashboard → Settings → Environment variables`

```bash
# Core Supabase Configuration
VITE_SUPABASE_URL=https://api.tryeatpal.com
VITE_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTI1MzE2MCwiZXhwIjo0OTIwOTI2NzYwLCJyb2xlIjoiYW5vbiJ9.HBFEkJdBlHpZozkyUAcaV2IO-065599yClMPfsYt3Ug
VITE_FUNCTIONS_URL=https://functions.tryeatpal.com

# Application Metadata
VITE_APP_NAME=EatPal
VITE_APP_VERSION=1.0.0
VITE_APP_URL=https://tryeatpal.com

# Optional: Payment & Analytics
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_GA_MEASUREMENT_ID=G-...

# Optional: Error Tracking (Sentry)
VITE_SENTRY_DSN=https://...
VITE_SENTRY_ENABLED=true
```

#### 2. **Local Development** (.env file)

Create a `.env` file in project root:

```bash
# Self-Hosted Supabase
VITE_SUPABASE_URL=https://api.tryeatpal.com
VITE_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTI1MzE2MCwiZXhwIjo0OTIwOTI2NzYwLCJyb2xlIjoiYW5vbiJ9.HBFEkJdBlHpZozkyUAcaV2IO-065599yClMPfsYt3Ug
VITE_FUNCTIONS_URL=https://functions.tryeatpal.com

# Development-only (use test keys)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

#### 3. **Supabase Server** (Coolify/Docker)

Self-hosted Supabase environment variables:

```bash
# PostgreSQL
POSTGRES_HOST=209.145.59.219
POSTGRES_PORT=5434
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-password>

# JWT Configuration (CRITICAL)
JWT_SECRET=<your-jwt-secret>
JWT_EXPIRY=3600

# Auth Configuration
SITE_URL=https://tryeatpal.com
ADDITIONAL_REDIRECT_URLS=https://tryeatpal.com/auth,https://tryeatpal.com/auth/callback
DISABLE_SIGNUP=false
MAILER_AUTOCONFIRM=false

# Email (Resend or similar)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=<resend-api-key>
SMTP_SENDER_NAME=EatPal
SMTP_SENDER_EMAIL=noreply@tryeatpal.com

# OAuth Providers
GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>
APPLE_CLIENT_ID=<apple-oauth-client-id>
APPLE_CLIENT_SECRET=<apple-oauth-client-secret>

# Security
API_EXTERNAL_URL=https://api.tryeatpal.com
ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTI1MzE2MCwiZXhwIjo0OTIwOTI2NzYwLCJyb2xlIjoiYW5vbiJ9.HBFEkJdBlHpZozkyUAcaV2IO-065599yClMPfsYt3Ug
SERVICE_ROLE_KEY=<service-role-jwt>
```

#### 4. **Edge Functions Service**

Separate Deno service environment:

```bash
# Supabase Connection
SUPABASE_URL=https://api.tryeatpal.com
SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTI1MzE2MCwiZXhwIjo0OTIwOTI2NzYwLCJyb2xlIjoiYW5vbiJ9.HBFEkJdBlHpZozkyUAcaV2IO-065599yClMPfsYt3Ug
SUPABASE_SERVICE_ROLE_KEY=<service-role-jwt>

# OpenAI (for AI features)
OPENAI_API_KEY=<openai-key>

# Email Service
RESEND_API_KEY=<resend-api-key>

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Self-Hosted Supabase Configuration

### Configuration File: `supabase/config.toml`

```toml
# Self-hosted Coolify Supabase - use direct DB connection
# API URL: https://api.tryeatpal.com
# DB: 209.145.59.219:5434

# Auth Configuration
[auth]
# Email provider configuration
enable_signup = true

# Edge Functions Configuration
# NOTE: These are on a SEPARATE service (https://functions.tryeatpal.com)
# JWT verification varies by function

[functions.ai-meal-plan]
verify_jwt = true

[functions.suggest-foods]
verify_jwt = true

[functions.create-checkout]
verify_jwt = true

[functions.stripe-webhook]
verify_jwt = false  # Stripe verifies via webhook signature

[functions.generate-sitemap]
verify_jwt = false  # Public endpoint
```

### Key Configuration Points

1. **Database Connection:**
   - Host: `209.145.59.219`
   - Port: `5434` (NOT default 5432)
   - Direct PostgreSQL connection via pgAdmin or Supabase CLI

2. **Auth Service:**
   - Full Supabase Auth running at `https://api.tryeatpal.com`
   - Handles: signup, login, OTP, password reset, OAuth
   - Session management via JWT tokens
   - Cookies: `sb-<project>-auth-token`

3. **Storage:**
   - `localStorage` is primary session storage
   - `sessionStorage` as fallback
   - Auto token refresh enabled

---

## Edge Functions Service

### Separate Service Architecture

**Why Separate?**
- Deno runtime requirements
- Independent scaling
- Different deployment cycle
- Easier debugging and monitoring

### Deployed Functions (77 total)

Categories:
- **AI Services:** `ai-meal-plan`, `suggest-foods`, `suggest-recipe`, `analyze-content`
- **Auth:** `send-auth-email`, `oauth-token-refresh`
- **Payments:** `create-checkout`, `stripe-webhook`, `manage-subscription`
- **Email:** `send-emails`, `process-email-sequences`
- **Blog:** `generate-blog-content`, `publish-scheduled-posts`
- **SEO:** `generate-sitemap`, `seo-audit`, `check-core-web-vitals`
- **Grocery:** `process-delivery-order`, `parse-recipe-grocery`

### Function URL Structure

```
Base URL: https://functions.tryeatpal.com
Individual function: https://functions.tryeatpal.com/<function-name>

Example:
POST https://functions.tryeatpal.com/ai-meal-plan
```

### Calling Edge Functions from Frontend

```typescript
import { supabase } from '@/integrations/supabase/client';

// With JWT verification
const { data, error } = await supabase.functions.invoke('ai-meal-plan', {
  body: {
    kid_id: 'uuid',
    start_date: '2026-01-01',
    days: 7
  }
});

// Without JWT (public endpoints)
const response = await fetch('https://functions.tryeatpal.com/generate-sitemap');
const data = await response.json();
```

---

## Frontend Authentication Flow

### 1. Supabase Client Setup

**File:** `src/integrations/supabase/client.ts`

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: typeof localStorage !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        'X-Client-Info': 'eatpal-web',
      },
    },
  }
);
```

**Key Features:**
- ✅ Graceful fallback if Supabase not configured
- ✅ Mock client for development without backend
- ✅ Auto token refresh
- ✅ LocalStorage session persistence

### 2. Protected Routes

**File:** `src/components/ProtectedRoute.tsx`

```typescript
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Check existing session
    const checkSession = async () => {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      setSession(currentSession);
      setIsLoading(false);
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Show loading while checking
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Redirect to auth if no session
  if (session === null) {
    const redirectPath = `${location.pathname}${location.search}${location.hash}`;
    const authUrl = `/auth?redirect=${encodeURIComponent(redirectPath)}`;
    return <Navigate to={authUrl} replace />;
  }

  return <>{children}</>;
}
```

**Security Features:**
- ✅ Race condition prevention (no premature redirects)
- ✅ Route memory (saves intended destination)
- ✅ Loading state prevents flash
- ✅ Cleanup on unmount

### 3. Authentication Page

**File:** `src/pages/Auth.tsx`

**Sign Up Flow:**
1. User enters email + password
2. Real-time validation (Zod schemas)
3. Password requirements displayed
4. Call `supabase.auth.signUp()`
5. Show OTP verification screen
6. User enters 6-digit code
7. Call `supabase.auth.verifyOtp()`
8. Create profile in database
9. Redirect to onboarding or dashboard

**Sign In Flow:**
1. User enters email + password
2. Call `supabase.auth.signInWithPassword()`
3. Session created automatically
4. `onAuthStateChange` listener fires
5. Check if onboarding complete
6. Redirect to appropriate page

**OAuth Flow (Google/Apple):**
1. User clicks OAuth button
2. Call `supabase.auth.signInWithOAuth({ provider: 'google' })`
3. Redirect to OAuth provider
4. User authorizes
5. Redirect back to `/auth?redirect=...`
6. Session created automatically
7. Profile created if first login
8. Redirect to intended page

### 4. Password Validation

**File:** `src/lib/validations.ts`

```typescript
export const PasswordSchema = z.string()
  .min(12, 'Password must be at least 12 characters long')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const EmailSchema = z.string().email('Invalid email address').max(255);
```

**Real-Time Feedback:**
- Shows checkmarks as requirements are met
- Green border when valid, red when invalid
- Visual indicators for each requirement

### 5. OTP Email Verification

**Features:**
- 6-digit code sent via email
- InputOTP component with autofocus
- Resend cooldown (60 seconds)
- Back to signup option
- Error handling with toast notifications

**Code:**
```typescript
const handleVerifyOtp = async (e: React.FormEvent) => {
  e.preventDefault();

  const { error } = await supabase.auth.verifyOtp({
    email: pendingEmail,
    token: otpCode,
    type: "signup",
  });

  if (error) {
    toast({ title: "Verification Failed", variant: "destructive" });
  } else {
    // Session automatically created, onAuthStateChange fires
    toast({ title: "Email Verified!", description: "Welcome to EatPal!" });
  }
};
```

---

## Database Setup

### Critical Tables for Authentication

#### 1. **`profiles` Table**

Created automatically by Supabase Auth, enhanced by migration:

**File:** `supabase/migrations/20251008140000_add_onboarding_to_profiles.sql`

```sql
-- Add onboarding_completed column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_completed);
```

**Columns:**
- `id` (UUID): Links to `auth.users.id`
- `email` (TEXT): User email
- `full_name` (TEXT): User's full name
- `onboarding_completed` (BOOLEAN): Onboarding status
- `created_at` (TIMESTAMPTZ): Account creation
- `updated_at` (TIMESTAMPTZ): Last update

#### 2. **`auth.users` Table**

Managed by Supabase Auth (DO NOT modify directly):
- `id` (UUID): Primary user identifier
- `email` (TEXT): User email
- `encrypted_password` (TEXT): Bcrypt hash
- `email_confirmed_at` (TIMESTAMPTZ): Email verification
- `last_sign_in_at` (TIMESTAMPTZ): Last login
- `raw_app_meta_data` (JSONB): OAuth metadata
- `raw_user_meta_data` (JSONB): Custom user data

#### 3. **Row-Level Security (RLS)**

**ALL tables with user data MUST have RLS enabled:**

```sql
-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
```

**Applied to all tables:**
- `kids`, `foods`, `recipes`, `plan_entries`
- `grocery_items`, `grocery_lists`
- `blog_posts` (author check)
- `subscriptions` (user_id check)

---

## Security Implementations

### 1. **Input Validation & Sanitization**

All user inputs validated with Zod schemas before submission:

```typescript
import { EmailSchema, PasswordSchema, sanitizeURL } from '@/lib/validations';

// Validate email
const emailResult = EmailSchema.safeParse(email);
if (!emailResult.success) {
  toast({ title: "Invalid Email", variant: "destructive" });
  return;
}

// Validate password
const passwordResult = PasswordSchema.safeParse(password);
if (!passwordResult.success) {
  toast({ title: "Weak Password", variant: "destructive" });
  return;
}

// Sanitize redirect URLs (prevent open redirect attacks)
const redirectTo = sanitizeURL(rawRedirect);
```

### 2. **Open Redirect Prevention**

**File:** `src/pages/Auth.tsx` (lines 107-111)

```typescript
// Get the redirect URL from query params (where user was trying to go)
// Validate redirect URL to prevent open redirect attacks
const rawRedirect = searchParams.get("redirect") || "/dashboard";
const sanitizedRedirect = sanitizeURL(rawRedirect);
// Only allow internal redirects (relative paths starting with /)
const redirectTo = sanitizedRedirect.startsWith("/") ? sanitizedRedirect : "/dashboard";
```

### 3. **XSS Prevention**

**File:** `src/lib/validations.ts`

Functions:
- `sanitizeHTML()` - Removes script tags, event handlers
- `sanitizeInput()` - Removes HTML, SQL injection patterns
- `sanitizeEmail()` - Prevents email header injection
- `sanitizeFilename()` - Prevents directory traversal

### 4. **CSRF Protection**

- Supabase handles CSRF tokens automatically
- All state-changing requests require valid JWT
- JWT verified on every API request

### 5. **Rate Limiting**

Database table: `rate_limit_config`

```sql
CREATE TABLE rate_limit_config (
  endpoint TEXT PRIMARY KEY,
  free_tier_limit INTEGER,
  premium_tier_limit INTEGER,
  window_minutes INTEGER
);
```

Applied to:
- `/auth/signup` - 5 attempts per hour
- `/auth/signin` - 10 attempts per hour
- Edge Functions - varies by tier

### 6. **Password Security**

- Minimum 12 characters
- Must include: uppercase, lowercase, number, special char
- Bcrypt hashing by Supabase Auth
- Salted with cost factor 10

### 7. **Session Management**

```typescript
auth: {
  storage: localStorage,  // Persistent sessions
  persistSession: true,   // Keep logged in
  autoRefreshToken: true, // Refresh before expiry
}
```

- JWT tokens stored in localStorage
- Tokens auto-refresh 5 minutes before expiry
- Session expires after 1 hour of inactivity
- Refresh tokens valid for 7 days

---

## OAuth Configuration

### Google OAuth Setup

1. **Google Cloud Console:**
   - Create project: "EatPal"
   - Enable "Google+ API"
   - Create OAuth 2.0 credentials

2. **Authorized Redirect URIs:**
   ```
   https://api.tryeatpal.com/auth/v1/callback
   https://tryeatpal.com/auth
   ```

3. **Scopes Required:**
   - `email`
   - `profile`
   - `openid`

4. **Add to Supabase:**
   ```bash
   GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=<client-secret>
   ```

### Apple OAuth Setup

1. **Apple Developer Console:**
   - Create App ID: `com.eatpal.app`
   - Enable "Sign in with Apple"
   - Create Service ID: `com.eatpal.web`

2. **Return URLs:**
   ```
   https://api.tryeatpal.com/auth/v1/callback
   ```

3. **Key Configuration:**
   - Download `.p8` key file
   - Convert to JWK format
   - Add to Supabase

4. **Add to Supabase:**
   ```bash
   APPLE_CLIENT_ID=com.eatpal.web
   APPLE_CLIENT_SECRET=<generated-jwt-token>
   ```

### OAuth Flow Implementation

**File:** `src/pages/Auth.tsx` (lines 335-352)

```typescript
const signInWithOAuth = async (provider: 'google' | 'apple') => {
  const callbackUrl = `${window.location.origin}/auth?redirect=${encodeURIComponent(redirectTo)}`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callbackUrl,
    },
  });

  if (error) {
    toast({ title: "Error", description: error.message, variant: "destructive" });
  }
};
```

**What happens:**
1. User clicks "Continue with Google"
2. Redirected to Google login
3. User authorizes app
4. Google redirects to: `https://api.tryeatpal.com/auth/v1/callback?code=...`
5. Supabase exchanges code for tokens
6. Supabase redirects to: `https://tryeatpal.com/auth?redirect=/dashboard`
7. Frontend creates session from URL params
8. Redirect to originally intended page

---

## Deployment Checklist

### Pre-Deployment

- [ ] Environment variables set in all environments
- [ ] Database migrations applied
- [ ] RLS policies enabled on all tables
- [ ] Edge Functions deployed and tested
- [ ] OAuth apps configured (Google, Apple)
- [ ] Email service configured (Resend/SMTP)
- [ ] SSL certificates installed
- [ ] DNS records configured

### DNS Configuration

```
A     api.tryeatpal.com        →  <server-ip>
A     functions.tryeatpal.com  →  <functions-server-ip>
A     tryeatpal.com            →  Cloudflare Pages
CNAME www.tryeatpal.com        →  tryeatpal.com
```

### SSL/TLS Certificates

- Self-hosted Supabase: Let's Encrypt via Nginx/Caddy
- Edge Functions: Let's Encrypt via Deno Deploy or similar
- Cloudflare Pages: Auto SSL

### Build & Deploy Commands

**Web (Cloudflare Pages):**
```bash
npm run build
# Output: dist/

# Manual deploy
npx wrangler pages deploy dist

# Auto-deploy on git push to main branch
```

**Edge Functions:**
```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy ai-meal-plan
```

---

## Testing & Verification

### Manual Testing Checklist

- [ ] **Sign Up:**
  - [ ] New user can create account
  - [ ] Email OTP sent and received
  - [ ] OTP verification works
  - [ ] Profile created in database
  - [ ] Redirect to onboarding

- [ ] **Sign In:**
  - [ ] Existing user can log in
  - [ ] Remember me (persistent session)
  - [ ] Auto-redirect if already logged in

- [ ] **OAuth:**
  - [ ] Google sign in works
  - [ ] Apple sign in works
  - [ ] Profile created on first OAuth login
  - [ ] Subsequent logins link to existing account

- [ ] **Password Reset:**
  - [ ] Forgot password email sent
  - [ ] Reset link works
  - [ ] New password accepted
  - [ ] Can log in with new password

- [ ] **Protected Routes:**
  - [ ] Unauthenticated users redirected to /auth
  - [ ] Authenticated users can access dashboard
  - [ ] Route memory works (redirect after login)

- [ ] **Session Management:**
  - [ ] Session persists on page reload
  - [ ] Session expires after inactivity
  - [ ] Token auto-refreshes
  - [ ] Logout clears session

### Automated Testing

**E2E Tests (Playwright):**

**File:** `tests/auth.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('user can sign up and verify email', async ({ page }) => {
  await page.goto('/auth');
  
  // Fill sign up form
  await page.fill('input[id="signup-email"]', 'test@example.com');
  await page.fill('input[id="signup-password"]', 'StrongP@ssw0rd123');
  await page.click('button[type="submit"]');
  
  // Should show OTP screen
  await expect(page.locator('text=Check Your Email')).toBeVisible();
});

test('user can sign in', async ({ page }) => {
  await page.goto('/auth');
  
  // Switch to sign in tab
  await page.click('text=Sign In');
  
  // Fill sign in form
  await page.fill('input[id="signin-email"]', 'test@example.com');
  await page.fill('input[id="signin-password"]', 'StrongP@ssw0rd123');
  await page.click('button[type="submit"]');
  
  // Should redirect to dashboard
  await expect(page).toHaveURL('/dashboard');
});
```

**Run Tests:**
```bash
npm run test:e2e
```

---

## Troubleshooting

### Common Issues

#### 1. **"Invalid JWT" Errors**

**Cause:** JWT secret mismatch between frontend and backend

**Fix:**
```bash
# Ensure VITE_SUPABASE_ANON_KEY matches the JWT generated with your JWT_SECRET
# Regenerate JWT if needed:

# JWT Payload:
{
  "iss": "supabase",
  "iat": 1765253160,
  "exp": 4920926760,
  "role": "anon"
}

# Sign with your JWT_SECRET using HS256 algorithm
```

#### 2. **Email OTP Not Sending**

**Check:**
- [ ] SMTP credentials correct
- [ ] Email service (Resend) API key valid
- [ ] Sender email verified
- [ ] Check spam folder
- [ ] Check Supabase Auth logs

**Debug:**
```bash
# Check Supabase logs
supabase logs --project-ref <ref>

# Test SMTP connection
curl -v --url 'smtp://smtp.resend.com:587' \
  --user 'resend:<api-key>' \
  --mail-from 'noreply@tryeatpal.com' \
  --mail-rcpt 'test@example.com' \
  --upload-file email.txt
```

#### 3. **OAuth Redirect Not Working**

**Check:**
- [ ] Redirect URLs match exactly in OAuth provider settings
- [ ] Using HTTPS (not HTTP)
- [ ] Callback URL includes `/auth/v1/callback`
- [ ] No trailing slashes

**Correct URLs:**
```
✅ https://api.tryeatpal.com/auth/v1/callback
❌ http://api.tryeatpal.com/auth/v1/callback  (HTTP)
❌ https://api.tryeatpal.com/auth/v1/callback/  (trailing slash)
```

#### 4. **Session Not Persisting**

**Check:**
- [ ] localStorage enabled in browser
- [ ] Cookies not blocked
- [ ] Same-site cookie policy correct
- [ ] Token not expired

**Debug:**
```javascript
// In browser console
localStorage.getItem('sb-api-auth-token')
// Should show JWT token

// Check session
const { data: { session } } = await supabase.auth.getSession();
console.log(session);
```

#### 5. **CORS Errors**

**Check:**
- [ ] `ADDITIONAL_REDIRECT_URLS` includes your frontend domain
- [ ] `SITE_URL` set correctly
- [ ] Nginx/Caddy CORS headers configured

**Nginx Config:**
```nginx
add_header 'Access-Control-Allow-Origin' 'https://tryeatpal.com';
add_header 'Access-Control-Allow-Credentials' 'true';
add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type';
```

#### 6. **Edge Functions Return 503**

**From test report:** All 77 edge functions returning 503

**Possible Causes:**
- Edge Functions service not running
- Wrong `VITE_FUNCTIONS_URL` in frontend
- Network connectivity issues
- Functions not deployed

**Fix:**
```bash
# Check if functions service is running
curl https://functions.tryeatpal.com/health

# Redeploy functions
supabase functions deploy

# Check logs
supabase functions logs ai-meal-plan
```

---

## Summary

### What Makes This Setup Work

1. **Separate Services:**
   - Supabase Auth on `api.tryeatpal.com`
   - Edge Functions on `functions.tryeatpal.com`
   - Frontend on `tryeatpal.com` (Cloudflare)

2. **Environment Variables:**
   - `VITE_SUPABASE_URL` points to self-hosted API
   - `VITE_SUPABASE_ANON_KEY` is custom-generated JWT
   - `VITE_FUNCTIONS_URL` points to separate functions service

3. **Security:**
   - RLS on all tables
   - Strong password requirements
   - Input validation with Zod
   - Open redirect prevention
   - XSS/CSRF protection

4. **Authentication Flow:**
   - Email + Password with OTP verification
   - OAuth (Google, Apple)
   - Protected routes with session persistence
   - Route memory for seamless UX

5. **Database:**
   - PostgreSQL with RLS
   - Profiles table with onboarding flag
   - Auth tables managed by Supabase

### Replication Steps (Quick Version)

1. **Deploy Self-Hosted Supabase:**
   - Docker or Coolify
   - Set JWT_SECRET
   - Configure SMTP
   - Set SITE_URL and ADDITIONAL_REDIRECT_URLS

2. **Deploy Edge Functions:**
   - Separate Deno service
   - Configure SUPABASE_URL and SUPABASE_ANON_KEY
   - Deploy all functions

3. **Configure Frontend:**
   - Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_FUNCTIONS_URL
   - Deploy to Cloudflare Pages or similar

4. **Set Up OAuth:**
   - Google Cloud Console
   - Apple Developer
   - Add credentials to Supabase

5. **Test:**
   - Sign up, sign in, OAuth
   - Protected routes
   - Email delivery
   - Token refresh

---

**Document Version:** 1.0  
**Last Verified:** January 7, 2026  
**Maintainer:** Development Team  
**Questions?** Check troubleshooting section or review code in `src/pages/Auth.tsx` and `src/integrations/supabase/client.ts`
