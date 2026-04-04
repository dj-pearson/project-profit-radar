import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Hook to configure Android status bar and navigation bar to match BuildDesk theme.
 * Only runs on Android native platform via Capacitor.
 *
 * Light theme: dark text on white status bar (#FFFFFF)
 * Dark theme: light text on dark status bar (#1A1A2E)
 */
export function useAndroidStatusBar() {
  const { theme } = useTheme();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return;
    }

    const configureStatusBar = async () => {
      try {
        const isDark = theme === 'dark';

        // Set status bar style (light/dark icons)
        await StatusBar.setStyle({
          style: isDark ? Style.Dark : Style.Light,
        });

        // Set status bar background color
        await StatusBar.setBackgroundColor({
          color: isDark ? '#1A1A2E' : '#FFFFFF',
        });
      } catch {
        // StatusBar plugin may not be available in all environments
      }
    };

    configureStatusBar();
  }, [theme]);
}
