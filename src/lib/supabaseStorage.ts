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
  setItem: (key: string, value: string) => safeStorage.setItem(key, value),
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

