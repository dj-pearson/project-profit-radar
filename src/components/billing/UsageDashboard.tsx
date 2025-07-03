import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, AlertTriangle } from 'lucide-react';
import { useUsageTracking } from '@/hooks/useUsageTracking';
import { useAuth } from '@/contexts/AuthContext';

interface UsageLimits {
  api_calls: number;
  storage_gb: number;
  projects: number;
  users: number;
}

const TIER_LIMITS: Record<string, UsageLimits> = {
  starter: { api_calls: 1000, storage_gb: 5, projects: 3, users: 5 },
  professional: { api_calls: 10000, storage_gb: 50, projects: 25, users: 25 },
  enterprise: { api_calls: 100000, storage_gb: 500, projects: 100, users: 100 }
};

const UsageDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const { getCurrentPeriodUsage, loading } = useUsageTracking();
  const [usageData, setUsageData] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);

  const subscriptionTier = userProfile?.company_id ? 'professional' : 'starter'; // Simplified logic
  const limits = TIER_LIMITS[subscriptionTier];

  useEffect(() => {
    loadUsageData();
  }, []);

  const loadUsageData = async () => {
    setRefreshing(true);
    try {
      const metrics = ['api_calls', 'storage_gb', 'projects', 'users'];
      const usage: Record<string, number> = {};

      for (const metric of metrics) {
        const { totalUsage } = await getCurrentPeriodUsage(metric);
        usage[metric] = totalUsage;
      }

      setUsageData(usage);
    } catch (error) {
      console.error('Error loading usage data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getUsagePercentage = (metric: string) => {
    const usage = usageData[metric] || 0;
    const limit = limits[metric as keyof UsageLimits];
    return Math.min((usage / limit) * 100, 100);
  };

  const getUsageStatus = (percentage: number) => {
    if (percentage >= 90) return { color: 'destructive', icon: AlertTriangle };
    if (percentage >= 75) return { color: 'warning', icon: TrendingUp };
    return { color: 'default', icon: null };
  };

  const formatValue = (metric: string, value: number) => {
    switch (metric) {
      case 'storage_gb':
        return `${value.toFixed(2)} GB`;
      case 'api_calls':
        return value.toLocaleString();
      default:
        return value.toString();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Usage Dashboard</h3>
          <p className="text-sm text-muted-foreground">
            Current billing period usage for {subscriptionTier} plan
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadUsageData}
          disabled={refreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(limits).map(([metric, limit]) => {
          const usage = usageData[metric] || 0;
          const percentage = getUsagePercentage(metric);
          const status = getUsageStatus(percentage);
          const StatusIcon = status.icon;

          return (
            <Card key={metric}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium capitalize">
                    {metric.replace('_', ' ')}
                  </CardTitle>
                  {StatusIcon && (
                    <StatusIcon className="h-4 w-4 text-orange-500" />
                  )}
                </div>
                <CardDescription>
                  {formatValue(metric, usage)} of {formatValue(metric, limit)} used
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress value={percentage} className="h-2" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {percentage.toFixed(1)}% used
                    </span>
                    <Badge 
                      variant={percentage >= 90 ? "destructive" : percentage >= 75 ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {percentage >= 90 ? 'Critical' : percentage >= 75 ? 'Warning' : 'Normal'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {Object.values(usageData).some((usage, index) => 
        (usage / Object.values(limits)[index]) >= 0.9
      ) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-800">Usage Alert</CardTitle>
            </div>
            <CardDescription className="text-orange-700">
              You're approaching or have exceeded your usage limits. Consider upgrading your plan to avoid service interruptions.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};

export default UsageDashboard;