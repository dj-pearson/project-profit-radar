/**
 * Backwards-compatible alias for useNativeStatusBar.
 *
 * Originally this hook only configured Android, but it now runs on iOS as
 * well (see useNativeStatusBar). Existing callers keep working.
 */
export { useNativeStatusBar as useAndroidStatusBar } from './useNativeStatusBar';
