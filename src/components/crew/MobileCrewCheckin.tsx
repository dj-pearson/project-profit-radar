/**
 * Mobile Crew Check-in Component
 * GPS-verified arrival and departure for field workers
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  Navigation,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useCrewGPSCheckin } from '@/hooks/useCrewGPSCheckin';
import { formatDistanceToNow } from 'date-fns';

const MobileCrewCheckin = () => {
  const {
    myPendingCheckins,
    crewPresence,
    currentLocation,
    loadingPending,
    checkingIn,
    checkingOut,
    performCheckin,
    performCheckout,
    calculateDistanceToSite,
    gpsError,
  } = useCrewGPSCheckin();

  // Find if I'm currently checked in anywhere
  const myCurrentCheckin = crewPresence.find(
    (p) => p.is_onsite && p.gps_checkout_timestamp === null
  );

  const formatDistance = (meters: number | null) => {
    if (meters === null) return 'Unknown';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const getDistanceStatus = (distance: number | null, allowedRadius: number | null) => {
    if (distance === null || allowedRadius === null) return 'unknown';
    if (distance <= allowedRadius) return 'inside';
    if (distance <= allowedRadius * 2) return 'nearby';
    return 'far';
  };

  if (loadingPending) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-construction-orange" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* GPS Status */}
      {gpsError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {gpsError}. Please enable location services to check in.
          </AlertDescription>
        </Alert>
      )}

      {currentLocation && (
        <Alert>
          <Navigation className="h-4 w-4" />
          <AlertDescription>
            GPS Active - Accuracy: ±{Math.round(currentLocation.accuracy)}m
          </AlertDescription>
        </Alert>
      )}

      {/* Currently Checked In */}
      {myCurrentCheckin && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
              <CheckCircle2 className="h-5 w-5" />
              Checked In
            </CardTitle>
            <CardDescription className="text-green-700 dark:text-green-300">
              You are currently on site
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="font-semibold text-green-900 dark:text-green-100">
                {myCurrentCheckin.project_name}
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">
                {myCurrentCheckin.project_location}
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
              <Clock className="h-4 w-4" />
              On site for {myCurrentCheckin.hours_onsite.toFixed(1)} hours
            </div>

            {myCurrentCheckin.gps_checkin_timestamp && (
              <div className="text-xs text-green-600 dark:text-green-400">
                Checked in{' '}
                {formatDistanceToNow(new Date(myCurrentCheckin.gps_checkin_timestamp), {
                  addSuffix: true,
                })}
              </div>
            )}

            <Button
              onClick={() => performCheckout(myCurrentCheckin.assignment_id)}
              disabled={checkingOut}
              variant="outline"
              className="w-full border-green-600 text-green-700 hover:bg-green-100 dark:text-green-300"
            >
              {checkingOut ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking Out...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Check Out
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pending Check-ins */}
      {myPendingCheckins.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Your Assignments Today</h2>

          {myPendingCheckins.map((assignment) => {
            const distance = calculateDistanceToSite(
              assignment.geofence_latitude,
              assignment.geofence_longitude
            );
            const distanceStatus = getDistanceStatus(
              distance,
              assignment.geofence_radius_meters
            );

            return (
              <Card key={assignment.id}>
                <CardHeader>
                  <CardTitle className="text-base">{assignment.project_name}</CardTitle>
                  <CardDescription>{assignment.project_location}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Distance indicator */}
                  {distance !== null && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {formatDistance(distance)} from site
                        </span>
                      </div>

                      {distanceStatus === 'inside' && (
                        <Badge variant="default" className="bg-green-600">
                          In Range
                        </Badge>
                      )}
                      {distanceStatus === 'nearby' && (
                        <Badge variant="secondary">Nearby</Badge>
                      )}
                      {distanceStatus === 'far' && (
                        <Badge variant="outline">Too Far</Badge>
                      )}
                    </div>
                  )}

                  {/* Status badge */}
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        assignment.status === 'dispatched'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {assignment.status === 'dispatched' ? 'En Route' : 'Scheduled'}
                    </Badge>
                  </div>

                  {/* Check-in button */}
                  <Button
                    onClick={() => performCheckin(assignment.id)}
                    disabled={checkingIn || !currentLocation}
                    className="w-full bg-construction-orange hover:bg-construction-orange/90"
                  >
                    {checkingIn ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying Location...
                      </>
                    ) : (
                      <>
                        <MapPin className="mr-2 h-4 w-4" />
                        GPS Check In
                      </>
                    )}
                  </Button>

                  {/* Geofence info */}
                  {assignment.geofence_radius_meters && (
                    <div className="text-xs text-muted-foreground text-center">
                      You must be within {assignment.geofence_radius_meters}m of the site
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        !myCurrentCheckin && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No assignments for today</p>
              <p className="text-sm mt-1">Check back later or contact your supervisor</p>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
};

export default MobileCrewCheckin;
