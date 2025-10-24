import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';

// Type for gtag function
type GtagFunction = (
  command: 'config' | 'event' | 'js' | 'set',
  targetId: string | Date,
  config?: any
) => void;

// Extend the Window interface to include gtag
declare global {
  interface Window {
    gtag?: GtagFunction;
    dataLayer?: any[];
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

// Get analytics config from Supabase SEO configurations
const getAnalyticsConfig = async (): Promise<AnalyticsConfig> => {
  try {
    const { data: seoConfig, error } = await supabase
      .from('seo_configurations')
      .select('google_analytics_id')
      .limit(1)
      .single();

    if (error) {
      console.log('No SEO configuration found, checking localStorage fallback');
      // Fallback to localStorage for backwards compatibility
      const saved = localStorage.getItem('analytics-config');
      if (saved) {
        return JSON.parse(saved);
      }
    }

    const trackingId = seoConfig?.google_analytics_id || '';
    
    return {
      enabled: !!trackingId,
      trackingId: trackingId,
      eventTracking: true,
      scrollTracking: true,
      formTracking: true,
    };
  } catch (error) {
    console.error('Error loading analytics config:', error);
    return {
      enabled: false,
      trackingId: '',
      eventTracking: true,
      scrollTracking: true,
      formTracking: true,
    };
  }
};

// Check if analytics should be loaded
const shouldLoadAnalytics = async (): Promise<boolean> => {
  const config = await getAnalyticsConfig();
  return config.enabled && !!config.trackingId;
};

// Load Google Analytics script
const loadGoogleAnalytics = (trackingId: string) => {
  if (typeof window === 'undefined') return;
  
  // Check if already loaded with the same tracking ID
  if (window.gtag && document.querySelector(`script[src*="${trackingId}"]`)) return;
  
  // Remove any existing GA scripts to avoid conflicts
  const existingScripts = document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]');
  existingScripts.forEach(script => script.remove());
  
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
  
  console.log('Google Analytics loaded with tracking ID:', trackingId);
};

// Google Analytics utility functions
export const gtag = {
  // Track page views
  pageview: async (url: string) => {
    const config = await getAnalyticsConfig();
    if (typeof window !== 'undefined' && window.gtag && config.enabled && config.trackingId) {
      window.gtag('config', config.trackingId, {
        page_path: url,
      });
    }
  },

  // Track events
  event: async (action: string, category: string, label?: string, value?: number) => {
    const config = await getAnalyticsConfig();
    if (typeof window !== 'undefined' && window.gtag && config.enabled && config.eventTracking) {
      window.gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value,
      });
    }
  },

  // Track user actions
  trackUserAction: async (action: string, details?: any) => {
    const config = await getAnalyticsConfig();
    if (typeof window !== 'undefined' && window.gtag && config.enabled && config.eventTracking) {
      window.gtag('event', action, {
        event_category: 'user_action',
        custom_parameters: details,
      });
    }
  },

  // Track business events
  trackBusinessEvent: async (event: string, data?: any) => {
    const config = await getAnalyticsConfig();
    if (typeof window !== 'undefined' && window.gtag && config.enabled && config.eventTracking) {
      window.gtag('event', event, {
        event_category: 'business',
        ...data,
      });
    }
  },

  // Track navigation
  trackNavigation: async (from: string, to: string) => {
    const config = await getAnalyticsConfig();
    if (typeof window !== 'undefined' && window.gtag && config.enabled && config.eventTracking) {
      window.gtag('event', 'navigation', {
        event_category: 'navigation',
        event_label: `${from} -> ${to}`,
      });
    }
  },

  // Track authentication events
  trackAuth: async (action: string, method?: string) => {
    const config = await getAnalyticsConfig();
    if (typeof window !== 'undefined' && window.gtag && config.enabled && config.eventTracking) {
      window.gtag('event', action, {
        event_category: 'authentication',
        event_label: method,
      });
    }
  },

  // Track project events
  trackProject: async (action: string, projectType?: string, value?: number) => {
    const config = await getAnalyticsConfig();
    if (typeof window !== 'undefined' && window.gtag && config.enabled && config.eventTracking) {
      window.gtag('event', action, {
        event_category: 'project',
        event_label: projectType,
        value: value,
      });
    }
  },

  // Track feature usage
  trackFeature: async (feature: string, action: string, value?: number) => {
    const config = await getAnalyticsConfig();
    if (typeof window !== 'undefined' && window.gtag && config.enabled && config.eventTracking) {
      window.gtag('event', action, {
        event_category: 'feature',
        event_label: feature,
        value: value,
      });
    }
  },

  // Track subscription events
  trackSubscription: async (action: string, plan?: string, value?: number) => {
    const config = await getAnalyticsConfig();
    if (typeof window !== 'undefined' && window.gtag && config.enabled && config.eventTracking) {
      window.gtag('event', action, {
        event_category: 'subscription',
        event_label: plan,
        value: value,
      });
    }
  },

  // Track conversions
  trackConversion: async (conversionType: string, value?: number) => {
    const config = await getAnalyticsConfig();
    if (typeof window !== 'undefined' && window.gtag && config.enabled && config.eventTracking) {
      window.gtag('event', 'conversion', {
        event_category: 'conversion',
        event_label: conversionType,
        value: value,
      });
    }
  },

  // Track errors
  trackError: async (error: string, location?: string) => {
    const config = await getAnalyticsConfig();
    if (typeof window !== 'undefined' && window.gtag && config.enabled) {
      window.gtag('event', 'exception', {
        description: error,
        fatal: false,
        custom_parameter_1: location,
      });
    }
  },

  // Track ecommerce events
  trackPurchase: async (transactionId: string, value: number, currency: string = 'USD', items?: any[]) => {
    const config = await getAnalyticsConfig();
    if (typeof window !== 'undefined' && window.gtag && config.enabled && config.eventTracking) {
      window.gtag('event', 'purchase', {
        transaction_id: transactionId,
        value: value,
        currency: currency,
        items: items,
      });
    }
  },
};

// Hook for automatic page view tracking
export const useGoogleAnalytics = () => {
  const location = useLocation();
  const [isLoaded, setIsLoaded] = useState(false);
  const [config, setConfig] = useState<AnalyticsConfig | null>(null);

  // Load config and initialize GA
  useEffect(() => {
    const initializeAnalytics = async () => {
      try {
        const analyticsConfig = await getAnalyticsConfig();
        setConfig(analyticsConfig);
        
        if (analyticsConfig.enabled && analyticsConfig.trackingId && !isLoaded) {
          loadGoogleAnalytics(analyticsConfig.trackingId);
          setIsLoaded(true);
        }
      } catch (error) {
        console.error('Error initializing analytics:', error);
      }
    };

    initializeAnalytics();
  }, [isLoaded]);

  // Track page views when location changes
  useEffect(() => {
    if (config?.enabled && config?.trackingId && isLoaded) {
      // Use a non-async version for page views to avoid issues
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('config', config.trackingId, {
          page_path: location.pathname + location.search,
        });
      }
    }
  }, [location, config, isLoaded]);

  return gtag;
};

// Hook for tracking user interactions
export const useAnalyticsTracker = () => {
  return {
    trackClick: async (element: string, location?: string) => {
      const config = await getAnalyticsConfig();
      if (config.enabled && config.eventTracking) {
        await gtag.event('click', 'interaction', `${element}${location ? ` - ${location}` : ''}`);
      }
    },
    
    trackFormSubmit: async (formName: string, success: boolean) => {
      const config = await getAnalyticsConfig();
      if (config.enabled && config.formTracking) {
        await gtag.event('form_submit', 'interaction', formName, success ? 1 : 0);
      }
    },
    
    trackSearch: async (query: string, results: number) => {
      const config = await getAnalyticsConfig();
      if (config.enabled && config.eventTracking) {
        await gtag.event('search', 'interaction', query, results);
      }
    },
    
    trackDownload: async (fileName: string) => {
      const config = await getAnalyticsConfig();
      if (config.enabled && config.eventTracking) {
        await gtag.event('download', 'interaction', fileName);
      }
    },
    
    trackVideoPlay: async (videoTitle: string) => {
      const config = await getAnalyticsConfig();
      if (config.enabled && config.eventTracking) {
        await gtag.event('video_play', 'media', videoTitle);
      }
    },
    
    trackError: async (error: string, location?: string) => {
      const config = await getAnalyticsConfig();
      if (config.enabled) {
        await gtag.trackError(error, location);
      }
    },
    
    trackTiming: async (category: string, variable: string, value: number) => {
      const config = await getAnalyticsConfig();
      if (config.enabled && config.eventTracking) {
        await gtag.event('timing_complete', category, variable, value);
      }
    },
  };
};

export default useGoogleAnalytics;