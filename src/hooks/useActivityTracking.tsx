/**
 * Activity Tracking Hook
 * Tracks user actions for debugging, analytics, and health score calculation
 */

import React, { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ActivityEvent {
  actionType: string;
  actionDetails?: Record<string, any>;
  url?: string;
  duration?: number;
}

interface ErrorEvent {
  errorMessage: string;
  errorType?: string;
  stackTrace?: string;
  component?: string;
  userAction?: string;
}

export const useActivityTracking = () => {
  const { user, userProfile } = useAuth();

  /**
   * Track a user action
   */
  const trackAction = useCallback(
    async (event: ActivityEvent) => {
      if (!user || !userProfile) return;

      try {
        await supabase.from('user_activity_timeline').insert({
          user_id: user.id,
          company_id: userProfile.company_id,
          action_type: event.actionType,
          action_details: event.actionDetails || {},
          url: event.url || window.location.href,
          referrer: document.referrer,
          user_agent: navigator.userAgent,
          duration_ms: event.duration,
        });
      } catch (error) {
        // Silently fail - don't break app if tracking fails
        console.debug('Activity tracking failed:', error);
      }
    },
    [user, userProfile]
  );

  /**
   * Track an error
   */
  const trackError = useCallback(
    async (event: ErrorEvent) => {
      if (!user || !userProfile) return;

      try {
        // Insert into both error_logs and activity_timeline
        await Promise.all([
          supabase.from('error_logs').insert({
            user_id: user.id,
            company_id: userProfile.company_id,
            error_type: event.errorType || 'UnknownError',
            error_message: event.errorMessage,
            stack_trace: event.stackTrace,
            url: window.location.href,
            user_action: event.userAction,
            component: event.component,
            browser_info: {
              userAgent: navigator.userAgent,
              platform: navigator.platform,
              language: navigator.language,
            },
            severity: 'medium',
          }),
          supabase.from('user_activity_timeline').insert({
            user_id: user.id,
            company_id: userProfile.company_id,
            action_type: 'error',
            error_message: event.errorMessage,
            error_details: {
              type: event.errorType,
              component: event.component,
              userAction: event.userAction,
            },
            stack_trace: event.stackTrace,
            url: window.location.href,
          }),
        ]);
      } catch (error) {
        console.debug('Error tracking failed:', error);
      }
    },
    [user, userProfile]
  );

  /**
   * Track a page view
   */
  const trackPageView = useCallback(
    async (pageName?: string) => {
      await trackAction({
        actionType: 'page_view',
        actionDetails: {
          page: pageName || document.title,
          path: window.location.pathname,
        },
      });
    },
    [trackAction]
  );

  /**
   * Track a feature usage
   */
  const trackFeatureUsage = useCallback(
    async (featureName: string, details?: Record<string, any>) => {
      await trackAction({
        actionType: 'feature_used',
        actionDetails: {
          feature: featureName,
          ...details,
        },
      });
    },
    [trackAction]
  );

  /**
   * Track an API call performance
   */
  const trackApiCall = useCallback(
    async (endpoint: string, durationMs: number, status: number) => {
      await trackAction({
        actionType: 'api_call',
        actionDetails: {
          endpoint,
          status,
          success: status >= 200 && status < 300,
        },
        duration: durationMs,
      });

      // Also log to performance_metrics
      if (user && userProfile) {
        try {
          await supabase.from('performance_metrics').insert({
            user_id: user.id,
            company_id: userProfile.company_id,
            metric_type: 'api_call',
            metric_name: endpoint,
            duration_ms: durationMs,
            details: { status },
          });
        } catch (error) {
          console.debug('Performance tracking failed:', error);
        }
      }
    },
    [trackAction, user, userProfile]
  );

  // Track page unload time
  useEffect(() => {
    const pageStartTime = Date.now();

    const handleUnload = () => {
      const duration = Date.now() - pageStartTime;

      // Use sendBeacon for reliable tracking on page unload
      if (user && userProfile && navigator.sendBeacon) {
        const data = {
          user_id: user.id,
          company_id: userProfile.company_id,
          action_type: 'page_unload',
          action_details: {
            duration_seconds: Math.round(duration / 1000),
            path: window.location.pathname,
          },
          url: window.location.href,
          duration_ms: duration,
          timestamp: new Date().toISOString(),
        };

        navigator.sendBeacon(
          `${supabase.supabaseUrl}/rest/v1/user_activity_timeline`,
          JSON.stringify(data)
        );
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [user, userProfile]);

  // Set up global error handler
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      trackError({
        errorMessage: event.message,
        errorType: event.error?.name || 'UncaughtError',
        stackTrace: event.error?.stack,
        component: 'Global',
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError({
        errorMessage: event.reason?.message || String(event.reason),
        errorType: 'UnhandledPromiseRejection',
        stackTrace: event.reason?.stack,
        component: 'Global',
      });
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [trackError]);

  return {
    trackAction,
    trackError,
    trackPageView,
    trackFeatureUsage,
    trackApiCall,
  };
};

/**
 * HOC to automatically track page views
 */
export function withPageTracking<P extends object>(
  Component: React.ComponentType<P>,
  pageName: string
) {
  return function TrackedComponent(props: P) {
    const { trackPageView } = useActivityTracking();

    useEffect(() => {
      trackPageView(pageName);
    }, [trackPageView]);

    return <Component {...props} />;
  };
}
