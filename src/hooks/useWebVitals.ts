import { useEffect } from 'react';
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
import { createRUMMetric, sendRUMData } from '@/utils/realUserMonitoring';
import type { Metric } from 'web-vitals';

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
  const {
    enableReporting = true,
    enableLogging = true,
    reportToAnalytics,
  } = config;

  useEffect(() => {
    if (!enableReporting) return;

    const handleMetric = (metric: Metric) => {
      const webVitalMetric: WebVitalsMetric = {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
      };

      if (enableLogging) {
        console.log(`[Web Vitals] ${metric.name}:`, {
          value: `${metric.value.toFixed(2)}ms`,
          rating: metric.rating,
          id: metric.id,
        });
      }

      // Send to RUM system
      const rumMetric = createRUMMetric(metric);
      sendRUMData(rumMetric);

      // Custom analytics callback
      if (reportToAnalytics) {
        reportToAnalytics(webVitalMetric);
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
    const handler = (metric: Metric) => {
      onPerfEntry({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
      });
    };

    onCLS(handler);
    onFCP(handler);
    onINP(handler);
    onLCP(handler);
    onTTFB(handler);
  }
};
