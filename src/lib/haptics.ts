/**
 * Haptic feedback utilities for mobile devices
 * Uses the Vibration API for tactile feedback
 */

/**
 * Check if vibration is supported
 */
export function isVibrationSupported(): boolean {
  return 'vibrate' in navigator;
}

/**
 * Light haptic feedback (10ms)
 * Use for: Button taps, toggles, selections
 */
export function hapticLight() {
  if (isVibrationSupported()) {
    navigator.vibrate(10);
  }
}

/**
 * Medium haptic feedback (50ms)
 * Use for: Important actions, confirmations, notifications
 */
export function hapticMedium() {
  if (isVibrationSupported()) {
    navigator.vibrate(50);
  }
}

/**
 * Heavy haptic feedback (100ms)
 * Use for: Critical actions, errors, warnings
 */
export function hapticHeavy() {
  if (isVibrationSupported()) {
    navigator.vibrate(100);
  }
}

/**
 * Success haptic pattern
 * Use for: Successful operations, completions
 */
export function hapticSuccess() {
  if (isVibrationSupported()) {
    navigator.vibrate([10, 50, 10]);
  }
}

/**
 * Error haptic pattern
 * Use for: Errors, failed operations
 */
export function hapticError() {
  if (isVibrationSupported()) {
    navigator.vibrate([50, 50, 50]);
  }
}

/**
 * Warning haptic pattern
 * Use for: Warnings, important notifications
 */
export function hapticWarning() {
  if (isVibrationSupported()) {
    navigator.vibrate([30, 50, 30, 50, 30]);
  }
}

/**
 * Selection haptic pattern
 * Use for: Selecting items in a list, swiping through options
 */
export function hapticSelection() {
  if (isVibrationSupported()) {
    navigator.vibrate(5);
  }
}

/**
 * Impact haptic (for drag and drop)
 * Use for: Drop actions, collisions, impacts
 */
export function hapticImpact() {
  if (isVibrationSupported()) {
    navigator.vibrate(15);
  }
}
