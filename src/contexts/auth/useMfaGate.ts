/**
 * The MFA gate after password sign-in (US-346). While the gate is up, auth
 * events are stashed instead of applied, so a password-only session cannot
 * reach the app; the stashed session is released once MFA passes or turns
 * out not to be needed.
 */
import { useCallback, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { gtag } from "@/hooks/useGoogleAnalytics";
import { logger } from "@/lib/logger";
import { checkMfaRequired, markMfaPending, readDeviceId, readMfaPending } from "@/lib/auth/mfaChallenge";
import type { MfaChallenge, UserProfile } from "./types";

interface Deps {
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setIsProfileFetchInProgress: (inProgress: boolean) => void;
  fetchUserProfile: (userId: string) => Promise<UserProfile | null>;
  successfulProfiles: MutableRefObject<Map<string, UserProfile>>;
}

/**
 * A session left behind by an MFA challenge that was never finished (reload,
 * closed tab) has not passed MFA.
 */
export function isAbandonedMfaSession(session: Session | null): boolean {
  return Boolean(session?.user && readMfaPending() === session.user.id);
}

/** Sign out a session that never passed its MFA challenge (US-346). */
export function discardAbandonedMfaSession(): void {
  logger.warn("Discarding a session that never passed its MFA challenge");
  markMfaPending(null);
  void supabase.auth.signOut({ scope: "local" });
}

export function useMfaGate(deps: Deps) {
  const [mfaChallenge, setMfaChallenge] = useState<MfaChallenge | null>(null);
  const mfaGateRef = useRef(false);
  const pendingSessionRef = useRef<Session | null>(null);

  const {
    setSession,
    setUser,
    setUserProfile,
    setLoading,
    setIsProfileFetchInProgress,
    fetchUserProfile,
    successfulProfiles,
  } = deps;

  // Let a held session into the app: the same state the auth listener would
  // have set, applied once MFA has passed or was not needed (US-346).
  async function releaseSession(held: Session) {
    const latest = pendingSessionRef.current ?? held;
    mfaGateRef.current = false;
    pendingSessionRef.current = null;
    markMfaPending(null);
    setSession(latest);
    setUser(latest.user);
    setIsProfileFetchInProgress(true);
    try {
      const profile = await fetchUserProfile(latest.user.id);
      setUserProfile(profile ?? null);
      if (profile) successfulProfiles.current.set(profile.id, profile);
    } finally {
      setIsProfileFetchInProgress(false);
      setLoading(false);
    }
  }

  // Drop a half-finished sign-in: revoke this session only, not the user's
  // sessions on other devices.
  async function abandonSignIn() {
    mfaGateRef.current = false;
    pendingSessionRef.current = null;
    markMfaPending(null);
    setMfaChallenge(null);
    try {
      await supabase.auth.signOut({ scope: "local" });
    } finally {
      setLoading(false);
    }
  }

  /** Raise the gate before the SIGNED_IN event can fire. */
  function raiseGate() {
    mfaGateRef.current = true;
    pendingSessionRef.current = null;
  }

  function lowerGate() {
    mfaGateRef.current = false;
  }

  function isGateRaised() {
    return mfaGateRef.current;
  }

  /**
   * For the auth listener: true when this session must be held rather than
   * applied. During signIn the gate is up and the session is stashed for
   * release after verify; a leftover pending marker (abandoned challenge) is
   * ignored here and signed out by the initial-session path.
   */
  function holdsSession(session: Session | null): boolean {
    if (session?.user && (mfaGateRef.current || readMfaPending() === session.user.id)) {
      if (mfaGateRef.current) pendingSessionRef.current = session;
      return true;
    }
    return false;
  }

  /**
   * After a password sign-in: challenge for MFA, or release the session when
   * none is needed. Returns the signIn result to hand back early, or null to
   * carry on as a completed sign-in.
   */
  async function challengeOrRelease(
    user: User,
    session: Session,
  ): Promise<{ error?: string; mfaRequired?: boolean } | null> {
    // Mark first, so a reload during the check still discards the session.
    markMfaPending(user.id);
    let mfaRequired: boolean;
    try {
      const check = await checkMfaRequired(session.access_token, user.id, readDeviceId());
      mfaRequired = check.required;
    } catch (checkError) {
      // Fail closed: if we cannot tell whether this account has MFA, a
      // password alone is not enough.
      logger.error("MFA check failed; not signing in:", checkError);
      await abandonSignIn();
      return { error: "We couldn't confirm your two-factor settings, so you weren't signed in. Please try again." };
    }

    if (mfaRequired) {
      pendingSessionRef.current = pendingSessionRef.current ?? session;
      setMfaChallenge({
        userId: user.id,
        email: user.email ?? null,
        accessToken: session.access_token,
      });
      setLoading(false);
      return { mfaRequired: true };
    }

    await releaseSession(session);
    return null;
  }

  const completeMfaChallenge = useCallback(async () => {
    const held = pendingSessionRef.current;
    setMfaChallenge(null);
    if (!held) {
      await abandonSignIn();
      return;
    }
    await releaseSession(held);
    gtag.trackAuth('login', 'email');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- releaseSession/abandonSignIn only touch refs and stable setters
  }, []);

  const cancelMfaChallenge = useCallback(async () => {
    setMfaChallenge(null);
    await abandonSignIn();
  }, []);

  return {
    mfaChallenge,
    raiseGate,
    lowerGate,
    isGateRaised,
    holdsSession,
    challengeOrRelease,
    abandonSignIn,
    completeMfaChallenge,
    cancelMfaChallenge,
  };
}
