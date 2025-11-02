import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Key,
  Copy,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Activity,
  TrendingUp,
  AlertCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface APIKey {
  id: string;
  name: string;
  description: string;
  key_prefix: string;
  scopes: string[];
  environment: string;
  is_active: boolean;
  last_used_at: string;
  total_requests: number;
  total_errors: number;
  rate_limit_per_minute: number;
  rate_limit_per_hour: number;
  rate_limit_per_day: number;
  expires_at: string;
  created_at: string;
}

interface APIRequestLog {
  id: string;
  method: string;
  endpoint: string;
  status_code: number;
  response_time_ms: number;
  success: boolean;
  error_message: string;
  created_at: string;
}

const AVAILABLE_SCOPES = [
  { value: 'read', label: 'Read', description: 'View resources' },
  { value: 'write', label: 'Write', description: 'Create and update resources' },
  { value: 'delete', label: 'Delete', description: 'Delete resources' },
  { value: 'projects', label: 'Projects', description: 'Access projects' },
  { value: 'invoices', label: 'Invoices', description: 'Access invoices' },
  { value: 'time_entries', label: 'Time Entries', description: 'Access time tracking' },
  { value: 'documents', label: 'Documents', description: 'Access documents' },
  { value: 'users', label: 'Users', description: 'Access user data' },
];

export const APIKeyManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [requestLogs, setRequestLogs] = useState<APIRequestLog[]>([]);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyVisible, setNewKeyVisible] = useState(false);
  const [newGeneratedKey, setNewGeneratedKey] = useState('');

  // New API key form
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyDescription, setNewKeyDescription] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['read']);
  const [newKeyEnvironment, setNewKeyEnvironment] = useState('production');

  useEffect(() => {
    loadAPIData();
  }, []);

  const loadAPIData = async () => {
    setLoading(true);
    try {
      // Load API keys
      const { data: keysData, error: keysError } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (keysError) throw keysError;
      setApiKeys(keysData || []);

      // Load recent request logs
      if (keysData && keysData.length > 0) {
        const { data: logsData, error: logsError } = await supabase
          .from('api_request_logs')
          .select('*')
          .in('api_key_id', keysData.map((k) => k.id))
          .order('created_at', { ascending: false })
          .limit(50);

        if (logsError) throw logsError;
        setRequestLogs(logsData || []);
      }
    } catch (error) {
      console.error('Failed to load API data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load API keys.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAPIKey = async () => {
    if (!newKeyName) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a name for the API key.',
        variant: 'destructive',
      });
      return;
    }

    if (newKeyScopes.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one scope.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Generate a random API key (in production, this should be done server-side)
      const key = `sk_${newKeyEnvironment === 'production' ? 'live' : 'test'}_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      const keyPrefix = key.substring(0, 12);

      // Hash the key (in production, use proper SHA-256)
      const keyHash = btoa(key); // Simple encoding for demo

      const { error } = await supabase
        .from('api_keys')
        .insert({
          user_id: user?.id,
          name: newKeyName,
          description: newKeyDescription,
          key_prefix: keyPrefix,
          key_hash: keyHash,
          scopes: newKeyScopes,
          environment: newKeyEnvironment,
          is_active: true,
        });

      if (error) throw error;

      setNewGeneratedKey(key);
      setNewKeyVisible(true);

      toast({
        title: 'API Key Created',
        description: 'Save this key securely. You won\'t be able to see it again.',
      });

      // Reset form
      setNewKeyName('');
      setNewKeyDescription('');
      setNewKeyScopes(['read']);
      loadAPIData();
    } catch (error) {
      console.error('Failed to create API key:', error);
      toast({
        title: 'Error',
        description: 'Failed to create API key.',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'API key copied to clipboard.',
    });
  };

  const toggleAPIKey = async (keyId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: !currentStatus })
        .eq('id', keyId);

      if (error) throw error;

      toast({
        title: currentStatus ? 'API Key Disabled' : 'API Key Enabled',
        description: currentStatus
          ? 'API key has been disabled.'
          : 'API key is now active.',
      });

      loadAPIData();
    } catch (error) {
      console.error('Failed to toggle API key:', error);
      toast({
        title: 'Error',
        description: 'Failed to update API key.',
        variant: 'destructive',
      });
    }
  };

  const deleteAPIKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Are you sure you want to delete the API key "${keyName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId);

      if (error) throw error;

      toast({
        title: 'API Key Deleted',
        description: `API key "${keyName}" has been deleted.`,
      });

      loadAPIData();
    } catch (error) {
      console.error('Failed to delete API key:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete API key.',
        variant: 'destructive',
      });
    }
  };

  const toggleScopeSelection = (scope: string) => {
    setNewKeyScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const getScopeBadge = (scope: string) => {
    const colors: Record<string, string> = {
      read: 'bg-blue-500',
      write: 'bg-green-500',
      delete: 'bg-red-500',
      projects: 'bg-purple-500',
      invoices: 'bg-yellow-500',
      time_entries: 'bg-teal-500',
      documents: 'bg-orange-500',
      users: 'bg-pink-500',
    };

    return (
      <Badge className={`${colors[scope] || 'bg-gray-500'} text-white text-xs`}>
        {scope}
      </Badge>
    );
  };

  const getStatusCodeBadge = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) {
      return <Badge className="bg-green-500 text-white">{statusCode}</Badge>;
    } else if (statusCode >= 400 && statusCode < 500) {
      return <Badge className="bg-yellow-500 text-white">{statusCode}</Badge>;
    } else {
      return <Badge className="bg-red-500 text-white">{statusCode}</Badge>;
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="API Keys">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Key className="w-12 h-12 text-construction-orange animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Loading API keys...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const totalRequests = apiKeys.reduce((sum, key) => sum + key.total_requests, 0);
  const totalErrors = apiKeys.reduce((sum, key) => sum + key.total_errors, 0);
  const activeKeys = apiKeys.filter((k) => k.is_active).length;
  const successRate = totalRequests > 0 ? ((totalRequests - totalErrors) / totalRequests * 100) : 100;

  return (
    <DashboardLayout title="API Key Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-construction-dark flex items-center gap-2">
              <Key className="w-8 h-8 text-construction-orange" />
              API Key Management
            </h1>
            <p className="text-muted-foreground">
              Manage API keys for third-party integrations
            </p>
          </div>
          <Button onClick={() => setShowCreateKey(!showCreateKey)}>
            <Plus className="w-4 h-4 mr-2" />
            Create API Key
          </Button>
        </div>

        {/* New API Key Display */}
        {newKeyVisible && newGeneratedKey && (
          <Card className="border-construction-orange border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-construction-orange" />
                Save Your API Key
              </CardTitle>
              <CardDescription>
                This is the only time you'll see this key. Save it securely!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm flex items-center justify-between">
                <code>{newGeneratedKey}</code>
                <Button size="sm" onClick={() => copyToClipboard(newGeneratedKey)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => {
                  setNewKeyVisible(false);
                  setNewGeneratedKey('');
                  setShowCreateKey(false);
                }}
              >
                I've Saved My Key
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Keys</p>
                  <p className="text-2xl font-bold">{activeKeys}</p>
                </div>
                <Key className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Requests</p>
                  <p className="text-2xl font-bold">{totalRequests.toLocaleString()}</p>
                </div>
                <Activity className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">{successRate.toFixed(1)}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-construction-orange" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Errors</p>
                  <p className="text-2xl font-bold">{totalErrors}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="keys">
          <TabsList>
            <TabsTrigger value="keys">API Keys ({apiKeys.length})</TabsTrigger>
            <TabsTrigger value="logs">Request Logs ({requestLogs.length})</TabsTrigger>
          </TabsList>

          {/* API Keys Tab */}
          <TabsContent value="keys" className="space-y-4">
            {showCreateKey && !newKeyVisible && (
              <Card>
                <CardHeader>
                  <CardTitle>Create New API Key</CardTitle>
                  <CardDescription>
                    Generate a new API key for third-party integrations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Key Name</Label>
                    <Input
                      placeholder="e.g., Production Integration"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Description (Optional)</Label>
                    <Textarea
                      placeholder="Describe what this key will be used for..."
                      value={newKeyDescription}
                      onChange={(e) => setNewKeyDescription(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label>Environment</Label>
                    <div className="flex gap-4 mt-2">
                      <Button
                        type="button"
                        variant={newKeyEnvironment === 'production' ? 'default' : 'outline'}
                        onClick={() => setNewKeyEnvironment('production')}
                      >
                        Production
                      </Button>
                      <Button
                        type="button"
                        variant={newKeyEnvironment === 'sandbox' ? 'default' : 'outline'}
                        onClick={() => setNewKeyEnvironment('sandbox')}
                      >
                        Sandbox
                      </Button>
                      <Button
                        type="button"
                        variant={newKeyEnvironment === 'development' ? 'default' : 'outline'}
                        onClick={() => setNewKeyEnvironment('development')}
                      >
                        Development
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Scopes ({newKeyScopes.length} selected)</Label>
                    <div className="border rounded-lg p-4 mt-2 space-y-2">
                      {AVAILABLE_SCOPES.map((scope) => (
                        <div key={scope.value} className="flex items-center gap-2">
                          <Checkbox
                            checked={newKeyScopes.includes(scope.value)}
                            onCheckedChange={() => toggleScopeSelection(scope.value)}
                          />
                          <div>
                            <p className="text-sm font-medium">{scope.label}</p>
                            <p className="text-xs text-muted-foreground">{scope.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={generateAPIKey}>Generate API Key</Button>
                    <Button variant="outline" onClick={() => setShowCreateKey(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {apiKeys.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No API keys created</p>
                  <Button onClick={() => setShowCreateKey(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First API Key
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <Card key={key.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{key.name}</h3>
                            {key.is_active ? (
                              <Badge className="bg-green-500 text-white">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-500 text-white">
                                <XCircle className="w-3 h-3 mr-1" />
                                Disabled
                              </Badge>
                            )}
                            <Badge variant="outline" className="capitalize">
                              {key.environment}
                            </Badge>
                          </div>
                          {key.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {key.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1 mb-2">
                            {key.scopes.map((scope) => getScopeBadge(scope))}
                          </div>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {key.key_prefix}...
                          </code>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Requests</p>
                          <p className="font-semibold">{key.total_requests.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Errors</p>
                          <p className="font-semibold">{key.total_errors}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Last Used</p>
                          <p className="font-semibold">
                            {key.last_used_at
                              ? new Date(key.last_used_at).toLocaleDateString()
                              : 'Never'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Rate Limit</p>
                          <p className="font-semibold">{key.rate_limit_per_minute}/min</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={key.is_active ? 'outline' : 'default'}
                          onClick={() => toggleAPIKey(key.id, key.is_active)}
                        >
                          {key.is_active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteAPIKey(key.id, key.name)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Request Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Recent API requests and responses
            </p>

            {requestLogs.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No API requests logged yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {requestLogs.map((log) => (
                  <Card key={log.id}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Badge variant="outline" className="font-mono">
                            {log.method}
                          </Badge>
                          <code className="text-sm">{log.endpoint}</code>
                          {getStatusCodeBadge(log.status_code)}
                          {log.success ? (
                            <Badge className="bg-green-500 text-white">Success</Badge>
                          ) : (
                            <Badge className="bg-red-500 text-white">Failed</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {log.response_time_ms}ms
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                      {log.error_message && (
                        <p className="text-xs text-red-600 mt-2">{log.error_message}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default APIKeyManagement;
