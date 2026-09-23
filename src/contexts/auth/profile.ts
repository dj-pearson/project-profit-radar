/**
 * Loading the signed-in user's user_profiles row: the fetch with its timeout
 * and retries, recovery when the row is missing (US-357), the sessionStorage
 * cache, and the error-tracking identity that follows the profile.
 */
import { useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { useToast } from "@/hooks/use-toast";
import { setSentryUser } from "@/lib/sentry";
import { setErrorLoggingUser } from "@/services/errorLoggingService";
import { logger } from "@/lib/logger";
import { PROFILE_FETCH_TIMEOUT_MS } from "@/lib/auth/timing";
import { UserProfileSchema, type UserProfile } from "./types";

type Toast = ReturnType<typeof useToast>["toast"];

/** sessionStorage key prefix for the cached profile (one key per user id). */
export const PROFILE_STORAGE_PREFIX = "bd.userProfile.";

export interface ProfileFetchDeps {
  toast: Toast;
  setProfileFetching: (fetching: boolean) => void;
}

// A session with no user_profiles row (US-357). This used to be read as
// "account deleted": sign out, "please sign up again". It is really what an
// SSO/OAuth user hits when handle_new_user fails, or anyone after a partial
// signup. ensure_user_profile() creates the caller's minimal profile with no
// company, and the app routes a company-less user to /setup. Sign-out is
// kept for the one case it fits: the auth user itself is gone.
export async function recoverMissingProfile(toast: Toast): Promise<UserProfile | null> {
  logger.warn("No user_profiles row for this session; creating a minimal one");
  type UntypedRpc = (fn: string) => Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
  const { data: ensured, error: ensureError } = await (supabase.rpc as unknown as UntypedRpc)('ensure_user_profile');
  if (!ensureError && ensured) {
    return ensured as UserProfile;
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    await supabase.auth.signOut();
    toast({
      title: "Account not found",
      description: "This account no longer exists. Please sign up again.",
      variant: "destructive",
    });
    return null;
  }

  logger.error("Could not create a missing profile:", ensureError);
  toast({
    title: "We couldn't finish setting up your account",
    description: "Please reload the page. If this keeps happening, contact support.",
    variant: "destructive",
  });
  return null;
}

// Fetch user profile with retry logic
export async function fetchUserProfile(
  userId: string,
  deps: ProfileFetchDeps,
  retryCount = 0,
): Promise<UserProfile | null> {
  const { toast, setProfileFetching } = deps;
  try {
    logger.debug(`Fetching profile for user: ${userId}`);
    setProfileFetching(true);

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Profile fetch timeout")), PROFILE_FETCH_TIMEOUT_MS);
    });

    const fetchPromise = supabase
      .from("user_profiles")
      .select("id, email, first_name, last_name, phone, company_id, role, is_active")
      .eq("id", userId)
      .maybeSingle(); // Use maybeSingle() to handle cases where user doesn't exist

    const { data, error } = await Promise.race([
      fetchPromise,
      timeoutPromise,
    ]);

    if (error) {
      logger.error("Profile fetch error:", error);

      if (error.code === 'PGRST116' || error.message?.includes('0 rows')) {
        return await recoverMissingProfile(toast);
      }

      if (retryCount < 2) {
        // Retry up to 3 times for other errors
        logger.debug(`Retrying profile fetch (${retryCount + 1}/3)`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return await fetchUserProfile(userId, deps, retryCount + 1);
      }
      return null;
    }

    if (!data) {
      return await recoverMissingProfile(toast);
    }

    // user_profiles.role is the one source of truth for role (US-348).
    // This used to overwrite it with get_user_primary_role(), which read
    // user_roles, a copy frozen in 2025-10: a demoted admin kept admin in
    // the UI, and a user created since had no row at all.
    const profile = data as UserProfile;

    logger.debug('Profile fetched successfully:', {
      role: profile.role,
    });

    // Set Sentry user context for error tracking
    setSentryUser({
      id: profile.id,
      email: profile.email,
      role: profile.role,
    });

    // Set error logging user context
    setErrorLoggingUser({
      id: profile.id,
      email: profile.email,
      role: profile.role,
      company_id: profile.company_id,
    });

    // SECURITY: Use sessionStorage instead of localStorage for PII
    // sessionStorage is cleared when browser/tab closes, reducing exposure
    try {
      sessionStorage.setItem(`${PROFILE_STORAGE_PREFIX}${userId}`, JSON.stringify(profile));
    } catch { /* ignore: non-critical, best-effort */ }
    return profile;
  } catch (error) {
    logger.error("Profile fetch exception:", error);
    const isTimeout =
      error instanceof Error && error.message === "Profile fetch timeout";

    // Check if it's a user not found error
    if (!isTimeout && error instanceof Error &&
        (error.message.includes('0 rows') || error.message.includes('not found'))) {
      logger.warn("User profile not found in catch block - user may have been deleted");
      await supabase.auth.signOut();
      toast({
        title: "Account not found",
        description: "Your user account no longer exists. Please sign up again.",
        variant: "destructive",
      });
      return null;
    }

    if (retryCount < 2 && !isTimeout) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return await fetchUserProfile(userId, deps, retryCount + 1);
    }
    return null;
  } finally {
    setProfileFetching(false);
  }
}

/**
 * The profile cached in sessionStorage for this user, or null. Throws when a
 * cached value is present but fails validation (after removing it), so the
 * caller falls through to a fresh fetch exactly as for a missing one.
 */
export function readStoredProfile(userId: string): UserProfile | null {
  const stored = sessionStorage.getItem(`${PROFILE_STORAGE_PREFIX}${userId}`);
  if (!stored) return null;
  // SECURITY: Validate cached data with Zod schema to prevent injection attacks
  const rawParsed = JSON.parse(stored);
  const parseResult = UserProfileSchema.safeParse(rawParsed);

  if (!parseResult.success) {
    logger.warn("Cached profile validation failed, removing corrupted data:", parseResult.error.errors);
    sessionStorage.removeItem(`${PROFILE_STORAGE_PREFIX}${userId}`);
    throw new Error("Invalid cached profile data");
  }

  return parseResult.data as UserProfile;
}

/** Log authentication state changes and update Sentry user context. */
export function useProfileTelemetry(user: User | null, userProfile: UserProfile | null): void {
  useEffect(() => {
    if (user && userProfile) {
      logger.debug("Authentication complete:", {
        userId: user.id,
        role: userProfile.role,
      });

      // Set Sentry user context for error tracking
      setSentryUser({
        id: user.id,
        email: userProfile.email,
        role: userProfile.role,
        company_id: userProfile.company_id,
      });

      // Set error logging user context
      setErrorLoggingUser({
        id: user.id,
        email: userProfile.email,
        role: userProfile.role,
        company_id: userProfile.company_id,
      });
    }
  }, [user?.id, userProfile?.role, userProfile?.email, userProfile?.company_id]);
}
