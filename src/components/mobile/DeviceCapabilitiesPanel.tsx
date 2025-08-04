import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  MapPin, 
  Camera, 
  Wifi, 
  WifiOff, 
  Battery, 
  HardDrive,
  Vibrate,
  Bell
} from 'lucide-react';
import { useDeviceInfo } from '@/hooks/useDeviceInfo';
import { useGeolocation } from '@/hooks/useGeolocation';

export const DeviceCapabilitiesPanel = () => {
  const { deviceInfo, capabilities, triggerHapticFeedback, getStorageInfo } = useDeviceInfo();
  const { position, getCurrentPosition, accuracy } = useGeolocation();
  const [storageInfo, setStorageInfo] = useState<any>(null);
  const geoSupported = 'geolocation' in navigator;

  useEffect(() => {
    const loadStorageInfo = async () => {
      const info = await getStorageInfo();
      setStorageInfo(info);
    };
    loadStorageInfo();
  }, [getStorageInfo]);

  const testHapticFeedback = () => {
    triggerHapticFeedback('medium');
  };

  const testGeolocation = () => {
    getCurrentPosition();
  };

  return (
    <div className="space-y-4">
      {/* Device Information */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Smartphone className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Device Information</h3>
          {deviceInfo.isNative && (
            <Badge variant="secondary">Native App</Badge>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Platform:</span>
            <p className="font-medium capitalize">{deviceInfo.platform}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Model:</span>
            <p className="font-medium">{deviceInfo.model}</p>
          </div>
          <div>
            <span className="text-muted-foreground">OS:</span>
            <p className="font-medium capitalize">{deviceInfo.operatingSystem}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Version:</span>
            <p className="font-medium">{deviceInfo.osVersion}</p>
          </div>
        </div>
      </Card>

      {/* Network Status */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {capabilities.isOnline ? (
              <Wifi className="w-5 h-5 text-green-600" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-600" />
            )}
            <h3 className="font-semibold">Network Status</h3>
          </div>
          <Badge variant={capabilities.isOnline ? "default" : "destructive"}>
            {capabilities.isOnline ? "Online" : "Offline"}
          </Badge>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Connection: {deviceInfo.networkStatus}
        </p>
        {capabilities.supportsOffline && (
          <p className="text-xs text-green-600 mt-1">
            ✓ Offline mode supported
          </p>
        )}
      </Card>

      {/* Device Capabilities */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Device Capabilities</h3>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Camera className={`w-4 h-4 ${capabilities.hasCamera ? 'text-green-600' : 'text-gray-400'}`} />
            <span>Camera</span>
            {capabilities.hasCamera && <Badge variant="outline" className="text-xs">✓</Badge>}
          </div>
          
          <div className="flex items-center gap-2">
            <MapPin className={`w-4 h-4 ${capabilities.hasGeolocation ? 'text-green-600' : 'text-gray-400'}`} />
            <span>GPS</span>
            {capabilities.hasGeolocation && <Badge variant="outline" className="text-xs">✓</Badge>}
          </div>
          
          <div className="flex items-center gap-2">
            <Vibrate className={`w-4 h-4 ${capabilities.hasHaptics ? 'text-green-600' : 'text-gray-400'}`} />
            <span>Haptics</span>
            {capabilities.hasHaptics && <Badge variant="outline" className="text-xs">✓</Badge>}
          </div>
          
          <div className="flex items-center gap-2">
            <Bell className={`w-4 h-4 ${capabilities.hasNotifications ? 'text-green-600' : 'text-gray-400'}`} />
            <span>Notifications</span>
            {capabilities.hasNotifications && <Badge variant="outline" className="text-xs">✓</Badge>}
          </div>
        </div>

        {/* Test Buttons */}
        <div className="flex gap-2 mt-4">
          {capabilities.hasHaptics && (
            <Button 
              onClick={testHapticFeedback} 
              variant="outline" 
              size="sm"
            >
              Test Haptics
            </Button>
          )}
          {capabilities.hasGeolocation && (
            <Button 
              onClick={testGeolocation} 
              variant="outline" 
              size="sm"
            >
              Test GPS
            </Button>
          )}
        </div>
      </Card>

      {/* Location Information */}
      {geoSupported && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Location Services</h3>
          </div>
          
          {position ? (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground">Latitude:</span>
                  <p className="font-mono">{position.coords.latitude.toFixed(6)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Longitude:</span>
                  <p className="font-mono">{position.coords.longitude.toFixed(6)}</p>
                </div>
              </div>
              {accuracy && (
                <div>
                  <span className="text-muted-foreground">Accuracy:</span>
                  <span className="ml-2 font-medium">{Math.round(accuracy)}m</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No location data available. Click "Test GPS" to get current position.
            </p>
          )}
        </Card>
      )}

      {/* Storage Information */}
      {storageInfo && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Storage Usage</h3>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Used:</span>
              <span>{Math.round(storageInfo.used / 1024 / 1024)}MB</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Available:</span>
              <span>{Math.round(storageInfo.available / 1024 / 1024)}MB</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full" 
                style={{ width: `${storageInfo.usedPercentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {storageInfo.usedPercentage}% used
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};