import { logger } from '@/lib/logger';
/**
 * Consent state management.
 *
 * Single source of truth for cookie / tracking consent. Used by:
 *   - CookieConsentBanner (writes)
 *   - useGoogleAnalytics, PostHog bootstrap, Sentry init (reads)
 *   - Footer "Cookie Preferences" link (resets)
 *   - index.html inline Google Consent Mode v2 default (reads)
 *
 * Design goals:
 *   1. Default to "denied" for non-essential categories until user explicitly
 *      opts in (GDPR/ePrivacy "consent before collection").
 *   2. Honor browser-level Global Privacy Control (GPC) as a valid opt-out
 *      under CCPA/CPRA, Colorado, Connecticut, and other state laws.
 *   3. Persist in localStorage with version + timestamp for audit logs.
 *   4. Emit a CustomEvent so non-React listeners (e.g., inline analytics
 *      bootstrap in index.html) can react to changes without React.
 */

export type ConsentCategory = 'essential' | 'analytics' | 'marketing' | 'preferences';

export interface ConsentState {
  /** Always true. Required for the Service to function. */
  essential: true;
  /** Analytics / performance tracking (PostHog, GA). */
  analytics: boolean;
  /** Marketing / advertising trackers. */
  marketing: boolean;
  /** Personalization / preference cookies (theme, language). */
  preferences: boolean;
}

export interface PersistedConsent {
  /** Schema version — bump when the categories change. */
  v: number;
  state: ConsentState;
  /** ISO timestamp when consent was recorded. */
  recordedAt: string;
  /** How the consent was captured. */
  method: 'banner' | 'preferences' | 'gpc' | 'reject-all';
  /** Whether GPC was active at time of consent. */
  gpc: boolean;
}

export const CONSENT_STORAGE_KEY = 'brikly_cookie_consent_v1';
export const CONSENT_CHANGED_EVENT = 'brikly:consent-changed';
export const OPEN_PREFERENCES_EVENT = 'brikly:open-cookie-preferences';
const CURRENT_SCHEMA_VERSION = 1;

const ALL_DENIED: ConsentState = {
  essential: true,
  analytics: false,
  marketing: false,
  preferences: false,
};

const ALL_GRANTED: ConsentState = {
  essential: true,
  analytics: true,
  marketing: true,
  preferences: true,
};

/**
 * Read the GPC signal. Returns true if the browser is signaling
 * "do not sell or share my personal information."
 */
export const isGlobalPrivacyControlActive = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  // Spec: https://globalprivacycontrol.github.io/gpc-spec/
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
};

/**
 * Detect EU/UK/Swiss browser locales as a (very rough) heuristic for
 * jurisdictions that require opt-IN consent before analytics. We default to
 * showing the banner regardless, but this is used to decide whether to
 * pre-load analytics on the assumption of legitimate-interest US-style
 * collection (we don't — we wait either way) or strictly require opt-in.
 *
 * Conservative behaviour: always treat as "consent required."
 */
export const requiresOptInConsent = (): boolean => true;

/** Read persisted consent from localStorage. Returns null if not set. */
export const readPersistedConsent = (): PersistedConsent | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedConsent;
    if (parsed?.v !== CURRENT_SCHEMA_VERSION) {
      // Schema mismatch — force re-consent.
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

/**
 * Get the effective consent state right now.
 *
 * Resolution order:
 *   1. If GPC is active, force analytics + marketing to denied (cannot be
 *      overridden by stale stored consent — GPC is a continuous signal).
 *   2. If persisted consent exists, use it.
 *   3. Otherwise, return ALL_DENIED.
 */
export const getEffectiveConsent = (): ConsentState => {
  const persisted = readPersistedConsent();
  const base: ConsentState = persisted?.state ?? ALL_DENIED;
  if (isGlobalPrivacyControlActive()) {
    return { ...base, analytics: false, marketing: false };
  }
  return base;
};

/**
 * Returns true if the user has made an explicit choice (banner has been
 * answered). Used to decide whether to show the banner.
 */
export const hasUserDecided = (): boolean => readPersistedConsent() !== null;

/** Persist consent and notify listeners. */
export const setConsent = (
  state: ConsentState,
  method: PersistedConsent['method'],
): PersistedConsent => {
  const record: PersistedConsent = {
    v: CURRENT_SCHEMA_VERSION,
    state,
    recordedAt: new Date().toISOString(),
    method,
    gpc: isGlobalPrivacyControlActive(),
  };
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage may be unavailable (private browsing, quota); we still emit
    // the event so listeners can act on the in-memory choice for the session.
  }
  emitConsentChanged(record);
  // Also forward to Google Consent Mode v2 if gtag is available, so
  // Google Analytics / Ads adjust collection in real time.
  syncToGoogleConsentMode(state);
  // Fire-and-forget audit write to the server-side consent_ledger table
  // so regulators can demonstrate the controller received the consent. We
  // never await this — the UX must not hinge on a network call.
  writeConsentAudit(record);
  return record;
};

/** Helper: accept all categories. */
export const acceptAllConsent = () => setConsent(ALL_GRANTED, 'banner');

/** Helper: reject everything except essential. */
export const rejectAllConsent = () => setConsent(ALL_DENIED, 'reject-all');

/** Helper: clear the saved choice (re-opens the banner). */
export const resetConsent = (): void => {
  try {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
    // Legacy keys from earlier implementations.
    window.localStorage.removeItem('cookie_consent');
    window.localStorage.removeItem('cookieConsent');
  } catch {
    // best-effort
  }
  emitConsentChanged(null);
};

/** Subscribe to consent-changed events. Returns an unsubscribe function. */
export const subscribeToConsent = (
  listener: (record: PersistedConsent | null) => void,
): (() => void) => {
  if (typeof window === 'undefined') return () => undefined;
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<PersistedConsent | null>).detail ?? null;
    listener(detail);
  };
  window.addEventListener(CONSENT_CHANGED_EVENT, handler);
  return () => window.removeEventListener(CONSENT_CHANGED_EVENT, handler);
};

const emitConsentChanged = (record: PersistedConsent | null) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: record }));
};

/**
 * Push consent state into Google Consent Mode v2. Safe to call before gtag
 * loads — if the dataLayer queue exists the call is buffered until gtag.js
 * is downloaded.
 *
 * Reference: https://developers.google.com/tag-platform/security/guides/consent
 */
export const syncToGoogleConsentMode = (state: ConsentState): void => {
  if (typeof window === 'undefined') return;
  const dataLayer =
    ((window as Window & { dataLayer?: unknown[] }).dataLayer ??=
      [] as unknown[]) as unknown[];
  // gtag is just a queueing function until gtag.js loads; it's safe to push
  // arguments regardless of whether the script has executed.
  dataLayer.push([
    'consent',
    'update',
    {
      ad_storage: state.marketing ? 'granted' : 'denied',
      ad_user_data: state.marketing ? 'granted' : 'denied',
      ad_personalization: state.marketing ? 'granted' : 'denied',
      analytics_storage: state.analytics ? 'granted' : 'denied',
      functionality_storage: 'granted', // always granted (essential)
      personalization_storage: state.preferences ? 'granted' : 'denied',
      security_storage: 'granted', // always granted (essential)
    },
  ]);
};

/** Convenience selectors for callers that just want to know "may I track?" */
export const mayLoadAnalytics = (): boolean => getEffectiveConsent().analytics;
export const mayLoadMarketing = (): boolean => getEffectiveConsent().marketing;

// ---------------------------------------------------------------------------
// Server-side audit trail (consent_ledger)
// ---------------------------------------------------------------------------

const SESSION_ID_KEY = 'brikly_consent_session_id';

/**
 * Stable per-device session id used to correlate anonymous consent events to
 * a later sign-in. Regenerated only when localStorage is cleared.
 */
const getOrCreateSessionId = (): string => {
  try {
    const existing = window.localStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    const fresh =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(SESSION_ID_KEY, fresh);
    return fresh;
  } catch {
    return `sess_anon_${Date.now().toString(36)}`;
  }
};

/**
 * Best-effort server-side audit write. Uses the authenticated Supabase
 * client when available so RLS attributes the row to `auth.uid()`; falls
 * back to the anon role which the RLS policy allows when `session_id` is
 * present and `user_id` is null.
 *
 * The Supabase client is imported dynamically so this module remains usable
 * in contexts where the client is not yet bundled (e.g., SSR of auth pages).
 */
const writeConsentAudit = (record: PersistedConsent): void => {
  if (typeof window === 'undefined') return;
  // Don't block the UI on the audit write. Errors are logged but swallowed.
  void (async () => {
    try {
      const mod = await import('@/integrations/supabase/client');
      const client = mod.supabase;
      if (!client) return;
      const {
        data: { user },
      } = await client.auth.getUser().catch(() => ({ data: { user: null } }));
      const { error } = await client.from('consent_ledger').insert({
        user_id: user?.id ?? null,
        session_id: getOrCreateSessionId(),
        consent_state: record.state,
        consent_method: record.method,
        gpc_active: record.gpc,
        user_agent:
          typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 512) : null,
      });
      // The comment above says errors are logged. They were not: supabase-js
      // returns its error rather than throwing, so the catch below never saw a
      // rejected insert and logger.debug never ran (US-300). Worth watching for
      // one shape in particular - an authenticated session whose getUser()
      // fell into the .catch above inserts user_id: null, which satisfies
      // neither policy on this table (users_insert_own_consent requires
      // user_id = auth.uid(), anon_insert_session_consent applies to the anon
      // role) and is rejected.
      if (error) {
        logger.warn('[consent] ledger write rejected; localStorage record stands', error);
      }
    } catch (err) {
      // Swallow. Client-side record in localStorage is still authoritative
      // for the user's session; privacy team can rebuild the audit from
      // server logs if the ledger insert fails systemically.
      if (typeof console !== 'undefined') {
        logger.debug('[consent] audit write skipped', err);
      }
    }
  })();
};
