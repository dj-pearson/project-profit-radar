import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Activity, Bell, Settings, Search } from 'lucide-react';

interface SystemMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  threshold: { warning: number; critical: number };
  history: { timestamp: string; value: number }[];
}

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
  source: string;
}

interface UptimeRecord {
  date: string;
  uptime: number;
  incidents: number;
  avgResponseTime: number;
}

const MonitoringDashboard = () => {
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [uptimeData, setUptimeData] = useState<UptimeRecord[]>([]);
  const [alertSettings, setAlertSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    slackIntegration: true,
    uptimeThreshold: 99.9
  });

  const mockMetrics: SystemMetric[] = [
    {
      id: 'cpu',
      name: 'CPU Usage',
      value: 67.5,
      unit: '%',
      status: 'warning',
      threshold: { warning: 70, critical: 90 },
      history: Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
        value: Math.random() * 80 + 10
      }))
    },
    {
      id: 'memory',
      name: 'Memory Usage',
      value: 82.3,
      unit: '%',
      status: 'warning',
      threshold: { warning: 80, critical: 95 },
      history: Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
        value: Math.random() * 90 + 5
      }))
    },
    {
      id: 'disk',
      name: 'Disk Usage',
      value: 45.8,
      unit: '%',
      status: 'healthy',
      threshold: { warning: 80, critical: 95 },
      history: Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
        value: Math.random() * 60 + 20
      }))
    },
    {
      id: 'response_time',
      name: 'Response Time',
      value: 245,
      unit: 'ms',
      status: 'healthy',
      threshold: { warning: 500, critical: 1000 },
      history: Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
        value: Math.random() * 400 + 100
      }))
    },
    {
      id: 'error_rate',
      name: 'Error Rate',
      value: 0.8,
      unit: '%',
      status: 'healthy',
      threshold: { warning: 2, critical: 5 },
      history: Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
        value: Math.random() * 3
      }))
    },
    {
      id: 'active_users',
      name: 'Active Users',
      value: 1247,
      unit: 'users',
      status: 'healthy',
      threshold: { warning: 2000, critical: 3000 },
      history: Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
        value: Math.random() * 1500 + 500
      }))
    }
  ];

  const mockAlerts: Alert[] = [
    {
      id: '1',
      title: 'High Memory Usage',
      message: 'Memory usage has exceeded 80% threshold on production server',
      severity: 'warning',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      status: 'active',
      source: 'System Monitor'
    },
    {
      id: '2',
      title: 'Database Connection Pool Full',
      message: 'All database connections are in use, new requests may be delayed',
      severity: 'critical',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      status: 'acknowledged',
      source: 'Database Monitor'
    },
    {
      id: '3',
      title: 'Backup Completed Successfully',
      message: 'Daily backup completed successfully at 02:00 AM',
      severity: 'info',
      timestamp: new Date(Date.now() - 21600000).toISOString(),
      status: 'resolved',
      source: 'Backup Service'
    }
  ];

  const mockUptimeData: UptimeRecord[] = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
    uptime: Math.random() * 1 + 99,
    incidents: Math.floor(Math.random() * 3),
    avgResponseTime: Math.random() * 200 + 150
  }));

  useEffect(() => {
    setMetrics(mockMetrics);
    setAlerts(mockAlerts);
    setUptimeData(mockUptimeData);

    // Simulate real-time updates
    const interval = setInterval(() => {
      setMetrics(prevMetrics => 
        prevMetrics.map(metric => ({
          ...metric,
          value: Math.max(0, metric.value + (Math.random() - 0.5) * 10),
          status: getMetricStatus(metric.value, metric.threshold)
        }))
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getMetricStatus = (value: number, threshold: { warning: number; critical: number }): 'healthy' | 'warning' | 'critical' => {
    if (value >= threshold.critical) return 'critical';
    if (value >= threshold.warning) return 'warning';
    return 'healthy';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      healthy: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      critical: 'bg-red-100 text-red-800',
      active: 'bg-red-100 text-red-800',
      acknowledged: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      info: 'bg-blue-100 text-blue-800',
      error: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prevAlerts => 
      prevAlerts.map(alert => 
        alert.id === alertId 
          ? { ...alert, status: 'acknowledged' as const }
          : alert
      )
    );
    toast({
      title: "Alert Acknowledged",
      description: "Alert has been acknowledged and marked for review."
    });
  };

  const resolveAlert = (alertId: string) => {
    setAlerts(prevAlerts => 
      prevAlerts.map(alert => 
        alert.id === alertId 
          ? { ...alert, status: 'resolved' as const }
          : alert
      )
    );
    toast({
      title: "Alert Resolved",
      description: "Alert has been marked as resolved."
    });
  };

  const updateAlertSettings = (key: string, value: any) => {
    setAlertSettings(prev => ({ ...prev, [key]: value }));
    toast({
      title: "Settings Updated",
      description: "Alert settings have been saved."
    });
  };

  const currentUptime = uptimeData.length > 0 
    ? uptimeData.reduce((sum, record) => sum + record.uptime, 0) / uptimeData.length 
    : 99.9;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Activity className="h-5 w-5" />
        <h2 className="text-2xl font-semibold">System Monitoring & Alerts</h2>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* System Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {currentUptime.toFixed(2)}%
                </div>
                <p className="text-sm text-muted-foreground">30-Day Uptime</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {alerts.filter(a => a.status === 'active').length}
                </div>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {metrics.find(m => m.id === 'response_time')?.value.toFixed(0)}ms
                </div>
                <p className="text-sm text-muted-foreground">Avg Response Time</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {metrics.find(m => m.id === 'active_users')?.value.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Active Users</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.slice(0, 6).map((metric) => (
              <Card key={metric.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{metric.name}</CardTitle>
                    <Badge className={getStatusColor(metric.status)}>
                      {metric.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">
                    {metric.value.toFixed(1)}{metric.unit}
                  </div>
                  <Progress 
                    value={Math.min(100, (metric.value / metric.threshold.critical) * 100)} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Warning: {metric.threshold.warning}{metric.unit}</span>
                    <span>Critical: {metric.threshold.critical}{metric.unit}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {/* Detailed Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {metrics.map((metric) => (
              <Card key={metric.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{metric.name}</CardTitle>
                    <Badge className={getStatusColor(metric.status)}>
                      {metric.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    Current: {metric.value.toFixed(2)}{metric.unit} | 
                    Warning: {metric.threshold.warning}{metric.unit} | 
                    Critical: {metric.threshold.critical}{metric.unit}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Progress 
                      value={Math.min(100, (metric.value / metric.threshold.critical) * 100)} 
                      className="h-3"
                    />
                    <div className="text-sm text-muted-foreground">
                      24-hour trend: {metric.history.length} data points
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {/* Active Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-4 w-4" />
                <span>System Alerts</span>
              </CardTitle>
              <CardDescription>
                Monitor and manage system alerts and notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No alerts at this time. System is operating normally.
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div key={alert.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium">{alert.title}</h4>
                            <Badge className={getStatusColor(alert.severity)}>
                              {alert.severity}
                            </Badge>
                            <Badge className={getStatusColor(alert.status)}>
                              {alert.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            {alert.message}
                          </p>
                          <div className="text-xs text-muted-foreground">
                            {alert.source} • {new Date(alert.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          {alert.status === 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => acknowledgeAlert(alert.id)}
                            >
                              Acknowledge
                            </Button>
                          )}
                          {alert.status !== 'resolved' && (
                            <Button
                              size="sm"
                              onClick={() => resolveAlert(alert.id)}
                            >
                              Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {/* Alert Configuration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Configure how and when you receive alerts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <Switch
                    id="email-notifications"
                    checked={alertSettings.emailNotifications}
                    onCheckedChange={(value) => updateAlertSettings('emailNotifications', value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="sms-notifications">SMS Notifications</Label>
                  <Switch
                    id="sms-notifications"
                    checked={alertSettings.smsNotifications}
                    onCheckedChange={(value) => updateAlertSettings('smsNotifications', value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="slack-integration">Slack Integration</Label>
                  <Switch
                    id="slack-integration"
                    checked={alertSettings.slackIntegration}
                    onCheckedChange={(value) => updateAlertSettings('slackIntegration', value)}
                  />
                </div>
                <div>
                  <Label htmlFor="uptime-threshold">Uptime Threshold (%)</Label>
                  <Input
                    id="uptime-threshold"
                    type="number"
                    value={alertSettings.uptimeThreshold}
                    onChange={(e) => updateAlertSettings('uptimeThreshold', parseFloat(e.target.value))}
                    step="0.1"
                    min="90"
                    max="100"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monitoring Endpoints</CardTitle>
                <CardDescription>
                  External services and integrations for monitoring
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-muted rounded">
                    <span className="font-medium">Application Health</span>
                    <Badge className="bg-green-100 text-green-800">Online</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded">
                    <span className="font-medium">Database Status</span>
                    <Badge className="bg-green-100 text-green-800">Online</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded">
                    <span className="font-medium">API Endpoints</span>
                    <Badge className="bg-green-100 text-green-800">Online</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded">
                    <span className="font-medium">CDN Status</span>
                    <Badge className="bg-green-100 text-green-800">Online</Badge>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  Configure Endpoints
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MonitoringDashboard;