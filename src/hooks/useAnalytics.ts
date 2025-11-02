import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import Analytics, { EventProperties } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';

/**
 * React hook for analytics tracking
 * Automatically tracks page views and provides convenience methods
 */
export const useAnalytics = () => {
  const location = useLocation();
  const { user } = useAuth();

  // Track page views on route change
  useEffect(() => {
    Analytics.page(location.pathname, {
      path: location.pathname,
      search: location.search,
      hash: location.hash,
    });
  }, [location]);

  // Identify user when authenticated
  useEffect(() => {
    if (user) {
      Analytics.identify(user.id, {
        email: user.email,
        // Add other user properties as needed
      });
    } else {
      Analytics.reset();
    }
  }, [user]);

  // Track custom event
  const track = useCallback((eventName: string, properties?: EventProperties) => {
    Analytics.track(eventName, properties);
  }, []);

  // Track conversion event
  const trackConversion = useCallback((event: Parameters<typeof Analytics.trackConversion>[0]) => {
    Analytics.trackConversion(event);
  }, []);

  return {
    track,
    trackConversion,
    identify: Analytics.identify.bind(Analytics),
    page: Analytics.page.bind(Analytics),
    reset: Analytics.reset.bind(Analytics),
  };
};

export default useAnalytics;
