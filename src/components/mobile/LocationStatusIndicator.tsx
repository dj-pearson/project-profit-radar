/**
 * Location Status Indicator
 * Displays GPS status, accuracy, distance, and geofence information
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  MapPin,
  Navigation,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  Signal
} from 'lucide-react';
import type { GeofenceLocation } from '@/services/geofencingService';

interface LocationStatusIndicatorProps {
  location: GeofenceLocation | null;
  isTracking: boolean;
  permissionStatus: 'prompt' | 'granted' | 'denied';
  isInsideGeofence?: boolean;
  distanceFromGeofence?: number | null;
  geofenceName?: string;
  geofenceRadius?: number;
  compact?: boolean;
  showDetails?: boolean;
}

export const LocationStatusIndicator: React.FC<LocationStatusIndicatorProps> = ({
  location,
  isTracking,
  permissionStatus,
  isInsideGeofence,
  distanceFromGeofence,
  geofenceName,
  geofenceRadius = 100,
  compact = false,
  showDetails = true
}) => {
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const getAccuracyLevel = (accuracy?: number): { level: string; color: string; icon: React.ReactNode } => {
    if (!accuracy) {
      return { level: 'Unknown', color: 'text-gray-500', icon: <Signal className="h-4 w-4" /> };
    }

    if (accuracy <= 10) {
      return { level: 'Excellent', color: 'text-green-500', icon: <CheckCircle className="h-4 w-4" /> };
    }

    if (accuracy <= 30) {
      return { level: 'Good', color: 'text-blue-500', icon: <CheckCircle className="h-4 w-4" /> };
    }

    if (accuracy <= 50) {
      return { level: 'Fair', color: 'text-yellow-500', icon: <AlertTriangle className="h-4 w-4" /> };
    }

    return { level: 'Poor', color: 'text-red-500', icon: <XCircle className="h-4 w-4" /> };
  };

  const getPermissionBadge = () => {
    switch (permissionStatus) {
      case 'granted':
        return <Badge variant="default" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          GPS Active
        </Badge>;
      case 'denied':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          GPS Denied
        </Badge>;
      default:
        return <Badge variant="secondary" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          GPS Permission Required
        </Badge>;
    }
  };

  const getGeofenceStatus = () => {
    if (isInsideGeofence === undefined || isInsideGeofence === null) {
      return null;
    }

    if (isInsideGeofence) {
      return {
        variant: 'default' as const,
        icon: <CheckCircle className="h-4 w-4" />,
        text: 'Inside Geofence',
        color: 'text-green-500'
      };
    }

    return {
      variant: 'destructive' as const,
      icon: <AlertTriangle className="h-4 w-4" />,
      text: 'Outside Geofence',
      color: 'text-red-500'
    };
  };

  const getProximityPercentage = (): number => {
    if (!distanceFromGeofence || !geofenceRadius) return 0;

    const percentage = Math.max(0, Math.min(100, ((geofenceRadius - distanceFromGeofence) / geofenceRadius) * 100));
    return percentage;
  };

  const accuracy = getAccuracyLevel(location?.accuracy);
  const geofenceStatus = getGeofenceStatus();
  const proximityPercentage = getProximityPercentage();

  // Compact view for small spaces
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {permissionStatus === 'granted' ? (
          <>
            <MapPin className={`h-4 w-4 ${isInsideGeofence ? 'text-green-500' : 'text-red-500'}`} />
            <span className="text-sm">
              {isInsideGeofence ? 'On Site' : distanceFromGeofence ? formatDistance(distanceFromGeofence) : 'Off Site'}
            </span>
          </>
        ) : (
          <>
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm">No GPS</span>
          </>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium">Location Status</h3>
            </div>
            {getPermissionBadge()}
          </div>

          {/* GPS Tracking Status */}
          {permissionStatus === 'granted' && (
            <div className="space-y-3">
              {/* Tracking Indicator */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">GPS Tracking:</span>
                <div className="flex items-center gap-2">
                  {isTracking ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                      <span className="text-blue-500">Active</span>
                    </>
                  ) : (
                    <span className="text-gray-500">Inactive</span>
                  )}
                </div>
              </div>

              {/* Accuracy */}
              {location && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Accuracy:</span>
                  <div className="flex items-center gap-2">
                    <span className={accuracy.color}>{accuracy.level}</span>
                    {accuracy.icon}
                    <span className="text-xs text-muted-foreground">
                      (±{Math.round(location.accuracy || 0)}m)
                    </span>
                  </div>
                </div>
              )}

              {/* Coordinates (if details enabled) */}
              {showDetails && location && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <Navigation className="h-3 w-3" />
                  <span>
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Geofence Status */}
          {geofenceStatus && (
            <>
              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{geofenceName || 'Job Site'}</span>
                  <Badge variant={geofenceStatus.variant} className="flex items-center gap-1">
                    {geofenceStatus.icon}
                    {geofenceStatus.text}
                  </Badge>
                </div>

                {/* Distance from geofence */}
                {distanceFromGeofence !== null && distanceFromGeofence !== undefined && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Distance:</span>
                      <span className={`font-medium ${geofenceStatus.color}`}>
                        {formatDistance(distanceFromGeofence)}
                      </span>
                    </div>

                    {/* Proximity bar */}
                    <div className="space-y-1">
                      <Progress
                        value={proximityPercentage}
                        className="h-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Edge ({formatDistance(geofenceRadius)})</span>
                        <span>Center</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Permission Denied Message */}
          {permissionStatus === 'denied' && (
            <div className="border-t pt-3">
              <div className="flex items-center gap-2 text-sm text-red-500">
                <XCircle className="h-4 w-4" />
                <span>Location permission denied. Enable GPS to use geofencing features.</span>
              </div>
            </div>
          )}

          {/* Permission Prompt Message */}
          {permissionStatus === 'prompt' && (
            <div className="border-t pt-3">
              <div className="flex items-center gap-2 text-sm text-yellow-600">
                <AlertTriangle className="h-4 w-4" />
                <span>Grant location permission to enable GPS tracking.</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationStatusIndicator;
