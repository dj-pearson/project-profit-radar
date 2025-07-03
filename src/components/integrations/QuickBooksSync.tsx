import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  DollarSign, 
  FileText, 
  Users, 
  Calendar,
  Settings
} from 'lucide-react';

interface QuickBooksConfig {
  id?: string;
  company_id: string;
  is_connected: boolean;
  client_id?: string;
  client_secret?: string;
  sandbox_mode: boolean;
  auto_sync_enabled: boolean;
  sync_frequency: string;
  last_sync: string | null;
  sync_settings: {
    sync_invoices: boolean;
    sync_customers: boolean;
    sync_items: boolean;
    sync_expenses: boolean;
    sync_payments: boolean;
  };
}

export const QuickBooksSync = () => {
  const { userProfile } = useAuth();
  const [config, setConfig] = useState<QuickBooksConfig>({
    company_id: userProfile?.company_id || '',
    is_connected: false,
    sandbox_mode: true,
    auto_sync_enabled: false,
    sync_frequency: 'daily',
    last_sync: null,
    sync_settings: {
      sync_invoices: true,
      sync_customers: true,
      sync_items: true,
      sync_expenses: true,
      sync_payments: true
    }
  });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadQuickBooksConfig();
  }, [userProfile?.company_id]);

  const loadQuickBooksConfig = async () => {
    if (!userProfile?.company_id) return;

    try {
      setLoading(true);
      // In real implementation, would load from a quickbooks_config table
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', userProfile.company_id)
        .single();

      if (error) throw error;

      // For now, just show mock configuration
      setConfig(prev => ({ ...prev, company_id: userProfile.company_id }));
    } catch (error) {
      console.error('Error loading QuickBooks config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      // In real implementation, would initiate OAuth flow with QuickBooks
      // For now, simulate connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setConfig(prev => ({ 
        ...prev, 
        is_connected: true,
        last_sync: new Date().toISOString()
      }));

      toast({
        title: "QuickBooks Connected",
        description: "Successfully connected to QuickBooks Online"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: "Failed to connect to QuickBooks. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      setConfig(prev => ({ 
        ...prev, 
        is_connected: false,
        last_sync: null
      }));

      toast({
        title: "QuickBooks Disconnected",
        description: "Successfully disconnected from QuickBooks"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to disconnect from QuickBooks"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!config.is_connected) return;

    setSyncing(true);
    try {
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setConfig(prev => ({ 
        ...prev,
        last_sync: new Date().toISOString()
      }));

      toast({
        title: "Sync Complete",
        description: "Successfully synced data with QuickBooks"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: "Failed to sync with QuickBooks. Please try again."
      });
    } finally {
      setSyncing(false);
    }
  };

  const updateSyncSettings = (key: keyof typeof config.sync_settings, value: boolean) => {
    setConfig(prev => ({
      ...prev,
      sync_settings: {
        ...prev.sync_settings,
        [key]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>QuickBooks Online Integration</span>
          </CardTitle>
          <CardDescription>
            Automatically sync your project data with QuickBooks Online
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${config.is_connected ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="font-medium">
                {config.is_connected ? 'Connected' : 'Not Connected'}
              </span>
              <Badge variant={config.is_connected ? 'default' : 'secondary'}>
                {config.is_connected ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {config.is_connected ? (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualSync}
                  disabled={syncing}
                >
                  {syncing ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={loading}
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button onClick={handleConnect} disabled={loading}>
                {loading ? 'Connecting...' : 'Connect to QuickBooks'}
              </Button>
            )}
          </div>

          {config.is_connected && config.last_sync && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Last synced: {new Date(config.last_sync).toLocaleString()}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Sync Settings */}
      {config.is_connected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Sync Settings</span>
            </CardTitle>
            <CardDescription>
              Configure what data to sync with QuickBooks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Auto Sync</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically sync data based on schedule
                </p>
              </div>
              <Switch
                checked={config.auto_sync_enabled}
                onCheckedChange={(checked) => 
                  setConfig(prev => ({ ...prev, auto_sync_enabled: checked }))
                }
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <Label className="text-base">Data Types to Sync</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>Invoices</span>
                  </div>
                  <Switch
                    checked={config.sync_settings.sync_invoices}
                    onCheckedChange={(checked) => updateSyncSettings('sync_invoices', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>Customers</span>
                  </div>
                  <Switch
                    checked={config.sync_settings.sync_customers}
                    onCheckedChange={(checked) => updateSyncSettings('sync_customers', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Items & Services</span>
                  </div>
                  <Switch
                    checked={config.sync_settings.sync_items}
                    onCheckedChange={(checked) => updateSyncSettings('sync_items', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Expenses</span>
                  </div>
                  <Switch
                    checked={config.sync_settings.sync_expenses}
                    onCheckedChange={(checked) => updateSyncSettings('sync_expenses', checked)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync History */}
      {config.is_connected && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Sync Activity</CardTitle>
            <CardDescription>
              View recent synchronization history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Full sync completed</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {config.last_sync ? new Date(config.last_sync).toLocaleString() : 'Never'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};