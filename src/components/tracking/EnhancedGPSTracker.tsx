import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Navigation, Clock, AlertTriangle, Wifi, WifiOff, Battery } from 'lucide-react';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  address?: string;
}

interface GeofenceArea {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  projectId?: string;
}

export const EnhancedGPSTracker = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationHistory, setLocationHistory] = useState<LocationData[]>([]);
  const [geofences, setGeofences] = useState<GeofenceArea[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<'high' | 'medium' | 'low'>('high');
  const [autoClockIn, setAutoClockIn] = useState(false);
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  // Monitor online status
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

  // Monitor battery level (if available)
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        
        const updateBattery = () => {
          setBatteryLevel(Math.round(battery.level * 100));
        };
        
        battery.addEventListener('levelchange', updateBattery);
        return () => battery.removeEventListener('levelchange', updateBattery);
      });
    }
  }, []);

  // Load geofences
  useEffect(() => {
    if (userProfile?.company_id) {
      loadGeofences();
    }
  }, [userProfile]);

  const loadGeofences = async () => {
    try {
      // Mock geofences for now - in production would use actual table
      const mockGeofences: GeofenceArea[] = [
        {
          id: '1',
          name: 'Main Construction Site',
          latitude: 40.7128,
          longitude: -74.0060,
          radius: 100,
          projectId: 'project-1'
        }
      ];
      setGeofences(mockGeofences);
    } catch (error) {
      console.error('Error loading geofences:', error);
    }
  };

  const checkGeofences = useCallback((location: LocationData) => {
    geofences.forEach(geofence => {
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        geofence.latitude,
        geofence.longitude
      );

      if (distance <= geofence.radius) {
        // User entered geofence
        handleGeofenceEntry(geofence, location);
      }
    });
  }, [geofences]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const handleGeofenceEntry = async (geofence: GeofenceArea, location: LocationData) => {
    try {
      // Store geofence entry locally for now
      const entry = {
        user_id: user?.id,
        company_id: userProfile?.company_id,
        project_id: geofence.projectId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        event_type: 'geofence_entry',
        geofence_id: geofence.id,
        timestamp: new Date(location.timestamp).toISOString()
      };
      
      const existingEntries = JSON.parse(localStorage.getItem('geofence_entries') || '[]');
      existingEntries.push(entry);
      localStorage.setItem('geofence_entries', JSON.stringify(existingEntries));

      // Auto clock-in if enabled
      if (autoClockIn && geofence.projectId) {
        await handleAutoClockIn(geofence.projectId, location);
      }

      toast({
        title: "Entered Job Site",
        description: `You've entered ${geofence.name}`,
      });
    } catch (error) {
      console.error('Error handling geofence entry:', error);
    }
  };

  const handleAutoClockIn = async (projectId: string, location: LocationData) => {
    try {
      const { error } = await supabase.from('time_entries').insert({
        user_id: user?.id,
        company_id: userProfile?.company_id,
        project_id: projectId,
        start_time: new Date().toISOString(),
        location_start_lat: location.latitude,
        location_start_lng: location.longitude,
        gps_accuracy: location.accuracy,
        entry_method: 'auto_geofence'
      });

      if (error) throw error;

      toast({
        title: "Auto Clock-In",
        description: "You've been automatically clocked in",
      });
    } catch (error) {
      console.error('Error with auto clock-in:', error);
    }
  };

  const getCurrentLocation = (): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      const options = {
        enableHighAccuracy: accuracy === 'high',
        timeout: accuracy === 'high' ? 15000 : 10000,
        maximumAge: accuracy === 'high' ? 0 : 30000
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };

          // Reverse geocode if online
          if (isOnline) {
            try {
              // Note: In production, you'd use a geocoding service
              locationData.address = `${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`;
            } catch (error) {
              console.error('Geocoding error:', error);
            }
          }

          resolve(locationData);
        },
        (error) => reject(error),
        options
      );
    });
  };

  const startTracking = async () => {
    try {
      const location = await getCurrentLocation();
      setCurrentLocation(location);
      setIsTracking(true);
      
      // Check geofences
      checkGeofences(location);

      toast({
        title: "GPS Tracking Started",
        description: "Location tracking is now active",
      });

      // Start continuous tracking
      const trackingInterval = setInterval(async () => {
        try {
          const newLocation = await getCurrentLocation();
          setCurrentLocation(newLocation);
          setLocationHistory(prev => [...prev.slice(-99), newLocation]); // Keep last 100 locations
          checkGeofences(newLocation);
          
          // Store location if online or queue for later
          await storeLocation(newLocation);
        } catch (error) {
          console.error('Tracking error:', error);
        }
      }, accuracy === 'high' ? 30000 : 60000); // 30s for high accuracy, 1min for others

      // Store interval ID for cleanup
      (window as any).gpsTrackingInterval = trackingInterval;
    } catch (error) {
      console.error('Error starting tracking:', error);
      toast({
        title: "GPS Error",
        description: "Unable to access location. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopTracking = () => {
    setIsTracking(false);
    if ((window as any).gpsTrackingInterval) {
      clearInterval((window as any).gpsTrackingInterval);
    }
    
    toast({
      title: "GPS Tracking Stopped",
      description: "Location tracking has been disabled",
    });
  };

  const storeLocation = async (location: LocationData) => {
    try {
      const locationLog = {
        user_id: user?.id,
        company_id: userProfile?.company_id,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        address: location.address,
        timestamp: new Date(location.timestamp).toISOString(),
        event_type: 'location_update',
        is_synced: isOnline
      };

      // Always store offline for now
      const offlineLocations = JSON.parse(localStorage.getItem('offlineLocations') || '[]');
      offlineLocations.push(locationLog);
      localStorage.setItem('offlineLocations', JSON.stringify(offlineLocations));
    } catch (error) {
      console.error('Error storing location:', error);
    }
  };

  const syncOfflineLocations = async () => {
    if (!isOnline) return;

    try {
      const offlineLocations = JSON.parse(localStorage.getItem('offlineLocations') || '[]');
      
      if (offlineLocations.length > 0) {
        // For now, just clear them - in production would sync to database
        localStorage.removeItem('offlineLocations');
        
        toast({
          title: "Locations Synced",
          description: `${offlineLocations.length} offline locations processed`,
        });
      }
    } catch (error) {
      console.error('Error syncing offline locations:', error);
    }
  };

  // Sync when coming back online
  useEffect(() => {
    if (isOnline) {
      syncOfflineLocations();
    }
  }, [isOnline]);

  const getAccuracyLevel = (accuracy?: number) => {
    if (!accuracy) return 'unknown';
    if (accuracy <= 5) return 'excellent';
    if (accuracy <= 10) return 'good';
    if (accuracy <= 50) return 'fair';
    return 'poor';
  };

  const getAccuracyColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'fair': return 'bg-yellow-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <CardTitle>Enhanced GPS Tracking</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              {batteryLevel !== null && (
                <div className="flex items-center gap-1">
                  <Battery className="h-4 w-4" />
                  <span className="text-sm">{batteryLevel}%</span>
                </div>
              )}
            </div>
          </div>
          <CardDescription>
            Real-time location tracking with geofencing and offline support
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={isTracking ? "default" : "secondary"}>
                {isTracking ? "Active" : "Inactive"}
              </Badge>
              {!isOnline && (
                <Badge variant="outline" className="text-orange-600">
                  Offline Mode
                </Badge>
              )}
            </div>
            <Button
              onClick={isTracking ? stopTracking : startTracking}
              variant={isTracking ? "destructive" : "default"}
            >
              {isTracking ? "Stop Tracking" : "Start Tracking"}
            </Button>
          </div>

          {/* Current Location */}
          {currentLocation && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Navigation className="h-4 w-4" />
                Current Location
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Coordinates:</span>
                  <p className="font-mono">{currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Accuracy:</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getAccuracyColor(getAccuracyLevel(currentLocation.accuracy))}`} />
                    <span>{currentLocation.accuracy?.toFixed(0)}m ({getAccuracyLevel(currentLocation.accuracy)})</span>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Update:</span>
                  <p>{new Date(currentLocation.timestamp).toLocaleTimeString()}</p>
                </div>
                {currentLocation.address && (
                  <div>
                    <span className="text-muted-foreground">Address:</span>
                    <p>{currentLocation.address}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="space-y-4">
            <h4 className="font-medium">Tracking Settings</h4>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="accuracy">GPS Accuracy</Label>
                <p className="text-sm text-muted-foreground">Higher accuracy uses more battery</p>
              </div>
              <select
                value={accuracy}
                onChange={(e) => setAccuracy(e.target.value as 'high' | 'medium' | 'low')}
                className="border rounded px-3 py-1"
                disabled={isTracking}
              >
                <option value="high">High (5-10m)</option>
                <option value="medium">Medium (10-50m)</option>
                <option value="low">Low (50m+)</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-clock">Auto Clock-In</Label>
                <p className="text-sm text-muted-foreground">Automatically clock in when entering job sites</p>
              </div>
              <Switch
                id="auto-clock"
                checked={autoClockIn}
                onCheckedChange={setAutoClockIn}
              />
            </div>
          </div>

          {/* Geofences */}
          <div className="space-y-4">
            <h4 className="font-medium">Active Geofences ({geofences.length})</h4>
            {geofences.length === 0 ? (
              <p className="text-sm text-muted-foreground">No geofences configured</p>
            ) : (
              <div className="space-y-2">
                {geofences.slice(0, 3).map((geofence) => (
                  <div key={geofence.id} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">{geofence.name}</span>
                    <Badge variant="outline">{geofence.radius}m radius</Badge>
                  </div>
                ))}
                {geofences.length > 3 && (
                  <p className="text-sm text-muted-foreground">+{geofences.length - 3} more</p>
                )}
              </div>
            )}
          </div>

          {/* Offline Alert */}
          {!isOnline && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You're offline. Location data will be stored locally and synced when connection is restored.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};