/**
 * Geofencing Service
 * Handles GPS location tracking, geofence verification, and distance calculations
 */

export interface GeofenceLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export interface GeofenceBoundary {
  id: string;
  name: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  type?: 'project' | 'office' | 'warehouse' | 'custom';
}

export interface GeofenceVerificationResult {
  success: boolean;
  verified: boolean;
  distanceMeters: number;
  allowedRadiusMeters: number;
  message: string;
  error?: string;
}

export interface LocationWatchOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

class GeofencingService {
  private watchId: number | null = null;
  private currentLocation: GeofenceLocation | null = null;
  private locationUpdateCallbacks: Array<(location: GeofenceLocation) => void> = [];
  private geofenceEnterCallbacks: Array<(geofenceId: string) => void> = [];
  private geofenceExitCallbacks: Array<(geofenceId: string) => void> = [];
  private activeGeofences: Map<string, GeofenceBoundary> = new Map();
  private currentlyInsideGeofences: Set<string> = new Set();

  /**
   * Check if geolocation is supported and permissions are granted
   */
  async checkAvailability(): Promise<boolean> {
    if (!('geolocation' in navigator)) {
      console.error('Geolocation is not supported by this browser');
      return false;
    }

    // Check permission if Permissions API is available
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state === 'granted' || result.state === 'prompt';
      } catch (error) {
        // Permissions API might not be fully supported
        console.warn('Permissions API not fully supported:', error);
        return true; // Assume available and let the actual request handle it
      }
    }

    return true;
  }

  /**
   * Request location permission from the user
   */
  async requestPermission(): Promise<boolean> {
    try {
      const position = await this.getCurrentPosition();
      return !!position;
    } catch (error) {
      console.error('Location permission denied:', error);
      return false;
    }
  }

  /**
   * Get current position once
   */
  async getCurrentPosition(options?: LocationWatchOptions): Promise<GeofenceLocation> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: GeofenceLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          this.currentLocation = location;
          resolve(location);
        },
        (error) => {
          let errorMessage = 'Failed to get location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: options?.enableHighAccuracy ?? true,
          timeout: options?.timeout ?? 10000,
          maximumAge: options?.maximumAge ?? 0,
        }
      );
    });
  }

  /**
   * Start watching location continuously
   */
  startWatchingLocation(
    callback: (location: GeofenceLocation) => void,
    options?: LocationWatchOptions
  ): void {
    if (!('geolocation' in navigator)) {
      console.error('Geolocation not supported');
      return;
    }

    // Stop existing watch if any
    this.stopWatchingLocation();

    // Add callback to list
    this.locationUpdateCallbacks.push(callback);

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location: GeofenceLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };

        this.currentLocation = location;

        // Notify all callbacks
        this.locationUpdateCallbacks.forEach((cb) => cb(location));

        // Check geofences
        this.checkGeofences(location);
      },
      (error) => {
        console.error('Location watch error:', error);
      },
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 10000,
        maximumAge: options?.maximumAge ?? 5000,
      }
    );
  }

  /**
   * Stop watching location
   */
  stopWatchingLocation(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.locationUpdateCallbacks = [];
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in meters
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Check if a location is inside a geofence
   */
  isInsideGeofence(location: GeofenceLocation, geofence: GeofenceBoundary): boolean {
    const distance = this.calculateDistance(
      location.latitude,
      location.longitude,
      geofence.centerLatitude,
      geofence.centerLongitude
    );

    return distance <= geofence.radiusMeters;
  }

  /**
   * Get distance from a location to a geofence center
   */
  getDistanceFromGeofence(
    location: GeofenceLocation,
    geofence: GeofenceBoundary
  ): number {
    return this.calculateDistance(
      location.latitude,
      location.longitude,
      geofence.centerLatitude,
      geofence.centerLongitude
    );
  }

  /**
   * Add a geofence to monitor
   */
  addGeofence(geofence: GeofenceBoundary): void {
    this.activeGeofences.set(geofence.id, geofence);

    // Check if we're currently inside this geofence
    if (this.currentLocation) {
      const isInside = this.isInsideGeofence(this.currentLocation, geofence);
      if (isInside) {
        this.currentlyInsideGeofences.add(geofence.id);
      }
    }
  }

  /**
   * Remove a geofence from monitoring
   */
  removeGeofence(geofenceId: string): void {
    this.activeGeofences.delete(geofenceId);
    this.currentlyInsideGeofences.delete(geofenceId);
  }

  /**
   * Register callback for geofence enter events
   */
  onGeofenceEnter(callback: (geofenceId: string) => void): void {
    this.geofenceEnterCallbacks.push(callback);
  }

  /**
   * Register callback for geofence exit events
   */
  onGeofenceExit(callback: (geofenceId: string) => void): void {
    this.geofenceExitCallbacks.push(callback);
  }

  /**
   * Check all active geofences against current location
   */
  private checkGeofences(location: GeofenceLocation): void {
    this.activeGeofences.forEach((geofence, geofenceId) => {
      const isInside = this.isInsideGeofence(location, geofence);
      const wasInside = this.currentlyInsideGeofences.has(geofenceId);

      // Entering geofence
      if (isInside && !wasInside) {
        this.currentlyInsideGeofences.add(geofenceId);
        this.geofenceEnterCallbacks.forEach((cb) => cb(geofenceId));
      }

      // Exiting geofence
      if (!isInside && wasInside) {
        this.currentlyInsideGeofences.delete(geofenceId);
        this.geofenceExitCallbacks.forEach((cb) => cb(geofenceId));
      }
    });
  }

  /**
   * Get all geofences that contain the current location
   */
  getCurrentGeofences(): GeofenceBoundary[] {
    if (!this.currentLocation) return [];

    const insideGeofences: GeofenceBoundary[] = [];

    this.activeGeofences.forEach((geofence) => {
      if (this.isInsideGeofence(this.currentLocation!, geofence)) {
        insideGeofences.push(geofence);
      }
    });

    return insideGeofences;
  }

  /**
   * Get current location (last known)
   */
  getLastKnownLocation(): GeofenceLocation | null {
    return this.currentLocation;
  }

  /**
   * Format distance for display
   */
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  }

  /**
   * Calculate bearing between two points (for direction indicators)
   */
  calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(y, x);
    const bearing = ((θ * 180) / Math.PI + 360) % 360;

    return bearing;
  }

  /**
   * Get cardinal direction from bearing
   */
  getBearingDirection(bearing: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  }

  /**
   * Clear all geofences and callbacks
   */
  cleanup(): void {
    this.stopWatchingLocation();
    this.activeGeofences.clear();
    this.currentlyInsideGeofences.clear();
    this.geofenceEnterCallbacks = [];
    this.geofenceExitCallbacks = [];
    this.currentLocation = null;
  }
}

// Export singleton instance
export const geofencingService = new GeofencingService();
export default geofencingService;
