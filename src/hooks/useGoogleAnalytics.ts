import { useEffect, useState } from 'react';
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

// Analytics configuration interface
interface AnalyticsConfig {
  enabled: boolean;
  trackingId: string;
  eventTracking: boolean;
  scrollTracking: boolean;
  formTracking: boolean;
}

// Get analytics config from localStorage
const getAnalyticsConfig = (): AnalyticsConfig => {
  try {
    const saved = localStorage.getItem('analytics-config');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading analytics config:', error);
  }
  
  return {
    enabled: false,
    trackingId: '',
    eventTracking: true,
    scrollTracking: true,
    formTracking: true,
  };
};

// Check if analytics should be loaded
const shouldLoadAnalytics = (): boolean => {
  const config = getAnalyticsConfig();
  return config.enabled && !!config.trackingId;
};

// Load Google Analytics script
const loadGoogleAnalytics = (trackingId: string) => {
  if (typeof window === 'undefined') return;
  
  // Check if already loaded
  if (window.gtag) return;
  
  // Create script tags
  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
  document.head.appendChild(script1);
  
  const script2 = document.createElement('script');
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${trackingId}', {
      page_title: document.title,
      page_location: window.location.href
    });
  `;
  document.head.appendChild(script2);
};

// Google Analytics utility functions
export const gtag = {
  // Track page views
  pageview: (url: string) => {
    const config = getAnalyticsConfig();
    if (typeof window !== 'undefined' && window.gtag && config.enabled && config.trackingId) {
      window.gtag('config', config.trackingId, {
        page_path: url,
      });
    }
  },

  // Track events
  event: (action: string, category: string, label?: string, value?: number) => {
    const config = getAnalyticsConfig();
    if (typeof window !== 'undefined' && window.gtag && config.enabled && config.eventTracking) {
      window.gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value,
      });
    }
  },

  // Track user actions
  trackUserAction: (action: string, details?: any) => {
    const config = getAnalyticsConfig();
    if (typeof window !== 'undefined' && window.gtag && config.enabled && config.eventTracking) {
      window.gtag('event', action, {
        event_category: 'user_action',
        custom_parameters: details,
      });
    }
  },

  // Track business events
  trackBusinessEvent: (event: string, data?: any) => {
    const config = getAnalyticsConfig();
    if (typeof window !== 'undefined' && window.gtag && config.enabled && config.eventTracking) {
      window.gtag('event', event, {
        event_category: 'business',
        ...data,
      });
    }
  },

  // Track navigation
  trackNavigation: (from: string, to: string) => {
    const config = getAnalyticsConfig();
    if (typeof window !== 'undefined' && window.gtag && config.enabled && config.eventTracking) {
      window.gtag('event', 'navigation', {
        event_category: 'navigation',
        event_label: `${from} -> ${to}`,
      });
    }
  },

  // Track authentication events
  trackAuth: (action: 'login' | 'logout' | 'signup' | 'password_reset', method?: string) => {
    const config = getAnalyticsConfig();
    if (typeof window !== 'undefined' && window.gtag && config.enabled && config.eventTracking) {
      window.gtag('event', action, {
        event_category: 'authentication',
        method: method || 'email',
      });
    }
  },

  // Track subscription events
  trackSubscription: (action: 'subscribe' | 'cancel' | 'upgrade' | 'downgrade', plan?: string) => {
    const config = getAnalyticsConfig();
    if (typeof window !== 'undefined' && window.gtag && config.enabled && config.eventTracking) {
      window.gtag('event', action, {
        event_category: 'subscription',
        event_label: plan,
      });
    }
  },

  // Track project events
  trackProject: (action: 'create' | 'update' | 'delete' | 'complete', projectType?: string) => {
    const config = getAnalyticsConfig();
    if (typeof window !== 'undefined' && window.gtag && config.enabled && config.eventTracking) {
      window.gtag('event', action, {
        event_category: 'project',
        event_label: projectType,
      });
    }
  },

  // Track feature usage
  trackFeature: (feature: string, action: string, value?: number) => {
    const config = getAnalyticsConfig();
    if (typeof window !== 'undefined' && window.gtag && config.enabled && config.eventTracking) {
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
    const config = getAnalyticsConfig();
    if (typeof window !== 'undefined' && window.gtag && config.enabled) {
      window.gtag('event', 'exception', {
        description: error,
        fatal: false,
        custom_location: location,
      });
    }
  },

  // Track conversions
  trackConversion: (conversionType: string, value?: number) => {
    const config = getAnalyticsConfig();
    if (typeof window !== 'undefined' && window.gtag && config.enabled && config.eventTracking) {
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
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load Google Analytics if configured
    if (shouldLoadAnalytics() && !isLoaded) {
      const config = getAnalyticsConfig();
      loadGoogleAnalytics(config.trackingId);
      setIsLoaded(true);
    }
  }, [isLoaded]);

  useEffect(() => {
    // Track page views when location changes
    if (shouldLoadAnalytics()) {
      gtag.pageview(location.pathname + location.search);
    }
  }, [location]);

  return gtag;
};

// Hook for tracking user interactions
export const useAnalyticsTracker = () => {
  return {
    trackClick: (element: string, location?: string) => {
      const config = getAnalyticsConfig();
      if (config.enabled && config.eventTracking) {
        gtag.event('click', 'interaction', `${element}${location ? ` - ${location}` : ''}`);
      }
    },
    
    trackFormSubmit: (formName: string, success: boolean) => {
      const config = getAnalyticsConfig();
      if (config.enabled && config.formTracking) {
        gtag.event('form_submit', 'interaction', formName, success ? 1 : 0);
      }
    },
    
    trackSearch: (query: string, results: number) => {
      const config = getAnalyticsConfig();
      if (config.enabled && config.eventTracking) {
        gtag.event('search', 'interaction', query, results);
      }
    },
    
    trackDownload: (fileName: string) => {
      const config = getAnalyticsConfig();
      if (config.enabled && config.eventTracking) {
        gtag.event('download', 'interaction', fileName);
      }
    },
    
    trackVideoPlay: (videoTitle: string) => {
      const config = getAnalyticsConfig();
      if (config.enabled && config.eventTracking) {
        gtag.event('video_play', 'media', videoTitle);
      }
    },
    
    trackError: (error: string, location?: string) => {
      const config = getAnalyticsConfig();
      if (config.enabled) {
        gtag.trackError(error, location);
      }
    },
    
    trackTiming: (category: string, variable: string, value: number) => {
      const config = getAnalyticsConfig();
      if (config.enabled && config.eventTracking) {
        gtag.event('timing_complete', category, variable, value);
      }
    },
  };
};

export default useGoogleAnalytics;