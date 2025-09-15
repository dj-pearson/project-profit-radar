import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { workflowAutomationService } from '@/services/WorkflowAutomationService';
import { complianceAutomationService } from '@/services/ComplianceAutomationService';
import { integrationEcosystemService } from '@/services/IntegrationEcosystemService';
import { toast } from '@/hooks/use-toast';
import {
  Zap,
  Shield,
  Link,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Clock,
  Users,
  Building2,
  Settings,
  RefreshCw,
  TrendingUp,
  Target,
  Award,
  Globe,
  Cpu,
  FileText,
  Plus
} from 'lucide-react';

export interface EnterpriseDashboardProps {
  className?: string;
}

export const EnterpriseDashboard: React.FC<EnterpriseDashboardProps> = ({
  className = ''
}) => {
  const { userProfile } = useAuth();
  const [workflowStats, setWorkflowStats] = useState<any>(null);
  const [complianceStats, setComplianceStats] = useState<any>(null);
  const [integrationStats, setIntegrationStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadEnterpriseMetrics = async () => {
    if (!userProfile?.company_id) return;

    try {
      setLoading(true);

      // Mock data - in real implementation, these would come from the services
      const mockWorkflowStats = {
        totalWorkflows: 12,
        activeWorkflows: 8,
        executionsToday: 45,
        successRate: 94,
        recentExecutions: [
          { name: 'Budget Alert', status: 'success', executedAt: '2 min ago' },
          { name: 'Invoice Generation', status: 'success', executedAt: '15 min ago' },
          { name: 'Safety Incident Response', status: 'success', executedAt: '1 hour ago' },
        ]
      };

      const mockComplianceStats = {
        totalRequirements: 28,
        compliantRequirements: 25,
        pendingChecks: 3,
        complianceRate: 89,
        recentAlerts: [
          { type: 'OSHA Inspection Due', severity: 'medium', dueDate: '2024-01-15' },
          { type: 'Safety Training Expiring', severity: 'high', dueDate: '2024-01-10' }
        ],
        upcomingDeadlines: [
          { requirement: 'Environmental Report', dueDate: '2024-01-20', status: 'on_track' },
          { requirement: 'Labor Compliance Review', dueDate: '2024-01-25', status: 'at_risk' }
        ]
      };

      const mockIntegrationStats = {
        totalIntegrations: 6,
        activeIntegrations: 4,
        lastSyncSuccess: '10 min ago',
        syncSuccessRate: 98,
        integrations: [
          { name: 'QuickBooks Online', status: 'connected', lastSync: '10 min ago', health: 'excellent' },
          { name: 'Microsoft 365', status: 'connected', lastSync: '5 min ago', health: 'excellent' },
          { name: 'Box Storage', status: 'connected', lastSync: '1 hour ago', health: 'good' },
          { name: 'Procore', status: 'disconnected', lastSync: '2 days ago', health: 'poor' }
        ]
      };

      setWorkflowStats(mockWorkflowStats);
      setComplianceStats(mockComplianceStats);
      setIntegrationStats(mockIntegrationStats);
      setLastUpdated(new Date());

    } catch (error: any) {
      console.error('Error loading enterprise metrics:', error);
      toast({
        title: "Error Loading Metrics",
        description: "Unable to load enterprise dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnterpriseMetrics();
  }, [userProfile?.company_id]);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'success';
      case 'good': return 'default';
      case 'poor': return 'destructive';
      default: return 'default';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'success';
      case 'at_risk': return 'warning';
      case 'overdue': return 'destructive';
      default: return 'default';
    }
  };

  if (!userProfile?.company_id) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Cpu className="h-5 w-5 mr-2" />
            <div>
              <CardTitle>Enterprise Command Center</CardTitle>
              <CardDescription>
                Advanced automation, compliance, and integration management
                {lastUpdated && (
                  <span className="ml-2 text-xs">
                    Updated {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadEnterpriseMetrics}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Enterprise Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Workflows</p>
                  <p className="text-2xl font-bold">{workflowStats?.activeWorkflows || 0}</p>
                </div>
                <Zap className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {workflowStats?.executionsToday || 0} executions today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Compliance Rate</p>
                  <p className="text-2xl font-bold">{complianceStats?.complianceRate || 0}%</p>
                </div>
                <Shield className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {complianceStats?.pendingChecks || 0} pending checks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Integrations</p>
                  <p className="text-2xl font-bold">{integrationStats?.activeIntegrations || 0}</p>
                </div>
                <Link className="h-8 w-8 text-purple-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {integrationStats?.syncSuccessRate || 0}% sync success
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Automation Score</p>
                  <p className="text-2xl font-bold">96</p>
                </div>
                <Award className="h-8 w-8 text-orange-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Excellent performance
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="workflows" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="workflows" className="flex items-center">
              <Zap className="h-4 w-4 mr-2" />
              Workflow Automation
            </TabsTrigger>
            <TabsTrigger value="compliance" className="flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Compliance Management
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center">
              <Link className="h-4 w-4 mr-2" />
              Integration Ecosystem
            </TabsTrigger>
          </TabsList>

          {/* Workflow Automation Tab */}
          <TabsContent value="workflows" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Workflow Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Workflow Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Success Rate</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={workflowStats?.successRate || 0} className="w-20" />
                      <span className="text-sm font-medium">{workflowStats?.successRate || 0}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Daily Executions</span>
                    <Badge variant="outline">{workflowStats?.executionsToday || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Workflows</span>
                    <Badge variant="outline">{workflowStats?.totalWorkflows || 0}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Workflow Executions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Recent Executions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {workflowStats?.recentExecutions?.map((execution: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">{execution.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{execution.executedAt}</span>
                    </div>
                  )) || (
                    <p className="text-sm text-muted-foreground">No recent executions</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Workflow Actions */}
            <div className="flex space-x-2">
              <Button size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Manage Workflows
              </Button>
              <Button variant="outline" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            </div>
          </TabsContent>

          {/* Compliance Management Tab */}
          <TabsContent value="compliance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Compliance Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Compliance Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Overall Rate</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={complianceStats?.complianceRate || 0} className="w-20" />
                      <span className="text-sm font-medium">{complianceStats?.complianceRate || 0}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Compliant</span>
                    <Badge variant="success">{complianceStats?.compliantRequirements || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Pending</span>
                    <Badge variant="warning">{complianceStats?.pendingChecks || 0}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming Deadlines */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Upcoming Deadlines</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {complianceStats?.upcomingDeadlines?.map((deadline: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="text-sm font-medium">{deadline.requirement}</p>
                        <p className="text-xs text-muted-foreground">{deadline.dueDate}</p>
                      </div>
                      <Badge variant={getStatusColor(deadline.status)}>
                        {deadline.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  )) || (
                    <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Alerts */}
            {complianceStats?.recentAlerts?.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Recent Alerts</h4>
                {complianceStats.recentAlerts.map((alert: any, index: number) => (
                  <Alert key={index} variant={getSeverityColor(alert.severity)}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{alert.type}</strong> - Due {alert.dueDate}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {/* Compliance Actions */}
            <div className="flex space-x-2">
              <Button size="sm">
                <Shield className="h-4 w-4 mr-2" />
                View Compliance
              </Button>
              <Button variant="outline" size="sm">
                <Target className="h-4 w-4 mr-2" />
                Run Audit
              </Button>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </TabsContent>

          {/* Integration Ecosystem Tab */}
          <TabsContent value="integrations" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Integration Health */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Integration Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {integrationStats?.integrations?.map((integration: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          integration.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <span className="text-sm">{integration.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getHealthColor(integration.health)}>
                          {integration.health}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{integration.lastSync}</span>
                      </div>
                    </div>
                  )) || (
                    <p className="text-sm text-muted-foreground">No integrations configured</p>
                  )}
                </CardContent>
              </Card>

              {/* Sync Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Sync Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Success Rate</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={integrationStats?.syncSuccessRate || 0} className="w-20" />
                      <span className="text-sm font-medium">{integrationStats?.syncSuccessRate || 0}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Last Sync</span>
                    <Badge variant="outline">{integrationStats?.lastSyncSuccess || 'Never'}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Connections</span>
                    <Badge variant="outline">{integrationStats?.activeIntegrations || 0}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Integration Actions */}
            <div className="flex space-x-2">
              <Button size="sm">
                <Link className="h-4 w-4 mr-2" />
                Manage Integrations
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync All
              </Button>
              <Button variant="outline" size="sm">
                <Globe className="h-4 w-4 mr-2" />
                Add Integration
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EnterpriseDashboard;
