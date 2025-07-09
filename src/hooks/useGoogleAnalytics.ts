import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Extend the Window interface to include gtag
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string | Date,
      config?: any
    ) => void;
    dataLayer: any[];
  }
}

// Google Analytics utility functions
export const gtag = {
  // Track page views
  pageview: (url: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', 'G-LNDT7H4SJR', {
        page_path: url,
      });
    }
  },

  // Track events
  event: (action: string, category: string, label?: string, value?: number) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value,
      });
    }
  },

  // Track user actions
  trackUserAction: (action: string, details?: any) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', action, {
        event_category: 'user_action',
        custom_parameters: details,
      });
    }
  },

  // Track business events
  trackBusinessEvent: (event: string, data?: any) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event, {
        event_category: 'business',
        ...data,
      });
    }
  },

  // Track navigation
  trackNavigation: (from: string, to: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'navigation', {
        event_category: 'navigation',
        event_label: `${from} -> ${to}`,
      });
    }
  },

  // Track authentication events
  trackAuth: (action: 'login' | 'logout' | 'signup' | 'password_reset', method?: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', action, {
        event_category: 'authentication',
        method: method || 'email',
      });
    }
  },

  // Track subscription events
  trackSubscription: (action: 'subscribe' | 'cancel' | 'upgrade' | 'downgrade', plan?: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', action, {
        event_category: 'subscription',
        event_label: plan,
      });
    }
  },

  // Track project events
  trackProject: (action: 'create' | 'update' | 'delete' | 'complete', projectType?: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', action, {
        event_category: 'project',
        event_label: projectType,
      });
    }
  },

  // Track feature usage
  trackFeature: (feature: string, action: string, value?: number) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'feature_usage', {
        event_category: 'feature',
        event_label: feature,
        custom_action: action,
        value: value,
      });
    }
  },

  // Track errors
  trackError: (error: string, location?: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error,
        fatal: false,
        custom_location: location,
      });
    }
  },

  // Track conversions
  trackConversion: (conversionType: string, value?: number) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'conversion', {
        event_category: 'conversion',
        event_label: conversionType,
        value: value,
      });
    }
  },
};

// Hook for automatic page view tracking
export const useGoogleAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    // Track page views when location changes
    gtag.pageview(location.pathname + location.search);
  }, [location]);

  return gtag;
};

// Hook for tracking user interactions
export const useAnalyticsTracker = () => {
  return {
    trackClick: (element: string, location?: string) => {
      gtag.event('click', 'interaction', `${element}${location ? ` - ${location}` : ''}`);
    },
    
    trackFormSubmit: (formName: string, success: boolean) => {
      gtag.event('form_submit', 'interaction', formName, success ? 1 : 0);
    },
    
    trackSearch: (query: string, results: number) => {
      gtag.event('search', 'interaction', query, results);
    },
    
    trackDownload: (fileName: string) => {
      gtag.event('download', 'interaction', fileName);
    },
    
    trackVideoPlay: (videoTitle: string) => {
      gtag.event('video_play', 'media', videoTitle);
    },
    
    trackError: (error: string, location?: string) => {
      gtag.trackError(error, location);
    },
    
    trackTiming: (category: string, variable: string, value: number) => {
      gtag.event('timing_complete', category, variable, value);
    },
  };
};

export default useGoogleAnalytics;