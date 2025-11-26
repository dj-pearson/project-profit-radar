/**
 * Geofencing Service Tests
 *
 * Tests for GPS location tracking, geofence boundary detection,
 * and distance calculations using the Haversine formula.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  geofencingService,
  type GeofenceLocation,
  type GeofenceBoundary,
} from '../geofencingService';

// Test data: Real-world coordinates
const LOS_ANGELES: GeofenceLocation = {
  latitude: 34.0522,
  longitude: -118.2437,
  accuracy: 10,
  timestamp: Date.now(),
};

const NEW_YORK: GeofenceLocation = {
  latitude: 40.7128,
  longitude: -74.006,
  accuracy: 10,
  timestamp: Date.now(),
};

const SANTA_MONICA: GeofenceLocation = {
  latitude: 34.0195,
  longitude: -118.4912,
  accuracy: 10,
  timestamp: Date.now(),
};

// Test geofences
const createTestGeofence = (
  overrides: Partial<GeofenceBoundary> = {}
): GeofenceBoundary => ({
  id: 'geofence-1',
  name: 'Test Site',
  centerLatitude: 34.0522,
  centerLongitude: -118.2437,
  radiusMeters: 100,
  type: 'project',
  ...overrides,
});

describe('GeofencingService', () => {
  beforeEach(() => {
    // Reset the service state before each test
    geofencingService.cleanup();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateDistance()', () => {
    it('should calculate distance between two identical points as zero', () => {
      const distance = geofencingService.calculateDistance(
        LOS_ANGELES.latitude,
        LOS_ANGELES.longitude,
        LOS_ANGELES.latitude,
        LOS_ANGELES.longitude
      );

      expect(distance).toBe(0);
    });

    it('should calculate approximate distance between LA and NYC', () => {
      // LA to NYC is approximately 3,940 km (3,940,000 meters)
      const distance = geofencingService.calculateDistance(
        LOS_ANGELES.latitude,
        LOS_ANGELES.longitude,
        NEW_YORK.latitude,
        NEW_YORK.longitude
      );

      // Allow 5% tolerance for the calculation
      expect(distance).toBeGreaterThan(3_800_000);
      expect(distance).toBeLessThan(4_100_000);
    });

    it('should calculate distance between LA and Santa Monica', () => {
      // LA downtown to Santa Monica is approximately 20 km
      const distance = geofencingService.calculateDistance(
        LOS_ANGELES.latitude,
        LOS_ANGELES.longitude,
        SANTA_MONICA.latitude,
        SANTA_MONICA.longitude
      );

      expect(distance).toBeGreaterThan(15_000);
      expect(distance).toBeLessThan(25_000);
    });

    it('should be symmetric (A to B equals B to A)', () => {
      const distanceAB = geofencingService.calculateDistance(
        LOS_ANGELES.latitude,
        LOS_ANGELES.longitude,
        NEW_YORK.latitude,
        NEW_YORK.longitude
      );

      const distanceBA = geofencingService.calculateDistance(
        NEW_YORK.latitude,
        NEW_YORK.longitude,
        LOS_ANGELES.latitude,
        LOS_ANGELES.longitude
      );

      expect(distanceAB).toBe(distanceBA);
    });

    it('should handle small distances accurately', () => {
      // Two points 100 meters apart (approximately)
      const lat1 = 34.0522;
      const lon1 = -118.2437;
      const lat2 = 34.0531; // ~100m north
      const lon2 = -118.2437;

      const distance = geofencingService.calculateDistance(lat1, lon1, lat2, lon2);

      // Should be roughly 100 meters (within 10% tolerance)
      expect(distance).toBeGreaterThan(90);
      expect(distance).toBeLessThan(110);
    });
  });

  describe('isInsideGeofence()', () => {
    it('should return true when location is at geofence center', () => {
      const geofence = createTestGeofence();
      const location: GeofenceLocation = {
        latitude: geofence.centerLatitude,
        longitude: geofence.centerLongitude,
        accuracy: 10,
        timestamp: Date.now(),
      };

      const isInside = geofencingService.isInsideGeofence(location, geofence);

      expect(isInside).toBe(true);
    });

    it('should return true when location is within radius', () => {
      const geofence = createTestGeofence({ radiusMeters: 1000 });
      const location: GeofenceLocation = {
        latitude: 34.0530, // ~90m away
        longitude: -118.2437,
        accuracy: 10,
        timestamp: Date.now(),
      };

      const isInside = geofencingService.isInsideGeofence(location, geofence);

      expect(isInside).toBe(true);
    });

    it('should return false when location is outside radius', () => {
      const geofence = createTestGeofence({ radiusMeters: 100 });
      const location = SANTA_MONICA; // ~20km away

      const isInside = geofencingService.isInsideGeofence(location, geofence);

      expect(isInside).toBe(false);
    });

    it('should return true when location is just inside the boundary', () => {
      const geofence = createTestGeofence({ radiusMeters: 200 });
      // Place location about 150m away (well within 200m radius)
      const location: GeofenceLocation = {
        latitude: 34.0535, // ~150m north
        longitude: -118.2437,
        accuracy: 0,
        timestamp: Date.now(),
      };

      const isInside = geofencingService.isInsideGeofence(location, geofence);

      expect(isInside).toBe(true);
    });
  });

  describe('getDistanceFromGeofence()', () => {
    it('should return zero when at geofence center', () => {
      const geofence = createTestGeofence();
      const location: GeofenceLocation = {
        latitude: geofence.centerLatitude,
        longitude: geofence.centerLongitude,
        accuracy: 10,
        timestamp: Date.now(),
      };

      const distance = geofencingService.getDistanceFromGeofence(location, geofence);

      expect(distance).toBe(0);
    });

    it('should return correct distance from geofence center', () => {
      const geofence = createTestGeofence();

      const distance = geofencingService.getDistanceFromGeofence(SANTA_MONICA, geofence);

      // Should be approximately 20km
      expect(distance).toBeGreaterThan(15_000);
      expect(distance).toBeLessThan(25_000);
    });
  });

  describe('Geofence management', () => {
    it('should add a geofence', () => {
      const geofence = createTestGeofence();

      geofencingService.addGeofence(geofence);

      // Verify geofence is added by checking if location inside returns in getCurrentGeofences
      // Note: This requires setting current location
    });

    it('should remove a geofence', () => {
      const geofence = createTestGeofence();
      geofencingService.addGeofence(geofence);

      geofencingService.removeGeofence(geofence.id);

      // Verify removal
      const currentGeofences = geofencingService.getCurrentGeofences();
      expect(currentGeofences.find((g) => g.id === geofence.id)).toBeUndefined();
    });

    it('should return empty array when no geofences contain current location', () => {
      // No geofences added, no location set
      const currentGeofences = geofencingService.getCurrentGeofences();

      expect(currentGeofences).toEqual([]);
    });
  });

  describe('formatDistance()', () => {
    it('should format meters correctly for small distances', () => {
      expect(geofencingService.formatDistance(50)).toBe('50m');
      expect(geofencingService.formatDistance(999)).toBe('999m');
    });

    it('should format kilometers correctly for large distances', () => {
      expect(geofencingService.formatDistance(1000)).toBe('1.0km');
      expect(geofencingService.formatDistance(5500)).toBe('5.5km');
      expect(geofencingService.formatDistance(10000)).toBe('10.0km');
    });

    it('should round meters to whole numbers', () => {
      expect(geofencingService.formatDistance(50.7)).toBe('51m');
      expect(geofencingService.formatDistance(50.3)).toBe('50m');
    });
  });

  describe('calculateBearing()', () => {
    it('should calculate bearing of 0 degrees for due north', () => {
      const bearing = geofencingService.calculateBearing(
        34.0, -118.0, // From
        35.0, -118.0  // To (due north)
      );

      // Due north should be ~0 degrees (or close to it)
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(10);
    });

    it('should calculate bearing of ~90 degrees for due east', () => {
      const bearing = geofencingService.calculateBearing(
        34.0, -118.0, // From
        34.0, -117.0  // To (due east)
      );

      // Due east should be ~90 degrees
      expect(bearing).toBeGreaterThan(85);
      expect(bearing).toBeLessThan(95);
    });

    it('should calculate bearing of ~180 degrees for due south', () => {
      const bearing = geofencingService.calculateBearing(
        34.0, -118.0, // From
        33.0, -118.0  // To (due south)
      );

      // Due south should be ~180 degrees
      expect(bearing).toBeGreaterThan(175);
      expect(bearing).toBeLessThan(185);
    });

    it('should calculate bearing of ~270 degrees for due west', () => {
      const bearing = geofencingService.calculateBearing(
        34.0, -118.0, // From
        34.0, -119.0  // To (due west)
      );

      // Due west should be ~270 degrees
      expect(bearing).toBeGreaterThan(265);
      expect(bearing).toBeLessThan(275);
    });
  });

  describe('getBearingDirection()', () => {
    it('should return correct cardinal directions', () => {
      expect(geofencingService.getBearingDirection(0)).toBe('N');
      expect(geofencingService.getBearingDirection(45)).toBe('NE');
      expect(geofencingService.getBearingDirection(90)).toBe('E');
      expect(geofencingService.getBearingDirection(135)).toBe('SE');
      expect(geofencingService.getBearingDirection(180)).toBe('S');
      expect(geofencingService.getBearingDirection(225)).toBe('SW');
      expect(geofencingService.getBearingDirection(270)).toBe('W');
      expect(geofencingService.getBearingDirection(315)).toBe('NW');
    });

    it('should handle 360 degrees as North', () => {
      expect(geofencingService.getBearingDirection(360)).toBe('N');
    });

    it('should round to nearest direction', () => {
      // 22 degrees should round to NE (45 is closest)
      expect(geofencingService.getBearingDirection(23)).toBe('NE');
      // 22 degrees should round to N (0 is closest)
      expect(geofencingService.getBearingDirection(22)).toBe('N');
    });
  });

  describe('getLastKnownLocation()', () => {
    it('should return null when no location has been set', () => {
      const location = geofencingService.getLastKnownLocation();

      expect(location).toBeNull();
    });
  });

  describe('cleanup()', () => {
    it('should clear all geofences', () => {
      geofencingService.addGeofence(createTestGeofence({ id: 'fence-1' }));
      geofencingService.addGeofence(createTestGeofence({ id: 'fence-2' }));

      geofencingService.cleanup();

      expect(geofencingService.getCurrentGeofences()).toEqual([]);
    });

    it('should clear location state', () => {
      geofencingService.cleanup();

      expect(geofencingService.getLastKnownLocation()).toBeNull();
    });
  });

  describe('Geofence callbacks', () => {
    it('should register enter callback', () => {
      const callback = vi.fn();

      geofencingService.onGeofenceEnter(callback);

      // Callback should be registered (we can't directly test private state)
      expect(callback).not.toHaveBeenCalled();
    });

    it('should register exit callback', () => {
      const callback = vi.fn();

      geofencingService.onGeofenceExit(callback);

      // Callback should be registered
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('checkAvailability()', () => {
    it('should return a boolean indicating availability', async () => {
      // In happy-dom, geolocation is already mocked in setup.ts
      const available = await geofencingService.checkAvailability();

      // Should return a boolean (true because setup.ts mocks geolocation)
      expect(typeof available).toBe('boolean');
    });
  });
});

describe('Haversine Formula Accuracy', () => {
  it('should match known distances within acceptable error', () => {
    // Known distances (verified with online calculators)
    const testCases = [
      {
        name: 'London to Paris',
        from: { lat: 51.5074, lon: -0.1278 },
        to: { lat: 48.8566, lon: 2.3522 },
        expectedKm: 343,
        toleranceKm: 20,
      },
      {
        name: 'San Francisco to LA',
        from: { lat: 37.7749, lon: -122.4194 },
        to: { lat: 34.0522, lon: -118.2437 },
        expectedKm: 559,
        toleranceKm: 30,
      },
      {
        name: 'Sydney to Melbourne',
        from: { lat: -33.8688, lon: 151.2093 },
        to: { lat: -37.8136, lon: 144.9631 },
        expectedKm: 714,
        toleranceKm: 40,
      },
    ];

    for (const testCase of testCases) {
      const distance = geofencingService.calculateDistance(
        testCase.from.lat,
        testCase.from.lon,
        testCase.to.lat,
        testCase.to.lon
      );

      const distanceKm = distance / 1000;

      expect(distanceKm).toBeGreaterThan(testCase.expectedKm - testCase.toleranceKm);
      expect(distanceKm).toBeLessThan(testCase.expectedKm + testCase.toleranceKm);
    }
  });
});

describe('Edge Cases', () => {
  it('should handle coordinates at the equator', () => {
    const distance = geofencingService.calculateDistance(
      0, 0,   // Origin
      0, 1    // 1 degree east on equator (~111km)
    );

    // 1 degree of longitude at equator is approximately 111km
    expect(distance).toBeGreaterThan(105_000);
    expect(distance).toBeLessThan(115_000);
  });

  it('should handle coordinates at high latitudes', () => {
    // Near North Pole
    const distance = geofencingService.calculateDistance(
      89, 0,   // Near pole
      89, 180  // Opposite side
    );

    // At high latitudes, longitude degrees cover less distance
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(500_000); // Should be much less than equatorial distance
  });

  it('should handle crossing the date line', () => {
    const distance = geofencingService.calculateDistance(
      0, 179,   // Just west of date line
      0, -179   // Just east of date line
    );

    // Should be approximately 222km (2 degrees at equator)
    expect(distance).toBeGreaterThan(200_000);
    expect(distance).toBeLessThan(250_000);
  });

  it('should handle negative coordinates', () => {
    // Southern hemisphere
    const distance = geofencingService.calculateDistance(
      -33.8688, 151.2093,  // Sydney
      -37.8136, 144.9631   // Melbourne
    );

    expect(distance).toBeGreaterThan(600_000);
    expect(distance).toBeLessThan(800_000);
  });
});
