import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { BarChart3, Clock, Zap, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';
import { usePerformanceMonitor, useRealUserMetrics } from '@/hooks/usePerformanceMonitor';

interface PerformanceMetric {
  name: string;
  value: number;
  threshold: number;
  unit: string;
  status: 'good' | 'needs_improvement' | 'poor';
  description: string;
}

export const PerformanceDashboard = ({ isVisible = false }: { isVisible?: boolean }) => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { getMetrics } = usePerformanceMonitor();
  const rumData = useRealUserMetrics();

  const refreshMetrics = () => {
    setIsRefreshing(true);
    
    // Get current Web Vitals metrics
    const currentMetrics = getMetrics();
    
    const formatMetrics: PerformanceMetric[] = [
      {
        name: 'LCP',
        value: currentMetrics.lcp || 0,
        threshold: 2500,
        unit: 'ms',
        status: (currentMetrics.lcp || 0) <= 2500 ? 'good' : (currentMetrics.lcp || 0) <= 4000 ? 'needs_improvement' : 'poor',
        description: 'Largest Contentful Paint - How quickly the main content loads'
      },
      {
        name: 'CLS',
        value: currentMetrics.cls || 0,
        threshold: 0.1,
        unit: '',
        status: (currentMetrics.cls || 0) <= 0.1 ? 'good' : (currentMetrics.cls || 0) <= 0.25 ? 'needs_improvement' : 'poor',
        description: 'Cumulative Layout Shift - Visual stability of the page'
      },
      {
        name: 'FID',
        value: currentMetrics.fid || 0,
        threshold: 100,
        unit: 'ms',
        status: (currentMetrics.fid || 0) <= 100 ? 'good' : (currentMetrics.fid || 0) <= 300 ? 'needs_improvement' : 'poor',
        description: 'First Input Delay - Responsiveness to first user interaction'
      },
      {
        name: 'INP',
        value: currentMetrics.inp || 0,
        threshold: 200,
        unit: 'ms',
        status: (currentMetrics.inp || 0) <= 200 ? 'good' : (currentMetrics.inp || 0) <= 500 ? 'needs_improvement' : 'poor',
        description: 'Interaction to Next Paint - Overall responsiveness'
      },
      {
        name: 'TTFB',
        value: currentMetrics.ttfb || 0,
        threshold: 800,
        unit: 'ms',
        status: (currentMetrics.ttfb || 0) <= 800 ? 'good' : (currentMetrics.ttfb || 0) <= 1800 ? 'needs_improvement' : 'poor',
        description: 'Time to First Byte - Server response time'
      }
    ];

    setMetrics(formatMetrics);
    
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  useEffect(() => {
    if (isVisible) {
      refreshMetrics();
    }
  }, [isVisible]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-100 text-green-800 border-green-200';
      case 'needs_improvement': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'poor': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return '✅';
      case 'needs_improvement': return '⚠️';
      case 'poor': return '❌';
      default: return '⏳';
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-w-[90vw] z-50">
      <Card className="shadow-lg border-2 border-construction-blue/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <BarChart3 className="mr-2 h-5 w-5 text-construction-blue" />
              Performance Monitor
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={refreshMetrics}
              disabled={isRefreshing}
              className="h-8"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <CardDescription>
            Core Web Vitals and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {metrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getStatusIcon(metric.status)}</span>
                  <div>
                    <p className="font-semibold text-sm">{metric.name}</p>
                    <p className="text-xs text-muted-foreground">{metric.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">
                    {metric.name === 'CLS' ? metric.value.toFixed(3) : Math.round(metric.value)}
                    {metric.unit}
                  </p>
                  <Badge className={`text-xs ${getStatusColor(metric.status)}`}>
                    {metric.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          
          {/* Real User Metrics Summary */}
          <div className="mt-4 pt-4 border-t">
            <h4 className="font-semibold text-sm mb-2 flex items-center">
              <Clock className="mr-1 h-4 w-4" />
              Page Load Summary
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Load Time</p>
                <p className="font-semibold">{Math.round(rumData.pageLoadTime || 0)}ms</p>
              </div>
              <div>
                <p className="text-muted-foreground">DOM Ready</p>
                <p className="font-semibold">{Math.round(rumData.domContentLoaded || 0)}ms</p>
              </div>
              <div>
                <p className="text-muted-foreground">Connection</p>
                <p className="font-semibold">{rumData.connectionType}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Device Memory</p>
                <p className="font-semibold">{rumData.deviceMemory}GB</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Performance insights component for developers
export const PerformanceInsights = () => {
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    const analyzePerformance = () => {
      const suggestions: string[] = [];
      
      // Analyze resource loading
      const resources = performance.getEntriesByType('resource');
      const largeResources = resources.filter(r => (r as any).transferSize > 500000); // >500KB
      
      if (largeResources.length > 0) {
        suggestions.push(`📦 ${largeResources.length} large resources detected. Consider compression or lazy loading.`);
      }

      // Check for render-blocking resources
      const renderBlockingCSS = resources.filter(r => 
        r.name.includes('.css') && (r as any).renderBlockingStatus === 'blocking'
      );
      
      if (renderBlockingCSS.length > 3) {
        suggestions.push(`🎨 ${renderBlockingCSS.length} render-blocking CSS files. Consider inlining critical CSS.`);
      }

      // Check for unused JavaScript
      if ('getEntriesByType' in performance) {
        const scripts = resources.filter(r => r.name.includes('.js'));
        if (scripts.length > 10) {
          suggestions.push(`📜 ${scripts.length} JavaScript files loaded. Consider code splitting.`);
        }
      }

      // Memory usage insights
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        const memUsageMB = memInfo.usedJSHeapSize / 1024 / 1024;
        
        if (memUsageMB > 50) {
          suggestions.push(`🧠 High memory usage: ${memUsageMB.toFixed(1)}MB. Monitor for memory leaks.`);
        }
      }

      setInsights(suggestions);
    };

    // Analyze after page is fully loaded
    if (document.readyState === 'complete') {
      setTimeout(analyzePerformance, 2000);
    } else {
      window.addEventListener('load', () => {
        setTimeout(analyzePerformance, 2000);
      });
    }
  }, []);

  if (insights.length === 0) {
    return null;
  }

  return (
    <Card className="mt-4 border-orange-200 bg-orange-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center text-orange-700">
          <TrendingUp className="mr-2 h-5 w-5" />
          Performance Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {insights.map((insight, index) => (
            <li key={index} className="text-sm text-orange-700 flex items-start">
              <AlertTriangle className="mr-2 h-4 w-4 mt-0.5 flex-shrink-0" />
              {insight}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default PerformanceDashboard;
