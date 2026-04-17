import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * On a Capacitor-native build, refresh the Supabase session whenever the app
 * returns to the foreground. Without this, a user who backgrounds the app for
 * longer than the access-token TTL (default 1 h) hits silent 401s on their
 * first request after resuming — the refresh-on-demand inside the SDK races
 * against the user's tap and often loses.
 *
 * No-op on web: browser tab focus already triggers the SDK's own visibility
 * refresh path.
 */
const isCapacitorNative = (): boolean => {
  try {
    return (
      typeof window !== 'undefined' &&
      !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
    );
  } catch {
    return false;
  }
};

export function useSupabaseSessionResume(): void {
  useEffect(() => {
    if (!isCapacitorNative()) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    // Lazy-import @capacitor/app so the web bundle is unaffected.
    import('@capacitor/app')
      .then(({ App }) => {
        if (cancelled) return;
        const handle = App.addListener('appStateChange', async ({ isActive }) => {
          if (!isActive) return;
          try {
            const { error } = await supabase.auth.refreshSession();
            if (error) {
              logger.warn('Session resume refresh failed:', error.message);
            }
          } catch (err) {
            logger.warn('Session resume refresh threw:', err);
          }
        });
        cleanup = async () => {
          try {
            const h = await handle;
            await h.remove();
          } catch {
            // ignore
          }
        };
      })
      .catch(() => {
        // @capacitor/app not installed or unavailable — silently no-op
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);
}
