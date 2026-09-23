/**
 * OAuth Proxy Edge Function
 * Bypasses GoTrue's GOTRUE_SITE_URL limitation for self-hosted Supabase
 *
 * Flow:
 * 1. Frontend redirects to ?action=authorize&provider=google
 * 2. This function redirects to Google/Apple OAuth
 * 3. After user authenticates, Google/Apple redirects to ?action=callback
 * 4. This function exchanges the code for tokens, creates/finds user, generates magic link
 * 5. Redirects to frontend /auth/callback with token
 */

import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { createServiceClient } from '../_shared/service-client.ts';
import { enforceRateLimit, getClientIP, RATE_LIMITS } from '../_shared/rate-limiter.ts';
import {
  checkPendingState, decideLink, emailVerified, randomToken, readCookie, safeReturnPath,
  sha256Hex, signState, verifyState, type Candidate,
} from './flow.ts';

// Configuration from environment variables
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://brikly.net';
const FUNCTIONS_URL = Deno.env.get('FUNCTIONS_URL') || 'https://functions.brikly.net';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') || '';
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') || '';
const APPLE_CLIENT_ID = Deno.env.get('APPLE_CLIENT_ID') || '';
const APPLE_CLIENT_SECRET = Deno.env.get('APPLE_CLIENT_SECRET') || '';
// Signs the state string. Falls back to the service-role key, which is
// already a server-only secret, so no deploy is blocked on a new one.
const STATE_SECRET = Deno.env.get('OAUTH_STATE_SECRET') || SUPABASE_SERVICE_ROLE_KEY;
// __Host-: Secure, Path=/, no Domain, so no other subdomain can set or read it.
const BINDING_COOKIE = '__Host-brikly_oauth';

const failTo = (reason: string, extra?: Record<string, string>) => {
  const errorUrl = new URL(`${FRONTEND_URL}/auth`);
  errorUrl.searchParams.set('error', reason);
  for (const [k, v] of Object.entries(extra ?? {})) errorUrl.searchParams.set(k, v);
  return new Response(null, {
    status: 302,
    headers: { 'Location': errorUrl.toString(), 'Set-Cookie': `${BINDING_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` },
  });
};

// Export handler for edge-functions-server
export default async function handler(req: Request): Promise<Response> {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const provider = url.searchParams.get('provider') || 'google';
    const redirectTo = safeReturnPath(url.searchParams.get('redirect_to'));
    const functionUrl = `${FUNCTIONS_URL}/oauth-proxy`;

    if (action === 'authorize') {
      if (provider !== 'google' && provider !== 'apple') {
        return new Response(JSON.stringify({ error: 'Unsupported provider' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Each authorize writes a pending-state row, and anyone can call it.
      const limited = await enforceRateLimit(createServiceClient(), `ip:${getClientIP(req)}`, 'oauth-proxy', RATE_LIMITS.AUTH, corsHeaders);
      if (limited) return limited;

      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // US-349: the state used to be btoa(JSON{verifier, redirectTo, provider})
      // and the callback trusted whatever decoded, so the PKCE verifier rode in
      // the URL and nothing tied the callback to the browser that started it.
      // Now the verifier and return path stay server-side, the state is a
      // signed random id, and a nonce cookie binds it to this browser.
      const stateId = randomToken();
      const nonce = randomToken();
      const { error: stateError } = await createServiceClient().from('oauth_pending_states').insert({
        state: stateId,
        code_verifier: codeVerifier,
        return_url: redirectTo,
        provider,
        browser_binding: await sha256Hex(nonce),
        ip_address: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for'),
        user_agent: req.headers.get('user-agent'),
      });
      if (stateError) {
        console.error('[oauth-proxy] could not store state:', stateError.message);
        return failTo('state_store_failed');
      }
      const stateData = await signState(stateId, STATE_SECRET);

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
        headers: {
          ...corsHeaders,
          'Location': authUrl.toString(),
          'Set-Cookie': `${BINDING_COOKIE}=${nonce}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
        },
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

      // Signed by us, known to the table, unexpired, used once, and back in the
      // browser that started it. The row is deleted as it is read.
      const stateId = await verifyState(state, STATE_SECRET);
      if (!stateId) return failTo('invalid_state');
      const admin = createServiceClient();
      const { data: pending, error: consumeError } = await admin
        .from('oauth_pending_states')
        .delete()
        .eq('state', stateId)
        .is('connection_id', null)
        .select('code_verifier, return_url, provider, browser_binding, expires_at')
        .maybeSingle();
      // If the row could not be consumed, single use is not guaranteed: refuse.
      if (consumeError) {
        console.error('[oauth-proxy] could not consume state:', consumeError.message);
        return failTo('invalid_state');
      }
      const check = await checkPendingState(pending, readCookie(req.headers.get('cookie'), BINDING_COOKIE));
      if (!check.ok) {
        console.warn('[oauth-proxy] state rejected:', check.reason);
        return failTo('invalid_state');
      }
      const verifier = pending!.code_verifier as string;
      const finalRedirect = safeReturnPath(pending!.return_url as string | null);
      const stateProvider = pending!.provider as string;
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

      if (!tokenData) return failTo('unsupported_provider');
      if (tokenData.error) {
        console.error('Token error:', tokenData);
        const errorUrl = new URL(`${FRONTEND_URL}/auth`);
        errorUrl.searchParams.set('error', tokenData.error);
        return new Response(null, { status: 302, headers: { 'Location': errorUrl.toString() } });
      }

      // Received straight from the provider's token endpoint over TLS with our
      // client secret, so its claims are the provider's.
      const payload = JSON.parse(atob(tokenData.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      const subject: string | null = typeof payload.sub === 'string' ? payload.sub : null;
      const verified = emailVerified(payload);

      // US-349: this used to scan the admin user list for a matching email - the first
      // page of users only, matched on email alone, with no email_verified check.
      const { data: candidates, error: findError } = await admin.rpc('find_oauth_user', {
        p_provider: stateProvider,
        p_subject: subject,
        p_email: payload.email ?? null,
      });
      if (findError) {
        console.error('[oauth-proxy] user lookup failed:', findError.message);
        return failTo('lookup_failed');
      }
      const decision = decideLink((candidates ?? []) as Candidate[], subject, verified);
      if (decision.action === 'refuse') {
        console.warn('[oauth-proxy] refused:', decision.reason);
        return failTo('account_link_refused', { error_description: decision.reason });
      }

      let loginEmail: string = payload.email;
      const isNewUser = decision.action === 'create';
      if (decision.action === 'create') {
        const { error: createError } = await admin.auth.admin.createUser({
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
            oauth_subjects: { [stateProvider]: subject },
          },
        });
        if (createError) {
          console.error('Create user error:', createError);
          return failTo('create_user_failed');
        }
      } else {
        const { data: found } = await admin.auth.admin.getUserById(decision.userId);
        if (!found?.user?.email) return failTo('lookup_failed');
        loginEmail = found.user.email;
        if (decision.action === 'link-then-sign-in') {
          const app = (found.user.app_metadata ?? {}) as Record<string, unknown>;
          const subjects = { ...((app.oauth_subjects as Record<string, string>) ?? {}), [stateProvider]: subject };
          const providers = Array.from(new Set([...((app.providers as string[]) ?? []), stateProvider]));
          const { error: linkErr } = await admin.auth.admin.updateUserById(decision.userId, {
            app_metadata: { ...app, oauth_subjects: subjects, providers },
          });
          if (linkErr) {
            console.error('[oauth-proxy] could not bind provider subject:', linkErr.message);
            return failTo('link_failed');
          }
        }
      }

      // Generate magic link for session
      const { data, error: linkError } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: loginEmail,
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
      if (isNewUser) successUrl.searchParams.set('new_user', 'true');

      return new Response(null, {
        status: 302,
        headers: {
          'Location': successUrl.toString(),
          'Set-Cookie': `${BINDING_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
        },
      });
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
