# OAuth Setup for Self-Hosted Supabase with Edge Functions

This guide documents how to implement Google/Apple OAuth when using self-hosted Supabase with a separate Edge Functions Docker container.

## The Problem

In self-hosted Supabase (especially with Coolify), `GOTRUE_SITE_URL` is locked to the Kong API URL (e.g., `api.yourdomain.com`). This causes OAuth to redirect to the Supabase Dashboard instead of your frontend after authentication.

## The Solution

Create a custom OAuth proxy edge function that:
1. Handles the OAuth flow directly with Google/Apple
2. Creates a Supabase user session via Admin API
3. Redirects to your frontend with a magic link token

## Architecture

```
Frontend (tryeatpal.com)
    │
    ▼ Click "Sign in with Google"
Edge Functions (functions.tryeatpal.com/oauth-proxy?action=authorize)
    │
    ▼ Redirect to Google
Google OAuth (accounts.google.com)
    │
    ▼ User authenticates, redirect with code
Edge Functions (functions.tryeatpal.com/oauth-proxy?action=callback)
    │
    ▼ Exchange code for tokens, create Supabase session
Frontend (tryeatpal.com/auth/callback?token=xxx)
    │
    ▼ Verify token, establish session
Dashboard (tryeatpal.com/dashboard)
```

---

## Step 1: Create the OAuth Proxy Edge Function

Create `supabase/functions/oauth-proxy/index.ts`:

```typescript
/**
 * OAuth Proxy Edge Function
 * Bypasses GoTrue's GOTRUE_SITE_URL limitation for self-hosted Supabase
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Configuration from environment variables
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://yourdomain.com';
const FUNCTIONS_URL = Deno.env.get('FUNCTIONS_URL') || 'https://functions.yourdomain.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://api.yourdomain.com';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') || '';
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') || '';
const APPLE_CLIENT_ID = Deno.env.get('APPLE_CLIENT_ID') || '';
const APPLE_CLIENT_SECRET = Deno.env.get('APPLE_CLIENT_SECRET') || '';

// Export handler for edge-functions-server
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const provider = url.searchParams.get('provider') || 'google';
    const redirectTo = url.searchParams.get('redirect_to') || '/dashboard';
    const functionUrl = `${FUNCTIONS_URL}/oauth-proxy`;

    if (action === 'authorize') {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const stateData = btoa(JSON.stringify({
        verifier: codeVerifier,
        redirectTo: redirectTo,
        provider: provider,
      }));

      let authUrl: URL;

      if (provider === 'google') {
        authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
        authUrl.searchParams.set('redirect_uri', `${functionUrl}?action=callback`);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'openid email profile');
        authUrl.searchParams.set('state', stateData);
        authUrl.searchParams.set('code_challenge', codeChallenge);
        authUrl.searchParams.set('code_challenge_method', 'S256');
        authUrl.searchParams.set('access_type', 'offline');
        authUrl.searchParams.set('prompt', 'consent');
      } else if (provider === 'apple') {
        authUrl = new URL('https://appleid.apple.com/auth/authorize');
        authUrl.searchParams.set('client_id', APPLE_CLIENT_ID);
        authUrl.searchParams.set('redirect_uri', `${functionUrl}?action=callback`);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'name email');
        authUrl.searchParams.set('state', stateData);
        authUrl.searchParams.set('response_mode', 'query');
      } else {
        return new Response(JSON.stringify({ error: 'Unsupported provider' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': authUrl.toString() },
      });
    }

    if (action === 'callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      if (error) {
        const errorUrl = new URL(`${FRONTEND_URL}/auth`);
        errorUrl.searchParams.set('error', error);
        errorUrl.searchParams.set('error_description', url.searchParams.get('error_description') || '');
        return new Response(null, { status: 302, headers: { 'Location': errorUrl.toString() } });
      }

      if (!code || !state) {
        return new Response(JSON.stringify({ error: 'Missing code or state' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let stateData;
      try {
        stateData = JSON.parse(atob(state));
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid state' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { verifier, redirectTo: finalRedirect, provider: stateProvider } = stateData;
      let tokenData;

      // Exchange code for tokens
      if (stateProvider === 'google') {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            code: code,
            code_verifier: verifier,
            grant_type: 'authorization_code',
            redirect_uri: `${functionUrl}?action=callback`,
          }),
        });
        tokenData = await tokenResponse.json();
      } else if (stateProvider === 'apple') {
        const tokenResponse = await fetch('https://appleid.apple.com/auth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: APPLE_CLIENT_ID,
            client_secret: APPLE_CLIENT_SECRET,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: `${functionUrl}?action=callback`,
          }),
        });
        tokenData = await tokenResponse.json();
      }

      if (tokenData.error) {
        console.error('Token error:', tokenData);
        const errorUrl = new URL(`${FRONTEND_URL}/auth`);
        errorUrl.searchParams.set('error', tokenData.error);
        return new Response(null, { status: 302, headers: { 'Location': errorUrl.toString() } });
      }

      // Decode ID token to get user info
      const payload = JSON.parse(atob(tokenData.id_token.split('.')[1]));

      // Create Supabase admin client
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Check if user exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === payload.email);

      if (!existingUser) {
        // Create new user
        const { error: createError } = await supabase.auth.admin.createUser({
          email: payload.email,
          email_confirm: true,
          user_metadata: {
            full_name: payload.name,
            avatar_url: payload.picture,
            provider: stateProvider,
          },
          app_metadata: {
            provider: stateProvider,
            providers: [stateProvider],
          },
        });
        if (createError) {
          console.error('Create user error:', createError);
          const errorUrl = new URL(`${FRONTEND_URL}/auth`);
          errorUrl.searchParams.set('error', 'create_user_failed');
          return new Response(null, { status: 302, headers: { 'Location': errorUrl.toString() } });
        }
      }

      // Generate magic link for session
      const { data, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: payload.email,
        options: { redirectTo: `${FRONTEND_URL}${finalRedirect}` },
      });

      if (linkError) {
        console.error('Generate link error:', linkError);
        const errorUrl = new URL(`${FRONTEND_URL}/auth`);
        errorUrl.searchParams.set('error', 'generate_link_failed');
        return new Response(null, { status: 302, headers: { 'Location': errorUrl.toString() } });
      }

      // Extract token and redirect to frontend
      const magicLinkUrl = new URL(data.properties.action_link);
      const token = magicLinkUrl.searchParams.get('token');
      const type = magicLinkUrl.searchParams.get('type');

      const successUrl = new URL(`${FRONTEND_URL}/auth/callback`);
      successUrl.searchParams.set('token', token || '');
      successUrl.searchParams.set('type', type || 'magiclink');
      successUrl.searchParams.set('redirect_to', finalRedirect);
      if (!existingUser) successUrl.searchParams.set('new_user', 'true');

      return new Response(null, { status: 302, headers: { 'Location': successUrl.toString() } });
    }

    // Default response
    return new Response(JSON.stringify({
      usage: 'Call with ?action=authorize&provider=google to start OAuth flow',
      providers: ['google', 'apple'],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('OAuth proxy error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// PKCE helpers
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
```

---

## Step 2: Add to Edge Functions Server

In your `edge-functions-server.ts`, add to the `FUNCTIONS_MAP`:

```typescript
const FUNCTIONS_MAP: { [key: string]: string } = {
  // ... other functions
  "oauth-proxy": "./functions/oauth-proxy/index.ts",
  // ... other functions
};
```

**Important:** The function must export a default handler, NOT use `Deno.serve()`.

---

## Step 3: Create Auth Callback Page

Create `src/pages/AuthCallback.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const error = searchParams.get('error');
        if (error) {
          setStatus('error');
          setErrorMessage(searchParams.get('error_description') || error);
          return;
        }

        // Handle magic link token from OAuth proxy
        const token = searchParams.get('token');
        const type = searchParams.get('type');
        const redirectTo = searchParams.get('redirect_to') || '/dashboard';

        if (token && type) {
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: type as any,
          });

          if (verifyError) {
            setStatus('error');
            setErrorMessage(verifyError.message);
            return;
          }

          if (data.session) {
            setStatus('success');
            setTimeout(() => navigate(redirectTo, { replace: true }), 500);
            return;
          }
        }

        // Handle PKCE code (fallback)
        const code = searchParams.get('code');
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            setStatus('error');
            setErrorMessage(exchangeError.message);
            return;
          }
          if (data.session) {
            setStatus('success');
            setTimeout(() => navigate('/dashboard', { replace: true }), 500);
            return;
          }
        }

        // No valid auth data found
        navigate('/auth', { replace: true });
      } catch (err) {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'An error occurred');
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  if (status === 'processing') {
    return <div>Completing sign in...</div>;
  }

  if (status === 'success') {
    return <div>Sign in successful! Redirecting...</div>;
  }

  return (
    <div>
      <h1>Authentication Failed</h1>
      <p>{errorMessage}</p>
      <button onClick={() => navigate('/auth')}>Try Again</button>
    </div>
  );
}
```

---

## Step 4: Add Route

In `src/App.tsx`:

```typescript
import { lazy } from 'react';

const AuthCallback = lazy(() => import('./pages/AuthCallback'));

// In your routes:
<Route path="/auth/callback" element={<AuthCallback />} />
```

---

## Step 5: Update Sign In Function

In your auth page, update the OAuth sign-in:

```typescript
const signInWithOAuth = async (provider: 'google' | 'apple') => {
  const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'https://functions.yourdomain.com';
  const redirectTo = '/dashboard'; // or wherever you want to redirect after login

  const oauthUrl = `${functionsUrl}/oauth-proxy?action=authorize&provider=${provider}&redirect_to=${encodeURIComponent(redirectTo)}`;

  window.location.href = oauthUrl;
};
```

---

## Step 6: Environment Variables

### Edge Functions Docker

Set these environment variables in your Edge Functions container:

```env
FRONTEND_URL=https://yourdomain.com
FUNCTIONS_URL=https://functions.yourdomain.com
SUPABASE_URL=https://api.yourdomain.com
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
APPLE_CLIENT_ID=your-apple-client-id (optional)
APPLE_CLIENT_SECRET=your-apple-client-secret (optional)
```

### Frontend

```env
VITE_FUNCTIONS_URL=https://functions.yourdomain.com
VITE_SUPABASE_URL=https://api.yourdomain.com
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Step 7: Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Create or edit an OAuth 2.0 Client ID
4. Add **Authorized redirect URI**:
   ```
   https://functions.yourdomain.com/oauth-proxy?action=callback
   ```
5. Save and wait 1-2 minutes for propagation

---

## Step 8: Dockerfile

Your Edge Functions Dockerfile should copy functions correctly:

```dockerfile
FROM denoland/deno:1.42.0

WORKDIR /app

# Copy functions from supabase/functions to ./functions
COPY supabase/functions ./functions
COPY supabase/config.toml ./config.toml
COPY edge-functions-server.ts ./server.ts

RUN deno cache server.ts

EXPOSE 8000

CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "server.ts"]
```

---

## Checklist for New Projects

- [ ] Create `supabase/functions/oauth-proxy/index.ts`
- [ ] Add `oauth-proxy` to `FUNCTIONS_MAP` in `edge-functions-server.ts`
- [ ] Create `src/pages/AuthCallback.tsx`
- [ ] Add `/auth/callback` route in `App.tsx`
- [ ] Update sign-in function to use oauth-proxy
- [ ] Set environment variables in Edge Functions Docker
- [ ] Set `VITE_FUNCTIONS_URL` in frontend
- [ ] Add redirect URI in Google Cloud Console
- [ ] Rebuild Docker with `--no-cache`

---

## Troubleshooting

### "Address already in use" error
The function is using `Deno.serve()` instead of exporting a handler. Change:
```typescript
// Wrong
Deno.serve(async (req) => { ... });

// Correct
export default async function handler(req: Request): Promise<Response> { ... }
```

### "redirect_uri_mismatch" error
1. Check the URL in Google's auth page - look for `redirect_uri` parameter
2. Add that exact URL to Google Cloud Console
3. Ensure HTTPS (not HTTP)
4. Include query parameters (`?action=callback`)

### Redirects to Supabase Dashboard
The oauth-proxy isn't being used. Check:
1. Frontend is calling `functions.yourdomain.com/oauth-proxy`
2. Function is in `FUNCTIONS_MAP`
3. Docker container was rebuilt

### "Function not found" error
1. Check `FUNCTIONS_MAP` includes `oauth-proxy`
2. Rebuild Docker with `--no-cache`
3. Verify function file exists in `supabase/functions/oauth-proxy/`
