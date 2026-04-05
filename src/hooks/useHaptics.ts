/**
 * useHaptics — unified haptic feedback hook.
 *
 * Provides a small, semantic API (impact / selection / success / warning /
 * error) that works on:
 *  - iOS & Android via @capacitor/haptics (dynamically imported so missing
 *    plugin or web builds stay lean)
 *  - Web / PWA via navigator.vibrate with sensible patterns
 *  - SSR safely (all methods are no-ops when window is undefined)
 *
 * Usage:
 *   const haptics = useHaptics();
 *   haptics.impact('light');     // button press
 *   haptics.selection();         // item tap / nav change
 *   haptics.success();           // success toast / refresh complete
 *   haptics.warning();           // non-blocking warning
 *   haptics.error();             // validation / failure
 */
import { useCallback, useMemo } from 'react';

type ImpactStrength = 'light' | 'medium' | 'heavy';

interface HapticsApi {
  impact: (strength?: ImpactStrength) => void;
  selection: () => void;
  success: () => void;
  warning: () => void;
  error: () => void;
}

const WEB_PATTERNS = {
  light: 8,
  medium: 14,
  heavy: 22,
  selection: 6,
  success: [10, 40, 18],
  warning: [14, 60, 14],
  error: [20, 50, 20, 50, 20],
} as const;

function webVibrate(pattern: number | number[]) {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  if (typeof nav.vibrate === 'function') {
    try {
      nav.vibrate(pattern);
    } catch {
      // Ignore — some browsers throw on user-gesture restrictions.
    }
  }
}

let nativeHapticsPromise: Promise<unknown> | null = null;
function loadNativeHaptics() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  // Only try on Capacitor native platforms to avoid shipping the plugin on web.
  const w = window as typeof window & { Capacitor?: { isNativePlatform?: () => boolean } };
  if (!w.Capacitor || typeof w.Capacitor.isNativePlatform !== 'function' || !w.Capacitor.isNativePlatform()) {
    return Promise.resolve(null);
  }
  if (!nativeHapticsPromise) {
    nativeHapticsPromise = import('@capacitor/haptics').catch(() => null);
  }
  return nativeHapticsPromise;
}

async function nativeImpact(strength: ImpactStrength) {
  const mod = (await loadNativeHaptics()) as
    | { Haptics?: { impact?: (opts: { style: unknown }) => Promise<void> }; ImpactStyle?: Record<string, unknown> }
    | null;
  if (!mod?.Haptics?.impact || !mod.ImpactStyle) return false;
  const style =
    strength === 'light'
      ? mod.ImpactStyle.Light
      : strength === 'heavy'
      ? mod.ImpactStyle.Heavy
      : mod.ImpactStyle.Medium;
  try {
    await mod.Haptics.impact({ style });
    return true;
  } catch {
    return false;
  }
}

async function nativeSelection() {
  const mod = (await loadNativeHaptics()) as
    | { Haptics?: { selectionStart?: () => Promise<void>; selectionEnd?: () => Promise<void> } }
    | null;
  if (!mod?.Haptics?.selectionStart || !mod.Haptics.selectionEnd) return false;
  try {
    await mod.Haptics.selectionStart();
    await mod.Haptics.selectionEnd();
    return true;
  } catch {
    return false;
  }
}

async function nativeNotification(type: 'SUCCESS' | 'WARNING' | 'ERROR') {
  const mod = (await loadNativeHaptics()) as
    | {
        Haptics?: { notification?: (opts: { type: unknown }) => Promise<void> };
        NotificationType?: Record<string, unknown>;
      }
    | null;
  if (!mod?.Haptics?.notification || !mod.NotificationType) return false;
  try {
    await mod.Haptics.notification({ type: mod.NotificationType[type] });
    return true;
  } catch {
    return false;
  }
}

export function useHaptics(): HapticsApi {
  const impact = useCallback((strength: ImpactStrength = 'light') => {
    void nativeImpact(strength).then((ok) => {
      if (!ok) webVibrate(WEB_PATTERNS[strength]);
    });
  }, []);

  const selection = useCallback(() => {
    void nativeSelection().then((ok) => {
      if (!ok) webVibrate(WEB_PATTERNS.selection);
    });
  }, []);

  const success = useCallback(() => {
    void nativeNotification('SUCCESS').then((ok) => {
      if (!ok) webVibrate(WEB_PATTERNS.success as unknown as number[]);
    });
  }, []);

  const warning = useCallback(() => {
    void nativeNotification('WARNING').then((ok) => {
      if (!ok) webVibrate(WEB_PATTERNS.warning as unknown as number[]);
    });
  }, []);

  const error = useCallback(() => {
    void nativeNotification('ERROR').then((ok) => {
      if (!ok) webVibrate(WEB_PATTERNS.error as unknown as number[]);
    });
  }, []);

  return useMemo(
    () => ({ impact, selection, success, warning, error }),
    [impact, selection, success, warning, error],
  );
}

// Imperative helpers for non-React call sites (e.g. utilities, event handlers
// outside hooks). Prefer the hook when possible for consistency.
export const haptics = {
  impact: (strength: ImpactStrength = 'light') => {
    void nativeImpact(strength).then((ok) => {
      if (!ok) webVibrate(WEB_PATTERNS[strength]);
    });
  },
  selection: () => {
    void nativeSelection().then((ok) => {
      if (!ok) webVibrate(WEB_PATTERNS.selection);
    });
  },
  success: () => {
    void nativeNotification('SUCCESS').then((ok) => {
      if (!ok) webVibrate(WEB_PATTERNS.success as unknown as number[]);
    });
  },
  warning: () => {
    void nativeNotification('WARNING').then((ok) => {
      if (!ok) webVibrate(WEB_PATTERNS.warning as unknown as number[]);
    });
  },
  error: () => {
    void nativeNotification('ERROR').then((ok) => {
      if (!ok) webVibrate(WEB_PATTERNS.error as unknown as number[]);
    });
  },
};
