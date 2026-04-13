import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Configures the native status bar to match the Brikly theme on iOS and
 * Android via Capacitor. Safe no-op on web / SSR.
 *
 * Light theme: dark icons on white status bar (#FFFFFF)
 * Dark theme:  light icons on dark status bar (#1A1A2E)
 *
 * On iOS, setBackgroundColor is ignored by the plugin (iOS does not support
 * arbitrary status bar backgrounds) so we only set the style. On Android, we
 * set both style and background color.
 */
export function useNativeStatusBar() {
  const { theme } = useTheme();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!Capacitor.isNativePlatform?.()) return;

    const platform = Capacitor.getPlatform?.();
    const isDark = theme === 'dark';

    const configure = async () => {
      try {
        // Style.Dark = light text on dark background
        // Style.Light = dark text on light background
        await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });

        if (platform === 'android') {
          await StatusBar.setBackgroundColor({
            color: isDark ? '#1A1A2E' : '#FFFFFF',
          });
        }
      } catch {
        // StatusBar plugin may not be available — fail silently.
      }
    };

    void configure();
  }, [theme]);
}
