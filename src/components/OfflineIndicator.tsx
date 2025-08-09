import { usePWA } from '@/hooks/usePWA';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';

export const OfflineIndicator = () => {
  const { isOffline } = usePWA();
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (!isOffline && showReconnected === false) {
      // Just came back online
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOffline, showReconnected]);

  if (!isOffline && !showReconnected) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      <Alert className={`${isOffline ? 'border-destructive bg-destructive/10' : 'border-green-500 bg-green-50'}`}>
        <div className="flex items-center gap-2">
          {isOffline ? (
            <WifiOff className="h-4 w-4 text-destructive" />
          ) : (
            <Wifi className="h-4 w-4 text-green-600" />
          )}
          <AlertDescription className={isOffline ? 'text-destructive' : 'text-green-600'}>
            {isOffline ? 'You are offline. Some features may be limited.' : 'Connection restored!'}
          </AlertDescription>
        </div>
      </Alert>
    </div>
  );
};