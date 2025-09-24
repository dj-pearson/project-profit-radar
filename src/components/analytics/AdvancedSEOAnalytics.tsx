import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface AdvancedSEOAnalyticsProps {
  trackingId?: string;
}

export const AdvancedSEOAnalytics: React.FC<AdvancedSEOAnalyticsProps> = ({ 
  trackingId = 'UA-BUILDDESK-SEO' 
}) => {
  const location = useLocation();

  useEffect(() => {
    // Track page views with enhanced SEO data
    const trackPageView = () => {
      if (typeof window !== 'undefined' && window.gtag) {
        // Enhanced page tracking for SEO
        window.gtag('event', 'page_view', {
          page_title: document.title,
          page_location: window.location.href,
          page_path: location.pathname,
          content_group1: getContentCategory(),
          content_group2: getIndustryFocus(),
          custom_parameter_seo_score: calculateSEOScore(),
        });

        // Track Core Web Vitals
        window.gtag('event', 'timing_complete', {
          name: 'page_load_time',
          value: performance.now(),
        });
      }
    };

    // Track search intent matching
    const trackSearchIntent = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const utmSource = searchParams.get('utm_source');
      const utmTerm = searchParams.get('utm_term');
      
      if (utmSource === 'google' && utmTerm) {
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'search_intent_match', {
            search_term: utmTerm,
            landing_page: location.pathname,
            intent_type: classifySearchIntent(utmTerm),
          });
        }
      }
    };

    trackPageView();
    trackSearchIntent();
  }, [location]);

  const getContentCategory = (): string => {
    const path = location.pathname;
    if (path.includes('/resources/')) return 'Educational Content';
    if (path.includes('/comparison/') || path.includes('vs')) return 'Comparison Content';
    if (path.includes('/topics/')) return 'Topic Hub';
    if (path.includes('/pricing')) return 'Commercial';
    return 'Marketing';
  };

  const getIndustryFocus = (): string => {
    const path = location.pathname;
    if (path.includes('residential')) return 'Residential Construction';
    if (path.includes('commercial')) return 'Commercial Construction';
    if (path.includes('osha') || path.includes('safety')) return 'Safety & Compliance';
    return 'General Construction';
  };

  const calculateSEOScore = (): number => {
    // Simple SEO score based on page elements
    let score = 0;
    
    // Check for SEO elements
    if (document.querySelector('h1')) score += 20;
    if (document.querySelector('meta[name="description"]')) score += 20;
    if (document.querySelector('link[rel="canonical"]')) score += 15;
    if (document.querySelector('script[type="application/ld+json"]')) score += 15;
    if (document.querySelector('img[alt]')) score += 10;
    if (document.querySelectorAll('h2').length > 0) score += 10;
    if (document.body.textContent && document.body.textContent.length > 300) score += 10;
    
    return score;
  };

  const classifySearchIntent = (term: string): string => {
    const lowerTerm = term.toLowerCase();
    if (lowerTerm.includes('vs') || lowerTerm.includes('compare') || lowerTerm.includes('alternative')) {
      return 'Comparison';
    }
    if (lowerTerm.includes('how to') || lowerTerm.includes('guide') || lowerTerm.includes('tutorial')) {
      return 'Educational';
    }
    if (lowerTerm.includes('best') || lowerTerm.includes('top') || lowerTerm.includes('review')) {
      return 'Research';
    }
    if (lowerTerm.includes('price') || lowerTerm.includes('cost') || lowerTerm.includes('buy')) {
      return 'Commercial';
    }
    return 'Informational';
  };

  return null;
};

export default AdvancedSEOAnalytics;