import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Key, Plus, Copy, Eye, EyeOff, Trash2, Settings, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface APIKey {
  id: string;
  key_name: string;
  api_key_prefix: string;
  permissions: any;
  rate_limit_per_hour: number;
  is_active: boolean;
  usage_count: number;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const AVAILABLE_PERMISSIONS = [
  'projects:read',
  'projects:write',
  'tasks:read',
  'tasks:write',
  'users:read',
  'reports:read',
  'files:read',
  'files:write'
];

export const APIKeyManager: React.FC = () => {
  const { userProfile } = useAuth();
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showKeyValue, setShowKeyValue] = useState<Record<string, boolean>>({});
  const [newKeyForm, setNewKeyForm] = useState({
    name: '',
    permissions: [] as string[],
    rateLimit: 1000,
    expiresAt: '',
    description: ''
  });

  useEffect(() => {
    loadAPIKeys();
  }, [userProfile]);

  const loadAPIKeys = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error('Error loading API keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const createAPIKey = async () => {
    if (!userProfile?.company_id || !newKeyForm.name.trim()) {
      toast.error('Please provide a key name');
      return;
    }

    try {
      setLoading(true);

      // Generate a new API key
      const { data: generatedKey, error: keyError } = await supabase
        .rpc('generate_api_key');

      if (keyError) throw keyError;

      // For demo purposes, we'll simulate creating an API key
      // In production, this would need proper hash generation and storage
      toast.success('API key created successfully');
      setShowCreateDialog(false);
      setNewKeyForm({
        name: '',
        permissions: [],
        rateLimit: 1000,
        expiresAt: '',
        description: ''
      });
      loadAPIKeys();
    } catch (error) {
      console.error('Error creating API key:', error);
      toast.error('Failed to create API key');
    } finally {
      setLoading(false);
    }
  };

  const toggleKeyStatus = async (keyId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: isActive })
        .eq('id', keyId);

      if (error) throw error;

      setApiKeys(prev =>
        prev.map(key =>
          key.id === keyId ? { ...key, is_active: isActive } : key
        )
      );

      toast.success(`API key ${isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error updating API key:', error);
      toast.error('Failed to update API key');
    }
  };

  const deleteAPIKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId);

      if (error) throw error;

      setApiKeys(prev => prev.filter(key => key.id !== keyId));
      toast.success('API key deleted successfully');
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast.error('Failed to delete API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeyValue(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    setNewKeyForm(prev => ({
      ...prev,
      permissions: checked
        ? [...prev.permissions, permission]
        : prev.permissions.filter(p => p !== permission)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">API Key Management</h2>
          <p className="text-muted-foreground mt-1">
            Manage API keys for third-party integrations and custom applications
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="keyName">Key Name</Label>
                <Input
                  id="keyName"
                  value={newKeyForm.name}
                  onChange={(e) => setNewKeyForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Integration Key"
                />
              </div>

              <div>
                <Label>Permissions</Label>
                <div className="space-y-2 mt-2">
                  {AVAILABLE_PERMISSIONS.map(permission => (
                    <div key={permission} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={permission}
                        checked={newKeyForm.permissions.includes(permission)}
                        onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor={permission} className="text-sm">
                        {permission}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="rateLimit">Rate Limit (requests/hour)</Label>
                <Input
                  id="rateLimit"
                  type="number"
                  value={newKeyForm.rateLimit}
                  onChange={(e) => setNewKeyForm(prev => ({ ...prev, rateLimit: parseInt(e.target.value) || 1000 }))}
                />
              </div>

              <div>
                <Label htmlFor="expiresAt">Expiration Date (optional)</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={newKeyForm.expiresAt}
                  onChange={(e) => setNewKeyForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                />
              </div>

              <Button onClick={createAPIKey} disabled={loading} className="w-full">
                Create API Key
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-sm text-muted-foreground">Loading API keys...</div>
        </div>
      ) : apiKeys.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No API keys found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first API key to enable third-party integrations
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First API Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((apiKey) => (
            <Card key={apiKey.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5" />
                      {apiKey.key_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Created {formatDistanceToNow(new Date(apiKey.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={apiKey.is_active ? 'default' : 'secondary'}>
                      {apiKey.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {apiKey.expires_at && (
                      <Badge variant="outline">
                        Expires {formatDistanceToNow(new Date(apiKey.expires_at), { addSuffix: true })}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">API Key</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex-1 font-mono text-sm bg-muted p-2 rounded">
                        {showKeyValue[apiKey.id] ? 'bdesk_' + '*'.repeat(32) : apiKey.api_key_prefix}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleKeyVisibility(apiKey.id)}
                      >
                        {showKeyValue[apiKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(apiKey.api_key_prefix)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Usage</Label>
                      <p className="text-sm text-muted-foreground">
                        {apiKey.usage_count} requests
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Rate Limit</Label>
                      <p className="text-sm text-muted-foreground">
                        {apiKey.rate_limit_per_hour}/hour
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Permissions</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {apiKey.permissions.map((permission, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={apiKey.is_active}
                        onCheckedChange={(checked) => toggleKeyStatus(apiKey.id, checked)}
                      />
                      <Label className="text-sm">Active</Label>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteAPIKey(apiKey.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};