import { useEffect, useRef, useState } from 'react';

export interface ConnectionStatus {
  /** True if the device currently reports online. */
  isOnline: boolean;
  /**
   * True for a brief window (~1.5s) immediately after the device transitions
   * back online — useful for rendering a "Syncing…" state.
   */
  justReconnected: boolean;
  /** True if the device has been offline at any point since mount. */
  wasOffline: boolean;
}

/**
 * Track navigator online/offline state with a short "just reconnected" pulse
 * on recovery. Safe on SSR (defaults to online).
 */
export function useConnectionStatus(reconnectPulseMs: number = 1500): ConnectionStatus {
  const getInitial = () =>
    typeof navigator === 'undefined' ? true : navigator.onLine;

  const [isOnline, setIsOnline] = useState<boolean>(getInitial);
  const [justReconnected, setJustReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      if (wasOfflineRef.current) {
        setJustReconnected(true);
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => {
          setJustReconnected(false);
        }, reconnectPulseMs);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      wasOfflineRef.current = true;
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [reconnectPulseMs]);

  return { isOnline, justReconnected, wasOffline };
}
