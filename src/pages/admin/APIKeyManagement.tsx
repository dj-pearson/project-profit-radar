import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Key, Copy, CheckCircle, XCircle, Activity, TrendingUp, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { useAPIKeyManagement, API_KEY_PERMISSIONS } from '@/hooks/useAPIKeyManagement';
import { ErrorState } from '@/components/common/ErrorState';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { confirmAction } from "@/components/ui/confirm-dialog";
import { DataTablePageSkeleton } from '@/components/ui/skeletons';
import { formatDate } from '@/lib/format';

export const APIKeyManagement = () => {
  const { toast } = useToast();
  const api = useAPIKeyManagement();
  const apiKeys = api.data?.keys ?? [];
  const requestLogs = api.data?.logs ?? [];

  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyVisible, setNewKeyVisible] = useState(false);
  const [newGeneratedKey, setNewGeneratedKey] = useState('');
  const [creating, setCreating] = useState(false);

  // New API key form
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['projects:read']);

  const failed = (description: string, error: unknown) => {
    console.error(description, error);
    toast({
      title: 'Error',
      description: error instanceof Error && error.message ? error.message : description,
      variant: 'destructive',
    });
  };

  const generateAPIKey = async () => {
    if (!newKeyName.trim()) {
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
        description: 'Please select at least one permission.',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      // Generated, hashed (SHA-256) and stored by api-management, which also
      // sets the company and writes the audit log. This used to build the key
      // from Math.random() in the browser and store btoa(key), which the
      // server's SHA-256 check never matched.
      const key = await api.create(newKeyName.trim(), newKeyScopes);
      setNewGeneratedKey(key);
      setNewKeyVisible(true);

      toast({
        title: 'API Key Created',
        description: 'Save this key securely. You won\'t be able to see it again.',
      });

      setNewKeyName('');
      setNewKeyScopes(['projects:read']);
    } catch (error) {
      failed('Failed to create API key.', error);
    } finally {
      setCreating(false);
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
      await api.setActive(keyId, !currentStatus);
      toast({
        title: currentStatus ? 'API Key Disabled' : 'API Key Enabled',
        description: currentStatus
          ? 'API key has been disabled.'
          : 'API key is now active.',
      });
    } catch (error) {
      failed('Failed to update API key.', error);
    }
  };

  const deleteAPIKey = async (keyId: string, keyName: string) => {
    if (!(await confirmAction({ title: `Are you sure you want to delete the API key "${keyName}"?`, description: `This action cannot be undone.`, destructive: true }))) {
      return;
    }

    try {
      await api.remove(keyId);
      toast({
        title: 'API Key Deleted',
        description: `API key "${keyName}" has been deleted.`,
      });
    } catch (error) {
      failed('Failed to delete API key.', error);
    }
  };

  const toggleScopeSelection = (scope: string) => {
    setNewKeyScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const getScopeBadge = (scope: string) => {
    const colors: Record<string, string> = {
      'projects:read': 'bg-blue-500',
      'projects:write': 'bg-green-500',
      'estimates:read': 'bg-purple-500',
      'invoices:read': 'bg-yellow-500',
    };

    return (
      <Badge key={scope} className={`${colors[scope] || 'bg-gray-500'} text-white text-xs`}>
        {scope}
      </Badge>
    );
  };

  const getStatusCodeBadge = (statusCode: number | null) => {
    if (statusCode == null) {
      return <Badge variant="outline">No status</Badge>;
    }
    if (statusCode >= 200 && statusCode < 300) {
      return <Badge className="bg-green-500 text-white">{statusCode}</Badge>;
    } else if (statusCode >= 400 && statusCode < 500) {
      return <Badge className="bg-yellow-500 text-white">{statusCode}</Badge>;
    } else {
      return <Badge className="bg-red-500 text-white">{statusCode}</Badge>;
    }
  };

  if (api.isLoading) {
    return (
      <AccessiblePageWrapper pageTitle="API Keys">
      <DashboardLayout hasAccessibleWrapper title="API Keys">
        <DataTablePageSkeleton label="Loading API keys" />
      </DashboardLayout>
      </AccessiblePageWrapper>
    );
  }

  const loaded = !!api.data && !api.error;
  const totalRequests = api.data?.totalRequests ?? 0;
  const totalErrors = api.data?.totalErrors ?? 0;
  const activeKeys = apiKeys.filter((k) => k.is_active).length;
  // No requests is no rate, not 100%.
  const successRate = totalRequests > 0 ? ((totalRequests - totalErrors) / totalRequests * 100) : null;

  return (
    <AccessiblePageWrapper pageTitle="API Key Management">
    <DashboardLayout hasAccessibleWrapper
      title="API Key Management"
      description="Manage API keys for third-party integrations"
      headerActions={
        <Button onClick={() => setShowCreateKey(!showCreateKey)}>
          <Plus className="w-4 h-4 mr-2" />
          Create API Key
        </Button>
      }
    >
      <div className="space-y-6">
        {api.error && (
          <ErrorState
            inline
            title="API keys could not be loaded"
            error={api.error}
            onRetry={() => { void api.refetch(); }}
          />
        )}

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
                  <p className="text-2xl font-bold">{loaded ? activeKeys : '--'}</p>
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
                  <p className="text-2xl font-bold">{loaded ? totalRequests.toLocaleString() : '--'}</p>
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
                  <p className="text-2xl font-bold">{loaded && successRate != null ? `${successRate.toFixed(1)}%` : '--'}</p>
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
                  <p className="text-2xl font-bold">{loaded ? totalErrors : '--'}</p>
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
                    <Label>Permissions ({newKeyScopes.length} selected)</Label>
                    <div className="border rounded-lg p-4 mt-2 space-y-2">
                      {API_KEY_PERMISSIONS.map((scope) => (
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
                    <Button onClick={generateAPIKey} disabled={creating}>{creating ? 'Generating...' : 'Generate API Key'}</Button>
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
                          </div>
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
                          <p className="font-semibold">{key.usage_count.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Expires</p>
                          <p className="font-semibold">
                            {key.expires_at ? formatDate(key.expires_at) : 'Never'}
                          </p>
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
                          <p className="font-semibold">{key.rate_limit_per_hour}/hour</p>
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
                          {log.response_time_ms != null && (
                            <span className="text-xs text-muted-foreground">
                              {log.response_time_ms}ms
                            </span>
                          )}
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
    </AccessiblePageWrapper>
  );
};

export default APIKeyManagement;
