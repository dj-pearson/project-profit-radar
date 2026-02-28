import { useState, useEffect, useCallback } from 'react';

const REDIRECT_LOOP_KEY = 'bd.auth.redirectLoop';
const REDIRECT_LOOP_THRESHOLD = 3;
const REDIRECT_LOOP_WINDOW = 10000;

export const useRedirectLoopDetection = () => {
  const [redirectLoopDetected, setRedirectLoopDetected] = useState(false);

  const checkRedirectLoop = useCallback((): boolean => {
    try {
      const stored = sessionStorage.getItem(REDIRECT_LOOP_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const now = Date.now();
        const recentRedirects = data.timestamps.filter((ts: number) => now - ts < REDIRECT_LOOP_WINDOW);
        if (recentRedirects.length >= REDIRECT_LOOP_THRESHOLD) {
          setRedirectLoopDetected(true);
          sessionStorage.setItem(REDIRECT_LOOP_KEY, JSON.stringify({ timestamps: [], blocked: true, blockedAt: now }));
          return true;
        }
        sessionStorage.setItem(REDIRECT_LOOP_KEY, JSON.stringify({ timestamps: recentRedirects, blocked: data.blocked || false }));
      }
      return false;
    } catch { return false; }
  }, []);

  const recordRedirectAttempt = useCallback(() => {
    try {
      const stored = sessionStorage.getItem(REDIRECT_LOOP_KEY);
      const data = stored ? JSON.parse(stored) : { timestamps: [], blocked: false };
      if (data.blocked) return;
      data.timestamps.push(Date.now());
      sessionStorage.setItem(REDIRECT_LOOP_KEY, JSON.stringify(data));
    } catch { /* ignore */ }
  }, []);

  const clearRedirectLoopTracking = useCallback(() => {
    try { sessionStorage.removeItem(REDIRECT_LOOP_KEY); } catch { /* ignore */ }
  }, []);

  const isBlocked = useCallback((): boolean => {
    try {
      const stored = sessionStorage.getItem(REDIRECT_LOOP_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.blocked) {
          if (Date.now() - (data.blockedAt || 0) > 60000) {
            sessionStorage.removeItem(REDIRECT_LOOP_KEY);
            setRedirectLoopDetected(false);
            return false;
          }
          return true;
        }
      }
      return false;
    } catch { return false; }
  }, []);

  // Check for existing block on mount
  useEffect(() => {
    if (isBlocked()) {
      setRedirectLoopDetected(true);
    }
  }, [isBlocked]);

  return {
    redirectLoopDetected,
    checkRedirectLoop,
    recordRedirectAttempt,
    clearRedirectLoopTracking,
    isBlocked,
  };
};
