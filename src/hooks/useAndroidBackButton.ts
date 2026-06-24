import { useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

interface UseAndroidBackButtonOptions {
  /** Called when back is pressed while a modal/sheet is open. Return true if handled. */
  onDismiss?: () => boolean;
  /** Whether to show exit confirmation on root screens */
  confirmExit?: boolean;
  /** Root paths where back button should trigger exit confirmation */
  rootPaths?: string[];
}

const DEFAULT_ROOT_PATHS = ['/', '/dashboard', '/login'];

/**
 * Hook to handle Android hardware back button for proper in-app navigation.
 *
 * Behavior:
 * 1. If onDismiss returns true, the modal/sheet is closed (no navigation)
 * 2. If browser history is available, navigates back
 * 3. If on a root screen, shows exit confirmation (double-tap to exit)
 *
 * Only activates on Android native platform via Capacitor.
 */
export function useAndroidBackButton(options: UseAndroidBackButtonOptions = {}) {
  const {
    onDismiss,
    confirmExit = true,
    rootPaths = DEFAULT_ROOT_PATHS,
  } = options;

  const navigate = useNavigate();
  const location = useLocation();
  const lastBackPress = useRef<number>(0);
  const EXIT_TIMEOUT = 2000; // 2 seconds for double-tap exit

  const isRootScreen = rootPaths.includes(location.pathname);

  const handleBackButton = useCallback(() => {
    // 1. Try dismissing modal/sheet first
    if (onDismiss && onDismiss()) {
      return;
    }

    // 2. If not on a root screen, navigate back
    if (!isRootScreen) {
      navigate(-1);
      return;
    }

    // 3. On root screen: double-tap to exit
    if (confirmExit) {
      const now = Date.now();
      if (now - lastBackPress.current < EXIT_TIMEOUT) {
        // Second press within timeout - exit the app
        App.exitApp();
      } else {
        // First press - show toast-like feedback via custom event
        lastBackPress.current = now;
        window.dispatchEvent(
          new CustomEvent('brikly:toast', {
            detail: { message: 'Press back again to exit', type: 'info' },
          })
        );
      }
    }
  }, [onDismiss, isRootScreen, confirmExit, navigate]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return;
    }

    const listener = App.addListener('backButton', ({ canGoBack }) => {
      // canGoBack indicates if WebView has history, but we manage our own via React Router
      handleBackButton();
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, [handleBackButton]);
}
