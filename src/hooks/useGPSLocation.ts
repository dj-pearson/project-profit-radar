import { useState, useCallback } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { useToast } from '@/hooks/use-toast';

interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

interface LocationResult {
  coordinates: GPSCoordinates | null;
  address?: string;
  error: string | null;
}

interface UseGPSLocationReturn {
  location: LocationResult;
  isLoading: boolean;
  getCurrentLocation: () => Promise<LocationResult>;
  watchPosition: (callback: (result: LocationResult) => void) => Promise<string>;
  clearWatch: (watchId: string) => Promise<void>;
}

/**
 * Hook for GPS location tracking with Capacitor Geolocation
 * Supports both web and native mobile platforms
 * 
 * @example
 * const { location, isLoading, getCurrentLocation } = useGPSLocation();
 * 
 * const handleGetLocation = async () => {
 *   const result = await getCurrentLocation();
 *   if (result.coordinates) {
 *     console.log(`Lat: ${result.coordinates.latitude}, Lng: ${result.coordinates.longitude}`);
 *   }
 * };
 */
export const useGPSLocation = (): UseGPSLocationReturn => {
  const { toast } = useToast();
  const [location, setLocation] = useState<LocationResult>({
    coordinates: null,
    address: undefined,
    error: null
  });
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Request location permissions
   */
  const checkPermissions = async (): Promise<boolean> => {
    try {
      const permission = await Geolocation.checkPermissions();
      
      if (permission.location === 'granted') {
        return true;
      }
      
      if (permission.location === 'prompt' || permission.location === 'prompt-with-rationale') {
        const requested = await Geolocation.requestPermissions();
        return requested.location === 'granted';
      }
      
      toast({
        title: 'Location Permission Required',
        description: 'Please enable location access in your device settings',
        variant: 'destructive',
      });
      
      return false;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  };

  /**
   * Reverse geocode coordinates to address
   * Uses OpenStreetMap Nominatim API (free, no API key required)
   */
  const reverseGeocode = async (lat: number, lng: number): Promise<string | undefined> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'BuildDesk Construction Management App'
          }
        }
      );
      
      if (!response.ok) {
        return undefined;
      }
      
      const data = await response.json();
      return data.display_name || undefined;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return undefined;
    }
  };

  /**
   * Get current GPS location
   */
  const getCurrentLocation = useCallback(async (): Promise<LocationResult> => {
    setIsLoading(true);
    
    try {
      // Check permissions first
      const hasPermission = await checkPermissions();
      if (!hasPermission) {
        const result: LocationResult = {
          coordinates: null,
          error: 'Location permission denied'
        };
        setLocation(result);
        setIsLoading(false);
        return result;
      }

      // Get current position
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });

      const coordinates: GPSCoordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        altitudeAccuracy: position.coords.altitudeAccuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
        timestamp: position.timestamp
      };

      // Try to get address
      const address = await reverseGeocode(
        coordinates.latitude,
        coordinates.longitude
      );

      const result: LocationResult = {
        coordinates,
        address,
        error: null
      };

      setLocation(result);
      setIsLoading(false);
      
      toast({
        title: 'Location Retrieved',
        description: address || `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`,
      });

      return result;
    } catch (error: any) {
      console.error('Location error:', error);
      
      let errorMessage = 'Unable to get current location';
      
      if (error.message?.includes('timeout')) {
        errorMessage = 'Location request timed out. Please try again.';
      } else if (error.message?.includes('denied')) {
        errorMessage = 'Location permission denied';
      }

      const result: LocationResult = {
        coordinates: null,
        error: errorMessage
      };

      setLocation(result);
      setIsLoading(false);
      
      toast({
        title: 'Location Error',
        description: errorMessage,
        variant: 'destructive',
      });

      return result;
    }
  }, [toast]);

  /**
   * Watch position for continuous updates
   */
  const watchPosition = useCallback(async (
    callback: (result: LocationResult) => void
  ): Promise<string> => {
    const hasPermission = await checkPermissions();
    if (!hasPermission) {
      throw new Error('Location permission denied');
    }

    const watchId = await Geolocation.watchPosition(
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      },
      async (position, error) => {
        if (error) {
          callback({
            coordinates: null,
            error: error.message || 'Location watch error'
          });
          return;
        }

        if (position) {
          const coordinates: GPSCoordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp
          };

          const address = await reverseGeocode(
            coordinates.latitude,
            coordinates.longitude
          );

          callback({
            coordinates,
            address,
            error: null
          });
        }
      }
    );

    return watchId;
  }, []);

  /**
   * Clear position watch
   */
  const clearWatch = useCallback(async (watchId: string): Promise<void> => {
    await Geolocation.clearWatch({ id: watchId });
  }, []);

  return {
    location,
    isLoading,
    getCurrentLocation,
    watchPosition,
    clearWatch
  };
};
