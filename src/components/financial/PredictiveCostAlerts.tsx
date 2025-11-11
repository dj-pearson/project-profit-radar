import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Users,
  PackageSearch,
  CheckCircle,
  XCircle,
  Info,
  Bell,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CostAlert {
  id: string;
  project_id: string;
  project_name: string;
  alert_type: 'labor_overrun' | 'material_overrun' | 'overall_budget' | 'efficiency_drop' | 'scope_creep' | 'vendor_variance';
  severity: 'info' | 'warning' | 'critical';
  detected_date: string;
  predicted_impact: number;
  confidence_level: number;
  days_to_impact: number;
  current_variance: number;
  projected_final_variance: number;
  status: 'active' | 'resolved' | 'dismissed';
  recommended_actions: string[];
  context: {
    budget: number;
    actual_to_date: number;
    percent_complete: number;
    comparable_avg: number;
  };
}

interface AlertStats {
  total_active: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
  total_predicted_impact: number;
  alerts_prevented: number;
  avg_detection_lead_time: number;
  prediction_accuracy: number;
}

export const PredictiveCostAlerts = () => {
  const [alerts, setAlerts] = useState<CostAlert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<CostAlert | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    loadAlerts();

    // Set up real-time subscription for new alerts
    const subscription = supabase
      .channel('cost_alerts')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'cost_alerts' },
        () => {
          loadAlerts();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadAlerts = async () => {
    try {
      // In production, this would call your edge function
      // For now, simulating with realistic predictive alert data
      const mockAlerts: CostAlert[] = [
        {
          id: '1',
          project_id: 'proj-001',
          project_name: 'Downtown Office Renovation',
          alert_type: 'labor_overrun',
          severity: 'critical',
          detected_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          predicted_impact: 8200,
          confidence_level: 87,
          days_to_impact: 18,
          current_variance: 12,
          projected_final_variance: 18,
          status: 'active',
          recommended_actions: [
            'Review crew time logs for inefficiencies or waiting time',
            'Interview superintendent about site access or material delays',
            'Check for scope changes without change orders',
            'Consider crew efficiency improvement or schedule acceleration'
          ],
          context: {
            budget: 125000,
            actual_to_date: 73500,
            percent_complete: 52,
            comparable_avg: 65800
          }
        },
        {
          id: '2',
          project_id: 'proj-002',
          project_name: 'Residential Kitchen Remodel',
          alert_type: 'material_overrun',
          severity: 'warning',
          detected_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          predicted_impact: 2400,
          confidence_level: 82,
          days_to_impact: 12,
          current_variance: 8,
          projected_final_variance: 15,
          status: 'active',
          recommended_actions: [
            'Compare material costs to original quote',
            'Check for price increases from suppliers',
            'Review material waste/damage logs',
            'Issue change order if scope expanded'
          ],
          context: {
            budget: 42000,
            actual_to_date: 28500,
            percent_complete: 63,
            comparable_avg: 26250
          }
        },
        {
          id: '3',
          project_id: 'proj-003',
          project_name: 'Warehouse Expansion',
          alert_type: 'efficiency_drop',
          severity: 'warning',
          detected_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          predicted_impact: 5600,
          confidence_level: 79,
          days_to_impact: 25,
          current_variance: 15,
          projected_final_variance: 12,
          status: 'active',
          recommended_actions: [
            'Crew efficiency 15% below company average',
            'Review site logistics and access issues',
            'Check for equipment availability problems',
            'Consider supervisor intervention or crew adjustment'
          ],
          context: {
            budget: 285000,
            actual_to_date: 142000,
            percent_complete: 45,
            comparable_avg: 128250
          }
        },
        {
          id: '4',
          project_id: 'proj-004',
          project_name: 'Medical Office Build-Out',
          alert_type: 'scope_creep',
          severity: 'info',
          detected_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          predicted_impact: 1200,
          confidence_level: 91,
          days_to_impact: 8,
          current_variance: 5,
          projected_final_variance: 8,
          status: 'active',
          recommended_actions: [
            'Electrical scope 22% above comparable projects',
            'Review for additional outlets or fixtures not in contract',
            'Document extra work and issue change order',
            'Implement stricter change approval process'
          ],
          context: {
            budget: 68000,
            actual_to_date: 42500,
            percent_complete: 58,
            comparable_avg: 39440
          }
        }
      ];

      const activeAlerts = mockAlerts.filter(a => a.status === 'active');
      const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length;
      const warningCount = activeAlerts.filter(a => a.severity === 'warning').length;
      const infoCount = activeAlerts.filter(a => a.severity === 'info').length;
      const totalImpact = activeAlerts.reduce((sum, a) => sum + a.predicted_impact, 0);

      setAlerts(mockAlerts);
      setStats({
        total_active: activeAlerts.length,
        critical_count: criticalCount,
        warning_count: warningCount,
        info_count: infoCount,
        total_predicted_impact: totalImpact,
        alerts_prevented: 12,
        avg_detection_lead_time: 21,
        prediction_accuracy: 89
      });
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-5 w-5" />;
      case 'warning': return <AlertTriangle className="h-5 w-5" />;
      case 'info': return <Info className="h-5 w-5" />;
      default: return <Info className="h-5 w-5" />;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'labor_overrun': return 'Labor Cost Overrun';
      case 'material_overrun': return 'Material Cost Overrun';
      case 'overall_budget': return 'Overall Budget Risk';
      case 'efficiency_drop': return 'Crew Efficiency Drop';
      case 'scope_creep': return 'Scope Creep Detected';
      case 'vendor_variance': return 'Vendor Price Variance';
      default: return 'Cost Alert';
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'labor_overrun': return <Users className="h-4 w-4" />;
      case 'material_overrun': return <PackageSearch className="h-4 w-4" />;
      case 'overall_budget': return <DollarSign className="h-4 w-4" />;
      case 'efficiency_drop': return <TrendingDown className="h-4 w-4" />;
      case 'scope_creep': return <TrendingUp className="h-4 w-4" />;
      case 'vendor_variance': return <DollarSign className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const handleResolveAlert = (alertId: string) => {
    // In production, would call API to mark alert as resolved
    setAlerts(alerts.map(a =>
      a.id === alertId ? { ...a, status: 'resolved' as const } : a
    ));
    setSelectedAlert(null);
  };

  const handleDismissAlert = (alertId: string) => {
    // In production, would call API to dismiss alert
    setAlerts(alerts.map(a =>
      a.id === alertId ? { ...a, status: 'dismissed' as const } : a
    ));
    setSelectedAlert(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Bell className="h-8 w-8 animate-pulse text-construction-orange" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-construction-dark flex items-center gap-2">
            <Bell className="h-6 w-6 text-construction-orange" />
            Predictive Cost Alerts
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Catch cost overruns 2-3 weeks before they happen • {stats?.prediction_accuracy}% prediction accuracy
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Alert Settings
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-2 border-red-200 bg-red-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Critical Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600 flex items-center gap-2">
                {stats.critical_count}
                <AlertTriangle className="h-6 w-6" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Require immediate action
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Predicted Impact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-construction-orange">
                {formatCurrency(stats.total_predicted_impact)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                If trends continue unchecked
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Early Detection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {stats.avg_detection_lead_time} days
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Average warning before impact
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Overruns Prevented
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-construction-dark flex items-center gap-2">
                {stats.alerts_prevented}
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                This quarter through early action
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts List */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">
            Active Alerts ({alerts.filter(a => a.status === 'active').length})
          </TabsTrigger>
          <TabsTrigger value="critical">
            Critical ({alerts.filter(a => a.severity === 'critical' && a.status === 'active').length})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resolved ({alerts.filter(a => a.status === 'resolved').length})
          </TabsTrigger>
        </TabsList>

        {['active', 'critical', 'resolved'].map(tab => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            {alerts
              .filter(alert => {
                if (tab === 'active') return alert.status === 'active';
                if (tab === 'critical') return alert.severity === 'critical' && alert.status === 'active';
                if (tab === 'resolved') return alert.status === 'resolved';
                return false;
              })
              .map((alert) => (
                <Card
                  key={alert.id}
                  className={`hover:shadow-lg transition-shadow cursor-pointer ${
                    alert.severity === 'critical' ? 'border-2 border-red-300' : ''
                  }`}
                  onClick={() => setSelectedAlert(alert)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getSeverityColor(alert.severity)}>
                            {getSeverityIcon(alert.severity)}
                            <span className="ml-1 capitalize">{alert.severity}</span>
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1">
                            {getAlertTypeIcon(alert.alert_type)}
                            {getAlertTypeLabel(alert.alert_type)}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{alert.project_name}</CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Detected {formatDate(alert.detected_date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Impact in {alert.days_to_impact} days
                          </span>
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-red-600">
                            {formatCurrency(alert.predicted_impact)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Predicted impact
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {alert.confidence_level}% confidence
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Current Status */}
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Budget</p>
                        <p className="font-semibold">{formatCurrency(alert.context.budget)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Spent</p>
                        <p className="font-semibold">{formatCurrency(alert.context.actual_to_date)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Complete</p>
                        <p className="font-semibold">{alert.context.percent_complete}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Variance</p>
                        <p className="font-semibold text-red-600">+{alert.current_variance}%</p>
                      </div>
                    </div>

                    {/* Variance Progression */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Current variance → Projected final</span>
                        <span className="font-medium text-red-600">
                          {alert.current_variance}% → {alert.projected_final_variance}%
                        </span>
                      </div>
                      <div className="relative pt-1">
                        <div className="flex mb-2 items-center justify-between">
                          <div className="text-xs text-muted-foreground">Budget</div>
                          <div className="text-xs text-red-600 font-semibold">
                            Trending {alert.projected_final_variance}% over
                          </div>
                        </div>
                        <Progress
                          value={Math.min(alert.context.percent_complete + alert.projected_final_variance, 100)}
                          className="h-3"
                        />
                      </div>
                    </div>

                    {/* Recommended Actions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-blue-900 mb-2">
                            Recommended Actions:
                          </p>
                          <ul className="space-y-1 text-sm text-blue-800">
                            {alert.recommended_actions.map((action, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-blue-600">•</span>
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {alert.status === 'active' && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResolveAlert(alert.id);
                          }}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Resolved
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismissAlert(alert.id);
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

            {alerts.filter(alert => {
              if (tab === 'active') return alert.status === 'active';
              if (tab === 'critical') return alert.severity === 'critical' && alert.status === 'active';
              if (tab === 'resolved') return alert.status === 'resolved';
              return false;
            }).length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {tab === 'resolved' ? 'No Resolved Alerts Yet' : 'All Clear!'}
                  </h3>
                  <p className="text-muted-foreground">
                    {tab === 'resolved'
                      ? 'Resolved alerts will appear here for your records.'
                      : 'No active cost alerts at this time. All projects tracking on budget.'
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Alert Accuracy Banner */}
      <Card className="bg-gradient-to-r from-construction-orange/10 to-construction-blue/10 border-construction-orange/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-construction-orange/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-construction-orange" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {stats?.prediction_accuracy}% Prediction Accuracy
                </h3>
                <p className="text-sm text-muted-foreground">
                  Our predictive models have caught {stats?.alerts_prevented} cost overruns this quarter,
                  saving an average of {stats?.avg_detection_lead_time} days lead time per alert.
                </p>
              </div>
            </div>
            <Button variant="outline">
              View Accuracy Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PredictiveCostAlerts;
