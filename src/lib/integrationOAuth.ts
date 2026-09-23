/**
 * US-371: where an integration's OAuth flow actually starts.
 *
 * The marketplace used to send every oauth2 app to
 * `/integrations/:slug/oauth/authorize`, an SPA path no route answers, so
 * Connect landed on a 404. Only three integrations have a start edge function
 * in supabase/functions/; each returns `{ auth_url }`. Anything not listed
 * here has no OAuth start and the marketplace must not offer Connect for it.
 */
import { validateRedirectUrl } from '@/lib/security/urlValidation';

export interface OAuthStart {
  /** Edge function under supabase/functions/ that returns `{ auth_url }`. */
  functionName: string;
  body: (ctx: { companyId: string; origin: string }) => Record<string, unknown>;
}

export const OAUTH_START_FUNCTIONS: Record<string, OAuthStart> = {
  quickbooks: {
    functionName: 'quickbooks-connect',
    // Same redirect QuickBooksIntegration uses; /quickbooks/callback is routed.
    body: ({ companyId, origin }) => ({ company_id: companyId, redirect_uri: `${origin}/quickbooks/callback` }),
  },
  'google-calendar': {
    functionName: 'google-calendar-auth',
    body: ({ companyId }) => ({ company_id: companyId }),
  },
  'outlook-calendar': {
    functionName: 'outlook-calendar-auth',
    body: ({ companyId }) => ({ company_id: companyId }),
  },
};

export function hasOAuthStart(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(OAUTH_START_FUNCTIONS, slug);
}

type Invoke = (
  functionName: string,
  options: { body: Record<string, unknown> }
) => Promise<{ data: unknown; error: unknown }>;

/**
 * Call the integration's start function and return the provider URL to send
 * the browser to. Throws when there is no start function, the call fails, or
 * the returned URL is not a trusted provider.
 */
export async function getIntegrationAuthUrl(
  slug: string,
  ctx: { companyId: string; origin: string },
  invoke: Invoke
): Promise<string> {
  const start = OAUTH_START_FUNCTIONS[slug];
  if (!start) throw new Error(`No OAuth start for integration "${slug}".`);
  if (!ctx.companyId) throw new Error('No company on this account.');

  const { data, error } = await invoke(start.functionName, { body: start.body(ctx) });
  if (error) throw error instanceof Error ? error : new Error(String(error));

  const authUrl = (data as { auth_url?: string } | null)?.auth_url;
  const check = validateRedirectUrl(authUrl, { allowSameOrigin: false });
  // A relative path passes validateRedirectUrl, but a provider URL is always absolute.
  if (!authUrl || !/^https:\/\//i.test(authUrl) || !check.valid) throw new Error('Invalid OAuth URL received from server.');
  return authUrl;
}
