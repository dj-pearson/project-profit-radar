import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Wifi, 
  WifiOff, 
  Download, 
  Upload, 
  Sync, 
  Database,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface OfflineData {
  id: string;
  type: 'project' | 'timesheet' | 'expense' | 'photo' | 'report';
  data: any;
  timestamp: string;
  synced: boolean;
  retryCount: number;
}

interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  inProgress: boolean;
}

export const OfflineCapabilities: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineData, setOfflineData] = useState<OfflineData[]>([]);
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    inProgress: false
  });
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [storageUsage, setStorageUsage] = useState({ used: 0, quota: 0 });
  const { toast } = useToast();

  useEffect(() => {
    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back Online",
        description: "Internet connection restored. Syncing offline data...",
      });
      syncOfflineData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Offline Mode",
        description: "You're now offline. Changes will be synced when connection is restored.",
        variant: "destructive"
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load offline data and check storage
    loadOfflineData();
    checkStorageUsage();

    // Set up periodic sync attempt when online
    const syncInterval = setInterval(() => {
      if (isOnline && offlineData.some(item => !item.synced)) {
        syncOfflineData();
      }
    }, 30000); // Try sync every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
    };
  }, []);

  const loadOfflineData = () => {
    try {
      const stored = localStorage.getItem('offline_data');
      if (stored) {
        const data = JSON.parse(stored);
        setOfflineData(data);
      }

      const lastSync = localStorage.getItem('last_sync_time');
      if (lastSync) {
        setLastSyncTime(lastSync);
      }
    } catch (error) {
      console.error('Error loading offline data:', error);
    }
  };

  const saveOfflineData = (data: OfflineData[]) => {
    try {
      localStorage.setItem('offline_data', JSON.stringify(data));
      setOfflineData(data);
    } catch (error) {
      console.error('Error saving offline data:', error);
      toast({
        title: "Storage Error",
        description: "Failed to save offline data. Storage may be full.",
        variant: "destructive"
      });
    }
  };

  const checkStorageUsage = async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        setStorageUsage({
          used: estimate.usage || 0,
          quota: estimate.quota || 0
        });
      } catch (error) {
        console.error('Error checking storage:', error);
      }
    }
  };

  const addOfflineData = (type: OfflineData['type'], data: any) => {
    const newItem: OfflineData = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: new Date().toISOString(),
      synced: false,
      retryCount: 0
    };

    const updatedData = [...offlineData, newItem];
    saveOfflineData(updatedData);

    if (isOnline) {
      // Try to sync immediately if online
      syncOfflineData();
    }

    return newItem.id;
  };

  const syncOfflineData = async () => {
    if (!isOnline || syncProgress.inProgress) return;

    const unsyncedData = offlineData.filter(item => !item.synced);
    if (unsyncedData.length === 0) return;

    setSyncProgress({
      total: unsyncedData.length,
      completed: 0,
      failed: 0,
      inProgress: true
    });

    const updatedData = [...offlineData];
    let completed = 0;
    let failed = 0;

    for (const item of unsyncedData) {
      try {
        const success = await syncSingleItem(item);
        const index = updatedData.findIndex(d => d.id === item.id);
        
        if (success && index !== -1) {
          updatedData[index].synced = true;
          updatedData[index].retryCount = 0;
          completed++;
        } else if (index !== -1) {
          updatedData[index].retryCount++;
          failed++;
        }
      } catch (error) {
        console.error(`Error syncing item ${item.id}:`, error);
        const index = updatedData.findIndex(d => d.id === item.id);
        if (index !== -1) {
          updatedData[index].retryCount++;
        }
        failed++;
      }

      setSyncProgress(prev => ({ ...prev, completed: completed, failed: failed }));
    }

    saveOfflineData(updatedData);
    
    const now = new Date().toISOString();
    localStorage.setItem('last_sync_time', now);
    setLastSyncTime(now);

    setSyncProgress(prev => ({ ...prev, inProgress: false }));

    if (completed > 0) {
      toast({
        title: "Sync Complete",
        description: `Successfully synced ${completed} items${failed > 0 ? `, ${failed} failed` : ''}`,
      });
    }
  };

  const syncSingleItem = async (item: OfflineData): Promise<boolean> => {
    try {
      const { data: userProfile } = await supabase.auth.getUser();
      if (!userProfile.user) return false;

      switch (item.type) {
        case 'timesheet':
          const { error: timesheetError } = await supabase
            .from('time_entries')
            .insert({
              ...item.data,
              user_id: userProfile.user.id,
              created_at: item.timestamp
            });
          return !timesheetError;

        case 'expense':
          const { error: expenseError } = await supabase
            .from('project_expenses')
            .insert({
              ...item.data,
              submitted_by: userProfile.user.id,
              created_at: item.timestamp
            });
          return !expenseError;

        case 'report':
          const { error: reportError } = await supabase
            .from('daily_reports')
            .insert({
              ...item.data,
              user_id: userProfile.user.id,
              created_at: item.timestamp
            });
          return !reportError;

        case 'photo':
          // Handle photo upload separately
          if (item.data.file) {
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('project-photos')
              .upload(`${Date.now()}-${item.data.filename}`, item.data.file);
            
            if (uploadError) return false;

            const { error: recordError } = await supabase
              .from('project_photos')
              .insert({
                project_id: item.data.project_id,
                url: uploadData.path,
                description: item.data.description,
                user_id: userProfile.user.id,
                created_at: item.timestamp
              });
            
            return !recordError;
          }
          return false;

        default:
          return false;
      }
    } catch (error) {
      console.error('Sync error:', error);
      return false;
    }
  };

  const clearSyncedData = () => {
    const unsyncedData = offlineData.filter(item => !item.synced);
    saveOfflineData(unsyncedData);
    checkStorageUsage();
    
    toast({
      title: "Cleanup Complete",
      description: "Synced offline data has been cleared"
    });
  };

  const clearAllOfflineData = () => {
    saveOfflineData([]);
    localStorage.removeItem('last_sync_time');
    setLastSyncTime(null);
    checkStorageUsage();
    
    toast({
      title: "All Data Cleared",
      description: "All offline data has been removed"
    });
  };

  const retryFailedSync = () => {
    if (isOnline) {
      syncOfflineData();
    } else {
      toast({
        title: "Offline",
        description: "Cannot sync while offline",
        variant: "destructive"
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'timesheet':
        return <Clock className="h-4 w-4" />;
      case 'expense':
        return <Database className="h-4 w-4" />;
      case 'photo':
        return <Download className="h-4 w-4" />;
      case 'report':
        return <Upload className="h-4 w-4" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  const unsyncedCount = offlineData.filter(item => !item.synced).length;
  const failedCount = offlineData.filter(item => !item.synced && item.retryCount > 0).length;

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-success" />
              ) : (
                <WifiOff className="h-5 w-5 text-destructive" />
              )}
              Connection Status
            </CardTitle>
            <Badge variant={isOnline ? "default" : "destructive"}>
              {isOnline ? "Online" : "Offline"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-semibold">{unsyncedCount}</div>
              <div className="text-sm text-muted-foreground">Pending Sync</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold">{failedCount}</div>
              <div className="text-sm text-muted-foreground">Failed Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold">
                {lastSyncTime ? new Date(lastSyncTime).toLocaleDateString() : 'Never'}
              </div>
              <div className="text-sm text-muted-foreground">Last Sync</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Progress */}
      {syncProgress.inProgress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Syncing Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Progress 
                value={(syncProgress.completed / syncProgress.total) * 100} 
                className="w-full" 
              />
              <p className="text-sm text-muted-foreground">
                {syncProgress.completed} of {syncProgress.total} items synced
                {syncProgress.failed > 0 && ` (${syncProgress.failed} failed)`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button 
          onClick={retryFailedSync} 
          disabled={!isOnline || syncProgress.inProgress || unsyncedCount === 0}
          variant="default"
        >
          <Sync className="h-4 w-4 mr-2" />
          Sync Now
        </Button>
        <Button 
          onClick={clearSyncedData} 
          variant="outline"
          disabled={offlineData.length === 0}
        >
          Clear Synced
        </Button>
        <Button 
          onClick={clearAllOfflineData} 
          variant="destructive"
          disabled={offlineData.length === 0}
        >
          Clear All
        </Button>
      </div>

      {/* Offline Data List */}
      <Card>
        <CardHeader>
          <CardTitle>Offline Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {offlineData.length === 0 ? (
              <div className="text-center py-8">
                <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No offline data stored</p>
              </div>
            ) : (
              offlineData.map(item => (
                <Card key={item.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(item.type)}
                      <div>
                        <p className="font-medium capitalize">{item.type.replace('_', ' ')}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.synced ? (
                        <Badge variant="default">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Synced
                        </Badge>
                      ) : item.retryCount > 0 ? (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Failed ({item.retryCount})
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Storage Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Used: {formatBytes(storageUsage.used)}</span>
              <span>Available: {formatBytes(storageUsage.quota - storageUsage.used)}</span>
            </div>
            <Progress 
              value={storageUsage.quota > 0 ? (storageUsage.used / storageUsage.quota) * 100 : 0} 
              className="w-full" 
            />
            <p className="text-xs text-muted-foreground">
              Total quota: {formatBytes(storageUsage.quota)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Hook to use offline capabilities in other components
export const useOfflineCapabilities = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveOfflineData = (type: OfflineData['type'], data: any) => {
    try {
      const stored = localStorage.getItem('offline_data') || '[]';
      const offlineData = JSON.parse(stored);
      
      const newItem: OfflineData = {
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        timestamp: new Date().toISOString(),
        synced: false,
        retryCount: 0
      };

      offlineData.push(newItem);
      localStorage.setItem('offline_data', JSON.stringify(offlineData));
      
      return newItem.id;
    } catch (error) {
      console.error('Error saving offline data:', error);
      return null;
    }
  };

  return {
    isOnline,
    saveOfflineData
  };
};