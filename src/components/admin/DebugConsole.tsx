/**
 * Debug Console
 * Comprehensive debugging tool for admin impersonation sessions
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bug,
  Activity,
  Database,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  RefreshCw,
  Download,
  XCircle,
} from 'lucide-react';

interface DebugConsoleProps {
  userId: string;
  companyId?: string;
  isFloating?: boolean;
}

interface ErrorLog {
  id: string;
  error_type: string;
  error_message: string;
  stack_trace?: string;
  url?: string;
  severity: string;
  timestamp: string;
  resolved: boolean;
}

interface PerformanceMetric {
  id: string;
  metric_type: string;
  metric_name: string;
  duration_ms: number;
  details?: any;
  timestamp: string;
}

export const DebugConsole: React.FC<DebugConsoleProps> = ({
  userId,
  companyId,
  isFloating = true,
}) => {
  const [activeTab, setActiveTab] = useState('errors');
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [timeRange, setTimeRange] = useState('1h');

  useEffect(() => {
    loadData();

    // Auto-refresh every 10 seconds if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadData, 10000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [userId, timeRange, autoRefresh, activeTab]);

  const loadData = async () => {
    switch (activeTab) {
      case 'errors':
        await loadErrors();
        break;
      case 'performance':
        await loadPerformanceMetrics();
        break;
    }
  };

  const loadErrors = async () => {
    try {
      setLoading(true);

      const hoursAgo = getHoursFromTimeRange(timeRange);
      const since = new Date();
      since.setHours(since.getHours() - hoursAgo);

      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', since.toISOString())
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;

      setErrors((data || []) as ErrorLog[]);
    } catch (error) {
      console.error('Error loading errors:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPerformanceMetrics = async () => {
    try {
      setLoading(true);

      const hoursAgo = getHoursFromTimeRange(timeRange);
      const since = new Date();
      since.setHours(since.getHours() - hoursAgo);

      const { data, error } = await supabase
        .from('performance_metrics')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', since.toISOString())
        .order('duration_ms', { ascending: false })
        .limit(50);

      if (error) throw error;

      setMetrics((data || []) as PerformanceMetric[]);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHoursFromTimeRange = (range: string): number => {
    switch (range) {
      case '15m':
        return 0.25;
      case '1h':
        return 1;
      case '6h':
        return 6;
      case '24h':
        return 24;
      default:
        return 1;
    }
  };

  const markErrorResolved = async (errorId: string) => {
    try {
      const { error } = await supabase
        .from('error_logs')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', errorId);

      if (error) throw error;

      await loadErrors();
    } catch (error) {
      console.error('Error marking as resolved:', error);
    }
  };

  const exportData = () => {
    const dataToExport = activeTab === 'errors' ? errors : metrics;
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-${activeTab}-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleString();
  };

  const consoleClasses = isFloating
    ? 'fixed bottom-4 right-4 w-96 max-h-[600px] shadow-2xl z-50 overflow-hidden'
    : 'w-full';

  return (
    <Card className={consoleClasses}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center">
            <Bug className="h-4 w-4 mr-2" />
            Debug Console
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15m">Last 15m</SelectItem>
                <SelectItem value="1h">Last 1h</SelectItem>
                <SelectItem value="6h">Last 6h</SelectItem>
                <SelectItem value="24h">Last 24h</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="h-8"
            >
              <RefreshCw className={`h-3 w-3 ${autoRefresh ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" variant="ghost" onClick={exportData} className="h-8">
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full rounded-none border-b">
            <TabsTrigger value="errors" className="flex-1">
              <AlertCircle className="h-3 w-3 mr-1" />
              Errors ({errors.filter((e) => !e.resolved).length})
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex-1">
              <BarChart3 className="h-3 w-3 mr-1" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex-1">
              <Zap className="h-3 w-3 mr-1" />
              Integrations
            </TabsTrigger>
          </TabsList>

          {/* Errors Tab */}
          <TabsContent value="errors" className="m-0 max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : errors.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p className="text-sm">No errors detected</p>
              </div>
            ) : (
              <div className="divide-y">
                {errors.map((error) => (
                  <div
                    key={error.id}
                    className={`p-3 ${error.resolved ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant={getSeverityColor(error.severity)} className="text-xs">
                          {error.severity}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(error.timestamp)}
                        </span>
                      </div>
                      {!error.resolved && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markErrorResolved(error.id)}
                          className="h-6 text-xs"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Mark Fixed
                        </Button>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium">{error.error_type}</p>
                      <p className="text-xs text-muted-foreground">{error.error_message}</p>
                      {error.url && (
                        <p className="text-xs text-muted-foreground truncate">
                          URL: {error.url}
                        </p>
                      )}
                      {error.stack_trace && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-primary">
                            View Stack Trace
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-[10px] overflow-x-auto">
                            {error.stack_trace}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="m-0 max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : metrics.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                <p className="text-sm">No performance data</p>
              </div>
            ) : (
              <div className="divide-y">
                {metrics.map((metric) => (
                  <div key={metric.id} className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {metric.metric_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(metric.timestamp)}
                        </span>
                      </div>
                      <Badge
                        variant={metric.duration_ms > 1000 ? 'destructive' : 'default'}
                        className="text-xs"
                      >
                        {metric.duration_ms}ms
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium">{metric.metric_name}</p>
                      {metric.details && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-primary">
                            View Details
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-[10px] overflow-x-auto">
                            {JSON.stringify(metric.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    {metric.duration_ms > 1000 && (
                      <div className="mt-2 flex items-center text-xs text-orange-600">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>Slow query detected</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="m-0 p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4" />
                  <span className="text-sm">QuickBooks</span>
                </div>
                <Badge className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4" />
                  <span className="text-sm">Stripe</span>
                </div>
                <Badge className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4" />
                  <span className="text-sm">Google Calendar</span>
                </div>
                <Badge variant="outline">
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Configured
                </Badge>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
