import { useEffect, useState, useCallback } from 'react';

interface ExitIntentOptions {
  enabled?: boolean;
  threshold?: number; // pixels from top before triggering
  delay?: number; // delay in ms before exit intent can fire again
  cookieDays?: number; // how long to remember user dismissed
  aggressive?: boolean; // also trigger on back button, idle time
  idleTime?: number; // ms of idle before showing (if aggressive)
}

export const useExitIntent = (
  onExit: () => void,
  options: ExitIntentOptions = {}
) => {
  const {
    enabled = true,
    threshold = 50,
    delay = 1000,
    cookieDays = 7,
    aggressive = false,
    idleTime = 30000, // 30 seconds default
  } = options;

  const [hasShown, setHasShown] = useState(false);
  const [lastTriggered, setLastTriggered] = useState<number>(0);
  const [idleTimer, setIdleTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Check if user has dismissed before
  const checkDismissed = useCallback(() => {
    try {
      const dismissed = localStorage.getItem('exitIntentDismissed');
      if (dismissed) {
        const dismissTime = parseInt(dismissed, 10);
        const daysSinceDismiss = (Date.now() - dismissTime) / (1000 * 60 * 60 * 24);
        return daysSinceDismiss < cookieDays;
      }
      return false;
    } catch {
      return false;
    }
  }, [cookieDays]);

  // Mark as dismissed
  const markDismissed = useCallback(() => {
    try {
      localStorage.setItem('exitIntentDismissed', Date.now().toString());
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Handle exit intent trigger
  const handleExitIntent = useCallback(() => {
    const now = Date.now();

    // Check if enough time has passed since last trigger
    if (now - lastTriggered < delay) {
      return;
    }

    // Check if user previously dismissed
    if (checkDismissed()) {
      return;
    }

    // Check if already shown
    if (hasShown) {
      return;
    }

    setHasShown(true);
    setLastTriggered(now);
    onExit();
  }, [lastTriggered, delay, hasShown, onExit, checkDismissed]);

  // Handle mouse movement
  const handleMouseMove = useCallback((e: MouseEvent) => {
    // Check if cursor is moving upward near top of page
    if (e.clientY <= threshold && e.movementY < 0) {
      handleExitIntent();
    }
  }, [threshold, handleExitIntent]);

  // Handle mouse leave
  const handleMouseLeave = useCallback((e: MouseEvent) => {
    // Only trigger if leaving through top of viewport
    if (e.clientY <= 0) {
      handleExitIntent();
    }
  }, [handleExitIntent]);

  // Handle back button (if aggressive mode)
  useEffect(() => {
    if (!enabled || !aggressive) return;

    const handlePopState = () => {
      handleExitIntent();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [enabled, aggressive, handleExitIntent]);

  // Handle idle time (if aggressive mode)
  useEffect(() => {
    if (!enabled || !aggressive || !idleTime) return;

    const resetIdleTimer = () => {
      if (idleTimer) {
        clearTimeout(idleTimer);
      }

      const newTimer = setTimeout(() => {
        handleExitIntent();
      }, idleTime);

      setIdleTimer(newTimer);
    };

    // Reset timer on user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, resetIdleTimer);
    });

    // Initial timer
    resetIdleTimer();

    return () => {
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
      events.forEach(event => {
        document.removeEventListener(event, resetIdleTimer);
      });
    };
  }, [enabled, aggressive, idleTime, handleExitIntent]);

  // Main exit intent detection
  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [enabled, handleMouseMove, handleMouseLeave]);

  // Return control methods
  return {
    hasShown,
    markDismissed,
    reset: () => setHasShown(false),
  };
};

export default useExitIntent;
