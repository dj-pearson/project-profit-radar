import { useEffect, useState } from 'react';
import { useWebVitals } from '@/hooks/useWebVitals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Zap, Eye, MousePointer, Clock, Gauge } from 'lucide-react';

interface Metrics {
  lcp?: number;
  cls?: number;
  inp?: number;
  fcp?: number;
  ttfb?: number;
}

interface MetricRatings {
  lcp?: 'good' | 'needs-improvement' | 'poor';
  cls?: 'good' | 'needs-improvement' | 'poor';
  inp?: 'good' | 'needs-improvement' | 'poor';
  fcp?: 'good' | 'needs-improvement' | 'poor';
  ttfb?: 'good' | 'needs-improvement' | 'poor';
}

export const RealTimePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<Metrics>({});
  const [ratings, setRatings] = useState<MetricRatings>({});

  useWebVitals({
    enableReporting: true,
    enableLogging: true,
    reportToAnalytics: (metric) => {
      setMetrics(prev => ({ ...prev, [metric.name.toLowerCase()]: metric.value }));
      setRatings(prev => ({ ...prev, [metric.name.toLowerCase()]: metric.rating }));
    }
  });

  const getRatingVariant = (rating?: 'good' | 'needs-improvement' | 'poor') => {
    if (!rating) return 'outline';
    if (rating === 'good') return 'default';
    if (rating === 'needs-improvement') return 'secondary';
    return 'destructive';
  };

  const formatValue = (value?: number, unit: string = 'ms') => {
    if (value === undefined) return '—';
    return `${value.toFixed(0)}${unit}`;
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Real-Time Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        {/* LCP - Largest Contentful Paint */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">LCP</div>
              <div className="text-xs text-muted-foreground">Largest Paint</div>
            </div>
          </div>
          <Badge variant={getRatingVariant(ratings.lcp)}>
            {formatValue(metrics.lcp)}
          </Badge>
        </div>

        {/* FCP - First Contentful Paint */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">FCP</div>
              <div className="text-xs text-muted-foreground">First Paint</div>
            </div>
          </div>
          <Badge variant={getRatingVariant(ratings.fcp)}>
            {formatValue(metrics.fcp)}
          </Badge>
        </div>

        {/* CLS - Cumulative Layout Shift */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">CLS</div>
              <div className="text-xs text-muted-foreground">Layout Shift</div>
            </div>
          </div>
          <Badge variant={getRatingVariant(ratings.cls)}>
            {formatValue(metrics.cls, '')}
          </Badge>
        </div>

        {/* INP - Interaction to Next Paint */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">INP</div>
              <div className="text-xs text-muted-foreground">Interaction</div>
            </div>
          </div>
          <Badge variant={getRatingVariant(ratings.inp)}>
            {formatValue(metrics.inp)}
          </Badge>
        </div>

        {/* TTFB - Time to First Byte */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">TTFB</div>
              <div className="text-xs text-muted-foreground">First Byte</div>
            </div>
          </div>
          <Badge variant={getRatingVariant(ratings.ttfb)}>
            {formatValue(metrics.ttfb)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
