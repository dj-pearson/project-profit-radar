import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  DollarSign, 
  FileText, 
  Users, 
  Calendar,
  ArrowUpDown,
  TrendingUp
} from 'lucide-react';
import { QuickBooksSync } from './QuickBooksSync';

interface QBIntegrationStatus {
  connected: boolean;
  company_name?: string;
  last_sync?: string;
  sync_status: 'success' | 'error' | 'pending' | 'never';
  error_message?: string;
}

interface SyncStats {
  invoices_synced: number;
  customers_synced: number;
  items_synced: number;
  errors: number;
  last_sync_duration: number;
}

export const QuickBooksIntegration = () => {
  const { userProfile } = useAuth();
  const [status, setStatus] = useState<QBIntegrationStatus>({
    connected: false,
    sync_status: 'never'
  });
  const [syncStats, setSyncStats] = useState<SyncStats>({
    invoices_synced: 0,
    customers_synced: 0,
    items_synced: 0,
    errors: 0,
    last_sync_duration: 0
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (userProfile?.company_id) {
      loadIntegrationStatus();
    }
  }, [userProfile?.company_id]);

  const loadIntegrationStatus = async () => {
    try {
      setLoading(true);
      
      // Check integration status
      const { data: integration, error } = await supabase
        .from('quickbooks_integrations')
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (integration) {
        setStatus({
          connected: integration.is_connected,
          company_name: integration.qb_company_name,
          last_sync: integration.last_sync_at,
          sync_status: integration.last_sync_status || 'never',
          error_message: integration.last_error_message
        });

        // Load sync stats
        const { data: stats } = await supabase
          .from('quickbooks_sync_logs')
          .select('*')
          .eq('company_id', userProfile?.company_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (stats) {
          setSyncStats({
            invoices_synced: stats.records_processed?.invoices || 0,
            customers_synced: stats.records_processed?.customers || 0,
            items_synced: stats.records_processed?.items || 0,
            errors: stats.errors_count || 0,
            last_sync_duration: stats.duration_seconds || 0
          });
        }
      }
    } catch (error: any) {
      console.error('Error loading QuickBooks status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load QuickBooks integration status"
      });
    } finally {
      setLoading(false);
    }
  };

  const initiateConnection = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('quickbooks-connect', {
        body: { 
          company_id: userProfile?.company_id,
          redirect_uri: `${window.location.origin}/quickbooks/callback`
        }
      });

      if (error) throw error;

      // Redirect to QuickBooks OAuth
      window.location.href = data.auth_url;

    } catch (error: any) {
      console.error('Error initiating QuickBooks connection:', error);
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: "Failed to connect to QuickBooks. Please try again."
      });
      setLoading(false);
    }
  };

  const disconnectQuickBooks = async () => {
    if (!confirm('Are you sure you want to disconnect from QuickBooks? This will stop all automatic syncing.')) {
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.functions.invoke('quickbooks-disconnect', {
        body: { company_id: userProfile?.company_id }
      });

      if (error) throw error;

      setStatus({
        connected: false,
        sync_status: 'never'
      });

      toast({
        title: "Disconnected",
        description: "Successfully disconnected from QuickBooks"
      });

    } catch (error: any) {
      console.error('Error disconnecting QuickBooks:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to disconnect from QuickBooks"
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerSync = async (syncType: 'full' | 'incremental' = 'incremental') => {
    try {
      setSyncing(true);

      const { data, error } = await supabase.functions.invoke('quickbooks-sync', {
        body: { 
          company_id: userProfile?.company_id,
          sync_type: syncType
        }
      });

      if (error) throw error;

      toast({
        title: "Sync Started",
        description: `${syncType === 'full' ? 'Full' : 'Incremental'} sync initiated. This may take a few minutes.`
      });

      // Refresh status after a delay
      setTimeout(() => {
        loadIntegrationStatus();
        setSyncing(false);
      }, 3000);

    } catch (error: any) {
      console.error('Error triggering sync:', error);
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: "Failed to start sync. Please try again."
      });
      setSyncing(false);
    }
  };

  const getStatusBadge = () => {
    if (!status.connected) return <Badge variant="secondary">Not Connected</Badge>;
    
    switch (status.sync_status) {
      case 'success':
        return <Badge className="bg-green-500 text-white">Synced</Badge>;
      case 'error':
        return <Badge variant="destructive">Sync Error</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500 text-white">Syncing</Badge>;
      default:
        return <Badge variant="outline">Never Synced</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>QuickBooks Online Integration</span>
            </div>
            {getStatusBadge()}
          </CardTitle>
          <CardDescription>
            {status.connected 
              ? `Connected to ${status.company_name || 'QuickBooks Online'}`
              : 'Connect your QuickBooks Online account for automatic data synchronization'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!status.connected ? (
            <div className="text-center py-6">
              <Button onClick={initiateConnection} disabled={loading}>
                Connect to QuickBooks Online
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                You'll be redirected to QuickBooks to authorize the connection
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {status.sync_status === 'error' && status.error_message && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Last Sync Error:</strong> {status.error_message}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Last synced: {status.last_sync 
                      ? new Date(status.last_sync).toLocaleString()
                      : 'Never'
                    }
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => triggerSync('incremental')}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                    )}
                    Quick Sync
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => triggerSync('full')}
                    disabled={syncing}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Full Sync
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={disconnectQuickBooks}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>

              {/* Sync Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{syncStats.invoices_synced}</div>
                  <div className="text-xs text-muted-foreground">Invoices Synced</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{syncStats.customers_synced}</div>
                  <div className="text-xs text-muted-foreground">Customers Synced</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{syncStats.items_synced}</div>
                  <div className="text-xs text-muted-foreground">Items Synced</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-destructive">{syncStats.errors}</div>
                  <div className="text-xs text-muted-foreground">Errors</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration */}
      {status.connected && (
        <Tabs defaultValue="sync" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sync">Sync Settings</TabsTrigger>
            <TabsTrigger value="mapping">Field Mapping</TabsTrigger>
            <TabsTrigger value="logs">Sync Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="sync">
            <QuickBooksSync />
          </TabsContent>

          <TabsContent value="mapping">
            <Card>
              <CardHeader>
                <CardTitle>Field Mapping</CardTitle>
                <CardDescription>
                  Configure how data is mapped between your system and QuickBooks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Field mapping configuration will be available in the next update.
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Sync Activity</CardTitle>
                <CardDescription>
                  View recent synchronization activity and any errors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Last sync completed successfully</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {status.last_sync ? new Date(status.last_sync).toLocaleString() : 'Never'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};