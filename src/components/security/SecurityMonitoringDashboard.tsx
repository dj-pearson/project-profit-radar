import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, Shield, Activity, Bell, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { AdminOnly } from '@/components/PermissionGate';

interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  triggered_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  event_data: any;
}

interface MonitoringRule {
  id: string;
  rule_name: string;
  rule_type: string;
  severity: string;
  is_active: boolean;
  threshold_value?: number;
  threshold_period_minutes?: number;
  recipients: string[];
}

interface SecurityMetrics {
  total_alerts: number;
  critical_alerts: number;
  resolved_alerts: number;
  resolution_rate: number;
  avg_resolution_time_hours: number;
  failed_logins_24h: number;
}

export const SecurityMonitoringDashboard = () => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [rules, setRules] = useState<MonitoringRule[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  const [isCreateRuleOpen, setIsCreateRuleOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [newRule, setNewRule] = useState({
    rule_name: '',
    rule_type: 'failed_login',
    severity: 'medium',
    description: '',
    threshold_value: 5,
    threshold_period_minutes: 60,
    recipients: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadSecurityAlerts(),
        loadMonitoringRules(),
        loadSecurityMetrics()
      ]);
    } catch (error) {
      console.error('Error loading security monitoring data:', error);
      toast({
        title: "Error",
        description: "Failed to load security monitoring data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSecurityAlerts = async () => {
    const { data, error } = await supabase
      .from('security_alerts')
      .select('*')
      .order('triggered_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    setAlerts(data || []);
  };

  const loadMonitoringRules = async () => {
    const { data, error } = await supabase
      .from('security_monitoring_rules')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setRules(data || []);
  };

  const loadSecurityMetrics = async () => {
    // Get current user's company
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (profile?.company_id) {
      const { data, error } = await supabase.rpc('calculate_security_metrics', {
        p_company_id: profile.company_id
      });

      if (error) throw error;
      setMetrics(data as unknown as SecurityMetrics);
    }
  };

  const createMonitoringRule = async () => {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('Company not found');
      }

      const recipients = newRule.recipients.split(',').map(r => r.trim()).filter(r => r);

      const { error } = await supabase
        .from('security_monitoring_rules')
        .insert({
          company_id: profile.company_id,
          rule_name: newRule.rule_name,
          rule_type: newRule.rule_type,
          severity: newRule.severity,
          description: newRule.description,
          threshold_value: newRule.threshold_value,
          threshold_period_minutes: newRule.threshold_period_minutes,
          recipients: recipients,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Monitoring rule created successfully",
      });

      setNewRule({
        rule_name: '',
        rule_type: 'failed_login',
        severity: 'medium',
        description: '',
        threshold_value: 5,
        threshold_period_minutes: 60,
        recipients: ''
      });
      setIsCreateRuleOpen(false);
      loadMonitoringRules();
    } catch (error) {
      console.error('Error creating monitoring rule:', error);
      toast({
        title: "Error",
        description: "Failed to create monitoring rule",
        variant: "destructive",
      });
    }
  };

  const updateAlertStatus = async (alertId: string, status: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('security_alerts')
        .update({
          status,
          ...(status === 'resolved' && { 
            resolved_at: new Date().toISOString(),
            resolved_by: (await supabase.auth.getUser()).data.user?.id,
            resolution_notes: notes
          }),
          ...(status === 'investigating' && {
            acknowledged_at: new Date().toISOString(),
            acknowledged_by: (await supabase.auth.getUser()).data.user?.id
          })
        })
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Alert status updated successfully",
      });

      loadSecurityAlerts();
      loadSecurityMetrics();
    } catch (error) {
      console.error('Error updating alert status:', error);
      toast({
        title: "Error",
        description: "Failed to update alert status",
        variant: "destructive",
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'destructive';
      case 'investigating': return 'default';
      case 'resolved': return 'secondary';
      case 'false_positive': return 'outline';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Alerts</p>
                <p className="text-2xl font-bold">{metrics?.total_alerts || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Alerts</p>
                <p className="text-2xl font-bold text-red-600">{metrics?.critical_alerts || 0}</p>
              </div>
              <Shield className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Resolution Rate</p>
                <p className="text-2xl font-bold text-green-600">{metrics?.resolution_rate || 0}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Resolution Time</p>
                <p className="text-2xl font-bold">{metrics?.avg_resolution_time_hours || 0}h</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
          <TabsTrigger value="rules">Monitoring Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Recent Security Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No security alerts found</p>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="border rounded-lg p-4 space-y-2 cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityColor(alert.severity)}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <Badge variant={getStatusColor(alert.status)}>
                            {alert.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(alert.triggered_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-medium">{alert.title}</h4>
                      <p className="text-sm text-muted-foreground">{alert.description}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Monitoring Rules
                </div>
                <AdminOnly>
                  <Dialog open={isCreateRuleOpen} onOpenChange={setIsCreateRuleOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Bell className="h-4 w-4 mr-2" />
                        Create Rule
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Create Monitoring Rule</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="rule_name">Rule Name</Label>
                          <Input
                            id="rule_name"
                            value={newRule.rule_name}
                            onChange={(e) => setNewRule({ ...newRule, rule_name: e.target.value })}
                            placeholder="Failed Login Attempts"
                          />
                        </div>

                        <div>
                          <Label htmlFor="rule_type">Rule Type</Label>
                          <Select
                            value={newRule.rule_type}
                            onValueChange={(value) => setNewRule({ ...newRule, rule_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="failed_login">Failed Login</SelectItem>
                              <SelectItem value="privilege_escalation">Privilege Escalation</SelectItem>
                              <SelectItem value="data_access">Data Access</SelectItem>
                              <SelectItem value="system_change">System Change</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="severity">Severity</Label>
                          <Select
                            value={newRule.severity}
                            onValueChange={(value) => setNewRule({ ...newRule, severity: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="threshold_value">Threshold Value</Label>
                          <Input
                            id="threshold_value"
                            type="number"
                            value={newRule.threshold_value}
                            onChange={(e) => setNewRule({ ...newRule, threshold_value: parseInt(e.target.value) })}
                          />
                        </div>

                        <div>
                          <Label htmlFor="recipients">Email Recipients (comma-separated)</Label>
                          <Input
                            id="recipients"
                            value={newRule.recipients}
                            onChange={(e) => setNewRule({ ...newRule, recipients: e.target.value })}
                            placeholder="admin@company.com, security@company.com"
                          />
                        </div>

                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={newRule.description}
                            onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                            placeholder="Describe when this rule should trigger..."
                          />
                        </div>

                        <Button onClick={createMonitoringRule} className="w-full">
                          Create Rule
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </AdminOnly>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rules.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No monitoring rules configured</p>
                ) : (
                  rules.map((rule) => (
                    <div key={rule.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{rule.rule_name}</h4>
                          <Badge variant={getSeverityColor(rule.severity)}>
                            {rule.severity}
                          </Badge>
                          {rule.is_active ? (
                            <Badge variant="secondary">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Type: {rule.rule_type.replace('_', ' ')}
                        {rule.threshold_value && ` • Threshold: ${rule.threshold_value}`}
                      </p>
                      {rule.recipients.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Recipients: {rule.recipients.join(', ')}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alert Details Dialog */}
      {selectedAlert && (
        <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                {selectedAlert.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge variant={getSeverityColor(selectedAlert.severity)}>
                  {selectedAlert.severity.toUpperCase()}
                </Badge>
                <Badge variant={getStatusColor(selectedAlert.status)}>
                  {selectedAlert.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">{selectedAlert.description}</p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Event Details</h4>
                <pre className="bg-muted p-3 rounded text-xs overflow-auto">
                  {JSON.stringify(selectedAlert.event_data, null, 2)}
                </pre>
              </div>

              <div className="flex gap-2">
                {selectedAlert.status === 'open' && (
                  <Button
                    variant="outline"
                    onClick={() => updateAlertStatus(selectedAlert.id, 'investigating')}
                  >
                    Acknowledge
                  </Button>
                )}
                
                {(selectedAlert.status === 'open' || selectedAlert.status === 'investigating') && (
                  <Button
                    onClick={() => updateAlertStatus(selectedAlert.id, 'resolved')}
                  >
                    Mark Resolved
                  </Button>
                )}

                {selectedAlert.status !== 'false_positive' && (
                  <Button
                    variant="outline"
                    onClick={() => updateAlertStatus(selectedAlert.id, 'false_positive')}
                  >
                    Mark False Positive
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};