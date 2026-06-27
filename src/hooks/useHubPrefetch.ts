import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { warmForRoute } from '@/utils/hubPrefetch';

/**
 * US-220: On hub navigation, idle-warm the likely-next route chunks and their
 * TanStack queries (see warmForRoute). Scheduled in idle time so it never
 * competes with the current page's render/interaction.
 */
export const useHubPrefetch = (): void => {
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const run = () => warmForRoute(pathname, queryClient, companyId);

    const ric = (
      window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback?: (id: number) => void;
      }
    ).requestIdleCallback;

    if (ric) {
      const id = ric(run, { timeout: 3000 });
      return () => {
        (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id);
      };
    }

    const t = window.setTimeout(run, 1200);
    return () => window.clearTimeout(t);
  }, [pathname, queryClient, companyId]);
};
