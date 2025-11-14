/**
 * React Hook for Geofencing Service
 * Provides easy integration with the geofencingService
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  geofencingService,
  type GeofenceLocation,
  type GeofenceBoundary
} from '@/services/geofencingService';

export interface UseGeofencingOptions {
  autoStart?: boolean;
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export interface UseGeofencingReturn {
  // Location state
  currentLocation: GeofenceLocation | null;
  isTracking: boolean;
  permissionStatus: 'prompt' | 'granted' | 'denied';
  error: string | null;

  // Methods
  requestPermission: () => Promise<boolean>;
  startTracking: () => void;
  stopTracking: () => void;
  getCurrentPosition: () => Promise<GeofenceLocation | null>;

  // Geofence management
  addGeofence: (geofence: GeofenceBoundary) => void;
  removeGeofence: (geofenceId: string) => void;
  isInsideGeofence: (geofenceId: string) => boolean;
  getDistanceFromGeofence: (geofenceId: string) => number | null;
  getCurrentGeofences: () => GeofenceBoundary[];

  // Utilities
  formatDistance: (meters: number) => string;
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
}

export const useGeofencing = (options: UseGeofencingOptions = {}): UseGeofencingReturn => {
  const {
    autoStart = false,
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 5000
  } = options;

  const [currentLocation, setCurrentLocation] = useState<GeofenceLocation | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [error, setError] = useState<string | null>(null);

  const geofencesRef = useRef<Map<string, GeofenceBoundary>>(new Map());

  // Check permission on mount
  useEffect(() => {
    checkPermission();

    // Auto-start if requested
    if (autoStart) {
      startTracking();
    }

    return () => {
      stopTracking();
    };
  }, []);

  const checkPermission = async () => {
    const available = await geofencingService.checkAvailability();
    if (!available) {
      setPermissionStatus('denied');
      setError('Geolocation not supported');
      return;
    }

    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setPermissionStatus(result.state as 'prompt' | 'granted' | 'denied');

        result.addEventListener('change', () => {
          setPermissionStatus(result.state as 'prompt' | 'granted' | 'denied');
        });
      } catch (err) {
        // Permissions API not fully supported
        console.warn('Permissions API not available');
      }
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const granted = await geofencingService.requestPermission();
      setPermissionStatus(granted ? 'granted' : 'denied');
      return granted;
    } catch (err: any) {
      setError(err.message || 'Permission denied');
      setPermissionStatus('denied');
      return false;
    }
  }, []);

  const getCurrentPosition = useCallback(async (): Promise<GeofenceLocation | null> => {
    try {
      setError(null);
      const location = await geofencingService.getCurrentPosition({
        enableHighAccuracy,
        timeout,
        maximumAge
      });
      setCurrentLocation(location);
      return location;
    } catch (err: any) {
      setError(err.message || 'Failed to get location');
      return null;
    }
  }, [enableHighAccuracy, timeout, maximumAge]);

  const startTracking = useCallback(() => {
    if (isTracking) return;

    setError(null);
    setIsTracking(true);

    geofencingService.startWatchingLocation(
      (location) => {
        setCurrentLocation(location);
        setError(null);
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge
      }
    );
  }, [isTracking, enableHighAccuracy, timeout, maximumAge]);

  const stopTracking = useCallback(() => {
    if (!isTracking) return;

    geofencingService.stopWatchingLocation();
    setIsTracking(false);
  }, [isTracking]);

  const addGeofence = useCallback((geofence: GeofenceBoundary) => {
    geofencesRef.current.set(geofence.id, geofence);
    geofencingService.addGeofence(geofence);
  }, []);

  const removeGeofence = useCallback((geofenceId: string) => {
    geofencesRef.current.delete(geofenceId);
    geofencingService.removeGeofence(geofenceId);
  }, []);

  const isInsideGeofence = useCallback((geofenceId: string): boolean => {
    if (!currentLocation) return false;

    const geofence = geofencesRef.current.get(geofenceId);
    if (!geofence) return false;

    return geofencingService.isInsideGeofence(currentLocation, geofence);
  }, [currentLocation]);

  const getDistanceFromGeofence = useCallback((geofenceId: string): number | null => {
    if (!currentLocation) return null;

    const geofence = geofencesRef.current.get(geofenceId);
    if (!geofence) return null;

    return geofencingService.getDistanceFromGeofence(currentLocation, geofence);
  }, [currentLocation]);

  const getCurrentGeofences = useCallback((): GeofenceBoundary[] => {
    return geofencingService.getCurrentGeofences();
  }, [currentLocation]);

  const formatDistance = useCallback((meters: number): string => {
    return geofencingService.formatDistance(meters);
  }, []);

  const calculateDistance = useCallback((
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    return geofencingService.calculateDistance(lat1, lon1, lat2, lon2);
  }, []);

  return {
    currentLocation,
    isTracking,
    permissionStatus,
    error,
    requestPermission,
    startTracking,
    stopTracking,
    getCurrentPosition,
    addGeofence,
    removeGeofence,
    isInsideGeofence,
    getDistanceFromGeofence,
    getCurrentGeofences,
    formatDistance,
    calculateDistance
  };
};

/**
 * Hook for monitoring a specific geofence
 */
export interface UseGeofenceMonitorOptions {
  geofence: GeofenceBoundary;
  onEnter?: () => void;
  onExit?: () => void;
  autoStart?: boolean;
}

export interface UseGeofenceMonitorReturn {
  isInside: boolean;
  distance: number | null;
  isTracking: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
}

export const useGeofenceMonitor = (
  options: UseGeofenceMonitorOptions
): UseGeofenceMonitorReturn => {
  const { geofence, onEnter, onExit, autoStart = true } = options;

  const [isInside, setIsInside] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const wasInsideRef = useRef(false);

  const {
    currentLocation,
    isTracking,
    startTracking,
    stopTracking,
    addGeofence,
    removeGeofence
  } = useGeofencing({ autoStart });

  // Add geofence on mount
  useEffect(() => {
    if (geofence) {
      addGeofence(geofence);
    }

    return () => {
      if (geofence) {
        removeGeofence(geofence.id);
      }
    };
  }, [geofence]);

  // Monitor location changes
  useEffect(() => {
    if (!currentLocation) return;

    const dist = geofencingService.getDistanceFromGeofence(currentLocation, geofence);
    const inside = geofencingService.isInsideGeofence(currentLocation, geofence);

    setDistance(dist);
    setIsInside(inside);

    // Trigger callbacks on enter/exit
    if (inside && !wasInsideRef.current) {
      wasInsideRef.current = true;
      onEnter?.();
    } else if (!inside && wasInsideRef.current) {
      wasInsideRef.current = false;
      onExit?.();
    }
  }, [currentLocation, geofence, onEnter, onExit]);

  const startMonitoring = useCallback(() => {
    startTracking();
  }, [startTracking]);

  const stopMonitoring = useCallback(() => {
    stopTracking();
  }, [stopTracking]);

  return {
    isInside,
    distance,
    isTracking,
    startMonitoring,
    stopMonitoring
  };
};
