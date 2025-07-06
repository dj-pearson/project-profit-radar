import { useState, useEffect, useCallback } from 'react';
import { Geolocation, Position, GeolocationOptions } from '@capacitor/geolocation';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';
import { useToast } from './use-toast';

interface GeofenceZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // meters
  projectId?: string;
}

interface LocationState {
  position: Position | null;
  isTracking: boolean;
  accuracy: number;
  error: string | null;
  currentZone: GeofenceZone | null;
  isInsideGeofence: boolean;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  trackingInterval?: number;
  geofences?: GeofenceZone[];
}

export const useGeolocation = (options: UseGeolocationOptions = {}) => {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 5000,
    trackingInterval = 30000, // 30 seconds
    geofences = []
  } = options;

  const { toast } = useToast();
  
  const [locationState, setLocationState] = useState<LocationState>({
    position: null,
    isTracking: false,
    accuracy: 0,
    error: null,
    currentZone: null,
    isInsideGeofence: false
  });

  const [watchId, setWatchId] = useState<string | null>(null);
  const [trackingInterval_, setTrackingInterval_] = useState<NodeJS.Timeout | null>(null);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = useCallback((
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }, []);

  // Check if position is within any geofence
  const checkGeofences = useCallback((position: Position) => {
    if (!geofences.length) return;

    const currentLat = position.coords.latitude;
    const currentLon = position.coords.longitude;

    for (const zone of geofences) {
      const distance = calculateDistance(
        currentLat,
        currentLon,
        zone.latitude,
        zone.longitude
      );

      if (distance <= zone.radius) {
        // Inside geofence
        if (!locationState.isInsideGeofence || locationState.currentZone?.id !== zone.id) {
          setLocationState(prev => ({
            ...prev,
            currentZone: zone,
            isInsideGeofence: true
          }));

          toast({
            title: "Geofence Entry",
            description: `You've entered the ${zone.name} work zone`,
          });

          // Store geofence entry event
          Preferences.set({
            key: `geofence_entry_${Date.now()}`,
            value: JSON.stringify({
              zoneId: zone.id,
              zoneName: zone.name,
              timestamp: new Date().toISOString(),
              position: { lat: currentLat, lon: currentLon }
            })
          });
        }
        return;
      }
    }

    // Outside all geofences
    if (locationState.isInsideGeofence) {
      const exitZone = locationState.currentZone;
      setLocationState(prev => ({
        ...prev,
        currentZone: null,
        isInsideGeofence: false
      }));

      if (exitZone) {
        toast({
          title: "Geofence Exit",
          description: `You've left the ${exitZone.name} work zone`,
        });

        // Store geofence exit event
        Preferences.set({
          key: `geofence_exit_${Date.now()}`,
          value: JSON.stringify({
            zoneId: exitZone.id,
            zoneName: exitZone.name,
            timestamp: new Date().toISOString(),
            position: { lat: currentLat, lon: currentLon }
          })
        });
      }
    }
  }, [geofences, locationState.isInsideGeofence, locationState.currentZone, calculateDistance, toast]);

  // Request location permissions
  const requestPermissions = useCallback(async () => {
    try {
      const permissions = await Geolocation.requestPermissions();
      
      if (permissions.location !== 'granted') {
        throw new Error('Location permission not granted');
      }

      return true;
    } catch (error) {
      setLocationState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Permission denied'
      }));
      return false;
    }
  }, []);

  // Get current position
  const getCurrentPosition = useCallback(async (): Promise<Position | null> => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;

      const geoOptions: GeolocationOptions = {
        enableHighAccuracy,
        timeout,
        maximumAge
      };

      const position = await Geolocation.getCurrentPosition(geoOptions);
      
      setLocationState(prev => ({
        ...prev,
        position,
        accuracy: position.coords.accuracy || 0,
        error: null
      }));

      checkGeofences(position);
      
      return position;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get location';
      setLocationState(prev => ({
        ...prev,
        error: errorMessage
      }));
      return null;
    }
  }, [requestPermissions, enableHighAccuracy, timeout, maximumAge, checkGeofences]);

  // Start tracking location
  const startTracking = useCallback(async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      // Clear any existing tracking
      await stopTracking();

      const geoOptions: GeolocationOptions = {
        enableHighAccuracy,
        timeout,
        maximumAge
      };

      // Start watching position
      const id = await Geolocation.watchPosition(geoOptions, (position, err) => {
        if (err) {
          setLocationState(prev => ({
            ...prev,
            error: err.message
          }));
          return;
        }

        if (position) {
          setLocationState(prev => ({
            ...prev,
            position,
            accuracy: position.coords.accuracy || 0,
            error: null
          }));

          checkGeofences(position);

          // Store location for offline sync
          Preferences.set({
            key: `location_${Date.now()}`,
            value: JSON.stringify({
              timestamp: new Date().toISOString(),
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              speed: position.coords.speed,
              heading: position.coords.heading
            })
          });
        }
      });

      setWatchId(id);
      setLocationState(prev => ({ ...prev, isTracking: true }));

      toast({
        title: "GPS Tracking Started",
        description: "Location tracking is now active",
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start tracking';
      setLocationState(prev => ({
        ...prev,
        error: errorMessage
      }));
    }
  }, [requestPermissions, enableHighAccuracy, timeout, maximumAge, checkGeofences, toast]);

  // Stop tracking location
  const stopTracking = useCallback(async () => {
    try {
      if (watchId) {
        await Geolocation.clearWatch({ id: watchId });
        setWatchId(null);
      }

      if (trackingInterval_) {
        clearInterval(trackingInterval_);
        setTrackingInterval_(null);
      }

      setLocationState(prev => ({ ...prev, isTracking: false }));

      toast({
        title: "GPS Tracking Stopped",
        description: "Location tracking has been disabled",
      });

    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  }, [watchId, trackingInterval_, toast]);

  // Get stored location history
  const getLocationHistory = useCallback(async (limit: number = 100) => {
    try {
      const { keys } = await Preferences.keys();
      const locationKeys = keys.filter(key => key.startsWith('location_'));
      
      const locations = await Promise.all(
        locationKeys
          .slice(-limit)
          .map(async (key) => {
            const { value } = await Preferences.get({ key });
            return value ? JSON.parse(value) : null;
          })
      );

      return locations.filter(Boolean);
    } catch (error) {
      console.error('Error getting location history:', error);
      return [];
    }
  }, []);

  // Clear location history
  const clearLocationHistory = useCallback(async () => {
    try {
      const { keys } = await Preferences.keys();
      const locationKeys = keys.filter(key => 
        key.startsWith('location_') || 
        key.startsWith('geofence_')
      );
      
      await Promise.all(
        locationKeys.map(key => Preferences.remove({ key }))
      );

      toast({
        title: "Location History Cleared",
        description: "All stored location data has been removed",
      });

    } catch (error) {
      console.error('Error clearing location history:', error);
    }
  }, [toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    // State
    position: locationState.position,
    isTracking: locationState.isTracking,
    accuracy: locationState.accuracy,
    error: locationState.error,
    currentZone: locationState.currentZone,
    isInsideGeofence: locationState.isInsideGeofence,
    
    // Actions
    getCurrentPosition,
    startTracking,
    stopTracking,
    getLocationHistory,
    clearLocationHistory,
    
    // Utils
    calculateDistance
  };
};