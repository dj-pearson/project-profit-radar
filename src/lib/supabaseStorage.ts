/**
 * Safe storage adapter for Supabase Auth
 * Uses @capacitor/preferences on native iOS/Android for reliable persistence,
 * falling back to localStorage on web.
 *
 * The Capacitor Preferences plugin stores data outside of WKWebView's purge-able
 * storage, preventing session loss when iOS clears WebView data.
 */

import type { SupportedStorage } from '@supabase/supabase-js';
import { safeStorage } from './safeStorage';

// Detect if running inside a Capacitor native app
const isCapacitorNative = (): boolean => {
  try {
    // Capacitor global is injected by the native layer
    return typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
};

// Lightweight Capacitor Preferences client (lazy import so web bundle is unaffected)
let _preferences: {
  get: (opts: { key: string }) => Promise<{ value: string | null }>;
  set: (opts: { key: string; value: string }) => Promise<void>;
  remove: (opts: { key: string }) => Promise<void>;
} | null = null;

const getPreferences = async () => {
  if (_preferences) return _preferences;
  try {
    const { Preferences } = await import('@capacitor/preferences');
    _preferences = Preferences;
  } catch {
    _preferences = null;
  }
  return _preferences;
};

/**
 * Sentinel recording an explicit sign-out. Persisted in BOTH storage layers so
 * that after an offline/failed sign-out the next launch does NOT silently
 * re-hydrate a stale session from Preferences. It is lifted only when a fresh
 * authenticated session token is written (i.e. a real re-login).
 */
const SIGNED_OUT_SENTINEL = 'brikly.auth.signed_out';

const setSignedOutSentinel = async (): Promise<void> => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(SIGNED_OUT_SENTINEL, '1');
    }
  } catch {
    // storage may be disabled
  }
  const prefs = await getPreferences();
  if (prefs) {
    await prefs.set({ key: SIGNED_OUT_SENTINEL, value: '1' }).catch(() => {});
  }
};

const clearSignedOutSentinel = (): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(SIGNED_OUT_SENTINEL);
    }
  } catch {
    // storage may be disabled
  }
  getPreferences().then((prefs) => {
    prefs?.remove({ key: SIGNED_OUT_SENTINEL }).catch(() => {});
  });
};

/**
 * Capacitor-native storage adapter.
 * Supabase needs a synchronous SupportedStorage interface, so we use a
 * localStorage mirror for reads and push writes to Preferences in the
 * background for durable persistence across app restarts on iOS.
 */
const createCapacitorStorage = (): SupportedStorage => {
  // On startup, seed localStorage from Preferences so the session is available
  // synchronously on the first getItem() call.
  const seedFromPreferences = async () => {
    const prefs = await getPreferences();
    if (!prefs) return;
    // If the device was explicitly signed out, never re-hydrate a stale
    // session. Proactively scrub any lingering token blobs from both layers
    // and bail — a real re-login will write a fresh token and lift the lock.
    try {
      const { value: signedOut } = await prefs.get({ key: SIGNED_OUT_SENTINEL });
      if (signedOut === '1') {
        await purgeSupabaseSessionStorage();
        return;
      }
    } catch {
      // ignore — if we can't read the sentinel, fall through to normal seeding
    }
    // Supabase stores its session under keys like "sb-<project>-auth-token"
    const seedKeys = ['sb-api-auth-token', 'supabase.auth.token'];
    for (const key of seedKeys) {
      try {
        const { value } = await prefs.get({ key });
        if (value && !localStorage.getItem(key)) {
          localStorage.setItem(key, value);
        }
      } catch {
        // ignore individual errors
      }
    }
  };

  if (typeof window !== 'undefined') {
    seedFromPreferences().catch(() => {});
  }

  return {
    getItem: (key: string) => safeStorage.getItem(key),

    setItem: (key: string, value: string) => {
      // A fresh authenticated session is being persisted — lift the sign-out
      // lock so legitimate re-logins seed normally on the next launch.
      if (value && isSupabaseAuthKey(key)) {
        clearSignedOutSentinel();
      }
      safeStorage.setItem(key, value);
      // Mirror to native Preferences for durability
      getPreferences().then((prefs) => {
        if (prefs) {
          prefs.set({ key, value }).catch(() => {});
        }
      });
    },

    removeItem: (key: string) => {
      safeStorage.removeItem(key);
      getPreferences().then((prefs) => {
        if (prefs) {
          prefs.remove({ key }).catch(() => {});
        }
      });
    },
  };
};

/**
 * Web-only storage adapter (wraps localStorage with error handling).
 */
const createWebStorage = (): SupportedStorage => ({
  getItem: (key: string) => safeStorage.getItem(key),
  setItem: (key: string, value: string) => {
    if (value && isSupabaseAuthKey(key)) {
      clearSignedOutSentinel();
    }
    safeStorage.setItem(key, value);
  },
  removeItem: (key: string) => safeStorage.removeItem(key),
});

/**
 * Create the Supabase storage adapter.
 * Automatically picks Capacitor Preferences on iOS/Android, localStorage on web.
 */
export const createSupabaseStorage = (): SupportedStorage => {
  if (isCapacitorNative()) {
    return createCapacitorStorage();
  }
  return createWebStorage();
};

export const supabaseStorage = createSupabaseStorage();

/**
 * Keys Supabase uses to persist auth state. Supabase's own naming has changed
 * over major versions (legacy `supabase.auth.token`, modern `sb-<project>-auth-token`,
 * plus derived `*-verifier` keys used during the PKCE flow). We scrub all of them
 * across both storage layers on sign-out so a stolen device cannot be re-hydrated
 * from leftover plaintext tokens in localStorage.
 */
const isSupabaseAuthKey = (key: string): boolean =>
  key === 'supabase.auth.token' ||
  /^sb-[^-]+-auth-token(?:-code-verifier|\.0|\.1)?$/.test(key) ||
  key.startsWith('sb-') && key.includes('-auth-token');

/**
 * Synchronously clear every Supabase auth-related key from localStorage and
 * fire-and-forget the same clear against @capacitor/preferences. Call this
 * AFTER supabase.auth.signOut() in your sign-out handler so that even if the
 * network round-trip failed (device offline, server unreachable) the local
 * device no longer holds a valid-looking session blob.
 */
export const purgeSupabaseSessionStorage = async (): Promise<void> => {
  // 1. localStorage (sync) — scan for any sb-* / supabase.auth.* keys
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && isSupabaseAuthKey(key)) toRemove.push(key);
      }
      for (const key of toRemove) {
        try {
          localStorage.removeItem(key);
        } catch {
          // ignore individual removal errors
        }
      }
    } catch {
      // ignore — storage may be disabled or quota-exceeded
    }
  }

  // 2. Capacitor Preferences (async) — remove the seed keys and any sb-* tokens.
  // Preferences has no keys() in @capacitor/preferences <5, so we explicitly
  // remove the well-known keys we ever write.
  const prefs = await getPreferences();
  if (prefs) {
    const knownKeys = [
      'sb-api-auth-token',
      'sb-api-auth-token-code-verifier',
      'supabase.auth.token',
    ];
    await Promise.all(
      knownKeys.map((key) => prefs.remove({ key }).catch(() => {}))
    );
  }

  // 3. Record the explicit sign-out in both layers so the next launch does not
  // re-hydrate a stale session (e.g. if this sign-out happened offline).
  await setSignedOutSentinel();
};
