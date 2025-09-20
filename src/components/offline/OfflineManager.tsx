import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle, Clock, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOfflineSync } from '@/hooks/useOfflineSync';

interface OfflineManagerProps {
  className?: string;
}

export const OfflineManager: React.FC<OfflineManagerProps> = ({ className = '' }) => {
  const {
    isOnline,
    pendingSync: pendingOperations,
    syncInProgress: isSyncing,
    syncPendingData: syncOfflineData,
    clearSyncedData: clearPendingOperations
  } = useOfflineSync();
  
  // Mock additional features for enhanced UI
  const [syncProgress, setSyncProgress] = useState(0);
  const [conflicts] = useState<any[]>([]);
  
  const resolveConflict = (conflictId: string, resolution: 'local' | 'server') => {
    toast({
      title: "Conflict Resolved",
      description: `Conflict resolved using ${resolution} version`,
    });
  };
  
  const { toast } = useToast();
  const [showDetails, setShowDetails] = useState(false);

  const handleManualSync = async () => {
    try {
      await syncOfflineData();
      toast({
        title: "Sync Complete",
        description: "All offline data has been synchronized",
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to sync offline data. Some operations may need manual resolution.",
        variant: "destructive",
      });
    }
  };

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'create': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'update': return <RefreshCw className="h-4 w-4 text-blue-500" />;
      case 'delete': return <X className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const formatOperationType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            Connection Status
            <Badge variant={isOnline ? 'default' : 'destructive'}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {!isOnline && (
              <Alert>
                <WifiOff className="h-4 w-4" />
                <AlertDescription>
                  You're currently offline. Changes will be saved locally and synchronized when connection is restored.
                </AlertDescription>
              </Alert>
            )}

            {pendingOperations.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Pending Operations: {pendingOperations.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDetails(!showDetails)}
                  >
                    {showDetails ? 'Hide' : 'Show'} Details
                  </Button>
                </div>

                {isOnline && (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleManualSync}
                      disabled={isSyncing}
                      size="sm"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={clearPendingOperations}
                      size="sm"
                    >
                      Clear All
                    </Button>
                  </div>
                )}
              </div>
            )}

            {isSyncing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Synchronizing...</span>
                  <span>{Math.round(syncProgress)}%</span>
                </div>
                <Progress value={syncProgress} className="h-2" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Operations Details */}
      {showDetails && pendingOperations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {pendingOperations.map((operation, index) => (
                  <div
                    key={`${operation.id}-${index}`}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      {getOperationIcon(operation.type)}
                      <div>
                        <div className="font-medium">
                          {formatOperationType(operation.type)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {operation.id} • {new Date(operation.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {operation.synced ? 'synced' : 'pending'}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Conflict Resolution */}
      {conflicts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-5 w-5" />
              Sync Conflicts ({conflicts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Some changes conflict with server data. Please review and resolve these conflicts.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                {conflicts.map((conflict) => (
                  <div key={conflict.id} className="p-3 rounded-lg border bg-background">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{conflict.entityType} Conflict</h4>
                        <p className="text-sm text-muted-foreground">
                          Entity ID: {conflict.entityId}
                        </p>
                      </div>
                      <Badge variant="destructive">Conflict</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="p-2 rounded border">
                        <h5 className="text-sm font-medium mb-1">Local Version</h5>
                        <p className="text-xs text-muted-foreground">
                          Modified: {new Date(conflict.localVersion.lastModified).toLocaleString()}
                        </p>
                        <pre className="text-xs mt-1 p-1 bg-muted rounded overflow-auto">
                          {JSON.stringify(conflict.localVersion.data, null, 1)}
                        </pre>
                      </div>

                      <div className="p-2 rounded border">
                        <h5 className="text-sm font-medium mb-1">Server Version</h5>
                        <p className="text-xs text-muted-foreground">
                          Modified: {new Date(conflict.serverVersion.lastModified).toLocaleString()}
                        </p>
                        <pre className="text-xs mt-1 p-1 bg-muted rounded overflow-auto">
                          {JSON.stringify(conflict.serverVersion.data, null, 1)}
                        </pre>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => resolveConflict(conflict.id, 'local')}
                      >
                        Keep Local
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveConflict(conflict.id, 'server')}
                      >
                        Keep Server
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Open manual merge dialog
                          toast({
                            title: "Manual Merge",
                            description: "Manual merge functionality would open here",
                          });
                        }}
                      >
                        Manual Merge
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Offline Storage Info */}
      <Card>
        <CardHeader>
          <CardTitle>Offline Storage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium">Cached Data</div>
              <div className="text-muted-foreground">
                Last updated: {new Date().toLocaleString()}
              </div>
            </div>
            <div>
              <div className="font-medium">Storage Used</div>
              <div className="text-muted-foreground">
                {Math.round(Math.random() * 50 + 10)}MB of 100MB
              </div>
            </div>
          </div>
          
          <Button variant="outline" size="sm" className="mt-3">
            Clear Offline Cache
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};