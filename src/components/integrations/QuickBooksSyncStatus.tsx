import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Settings,
  DollarSign,
  XCircle,
  Loader2
} from 'lucide-react';

interface QuickBooksSyncStatusProps {
  compact?: boolean;
}

export const QuickBooksSyncStatus = ({ compact = false }: QuickBooksSyncStatusProps) => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState({
    connected: false,
    company_name: '',
    last_sync: null as string | null,
    sync_status: 'never' as 'success' | 'error' | 'pending' | 'never'
  });

  useEffect(() => {
    if (userProfile?.company_id) {
      loadStatus();
    }
  }, [userProfile?.company_id]);

  const loadStatus = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('quickbooks_integrations')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .single();

      if (error || !data) {
        setStatus({
          connected: false,
          company_name: '',
          last_sync: null,
          sync_status: 'never'
        });
      } else {
        setStatus({
          connected: data.is_connected,
          company_name: data.qb_company_name || 'QuickBooks Online',
          last_sync: data.last_sync_at,
          sync_status: data.last_sync_status as 'success' | 'error' | 'pending' | 'never'
        });
      }
    } catch (error) {
      console.error('Error loading QuickBooks status:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerSync = async () => {
    try {
      setSyncing(true);

      const { error } = await supabase.functions.invoke('quickbooks-sync', {
        body: {
          company_id: userProfile?.company_id,
          sync_type: 'incremental'
        }
      });

      if (error) throw error;

      toast({
        title: "Sync Started",
        description: "QuickBooks sync initiated. This may take a few minutes."
      });

      // Refresh status after a delay
      setTimeout(() => {
        loadStatus();
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

  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'Never';

    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading QuickBooks status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not connected state
  if (!status.connected) {
    return (
      <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950 mb-6">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="font-semibold text-orange-900 dark:text-orange-100">
                QuickBooks Not Connected
              </h3>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                Connect to sync financial data automatically and save hours of manual entry
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => navigate('/integrations')}
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Connect QuickBooks
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Connected with error state
  if (status.sync_status === 'error') {
    return (
      <Card className="border-red-500 bg-red-50 dark:bg-red-950 mb-6">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-100">
                QuickBooks Sync Error
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                Last sync failed. Please check your connection or try syncing again.
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={triggerSync}
              disabled={syncing}
              className="border-red-600 text-red-600 hover:bg-red-100"
            >
              {syncing ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Try Again
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/integrations')}
              className="text-red-600 hover:bg-red-100"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Connected and working state
  return (
    <Card className="border-green-500 bg-green-50 dark:bg-green-950 mb-6">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {syncing ? (
              <RefreshCw className="h-8 w-8 text-green-600 dark:text-green-400 animate-spin" />
            ) : (
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-green-900 dark:text-green-100">
                QuickBooks Connected
              </h3>
              <Badge className="bg-green-600 text-white hover:bg-green-700">
                {status.company_name}
              </Badge>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">
              {syncing ? (
                'Syncing data...'
              ) : (
                <>
                  Last synced: {getTimeAgo(status.last_sync)}
                  {status.last_sync && (
                    <span className="ml-2 text-xs opacity-75">
                      ({new Date(status.last_sync).toLocaleString()})
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={triggerSync}
            disabled={syncing}
            className="border-green-600 text-green-600 hover:bg-green-100"
          >
            {syncing ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sync Now
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/integrations')}
            className="text-green-600 hover:bg-green-100"
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
