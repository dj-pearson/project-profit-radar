import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQueryPerformance } from '@/hooks/useOptimizedQueries';
import { cacheUtils, devTools } from '@/lib/queryClient';
import { 
  Activity, 
  Zap, 
  Database, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Trash2,
  RefreshCw
} from 'lucide-react';

export interface PerformanceMetrics {
  bundleSize: number;
  loadTime: number;
  queryCount: number;
  cacheHitRate: number;
  errorRate: number;
  memoryUsage: number;
}

export const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { getCacheStats, clearStaleQueries } = useQueryPerformance();
  
  // Only show in development mode
  useEffect(() => {
    setIsVisible(process.env.NODE_ENV === 'development');
  }, []);

  const updateMetrics = () => {
    const cacheStats = getCacheStats();
    const performanceEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    // Use startTime instead of deprecated navigationStart
    const loadTime = performanceEntries[0]?.loadEventEnd - performanceEntries[0]?.startTime || 0;
    
    // Estimate memory usage (simplified)
    const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;
    
    setMetrics({
      bundleSize: 0, // Would need build-time integration
      loadTime: Math.round(loadTime),
      queryCount: cacheStats.totalQueries,
      cacheHitRate: cacheStats.totalQueries > 0 
        ? Math.round(((cacheStats.totalQueries - cacheStats.fetchingQueries) / cacheStats.totalQueries) * 100)
        : 0,
      errorRate: cacheStats.totalQueries > 0
        ? Math.round((cacheStats.errorQueries / cacheStats.totalQueries) * 100)
        : 0,
      memoryUsage: Math.round(memoryUsage / 1024 / 1024), // MB
    });
  };

  useEffect(() => {
    if (isVisible) {
      updateMetrics();
      const interval = setInterval(updateMetrics, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  const handleClearCache = () => {
    cacheUtils.clearCache();
    updateMetrics();
  };

  const handleClearStale = () => {
    const cleared = clearStaleQueries();
    console.log(`Cleared ${cleared} stale queries`);
    updateMetrics();
  };

  const getPerformanceStatus = (metric: keyof PerformanceMetrics, value: number) => {
    const thresholds = {
      loadTime: { good: 2000, warning: 4000 }, // ms
      queryCount: { good: 20, warning: 50 },
      cacheHitRate: { good: 80, warning: 60 }, // %
      errorRate: { good: 2, warning: 5 }, // %
      memoryUsage: { good: 50, warning: 100 }, // MB
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return 'default';

    if (metric === 'cacheHitRate') {
      // Higher is better for cache hit rate
      if (value >= threshold.good) return 'success';
      if (value >= threshold.warning) return 'warning';
      return 'destructive';
    } else {
      // Lower is better for other metrics
      if (value <= threshold.good) return 'success';
      if (value <= threshold.warning) return 'warning';
      return 'destructive';
    }
  };

  if (!isVisible || !metrics) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center">
            <Activity className="h-4 w-4 mr-2" />
            Performance Monitor
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="ml-auto h-6 w-6 p-0"
            >
              ×
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Load Time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm">
              <Clock className="h-3 w-3 mr-1" />
              Load Time
            </div>
            <Badge variant={getPerformanceStatus('loadTime', metrics.loadTime)}>
              {metrics.loadTime}ms
            </Badge>
          </div>

          {/* Query Count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm">
              <Database className="h-3 w-3 mr-1" />
              Active Queries
            </div>
            <Badge variant={getPerformanceStatus('queryCount', metrics.queryCount)}>
              {metrics.queryCount}
            </Badge>
          </div>

          {/* Cache Hit Rate */}
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm">
              <Zap className="h-3 w-3 mr-1" />
              Cache Hit Rate
            </div>
            <Badge variant={getPerformanceStatus('cacheHitRate', metrics.cacheHitRate)}>
              {metrics.cacheHitRate}%
            </Badge>
          </div>

          {/* Error Rate */}
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Error Rate
            </div>
            <Badge variant={getPerformanceStatus('errorRate', metrics.errorRate)}>
              {metrics.errorRate}%
            </Badge>
          </div>

          {/* Memory Usage */}
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm">
              <Activity className="h-3 w-3 mr-1" />
              Memory
            </div>
            <Badge variant={getPerformanceStatus('memoryUsage', metrics.memoryUsage)}>
              {metrics.memoryUsage}MB
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearStale}
              className="flex-1 text-xs"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear Stale
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCache}
              className="flex-1 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Clear Cache
            </Button>
          </div>

          {/* Development Tools */}
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={devTools.logQueries}
              className="w-full text-xs"
            >
              Log Queries to Console
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Performance warning component for production issues
 */
export const PerformanceWarning: React.FC = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [performanceIssues, setPerformanceIssues] = useState<string[]>([]);

  useEffect(() => {
    const checkPerformance = () => {
      const issues: string[] = [];
      
      // Check load time
      const performanceEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      // Use startTime instead of deprecated navigationStart
      const loadTime = performanceEntries[0]?.loadEventEnd - performanceEntries[0]?.startTime || 0;
      
      if (loadTime > 5000) {
        issues.push('Slow page load time detected');
      }

      // Check memory usage
      const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;
      if (memoryUsage > 100 * 1024 * 1024) { // 100MB
        issues.push('High memory usage detected');
      }

      // Check for console errors
      const hasErrors = window.console.error !== console.error;
      if (hasErrors) {
        issues.push('Console errors detected');
      }

      if (issues.length > 0) {
        setPerformanceIssues(issues);
        setShowWarning(true);
      }
    };

    // Check performance after page load
    setTimeout(checkPerformance, 3000);
  }, []);

  if (!showWarning) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center text-orange-800 dark:text-orange-200">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Performance Warning
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowWarning(false)}
              className="ml-auto h-6 w-6 p-0"
            >
              ×
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-1 text-orange-700 dark:text-orange-300">
            {performanceIssues.map((issue, index) => (
              <li key={index} className="flex items-center">
                <AlertTriangle className="h-3 w-3 mr-2 flex-shrink-0" />
                {issue}
              </li>
            ))}
          </ul>
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
            Consider optimizing your application for better performance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceMonitor;
