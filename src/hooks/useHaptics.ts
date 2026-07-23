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
  // Raw primitives
  impact: (strength?: ImpactStrength) => void;
  selection: () => void;
  success: () => void;
  warning: () => void;
  error: () => void;

  // Semantic palette — prefer these in call sites so intent is obvious
  // and the palette can be tuned globally without hunting for strength args.
  // See docs/MOBILE_HAPTICS_PALETTE.md for the canonical mapping.
  impactLight: () => void;
  impactMedium: () => void;
  impactHeavy: () => void;
  /** Tab / menu / item tap (lightest cue). */
  tap: () => void;
  /** Toggle / switch / segmented-control change. */
  toggle: () => void;
  /** Irreversible / destructive confirm (medium impact). */
  destructive: () => void;
  /** Haptic for reveal gestures (swipe actions, sheet open at threshold). */
  reveal: () => void;
}

const USER_PREF_KEY = 'brikly.a11y.haptics'; // 'on' | 'off'
function hapticsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(USER_PREF_KEY) !== 'off';
  } catch {
    return true;
  }
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
  if (!hapticsEnabled()) return;
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
    // `@capacitor/haptics` is only present in the native Capacitor build — it is
    // not a dependency of the web/test graph. Using a variable specifier (plus
    // @vite-ignore) prevents Vite/Rollup import-analysis from trying to resolve a
    // module that isn't installed here, which would otherwise break the web build
    // and the Vitest suite. The runtime guard above ensures this line is only
    // reached on a native platform (where the plugin exists); .catch keeps it
    // safe if the plugin is somehow absent.
    const nativeHapticsModule = '@capacitor/haptics';
    nativeHapticsPromise = import(/* @vite-ignore */ nativeHapticsModule).catch(() => null);
  }
  return nativeHapticsPromise;
}

async function nativeImpact(strength: ImpactStrength) {
  if (!hapticsEnabled()) return true;
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
  if (!hapticsEnabled()) return true;
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
  if (!hapticsEnabled()) return true;
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

  const impactLight = useCallback(() => impact('light'), [impact]);
  const impactMedium = useCallback(() => impact('medium'), [impact]);
  const impactHeavy = useCallback(() => impact('heavy'), [impact]);
  const tap = selection;
  const toggle = selection;
  const destructive = impactMedium;
  const reveal = impactMedium;

  return useMemo(
    () => ({
      impact,
      selection,
      success,
      warning,
      error,
      impactLight,
      impactMedium,
      impactHeavy,
      tap,
      toggle,
      destructive,
      reveal,
    }),
    [
      impact,
      selection,
      success,
      warning,
      error,
      impactLight,
      impactMedium,
      impactHeavy,
      tap,
      toggle,
      destructive,
      reveal,
    ],
  );
}

/**
 * Imperative getter/setter for the global haptics enable preference.
 * Used by the Settings › Accessibility toggle and any non-hook call site.
 */
export function isHapticsEnabled(): boolean {
  return hapticsEnabled();
}

export function setHapticsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(USER_PREF_KEY, enabled ? 'on' : 'off');
  } catch {
    // storage unavailable
  }
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
  // Semantic palette mirrors
  impactLight: () => haptics.impact('light'),
  impactMedium: () => haptics.impact('medium'),
  impactHeavy: () => haptics.impact('heavy'),
  tap: () => haptics.selection(),
  toggle: () => haptics.selection(),
  destructive: () => haptics.impact('medium'),
  reveal: () => haptics.impact('medium'),
};
