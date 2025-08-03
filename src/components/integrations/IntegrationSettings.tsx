import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings, 
  Webhook, 
  Database, 
  Zap, 
  Mail, 
  MessageSquare, 
  ExternalLink,
  Check,
  X,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { APIKeyManager } from './APIKeyManager';

interface IntegrationConfig {
  id: string;
  name: string;
  type: 'webhook' | 'api' | 'oauth';
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  config: Record<string, any>;
}

const SAMPLE_INTEGRATIONS: IntegrationConfig[] = [
  {
    id: '1',
    name: 'QuickBooks Online',
    type: 'oauth',
    status: 'connected',
    lastSync: '2024-01-15T10:30:00Z',
    config: {
      companyId: 'QB-123456',
      syncFrequency: 'hourly',
      autoSync: true
    }
  },
  {
    id: '2',
    name: 'Zapier Webhook',
    type: 'webhook',
    status: 'connected',
    config: {
      webhookUrl: 'https://hooks.zapier.com/hooks/catch/12345/abcdef/',
      events: ['project_created', 'task_completed']
    }
  },
  {
    id: '3',
    name: 'Slack Notifications',
    type: 'webhook',
    status: 'disconnected',
    config: {
      channel: '#construction-updates',
      notifications: ['project_milestones', 'budget_alerts']
    }
  }
];

export const IntegrationSettings: React.FC = () => {
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>(SAMPLE_INTEGRATIONS);
  const [activeTab, setActiveTab] = useState('connections');
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [] as string[]
  });

  const getStatusIcon = (status: IntegrationConfig['status']) => {
    switch (status) {
      case 'connected':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <X className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: IntegrationConfig['status']) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800">Connected</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Disconnected</Badge>;
    }
  };

  const handleConnect = (integrationId: string) => {
    setIntegrations(prev =>
      prev.map(int =>
        int.id === integrationId
          ? { ...int, status: 'connected' as const }
          : int
      )
    );
    toast.success('Integration connected successfully');
  };

  const handleDisconnect = (integrationId: string) => {
    setIntegrations(prev =>
      prev.map(int =>
        int.id === integrationId
          ? { ...int, status: 'disconnected' as const }
          : int
      )
    );
    toast.success('Integration disconnected');
  };

  const handleTestConnection = async (integrationId: string) => {
    toast.loading('Testing connection...');
    // Simulate test
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast.success('Connection test successful');
  };

  const createWebhook = () => {
    if (!newWebhook.name.trim() || !newWebhook.url.trim()) {
      toast.error('Please provide webhook name and URL');
      return;
    }

    const webhook: IntegrationConfig = {
      id: Date.now().toString(),
      name: newWebhook.name,
      type: 'webhook',
      status: 'connected',
      config: {
        webhookUrl: newWebhook.url,
        events: newWebhook.events
      }
    };

    setIntegrations(prev => [...prev, webhook]);
    setShowWebhookDialog(false);
    setNewWebhook({ name: '', url: '', events: [] });
    toast.success('Webhook created successfully');
  };

  const deleteIntegration = (integrationId: string) => {
    if (!confirm('Are you sure you want to delete this integration?')) return;
    
    setIntegrations(prev => prev.filter(int => int.id !== integrationId));
    toast.success('Integration deleted');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Integration Settings</h2>
          <p className="text-muted-foreground mt-1">
            Manage your third-party connections and API configurations
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-4">
          <div className="grid gap-4">
            {integrations.filter(int => int.type !== 'webhook').map((integration) => (
              <Card key={integration.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-foreground rounded-lg flex items-center justify-center text-white font-bold">
                        {integration.name.charAt(0)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{integration.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {integration.type.toUpperCase()} Integration
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusIcon(integration.status)}
                      {getStatusBadge(integration.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {integration.lastSync && (
                      <div>
                        <Label className="text-sm font-medium">Last Sync</Label>
                        <p className="text-sm text-muted-foreground">
                          {new Date(integration.lastSync).toLocaleString()}
                        </p>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      {integration.status === 'connected' ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestConnection(integration.id)}
                          >
                            Test Connection
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDisconnect(integration.id)}
                          >
                            Disconnect
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleConnect(integration.id)}
                        >
                          Connect
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Webhook Configurations</h3>
              <p className="text-sm text-muted-foreground">
                Configure webhooks to send real-time updates to external services
              </p>
            </div>
            <Dialog open={showWebhookDialog} onOpenChange={setShowWebhookDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Webhook className="h-4 w-4 mr-2" />
                  Add Webhook
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Webhook</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="webhookName">Webhook Name</Label>
                    <Input
                      id="webhookName"
                      value={newWebhook.name}
                      onChange={(e) => setNewWebhook(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="My Custom Webhook"
                    />
                  </div>
                  <div>
                    <Label htmlFor="webhookUrl">Webhook URL</Label>
                    <Input
                      id="webhookUrl"
                      value={newWebhook.url}
                      onChange={(e) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="https://your-service.com/webhook"
                    />
                  </div>
                  <div>
                    <Label>Events to Subscribe</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {['project_created', 'task_completed', 'budget_alert', 'milestone_reached'].map(event => (
                        <div key={event} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={event}
                            checked={newWebhook.events.includes(event)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewWebhook(prev => ({ ...prev, events: [...prev.events, event] }));
                              } else {
                                setNewWebhook(prev => ({ ...prev, events: prev.events.filter(e => e !== event) }));
                              }
                            }}
                          />
                          <Label htmlFor={event} className="text-sm">
                            {event.replace('_', ' ')}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button onClick={createWebhook} className="w-full">
                    Create Webhook
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {integrations.filter(int => int.type === 'webhook').map((webhook) => (
              <Card key={webhook.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Webhook className="h-8 w-8 text-primary" />
                      <div>
                        <CardTitle>{webhook.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {webhook.config.webhookUrl}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(webhook.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Subscribed Events</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {webhook.config.events?.map((event: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {event.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        Test Webhook
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteIntegration(webhook.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="api-keys">
          <APIKeyManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};