import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Zap, Link, Settings, CheckCircle, AlertTriangle, X, 
  ExternalLink, RefreshCw, Key, Clock, Shield, Activity, Plus
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  category: 'accounting' | 'project_management' | 'communication' | 'storage' | 'analytics' | 'other';
  description: string;
  provider: string;
  version: string;
  status: 'connected' | 'disconnected' | 'error' | 'syncing' | 'setup_required';
  lastSync?: Date;
  syncFrequency: string;
  dataDirection: 'import' | 'export' | 'bidirectional';
  apiEndpoint?: string;
  authType: 'oauth' | 'api_key' | 'webhook';
  permissions: string[];
  features: string[];
  monthlyUsage: number;
  usageLimit: number;
  errorCount: number;
  logs: IntegrationLog[];
}

interface IntegrationLog {
  id: string;
  timestamp: Date;
  type: 'sync' | 'error' | 'auth' | 'config';
  message: string;
  details?: string;
  status: 'success' | 'warning' | 'error';
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive' | 'failed';
  lastTriggered?: Date;
  successRate: number;
  totalDeliveries: number;
  secret?: string;
  retryPolicy: 'none' | 'exponential' | 'linear';
}

export const IntegrationManagementHub: React.FC = () => {
  const [integrations] = useState<Integration[]>([
    {
      id: '1',
      name: 'QuickBooks Online',
      category: 'accounting',
      description: 'Sync financial data, invoices, and project costs with QuickBooks',
      provider: 'Intuit',
      version: '2023.1',
      status: 'connected',
      lastSync: new Date('2024-01-29T08:30:00'),
      syncFrequency: 'Daily at 8:00 AM',
      dataDirection: 'bidirectional',
      apiEndpoint: 'https://sandbox-quickbooks.api.intuit.com',
      authType: 'oauth',
      permissions: ['read_customers', 'write_invoices', 'read_items', 'write_payments'],
      features: ['Invoice Sync', 'Customer Management', 'Expense Tracking', 'Financial Reports'],
      monthlyUsage: 1250,
      usageLimit: 5000,
      errorCount: 0,
      logs: [
        {
          id: 'l1',
          timestamp: new Date('2024-01-29T08:30:00'),
          type: 'sync',
          message: 'Successfully synced 15 invoices and 8 payments',
          status: 'success'
        }
      ]
    },
    {
      id: '2',
      name: 'Procore',
      category: 'project_management',
      description: 'Connect with Procore for advanced project management features',
      provider: 'Procore Technologies',
      version: '2024.1',
      status: 'setup_required',
      syncFrequency: 'Real-time',
      dataDirection: 'bidirectional',
      authType: 'oauth',
      permissions: ['read_projects', 'write_documents', 'read_schedules'],
      features: ['Project Sync', 'Document Management', 'Schedule Integration'],
      monthlyUsage: 0,
      usageLimit: 2000,
      errorCount: 0,
      logs: []
    },
    {
      id: '3',
      name: 'Slack',
      category: 'communication',
      description: 'Send notifications and updates to Slack channels',
      provider: 'Slack Technologies',
      version: '1.0',
      status: 'connected',
      lastSync: new Date('2024-01-29T15:45:00'),
      syncFrequency: 'Real-time',
      dataDirection: 'export',
      authType: 'webhook',
      permissions: ['send_messages', 'create_channels'],
      features: ['Project Notifications', 'Safety Alerts', 'Daily Reports'],
      monthlyUsage: 450,
      usageLimit: 1000,
      errorCount: 2,
      logs: [
        {
          id: 'l2',
          timestamp: new Date('2024-01-29T15:45:00'),
          type: 'error',
          message: 'Failed to send notification to #safety-alerts channel',
          details: 'Channel not found or insufficient permissions',
          status: 'error'
        }
      ]
    },
    {
      id: '4',
      name: 'Google Drive',
      category: 'storage',
      description: 'Store and sync project documents with Google Drive',
      provider: 'Google',
      version: '3.0',
      status: 'connected',
      lastSync: new Date('2024-01-29T14:20:00'),
      syncFrequency: 'Every 4 hours',
      dataDirection: 'bidirectional',
      authType: 'oauth',
      permissions: ['read_files', 'write_files', 'create_folders'],
      features: ['Document Sync', 'Automatic Backup', 'File Sharing'],
      monthlyUsage: 2800,
      usageLimit: 10000,
      errorCount: 1,
      logs: [
        {
          id: 'l3',
          timestamp: new Date('2024-01-29T14:20:00'),
          type: 'sync',
          message: 'Uploaded 12 new documents, synced 5 folders',
          status: 'success'
        }
      ]
    },
    {
      id: '5',
      name: 'Power BI',
      category: 'analytics',
      description: 'Create advanced analytics dashboards and reports',
      provider: 'Microsoft',
      version: '2.0',
      status: 'error',
      lastSync: new Date('2024-01-28T20:30:00'),
      syncFrequency: 'Daily at 9:00 PM',
      dataDirection: 'export',
      authType: 'api_key',
      permissions: ['read_data', 'create_reports'],
      features: ['Custom Dashboards', 'Financial Analytics', 'Project Reports'],
      monthlyUsage: 890,
      usageLimit: 2000,
      errorCount: 5,
      logs: [
        {
          id: 'l4',
          timestamp: new Date('2024-01-28T20:30:00'),
          type: 'error',
          message: 'Authentication failed - API key expired',
          details: 'Please renew API key in Microsoft Power BI admin portal',
          status: 'error'
        }
      ]
    }
  ]);

  const [webhooks] = useState<Webhook[]>([
    {
      id: 'w1',
      name: 'Project Status Updates',
      url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
      events: ['project.completed', 'project.delayed', 'milestone.reached'],
      status: 'active',
      lastTriggered: new Date('2024-01-29T16:30:00'),
      successRate: 98.5,
      totalDeliveries: 1247,
      secret: 'sk_webhook_••••••••••••••••',
      retryPolicy: 'exponential'
    },
    {
      id: 'w2',
      name: 'Safety Incident Alerts',
      url: 'https://api.example.com/safety/incidents',
      events: ['safety.incident', 'safety.near_miss'],
      status: 'active',
      lastTriggered: new Date('2024-01-29T11:15:00'),
      successRate: 100,
      totalDeliveries: 23,
      retryPolicy: 'exponential'
    },
    {
      id: 'w3',
      name: 'Financial Data Export',
      url: 'https://accounting.company.com/api/builddesk/import',
      events: ['invoice.created', 'payment.received', 'expense.recorded'],
      status: 'failed',
      lastTriggered: new Date('2024-01-28T14:20:00'),
      successRate: 45.2,
      totalDeliveries: 156,
      retryPolicy: 'linear'
    }
  ]);

  const [selectedIntegration, setSelectedIntegration] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIntegrations = integrations.filter(integration =>
    integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    integration.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: Integration['status']) => {
    switch (status) {
      case 'connected': return 'default';
      case 'syncing': return 'secondary';
      case 'setup_required': return 'outline';
      case 'error': return 'destructive';
      case 'disconnected': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: Integration['status']) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'syncing': return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'setup_required': return <Settings className="h-4 w-4 text-orange-500" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'disconnected': return <X className="h-4 w-4 text-gray-500" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getCategoryIcon = (category: Integration['category']) => {
    switch (category) {
      case 'accounting': return '💰';
      case 'project_management': return '📋';
      case 'communication': return '💬';
      case 'storage': return '💾';
      case 'analytics': return '📊';
      default: return '🔧';
    }
  };

  const getWebhookStatusColor = (status: Webhook['status']) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'outline';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const renderIntegrationCard = (integration: Integration) => {
    const usagePercentage = (integration.monthlyUsage / integration.usageLimit) * 100;

    return (
      <Card key={integration.id} className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="text-2xl">{getCategoryIcon(integration.category)}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium">{integration.name}</h4>
                <Badge variant="outline" className="text-xs">v{integration.version}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{integration.description}</p>
              <p className="text-xs text-muted-foreground">by {integration.provider}</p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              {getStatusIcon(integration.status)}
              <Badge variant={getStatusColor(integration.status)}>
                {integration.status.replace('_', ' ')}
              </Badge>
            </div>
            {integration.errorCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {integration.errorCount} errors
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <RefreshCw className="h-3 w-3" />
            <span>{integration.syncFrequency}</span>
          </div>
          {integration.lastSync && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-3 w-3" />
              <span>Last sync: {integration.lastSync.toLocaleString()}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Activity className="h-3 w-3" />
            <span className="capitalize">{integration.dataDirection} data</span>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Monthly Usage:</span>
            <span>{integration.monthlyUsage.toLocaleString()} / {integration.usageLimit.toLocaleString()}</span>
          </div>
          <Progress value={Math.min(100, usagePercentage)} className="h-2" />
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {integration.features.slice(0, 3).map(feature => (
            <Badge key={feature} variant="outline" className="text-xs">
              {feature}
            </Badge>
          ))}
          {integration.features.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{integration.features.length - 3} more
            </Badge>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          {integration.status === 'setup_required' ? (
            <Button size="sm">
              <Settings className="h-3 w-3 mr-1" />
              Setup
            </Button>
          ) : integration.status === 'error' ? (
            <Button size="sm" variant="outline">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Fix Issues
            </Button>
          ) : (
            <Button size="sm" variant="outline">
              <RefreshCw className="h-3 w-3 mr-1" />
              Sync Now
            </Button>
          )}
          <Button size="sm" variant="outline">
            <Settings className="h-3 w-3 mr-1" />
            Configure
          </Button>
          <Button size="sm" variant="ghost">
            <ExternalLink className="h-3 w-3 mr-1" />
            Details
          </Button>
        </div>
      </Card>
    );
  };

  const renderWebhookCard = (webhook: Webhook) => {
    return (
      <Card key={webhook.id} className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h4 className="font-medium">{webhook.name}</h4>
            <p className="text-sm text-muted-foreground truncate">{webhook.url}</p>
          </div>
          <Badge variant={getWebhookStatusColor(webhook.status)}>
            {webhook.status}
          </Badge>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Success Rate:</span>
            <span className="font-medium">{webhook.successRate.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Deliveries:</span>
            <span className="font-medium">{webhook.totalDeliveries.toLocaleString()}</span>
          </div>
          {webhook.lastTriggered && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last Triggered:</span>
              <span className="font-medium">{webhook.lastTriggered.toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-1">Events:</p>
          <div className="flex flex-wrap gap-1">
            {webhook.events.map(event => (
              <Badge key={event} variant="outline" className="text-xs">
                {event}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline">
            Test
          </Button>
          <Button size="sm" variant="outline">
            <Settings className="h-3 w-3 mr-1" />
            Configure
          </Button>
          <Button size="sm" variant="ghost">
            Logs
          </Button>
        </div>
      </Card>
    );
  };

  // Calculate statistics
  const connectedIntegrations = integrations.filter(i => i.status === 'connected').length;
  const errorIntegrations = integrations.filter(i => i.status === 'error').length;
  const totalApiCalls = integrations.reduce((sum, i) => sum + i.monthlyUsage, 0);
  const activeWebhooks = webhooks.filter(w => w.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Integration Management Hub</h2>
          <p className="text-muted-foreground">
            Connect and manage all your business integrations and APIs
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Integration
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Connected</p>
                <p className="text-2xl font-bold text-green-600">{connectedIntegrations}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Need Attention</p>
                <p className="text-2xl font-bold text-orange-500">{errorIntegrations}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">API Calls (Month)</p>
                <p className="text-2xl font-bold">{totalApiCalls.toLocaleString()}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Webhooks</p>
                <p className="text-2xl font-bold">{activeWebhooks}</p>
              </div>
              <Zap className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Search integrations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="integrations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Available Integrations</h3>
              <div className="flex gap-2">
                <Badge variant="outline">{integrations.length} total</Badge>
                <Badge variant="default">{connectedIntegrations} connected</Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredIntegrations.map(renderIntegrationCard)}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="webhooks">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Webhook Management</h3>
              <Button>Create Webhook</Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {webhooks.map(renderWebhookCard)}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="api-keys">
          <Card>
            <CardHeader>
              <CardTitle>API Key Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                API key management interface coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Integration Activity Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {integrations.flatMap(integration => 
                  integration.logs.map(log => (
                    <div key={log.id} className="flex items-start gap-3 p-3 border rounded">
                      <div className="flex-shrink-0 mt-1">
                        {log.status === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
                        {log.status === 'warning' && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                        {log.status === 'error' && <X className="h-4 w-4 text-red-600" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{integration.name}</span>
                          <Badge variant="outline" className="text-xs capitalize">{log.type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {log.timestamp.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm">{log.message}</p>
                        {log.details && (
                          <p className="text-xs text-muted-foreground mt-1">{log.details}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};