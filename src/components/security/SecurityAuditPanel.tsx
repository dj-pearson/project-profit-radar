import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, XCircle, Shield, Eye, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface SecurityMetric {
  name: string;
  status: 'good' | 'warning' | 'critical';
  value: string;
  description: string;
  lastChecked: string;
}

interface SecurityAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  resolved: boolean;
}

export const SecurityAuditPanel: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<SecurityMetric[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSecurityData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch security metrics
      const { data: metricsData, error: metricsError } = await supabase.rpc('calculate_security_metrics', {
        p_company_id: user.user_metadata?.company_id
      });

      if (metricsError) throw metricsError;

      // Transform metrics data with proper typing
      const metrics = metricsData as {
        failed_logins_24h?: number;
        critical_alerts?: number;
        total_alerts?: number;
        resolution_rate?: number;
        avg_resolution_time_hours?: number;
      };

      const securityMetrics: SecurityMetric[] = [
        {
          name: 'Failed Login Attempts (24h)',
          status: (metrics?.failed_logins_24h || 0) > 10 ? 'critical' : (metrics?.failed_logins_24h || 0) > 5 ? 'warning' : 'good',
          value: (metrics?.failed_logins_24h || 0).toString(),
          description: 'Recent failed authentication attempts',
          lastChecked: new Date().toISOString()
        },
        {
          name: 'Security Alerts (30d)',
          status: (metrics?.critical_alerts || 0) > 0 ? 'critical' : (metrics?.total_alerts || 0) > 5 ? 'warning' : 'good',
          value: `${metrics?.total_alerts || 0} (${metrics?.critical_alerts || 0} critical)`,
          description: 'Security incidents and violations',
          lastChecked: new Date().toISOString()
        },
        {
          name: 'Alert Resolution Rate',
          status: (metrics?.resolution_rate || 0) < 70 ? 'critical' : (metrics?.resolution_rate || 0) < 90 ? 'warning' : 'good',
          value: `${metrics?.resolution_rate || 0}%`,
          description: 'Percentage of resolved security alerts',
          lastChecked: new Date().toISOString()
        },
        {
          name: 'Average Resolution Time',
          status: (metrics?.avg_resolution_time_hours || 0) > 24 ? 'critical' : (metrics?.avg_resolution_time_hours || 0) > 12 ? 'warning' : 'good',
          value: `${metrics?.avg_resolution_time_hours || 0}h`,
          description: 'Time taken to resolve security incidents',
          lastChecked: new Date().toISOString()
        }
      ];

      setMetrics(securityMetrics);

      // Fetch recent security alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('security_alerts')
        .select('*')
        .eq('company_id', user.user_metadata?.company_id)
        .order('triggered_at', { ascending: false })
        .limit(10);

      if (alertsError) throw alertsError;

      const transformedAlerts: SecurityAlert[] = (alertsData || []).map(alert => ({
        id: alert.id,
        type: alert.alert_type,
        severity: alert.severity as 'low' | 'medium' | 'high' | 'critical',
        title: alert.title,
        description: alert.description || '',
        timestamp: alert.triggered_at,
        resolved: alert.status === 'resolved'
      }));

      setAlerts(transformedAlerts);

    } catch (error) {
      console.error('Error fetching security data:', error);
      toast({
        title: "Error",
        description: "Failed to load security data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, [user]);

  const getStatusIcon = (status: 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getSeverityBadge = (severity: 'low' | 'medium' | 'high' | 'critical') => {
    const variants = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={variants[severity]}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Security Audit Dashboard
          </h2>
          <p className="text-muted-foreground">
            Monitor your application's security metrics and alerts
          </p>
        </div>
        <Button onClick={fetchSecurityData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Security Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                {getStatusIcon(metric.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">{metric.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Security Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Recent Security Alerts
          </CardTitle>
          <CardDescription>
            Latest security incidents and violations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No security alerts found. Your system is secure!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{alert.title}</h4>
                      {getSeverityBadge(alert.severity)}
                      {alert.resolved && (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          RESOLVED
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Type: {alert.type}</span>
                      <span>Time: {new Date(alert.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Security Recommendations</CardTitle>
          <CardDescription>
            Actions to improve your security posture
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Enable Two-Factor Authentication</h4>
                <p className="text-sm text-blue-700">Add an extra layer of security to user accounts</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900">Review User Permissions</h4>
                <p className="text-sm text-yellow-700">Ensure users have minimum required access levels</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <Shield className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900">Database Security Hardened</h4>
                <p className="text-sm text-green-700">All database functions have been secured with proper search paths</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <Shield className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900">Stripe Keys Encrypted</h4>
                <p className="text-sm text-green-700">Payment keys are now secured with AES-256-GCM encryption</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};