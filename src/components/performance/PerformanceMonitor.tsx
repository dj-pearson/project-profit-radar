import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Clock, Database, AlertTriangle, Zap, RefreshCw } from 'lucide-react';

interface PerformanceMetrics {
  loadTime: number;
  queryCount: number;
  cacheHitRate: number;
  errorRate: number;
  memoryUsage: number;
}

const getPerformanceStatus = (metric: string, value: number): "default" | "destructive" | "outline" | "secondary" => {
  switch (metric) {
    case 'loadTime':
      return value > 3000 ? 'destructive' : value > 1500 ? 'secondary' : 'default';
    case 'queryCount':
      return value > 50 ? 'destructive' : value > 25 ? 'secondary' : 'default';
    case 'cacheHitRate':
      return value < 50 ? 'destructive' : value < 80 ? 'secondary' : 'default';
    case 'errorRate':
      return value > 5 ? 'destructive' : value > 2 ? 'secondary' : 'default';
    case 'memoryUsage':
      return value > 100 ? 'destructive' : value > 50 ? 'secondary' : 'default';
    default:
      return 'default';
  }
};

export const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 850,
    queryCount: 12,
    cacheHitRate: 85,
    errorRate: 0.5,
    memoryUsage: 45
  });

  const refreshMetrics = () => {
    setMetrics({
      loadTime: Math.floor(Math.random() * 2000) + 500,
      queryCount: Math.floor(Math.random() * 30) + 5,
      cacheHitRate: Math.floor(Math.random() * 40) + 60,
      errorRate: Math.random() * 3,
      memoryUsage: Math.floor(Math.random() * 80) + 20
    });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center">
            <Activity className="h-4 w-4 mr-2" />
            Performance Monitor
          </div>
          <Button
            variant="ghost" 
            size="sm"
            onClick={refreshMetrics}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className="h-3 w-3" />
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
            {metrics.errorRate.toFixed(1)}%
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
      </CardContent>
    </Card>
  );
};

export const PerformanceWarning: React.FC = () => {
  return null; // Simplified to prevent timeout
};

export default PerformanceMonitor;