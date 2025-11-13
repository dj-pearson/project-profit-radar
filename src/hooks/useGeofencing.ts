import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { Preferences } from '@capacitor/preferences';

export interface GeofenceRegion {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // meters
  projectId?: string;
  active: boolean;
}

export interface GeofenceEvent {
  id: string;
  regionId: string;
  type: 'enter' | 'exit';
  timestamp: number;
  latitude: number;
  longitude: number;
}

/**
 * Custom hook for geofencing functionality
 * Enables automatic check-in/out at job sites
 */
export const useGeofencing = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [regions, setRegions] = useState<GeofenceRegion[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Position | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    checkSupport();
    loadRegions();
    checkPermissions();
  }, []);

  /**
   * Check if geofencing is supported
   */
  const checkSupport = () => {
    setIsSupported(Capacitor.isNativePlatform());
  };

  /**
   * Check location permissions
   */
  const checkPermissions = async () => {
    if (!isSupported) return;

    try {
      const permission = await Geolocation.checkPermissions();
      setPermissionGranted(
        permission.location === 'granted' || permission.location === 'prompt'
      );
    } catch (error) {
      console.error('Error checking geolocation permissions:', error);
    }
  };

  /**
   * Request location permissions
   */
  const requestPermissions = async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const permission = await Geolocation.requestPermissions();
      const granted = permission.location === 'granted';
      setPermissionGranted(granted);
      return granted;
    } catch (error) {
      console.error('Error requesting geolocation permissions:', error);
      return false;
    }
  };

  /**
   * Load saved geofence regions
   */
  const loadRegions = async () => {
    try {
      const { value } = await Preferences.get({ key: 'geofence_regions' });
      if (value) {
        const savedRegions: GeofenceRegion[] = JSON.parse(value);
        setRegions(savedRegions);
      }
    } catch (error) {
      console.error('Error loading geofence regions:', error);
    }
  };

  /**
   * Save geofence regions
   */
  const saveRegions = async (newRegions: GeofenceRegion[]) => {
    try {
      await Preferences.set({
        key: 'geofence_regions',
        value: JSON.stringify(newRegions),
      });
      setRegions(newRegions);
    } catch (error) {
      console.error('Error saving geofence regions:', error);
      throw error;
    }
  };

  /**
   * Add a new geofence region
   */
  const addRegion = async (region: Omit<GeofenceRegion, 'id' | 'active'>): Promise<string> => {
    const newRegion: GeofenceRegion = {
      ...region,
      id: `geofence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      active: true,
    };

    const updatedRegions = [...regions, newRegion];
    await saveRegions(updatedRegions);

    return newRegion.id;
  };

  /**
   * Remove a geofence region
   */
  const removeRegion = async (regionId: string) => {
    const updatedRegions = regions.filter((r) => r.id !== regionId);
    await saveRegions(updatedRegions);
  };

  /**
   * Update a geofence region
   */
  const updateRegion = async (regionId: string, updates: Partial<GeofenceRegion>) => {
    const updatedRegions = regions.map((r) =>
      r.id === regionId ? { ...r, ...updates } : r
    );
    await saveRegions(updatedRegions);
  };

  /**
   * Get current location
   */
  const getCurrentLocation = async (): Promise<Position | null> => {
    if (!isSupported || !permissionGranted) return null;

    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });

      setCurrentLocation(position);
      return position;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  };

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  /**
   * Check if current location is inside a geofence region
   */
  const isInsideRegion = async (regionId: string): Promise<boolean> => {
    const region = regions.find((r) => r.id === regionId);
    if (!region) return false;

    const position = await getCurrentLocation();
    if (!position) return false;

    const distance = calculateDistance(
      position.coords.latitude,
      position.coords.longitude,
      region.latitude,
      region.longitude
    );

    return distance <= region.radius;
  };

  /**
   * Get all regions that contain the current location
   */
  const getActiveRegions = async (): Promise<GeofenceRegion[]> => {
    const position = await getCurrentLocation();
    if (!position) return [];

    return regions.filter((region) => {
      if (!region.active) return false;

      const distance = calculateDistance(
        position.coords.latitude,
        position.coords.longitude,
        region.latitude,
        region.longitude
      );

      return distance <= region.radius;
    });
  };

  /**
   * Start monitoring geofences
   * Note: In production, this should use a background task
   */
  const startMonitoring = async (): Promise<boolean> => {
    if (!isSupported || !permissionGranted) return false;

    try {
      await Preferences.set({ key: 'geofence_monitoring', value: 'true' });
      setIsEnabled(true);
      return true;
    } catch (error) {
      console.error('Error starting geofence monitoring:', error);
      return false;
    }
  };

  /**
   * Stop monitoring geofences
   */
  const stopMonitoring = async () => {
    try {
      await Preferences.set({ key: 'geofence_monitoring', value: 'false' });
      setIsEnabled(false);
    } catch (error) {
      console.error('Error stopping geofence monitoring:', error);
    }
  };

  /**
   * Log a geofence event
   */
  const logEvent = async (event: Omit<GeofenceEvent, 'id'>) => {
    try {
      const { value } = await Preferences.get({ key: 'geofence_events' });
      const events: GeofenceEvent[] = value ? JSON.parse(value) : [];

      const newEvent: GeofenceEvent = {
        ...event,
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      events.push(newEvent);

      // Keep only last 100 events
      const recentEvents = events.slice(-100);

      await Preferences.set({
        key: 'geofence_events',
        value: JSON.stringify(recentEvents),
      });
    } catch (error) {
      console.error('Error logging geofence event:', error);
    }
  };

  /**
   * Get geofence event history
   */
  const getEventHistory = async (): Promise<GeofenceEvent[]> => {
    try {
      const { value } = await Preferences.get({ key: 'geofence_events' });
      return value ? JSON.parse(value) : [];
    } catch (error) {
      console.error('Error getting geofence event history:', error);
      return [];
    }
  };

  /**
   * Clear event history
   */
  const clearEventHistory = async () => {
    try {
      await Preferences.remove({ key: 'geofence_events' });
    } catch (error) {
      console.error('Error clearing geofence event history:', error);
    }
  };

  return {
    isSupported,
    isEnabled,
    permissionGranted,
    regions,
    currentLocation,
    requestPermissions,
    getCurrentLocation,
    addRegion,
    removeRegion,
    updateRegion,
    isInsideRegion,
    getActiveRegions,
    startMonitoring,
    stopMonitoring,
    calculateDistance,
    logEvent,
    getEventHistory,
    clearEventHistory,
  };
};
