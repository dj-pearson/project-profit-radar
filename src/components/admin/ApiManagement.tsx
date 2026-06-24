import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { Switch } from '@/components/ui/switch';
import { Copy, Plus, TestTube, Activity } from 'lucide-react';

interface ApiKey {
  id: string;
  key_name: string;
  api_key_prefix: string;
  permissions: string[];
  is_active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  usage_count: number;
  rate_limit_per_hour: number;
  created_at: string;
}

interface WebhookEndpoint {
  id: string;
  endpoint_name: string;
  url: string;
  events: string[];
  is_active: boolean;
  retry_attempts: number;
  timeout_seconds: number;
  last_success_at: string | null;
  last_failure_at: string | null;
  failure_count: number;
  created_at: string;
}

const ApiManagement: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateKeyDialog, setShowCreateKeyDialog] = useState(false);
  const [showCreateWebhookDialog, setShowCreateWebhookDialog] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  // API Keys Query
  const { data: apiKeys, isLoading: loadingKeys } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ApiKey[];
    }
  });

  // Webhooks Query
  const { data: webhooks, isLoading: loadingWebhooks } = useQuery({
    queryKey: ['webhook-endpoints'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhook_endpoints')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as WebhookEndpoint[];
    }
  });

  // Create API Key Mutation
  const createApiKeyMutation = useMutation({
    mutationFn: async (keyData: {
      key_name: string;
      permissions: string[];
      expires_at?: string;
      rate_limit_per_hour: number;
    }) => {
      const { data, error } = await supabase.functions.invoke('api-management', {
        body: { 
          action: 'create-key',
          ...keyData 
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setNewApiKey(data.api_key);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setShowCreateKeyDialog(false);
      toast({
        title: 'API Key Created',
        description: 'Your new API key has been generated. Make sure to copy it now - it won\'t be shown again.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create API key.',
        variant: 'destructive',
      });
    }
  });

  // Create Webhook Mutation
  const createWebhookMutation = useMutation({
    mutationFn: async (webhookData: {
      endpoint_name: string;
      url: string;
      events: string[];
      retry_attempts: number;
      timeout_seconds: number;
    }) => {
      // Get user's company_id
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (profileError || !profile?.company_id) {
        throw new Error('Unable to determine company ID');
      }

      const { data, error } = await supabase
        .from('webhook_endpoints')
        .insert({
          ...webhookData,
          secret_token: crypto.randomUUID(), // Generate random secret
          created_by: user?.id
        } as any)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-endpoints'] });
      setShowCreateWebhookDialog(false);
      toast({
        title: 'Webhook Created',
        description: 'Your webhook endpoint has been configured.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create webhook endpoint.',
        variant: 'destructive',
      });
    }
  });

  // Test Webhook Mutation
  const testWebhookMutation = useMutation({
    mutationFn: async (webhookId: string) => {
      const { data, error } = await supabase.functions.invoke('api-management', {
        body: { 
          action: 'test-webhook',
          webhook_id: webhookId 
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Test Sent',
        description: 'Test webhook has been sent successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Test Failed',
        description: 'Failed to send test webhook.',
        variant: 'destructive',
      });
    }
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied',
        description: 'API key copied to clipboard.',
      });
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the API key manually.',
        variant: 'destructive',
      });
    }
  };

  const availablePermissions = [
    'projects:read',
    'projects:write',
    'estimates:read',
    'estimates:write',
    'invoices:read',
    'invoices:write',
    'tasks:read',
    'tasks:write',
    'users:read',
    'webhooks:manage'
  ];

  const availableEvents = [
    'project.created',
    'project.updated',
    'project.completed',
    'estimate.created',
    'estimate.approved',
    'invoice.created',
    'invoice.paid',
    'task.completed',
    'user.created'
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">API Management</h2>
          <p className="text-muted-foreground">
            Manage API keys and webhook endpoints for external integrations
          </p>
        </div>
      </div>

      <Tabs defaultValue="api-keys" className="space-y-6">
        <TabsList>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">API Keys</h3>
            <Dialog open={showCreateKeyDialog} onOpenChange={setShowCreateKeyDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create API Key
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create API Key</DialogTitle>
                </DialogHeader>
                <CreateApiKeyForm
                  onSubmit={(data) => createApiKeyMutation.mutate(data)}
                  isLoading={createApiKeyMutation.isPending}
                  availablePermissions={availablePermissions}
                />
              </DialogContent>
            </Dialog>
          </div>

          {newApiKey && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-800">API Key Created Successfully</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Your API Key (copy now - it won't be shown again):</Label>
                  <div className="flex items-center space-x-2">
                    <Input value={newApiKey} readOnly className="font-mono" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(newApiKey)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setNewApiKey(null)}
                  >
                    Got it, hide this key
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {loadingKeys ? (
              <div>Loading API keys...</div>
            ) : apiKeys?.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No API keys found</p>
                </CardContent>
              </Card>
            ) : (
              apiKeys?.map((key) => (
                <ApiKeyCard key={key.id} apiKey={key} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Webhook Endpoints</h3>
            <Dialog open={showCreateWebhookDialog} onOpenChange={setShowCreateWebhookDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Webhook
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Webhook Endpoint</DialogTitle>
                </DialogHeader>
                <CreateWebhookForm
                  onSubmit={(data) => createWebhookMutation.mutate(data)}
                  isLoading={createWebhookMutation.isPending}
                  availableEvents={availableEvents}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {loadingWebhooks ? (
              <div>Loading webhooks...</div>
            ) : webhooks?.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No webhook endpoints found</p>
                </CardContent>
              </Card>
            ) : (
              webhooks?.map((webhook) => (
                <WebhookCard
                  key={webhook.id}
                  webhook={webhook}
                  onTest={(id) => testWebhookMutation.mutate(id)}
                  isTestLoading={testWebhookMutation.isPending}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <ApiActivityLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const ApiKeyCard: React.FC<{ apiKey: ApiKey }> = ({ apiKey }) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{apiKey.key_name}</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant={apiKey.is_active ? 'default' : 'secondary'}>
              {apiKey.is_active ? 'Active' : 'Inactive'}
            </Badge>
            {apiKey.expires_at && new Date(apiKey.expires_at) < new Date() && (
              <Badge variant="destructive">Expired</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label>API Key</Label>
              <p className="font-mono">{apiKey.api_key_prefix}</p>
            </div>
            <div>
              <Label>Usage Count</Label>
              <p>{apiKey.usage_count.toLocaleString()}</p>
            </div>
            <div>
              <Label>Rate Limit</Label>
              <p>{apiKey.rate_limit_per_hour}/hour</p>
            </div>
            <div>
              <Label>Last Used</Label>
              <p>{apiKey.last_used_at ? new Date(apiKey.last_used_at).toLocaleDateString() : 'Never'}</p>
            </div>
          </div>

          <div>
            <Label>Permissions</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {apiKey.permissions.map((permission) => (
                <Badge key={permission} variant="outline" className="text-xs">
                  {permission}
                </Badge>
              ))}
            </div>
          </div>

          {apiKey.expires_at && (
            <div>
              <Label>Expires</Label>
              <p className="text-sm">{new Date(apiKey.expires_at).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const WebhookCard: React.FC<{
  webhook: WebhookEndpoint;
  onTest: (id: string) => void;
  isTestLoading: boolean;
}> = ({ webhook, onTest, isTestLoading }) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{webhook.endpoint_name}</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
              {webhook.is_active ? 'Active' : 'Inactive'}
            </Badge>
            {webhook.failure_count > 0 && (
              <Badge variant="destructive">{webhook.failure_count} failures</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label>URL</Label>
              <p className="font-mono break-all">{webhook.url}</p>
            </div>
            <div>
              <Label>Timeout</Label>
              <p>{webhook.timeout_seconds}s</p>
            </div>
            <div>
              <Label>Retry Attempts</Label>
              <p>{webhook.retry_attempts}</p>
            </div>
            <div>
              <Label>Last Success</Label>
              <p>{webhook.last_success_at ? new Date(webhook.last_success_at).toLocaleDateString() : 'Never'}</p>
            </div>
          </div>

          <div>
            <Label>Events</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {webhook.events.map((event) => (
                <Badge key={event} variant="outline" className="text-xs">
                  {event}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onTest(webhook.id)}
              disabled={isTestLoading}
            >
              <TestTube className="h-4 w-4 mr-2" />
              Test Webhook
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CreateApiKeyForm: React.FC<{
  onSubmit: (data: any) => void;
  isLoading: boolean;
  availablePermissions: string[];
}> = ({ onSubmit, isLoading, availablePermissions }) => {
  const [formData, setFormData] = useState({
    key_name: '',
    permissions: [] as string[],
    expires_at: '',
    rate_limit_per_hour: 1000
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      expires_at: formData.expires_at || null
    });
  };

  const togglePermission = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="key_name">Key Name</Label>
        <Input
          id="key_name"
          value={formData.key_name}
          onChange={(e) => setFormData(prev => ({ ...prev, key_name: e.target.value }))}
          placeholder="Integration Name"
          required
        />
      </div>

      <div>
        <Label>Permissions</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {availablePermissions.map((permission) => (
            <div key={permission} className="flex items-center space-x-2">
              <Switch
                checked={formData.permissions.includes(permission)}
                onCheckedChange={() => togglePermission(permission)}
              />
              <Label className="text-xs">{permission}</Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="rate_limit">Rate Limit (requests/hour)</Label>
        <Input
          id="rate_limit"
          type="number"
          value={formData.rate_limit_per_hour}
          onChange={(e) => setFormData(prev => ({ ...prev, rate_limit_per_hour: parseInt(e.target.value) }))}
          min="1"
          max="10000"
        />
      </div>

      <div>
        <Label htmlFor="expires_at">Expiration Date (optional)</Label>
        <Input
          id="expires_at"
          type="date"
          value={formData.expires_at}
          onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Creating...' : 'Create API Key'}
      </Button>
    </form>
  );
};

const CreateWebhookForm: React.FC<{
  onSubmit: (data: any) => void;
  isLoading: boolean;
  availableEvents: string[];
}> = ({ onSubmit, isLoading, availableEvents }) => {
  const [formData, setFormData] = useState({
    endpoint_name: '',
    url: '',
    events: [] as string[],
    retry_attempts: 3,
    timeout_seconds: 30
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const toggleEvent = (event: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="endpoint_name">Endpoint Name</Label>
        <Input
          id="endpoint_name"
          value={formData.endpoint_name}
          onChange={(e) => setFormData(prev => ({ ...prev, endpoint_name: e.target.value }))}
          placeholder="My Integration"
          required
        />
      </div>

      <div>
        <Label htmlFor="url">Webhook URL</Label>
        <Input
          id="url"
          type="url"
          value={formData.url}
          onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
          placeholder="https://api.example.com/webhooks"
          required
        />
      </div>

      <div>
        <Label>Events</Label>
        <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
          {availableEvents.map((event) => (
            <div key={event} className="flex items-center space-x-2">
              <Switch
                checked={formData.events.includes(event)}
                onCheckedChange={() => toggleEvent(event)}
              />
              <Label className="text-xs">{event}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="retry_attempts">Retry Attempts</Label>
          <Input
            id="retry_attempts"
            type="number"
            value={formData.retry_attempts}
            onChange={(e) => setFormData(prev => ({ ...prev, retry_attempts: parseInt(e.target.value) }))}
            min="0"
            max="10"
          />
        </div>
        <div>
          <Label htmlFor="timeout_seconds">Timeout (seconds)</Label>
          <Input
            id="timeout_seconds"
            type="number"
            value={formData.timeout_seconds}
            onChange={(e) => setFormData(prev => ({ ...prev, timeout_seconds: parseInt(e.target.value) }))}
            min="5"
            max="300"
          />
        </div>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Creating...' : 'Create Webhook'}
      </Button>
    </form>
  );
};

const ApiActivityLogs: React.FC = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['api-request-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_request_logs')
        .select(`
          *,
          api_keys!inner(key_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div>Loading logs...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Activity className="h-5 w-5 mr-2" />
          Recent API Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {logs?.map((log: any) => (
            <div key={log.id} className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center space-x-4">
                <Badge variant="outline">{log.method}</Badge>
                <span className="font-mono text-sm">{log.endpoint}</span>
                <span className="text-sm text-muted-foreground">{log.api_keys.key_name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={log.response_status < 400 ? 'default' : 'destructive'}>
                  {log.response_status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiManagement;