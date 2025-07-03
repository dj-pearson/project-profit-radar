import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wifi, 
  WifiOff, 
  Download, 
  Upload, 
  Clock, 
  CheckCircle,
  AlertCircle 
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface OfflineData {
  timeEntries: any[];
  dailyReports: any[];
  photos: File[];
  jobCosts: any[];
  lastSync: string | null;
}

const OfflineManager = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineData, setOfflineData] = useState<OfflineData>({
    timeEntries: [],
    dailyReports: [],
    photos: [],
    jobCosts: [],
    lastSync: null
  });
  const [syncInProgress, setSyncInProgress] = useState(false);

  useEffect(() => {
    // Load offline data from localStorage on mount
    loadOfflineData();

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Connection Restored",
        description: "You're back online. Ready to sync data.",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Connection Lost",
        description: "You're now in offline mode. Data will be saved locally.",
        variant: "destructive"
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadOfflineData = () => {
    try {
      const stored = localStorage.getItem('offlineData');
      if (stored) {
        setOfflineData(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading offline data:', error);
    }
  };

  const saveToOfflineStorage = (type: keyof OfflineData, data: any) => {
    try {
      const currentData = { ...offlineData };
      if (type === 'photos') {
        // Handle files differently
        currentData[type] = [...(currentData[type] as File[]), data];
      } else if (type === 'lastSync') {
        currentData[type] = data;
      } else {
        currentData[type] = [...(currentData[type] as any[]), data];
      }
      
      setOfflineData(currentData);
      localStorage.setItem('offlineData', JSON.stringify(currentData));
      
      toast({
        title: "Data Saved Offline",
        description: "Your data has been saved locally and will sync when online.",
      });
    } catch (error) {
      console.error('Error saving offline data:', error);
    }
  };

  const syncOfflineData = async () => {
    if (!isOnline) {
      toast({
        title: "No Connection",
        description: "Please connect to the internet to sync data.",
        variant: "destructive"
      });
      return;
    }

    setSyncInProgress(true);
    let syncedItems = 0;
    const totalItems = offlineData.timeEntries.length + 
                      offlineData.dailyReports.length + 
                      offlineData.jobCosts.length;

    try {
      // Sync time entries
      for (const entry of offlineData.timeEntries) {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        syncedItems++;
      }

      // Sync daily reports
      for (const report of offlineData.dailyReports) {
        await new Promise(resolve => setTimeout(resolve, 500));
        syncedItems++;
      }

      // Sync job costs
      for (const cost of offlineData.jobCosts) {
        await new Promise(resolve => setTimeout(resolve, 500));
        syncedItems++;
      }

      // Clear offline data after successful sync
      const clearedData = {
        timeEntries: [],
        dailyReports: [],
        photos: [],
        jobCosts: [],
        lastSync: new Date().toISOString()
      };
      
      setOfflineData(clearedData);
      localStorage.setItem('offlineData', JSON.stringify(clearedData));

      toast({
        title: "Sync Complete",
        description: `Successfully synced ${syncedItems} items to the server.`,
      });
    } catch (error) {
      console.error('Error syncing data:', error);
      toast({
        title: "Sync Failed",
        description: "Some data could not be synced. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSyncInProgress(false);
    }
  };

  const getPendingItemsCount = () => {
    return offlineData.timeEntries.length + 
           offlineData.dailyReports.length + 
           offlineData.jobCosts.length + 
           offlineData.photos.length;
  };

  const downloadForOfflineUse = async () => {
    try {
      // Simulate downloading essential data for offline use
      toast({
        title: "Downloading Data",
        description: "Preparing data for offline use...",
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: "Download Complete",
        description: "Essential project data is now available offline.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not prepare data for offline use.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-500" />
          )}
          Offline Mode Manager
          <Badge variant={isOnline ? "default" : "destructive"}>
            {isOnline ? "Online" : "Offline"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isOnline && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You're currently offline. Data will be saved locally and synced when connection is restored.
            </AlertDescription>
          </Alert>
        )}

        {getPendingItemsCount() > 0 && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              {getPendingItemsCount()} items pending sync
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={downloadForOfflineUse}
            variant="outline"
            className="flex items-center gap-2"
            disabled={!isOnline}
          >
            <Download className="h-4 w-4" />
            Download for Offline
          </Button>

          <Button
            onClick={syncOfflineData}
            variant="default"
            className="flex items-center gap-2"
            disabled={!isOnline || syncInProgress || getPendingItemsCount() === 0}
          >
            {syncInProgress ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {syncInProgress ? "Syncing..." : "Sync Data"}
          </Button>
        </div>

        {offlineData.lastSync && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4" />
            Last sync: {new Date(offlineData.lastSync).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OfflineManager;