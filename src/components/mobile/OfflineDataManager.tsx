import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Cloud, CloudOff, Download, Upload, RefreshCw, HardDrive, Wifi, WifiOff } from 'lucide-react';

interface OfflineData {
  projects: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  timeEntries: Record<string, unknown>[];
  expenses: Record<string, unknown>[];
  locations: Record<string, unknown>[];
  inspections: Record<string, unknown>[];
}

interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  pendingUploads: number;
  pendingDownloads: number;
  storageUsed: number;
  syncInProgress: boolean;
}

export const OfflineDataManager = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    lastSync: null,
    pendingUploads: 0,
    pendingDownloads: 0,
    storageUsed: 0,
    syncInProgress: false
  });
  const [offlineData, setOfflineData] = useState<OfflineData>({
    projects: [],
    tasks: [],
    timeEntries: [],
    expenses: [],
    locations: [],
    inspections: []
  });
  const [syncProgress, setSyncProgress] = useState(0);
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    initializeOfflineManager();
    setupConnectionMonitor();
    loadOfflineData();
    
    // Check for pending uploads/downloads every 30 seconds
    const interval = setInterval(checkPendingSync, 30000);
    return () => clearInterval(interval);
  }, []);

  const initializeOfflineManager = () => {
    // Initialize IndexedDB for offline storage
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
    
    // Initialize last sync from localStorage
    const lastSyncStr = localStorage.getItem('lastSync');
    if (lastSyncStr) {
      setSyncStatus(prev => ({ ...prev, lastSync: new Date(lastSyncStr) }));
    }
  };

  const setupConnectionMonitor = () => {
    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: true }));
      if (syncStatus.pendingUploads > 0) {
        syncPendingData();
      }
      toast({
        title: "Back Online",
        description: "Connection restored. Syncing pending data...",
      });
    };

    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: false }));
      toast({
        title: "Offline Mode",
        description: "Working offline. Data will sync when connection is restored.",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  };

  const loadOfflineData = async () => {
    try {
      const offlineProjects = JSON.parse(localStorage.getItem('offline_projects') || '[]');
      const offlineTasks = JSON.parse(localStorage.getItem('offline_tasks') || '[]');
      const offlineTimeEntries = JSON.parse(localStorage.getItem('offline_time_entries') || '[]');
      const offlineExpenses = JSON.parse(localStorage.getItem('offline_expenses') || '[]');
      const offlineLocations = JSON.parse(localStorage.getItem('offline_locations') || '[]');
      const offlineInspections = JSON.parse(localStorage.getItem('offline_inspections') || '[]');
      
      setOfflineData({
        projects: offlineProjects,
        tasks: offlineTasks,
        timeEntries: offlineTimeEntries,
        expenses: offlineExpenses,
        locations: offlineLocations,
        inspections: offlineInspections
      });

      // Calculate storage usage
      const totalSize = JSON.stringify({
        offlineProjects,
        offlineTasks,
        offlineTimeEntries,
        offlineExpenses,
        offlineLocations,
        offlineInspections
      }).length;
      
      setSyncStatus(prev => ({ ...prev, storageUsed: Math.round(totalSize / 1024) })); // KB
    } catch (error) {
      console.error('Error loading offline data:', error);
    }
  };

  const checkPendingSync = () => {
    const pendingItems = [
      'pending_time_entries',
      'pending_expenses',
      'pending_locations',
      'pending_inspections',
      'pending_tasks'
    ];

    let totalPending = 0;
    pendingItems.forEach(key => {
      const items = JSON.parse(localStorage.getItem(key) || '[]');
      totalPending += items.length;
    });

    setSyncStatus(prev => ({ ...prev, pendingUploads: totalPending }));
  };

  const downloadEssentialData = async () => {
    if (!syncStatus.isOnline || !userProfile?.company_id) return;

    try {
      setSyncStatus(prev => ({ ...prev, syncInProgress: true }));
      setSyncProgress(0);

      // Download active projects - only essential columns for offline use
      setSyncProgress(20);
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, status, client_name, budget, completion_percentage, start_date, end_date, site_address')
        .eq('company_id', userProfile.company_id)
        .eq('status', 'active')
        .limit(50);

      localStorage.setItem('offline_projects', JSON.stringify(projects || []));

      // Download recent tasks - only essential columns
      setSyncProgress(40);
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, name, description, status, priority, due_date, project_id, assigned_to, completion_percentage, created_at')
        .eq('company_id', userProfile.company_id)
        .gte('created_at', oneMonthAgo)
        .limit(100);

      localStorage.setItem('offline_tasks', JSON.stringify(tasks || []));

      // Download user's recent time entries - only essential columns
      setSyncProgress(60);
      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('id, project_id, user_id, date, hours, notes, status, created_at')
        .eq('user_id', user?.id)
        .gte('date', oneMonthAgo)
        .limit(50);

      localStorage.setItem('offline_time_entries', JSON.stringify(timeEntries || []));

      // Download recent expenses - only essential columns
      setSyncProgress(80);
      const { data: expenses } = await supabase
        .from('expenses')
        .select('id, project_id, amount, category, date, receipt_url, status, description, created_at')
        .eq('company_id', userProfile.company_id)
        .gte('date', oneMonthAgo)
        .limit(50);

      localStorage.setItem('offline_expenses', JSON.stringify(expenses || []));
      setSyncProgress(100);
      localStorage.setItem('lastSync', new Date().toISOString());
      
      setSyncStatus(prev => ({
        ...prev,
        lastSync: new Date(),
        syncInProgress: false
      }));

      await loadOfflineData();
      
      toast({
        title: "Data Downloaded",
        description: "Essential data has been cached for offline use",
      });
    } catch (error) {
      console.error('Error downloading data:', error);
      toast({
        title: "Download Error",
        description: "Failed to download offline data",
        variant: "destructive"
      });
    } finally {
      setSyncStatus(prev => ({ ...prev, syncInProgress: false }));
      setSyncProgress(0);
    }
  };

  const syncPendingData = async () => {
    if (!syncStatus.isOnline) return;

    try {
      setSyncStatus(prev => ({ ...prev, syncInProgress: true }));
      setSyncProgress(0);

      let synced = 0;
      let failed = 0;
      const totalPending = syncStatus.pendingUploads;
      const failures: string[] = [];

      // Supabase RETURNS errors rather than throwing them, so the surrounding
      // try/catch never saw a rejected insert. Every queue below used to clear
      // its localStorage key unconditionally straight after the await, which
      // meant an RLS denial, a constraint violation or a validation failure
      // destroyed the field worker's queued rows and still reported success.
      // Only clear a queue once its rows are actually in the database.
      const flushQueue = async (
        storageKey: string,
        table: 'time_entries' | 'expenses' | 'quality_inspections' | 'tasks',
        label: string,
      ) => {
        const pending = JSON.parse(localStorage.getItem(storageKey) || '[]');
        if (!pending.length) return;

        const { error } = await supabase.from(table).insert(pending);

        if (error) {
          // Leave the queue in place so the next sync retries it.
          console.error(`[offline-sync] ${table} insert failed, keeping ${pending.length} queued`, error);
          failed += pending.length;
          failures.push(`${pending.length} ${label}`);
        } else {
          localStorage.removeItem(storageKey);
          synced += pending.length;
        }

        if (totalPending > 0) {
          setSyncProgress(Math.min(100, ((synced + failed) / totalPending) * 100));
        }
      };

      await flushQueue('pending_time_entries', 'time_entries', 'time entries');
      await flushQueue('pending_expenses', 'expenses', 'expenses');
      await flushQueue('pending_inspections', 'quality_inspections', 'inspections');
      await flushQueue('pending_tasks', 'tasks', 'tasks');

      // pending_locations has no destination table — the original code cleared
      // the queue with a "Mock sync - in production would sync to actual table"
      // comment, so queued locations were being thrown away every sync. They
      // are now left in place rather than silently discarded; see US-300.
      const pendingLocations = JSON.parse(localStorage.getItem('pending_locations') || '[]');
      if (pendingLocations.length > 0) {
        console.error(`[offline-sync] ${pendingLocations.length} queued location(s) have no sync target; keeping them queued`);
      }

      localStorage.setItem('lastSync', new Date().toISOString());

      setSyncStatus(prev => ({
        ...prev,
        lastSync: new Date(),
        pendingUploads: failed + pendingLocations.length,
        syncInProgress: false
      }));

      if (failed > 0) {
        toast({
          title: "Sync Incomplete",
          description: `Synced ${synced} item(s). ${failures.join(', ')} could not be saved and are still queued.`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sync Complete",
        description: `Successfully synced ${synced} items`,
      });
    } catch (error) {
      console.error('Error syncing data:', error);
      toast({
        title: "Sync Error",
        description: "Some items failed to sync. Will retry automatically.",
        variant: "destructive"
      });
    } finally {
      setSyncProgress(0);
      setSyncStatus(prev => ({ ...prev, syncInProgress: false }));
    }
  };

  const clearOfflineData = () => {
    const offlineKeys = [
      'offline_projects',
      'offline_tasks',
      'offline_time_entries',
      'offline_expenses',
      'offline_locations',
      'offline_inspections'
    ];

    offlineKeys.forEach(key => localStorage.removeItem(key));
    
    setOfflineData({
      projects: [],
      tasks: [],
      timeEntries: [],
      expenses: [],
      locations: [],
      inspections: []
    });

    setSyncStatus(prev => ({ ...prev, storageUsed: 0 }));

    toast({
      title: "Cache Cleared",
      description: "All offline data has been removed",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {syncStatus.isOnline ? (
                <Wifi className="h-5 w-5 text-green-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-600" />
              )}
              <CardTitle>Offline Data Manager</CardTitle>
            </div>
            <Badge variant={syncStatus.isOnline ? "default" : "secondary"}>
              {syncStatus.isOnline ? "Online" : "Offline"}
            </Badge>
          </div>
          <CardDescription>
            Manage offline data sync and storage for mobile use
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sync Status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Upload className="h-4 w-4 text-orange-600" />
              </div>
              <div className="text-2xl font-bold">{syncStatus.pendingUploads}</div>
              <div className="text-sm text-muted-foreground">Pending Uploads</div>
            </div>
            
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <HardDrive className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold">{syncStatus.storageUsed}</div>
              <div className="text-sm text-muted-foreground">KB Cached</div>
            </div>
            
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Cloud className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-2xl font-bold">
                {offlineData.projects.length + offlineData.tasks.length + offlineData.timeEntries.length}
              </div>
              <div className="text-sm text-muted-foreground">Items Cached</div>
            </div>
            
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <RefreshCw className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-2xl font-bold">
                {syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleDateString() : 'Never'}
              </div>
              <div className="text-sm text-muted-foreground">Last Sync</div>
            </div>
          </div>

          {/* Sync Progress */}
          {syncStatus.syncInProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Syncing data...</span>
                <span>{Math.round(syncProgress)}%</span>
              </div>
              <Progress value={syncProgress} className="w-full" />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={downloadEssentialData}
              disabled={!syncStatus.isOnline || syncStatus.syncInProgress}
              variant="default"
            >
              <Download className="h-4 w-4 mr-2" />
              Download for Offline
            </Button>
            
            <Button
              onClick={syncPendingData}
              disabled={!syncStatus.isOnline || syncStatus.pendingUploads === 0 || syncStatus.syncInProgress}
              variant="outline"
            >
              <Upload className="h-4 w-4 mr-2" />
              Sync Pending ({syncStatus.pendingUploads})
            </Button>
            
            <Button
              onClick={clearOfflineData}
              disabled={syncStatus.syncInProgress}
              variant="destructive"
            >
              Clear Cache
            </Button>
          </div>

          {/* Offline Data Summary */}
          <div className="space-y-3">
            <h4 className="font-medium">Cached Data</h4>
            <div className="grid gap-2">
              <div className="flex justify-between text-sm">
                <span>Projects:</span>
                <Badge variant="outline">{offlineData.projects.length} items</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tasks:</span>
                <Badge variant="outline">{offlineData.tasks.length} items</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Time Entries:</span>
                <Badge variant="outline">{offlineData.timeEntries.length} items</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Expenses:</span>
                <Badge variant="outline">{offlineData.expenses.length} items</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Locations:</span>
                <Badge variant="outline">{offlineData.locations.length} items</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Inspections:</span>
                <Badge variant="outline">{offlineData.inspections.length} items</Badge>
              </div>
            </div>
          </div>

          {/* Status Alerts */}
          {!syncStatus.isOnline && (
            <Alert>
              <CloudOff className="h-4 w-4" />
              <AlertDescription>
                You're working offline. New data will be saved locally and synced when connection is restored.
              </AlertDescription>
            </Alert>
          )}

          {syncStatus.pendingUploads > 0 && syncStatus.isOnline && (
            <Alert>
              <Upload className="h-4 w-4" />
              <AlertDescription>
                You have {syncStatus.pendingUploads} items waiting to sync. Click "Sync Pending" to upload them now.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};