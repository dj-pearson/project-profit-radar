import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingUp, DollarSign, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/formatters';

interface BudgetAlert {
  id: string;
  project_id: string;
  category: string;
  alert_type: string;
  message: string;
  threshold_exceeded: number;
  created_at: string;
  project_name?: string;
}

export const CostVarianceAlerts: React.FC = () => {
  const { userProfile } = useAuth();
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (userProfile?.company_id) {
      loadAlerts();
      
      // Set up real-time subscription for new alerts
      const channel = supabase
        .channel('budget-alerts')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'budget_alerts'
        }, () => {
          loadAlerts();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userProfile]);

  const loadAlerts = async () => {
    try {
      // First get alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('budget_alerts')
        .select('*')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .order('created_at', { ascending: false });

      if (alertsError) throw alertsError;

      // Then get projects for those alerts
      if (alertsData && alertsData.length > 0) {
        const projectIds = [...new Set(alertsData.map(alert => alert.project_id))];
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('id, name, company_id')
          .in('id', projectIds)
          .eq('company_id', userProfile?.company_id);

        if (projectsError) throw projectsError;

        const projectsMap = new Map(projectsData?.map(p => [p.id, p.name]) || []);
        
        const formattedAlerts = alertsData.map(alert => ({
          ...alert,
          project_name: projectsMap.get(alert.project_id) || 'Unknown Project'
        }));

        setAlerts(formattedAlerts);
      } else {
        setAlerts([]);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  const getAlertVariant = (alertType: string) => {
    switch (alertType) {
      case 'critical':
        return 'destructive';
      case 'overbudget':
        return 'destructive';
      case 'warning':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      case 'overbudget':
        return <TrendingUp className="h-4 w-4" />;
      case 'warning':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id));

  if (loading) {
    return <div className="flex justify-center p-4">Loading alerts...</div>;
  }

  if (visibleAlerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Cost Variance Alerts
          </CardTitle>
          <CardDescription>
            No budget alerts at this time. All projects are within acceptable variance thresholds.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Cost Variance Alerts
          <Badge variant="secondary">{visibleAlerts.length}</Badge>
        </CardTitle>
        <CardDescription>
          Active budget variance alerts requiring attention
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {visibleAlerts.map((alert) => (
            <Alert 
              key={alert.id} 
              variant={getAlertVariant(alert.alert_type) as any}
              className="relative"
            >
              <div className="flex items-start gap-3">
                {getAlertIcon(alert.alert_type)}
                <div className="flex-1">
                  <AlertTitle className="flex items-center justify-between">
                    <span>{alert.project_name} - {alert.category.toUpperCase()}</span>
                    <Badge variant="outline" className="ml-2">
                      {alert.threshold_exceeded.toFixed(1)}% over
                    </Badge>
                  </AlertTitle>
                  <AlertDescription className="mt-2">
                    {alert.message}
                  </AlertDescription>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {new Date(alert.created_at).toLocaleDateString()} at {new Date(alert.created_at).toLocaleTimeString()}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissAlert(alert.id)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Alert>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};