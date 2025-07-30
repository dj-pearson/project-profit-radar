import { supabase } from '@/integrations/supabase/client';

// Initialize Google Analytics based on SEO configuration
export const initializeGoogleAnalytics = async () => {
  try {
    // Get the tracking ID from SEO configuration
    const { data: seoConfig, error } = await supabase
      .from('seo_configurations')
      .select('google_analytics_id')
      .limit(1)
      .maybeSingle();

    if (error || !seoConfig?.google_analytics_id) {
      console.log('No Google Analytics ID found in SEO configuration');
      return;
    }

    const trackingId = seoConfig.google_analytics_id;
    
    // Load Google Analytics script
    loadGoogleAnalyticsScript(trackingId);
    
    console.log('Google Analytics initialized with ID:', trackingId);
  } catch (error) {
    console.error('Error initializing Google Analytics:', error);
  }
};

// Load Google Analytics script directly
const loadGoogleAnalyticsScript = (trackingId: string) => {
  if (typeof window === 'undefined') return;
  
  // Check if already loaded
  if (document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${trackingId}"]`)) {
    return;
  }
  
  // Create gtag script
  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
  document.head.appendChild(script1);
  
  // Create configuration script
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

// Track page views (simple version)
export const trackPageView = (path: string) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('config', getTrackingIdFromDOM(), {
      page_path: path,
    });
  }
};

// Track events (simple version)
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Get tracking ID from DOM
const getTrackingIdFromDOM = (): string => {
  const script = document.querySelector('script[src*="googletagmanager.com/gtag/js"]');
  if (script) {
    const src = script.getAttribute('src') || '';
    const match = src.match(/id=([^&]+)/);
    return match ? match[1] : '';
  }
  return '';
}; 