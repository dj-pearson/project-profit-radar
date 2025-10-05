import { useEffect } from 'react';
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

interface WebVitalsConfig {
  enableReporting?: boolean;
  enableLogging?: boolean;
  reportToAnalytics?: (metric: WebVitalsMetric) => void;
}

export const useWebVitals = (config: WebVitalsConfig = {}) => {
  const { enableReporting = true, enableLogging = true, reportToAnalytics } = config;

  useEffect(() => {
    if (!enableReporting) return;

    const handleMetric = (metric: any) => {
      const webVitalMetric: WebVitalsMetric = {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id
      };

      if (enableLogging) {
        console.log(`[Web Vitals] ${metric.name}:`, {
          value: `${metric.value.toFixed(2)}ms`,
          rating: metric.rating,
          id: metric.id
        });
      }

      // Report to analytics
      if (reportToAnalytics) {
        reportToAnalytics(webVitalMetric);
      } else if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', metric.name, {
          value: Math.round(metric.value),
          metric_rating: metric.rating,
          metric_delta: Math.round(metric.delta),
          metric_id: metric.id,
          event_category: 'Web Vitals'
        });
      }
    };

    // Register all Core Web Vitals
    onCLS(handleMetric);
    onFCP(handleMetric);
    onINP(handleMetric);
    onLCP(handleMetric);
    onTTFB(handleMetric);
  }, [enableReporting, enableLogging, reportToAnalytics]);
};

// Standalone function for manual reporting
export const reportWebVitals = (onPerfEntry?: (metric: WebVitalsMetric) => void) => {
  if (onPerfEntry) {
    onCLS((metric) => onPerfEntry(metric as any));
    onFCP((metric) => onPerfEntry(metric as any));
    onINP((metric) => onPerfEntry(metric as any));
    onLCP((metric) => onPerfEntry(metric as any));
    onTTFB((metric) => onPerfEntry(metric as any));
  }
};
