import { getEdgeFunctionUrl } from "@/integrations/supabase/client";
import { gtag } from "@/hooks/useGoogleAnalytics";
import { logger } from "@/lib/logger";
import { getWindowLocation } from "./windowLocation";

type OAuthProvider = "google" | "apple";

const LABEL: Record<OAuthProvider, string> = { google: "Google", apple: "Apple" };

/**
 * The signInWithGoogle / signInWithApple action: hand the browser to our OAuth
 * proxy edge function, which runs the whole flow and returns to /dashboard.
 */
export function createOAuthSignIn(provider: OAuthProvider, setLoading: (loading: boolean) => void) {
  const label = LABEL[provider];
  return async (): Promise<{ error?: string }> => {
    try {
      logger.debug(`Signing in with ${label} via OAuth proxy...`);
      setLoading(true);

      // Use our custom OAuth proxy edge function to bypass GoTrue's GOTRUE_SITE_URL limitation
      const edgeFunctionsUrl = getEdgeFunctionUrl('oauth-proxy');
      const redirectTo = '/dashboard';

      const oauthUrl = `${edgeFunctionsUrl}?action=authorize&provider=${provider}&redirect_to=${encodeURIComponent(redirectTo)}`;

      gtag.trackAuth('login', provider);

      // Redirect to OAuth proxy which handles the full flow
      const location = getWindowLocation();
      if (location) {
        location.href = oauthUrl;
      }

      return {};
    } catch (error) {
      logger.error(`${label} sign in exception:`, error);
      setLoading(false);
      return { error: "An unexpected error occurred" };
    }
  };
}
