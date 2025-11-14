/**
 * Auto Clock-In Manager
 * Automatically clocks users in/out when entering/exiting job site geofences
 */

import React, { useEffect, useState } from 'react';
import { useGeofenceMonitor } from '@/hooks/useGeofencing';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

interface AutoClockInManagerProps {
  project: {
    id: string;
    name: string;
    site_latitude: number;
    site_longitude: number;
    geofence_radius_meters: number;
  };
  enabled?: boolean;
  onAutoClockIn?: (entryId: string) => void;
  onAutoClockOut?: (entryId: string) => void;
}

export const AutoClockInManager: React.FC<AutoClockInManagerProps> = ({
  project,
  enabled = true,
  onAutoClockIn,
  onAutoClockOut
}) => {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [hasActiveEntry, setHasActiveEntry] = useState(false);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<{
    type: 'clock-in' | 'clock-out' | 'alert';
    timestamp: Date;
    message: string;
  } | null>(null);

  const { isInside, distance, isTracking } = useGeofenceMonitor({
    geofence: {
      id: project.id,
      name: project.name,
      centerLatitude: project.site_latitude,
      centerLongitude: project.site_longitude,
      radiusMeters: project.geofence_radius_meters,
      type: 'project'
    },
    onEnter: async () => {
      if (!enabled) return;

      // Only auto clock-in if not already clocked in
      if (!hasActiveEntry && user) {
        await handleAutoClockIn();
      }
    },
    onExit: async () => {
      if (!enabled) return;

      // Alert if clocked in and leaving site
      if (hasActiveEntry) {
        handleGeofenceAlert();
      }
    },
    autoStart: enabled
  });

  // Check for active entry on mount and when user changes
  useEffect(() => {
    if (user) {
      checkActiveEntry();
    }
  }, [user]);

  // Poll for active entry status every 30 seconds
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      checkActiveEntry();
    }, 30000);

    return () => clearInterval(interval);
  }, [enabled, user]);

  const checkActiveEntry = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('id, start_time, project_id')
        .eq('user_id', user.id)
        .eq('project_id', project.id)
        .is('end_time', null)
        .maybeSingle();

      if (error) {
        console.error('Error checking active entry:', error);
        return;
      }

      setHasActiveEntry(!!data);
      setCurrentEntryId(data?.id || null);
    } catch (error) {
      console.error('Error in checkActiveEntry:', error);
    }
  };

  const handleAutoClockIn = async () => {
    if (!user?.id || !userProfile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          project_id: project.id,
          company_id: userProfile.company_id,
          start_time: new Date().toISOString(),
          is_geofence_verified: true,
          geofence_distance_meters: distance,
          break_duration: 0
        })
        .select()
        .single();

      if (error) throw error;

      setHasActiveEntry(true);
      setCurrentEntryId(data.id);
      setLastAction({
        type: 'clock-in',
        timestamp: new Date(),
        message: `Auto clocked in to ${project.name}`
      });

      toast({
        title: '✓ Auto Clock-In',
        description: `Automatically clocked in to ${project.name}`,
        variant: 'default'
      });

      onAutoClockIn?.(data.id);
    } catch (error: any) {
      console.error('Auto clock-in failed:', error);

      toast({
        title: 'Auto Clock-In Failed',
        description: error.message || 'Could not automatically clock in',
        variant: 'destructive'
      });
    }
  };

  const handleGeofenceAlert = () => {
    setLastAction({
      type: 'alert',
      timestamp: new Date(),
      message: 'You have left the job site while clocked in'
    });

    toast({
      title: 'Geofence Alert',
      description: `You have left ${project.name} while clocked in. Remember to clock out when finished.`,
      variant: 'destructive',
      duration: 10000
    });
  };

  // Don't render if not enabled
  if (!enabled) return null;

  const getStatusColor = () => {
    if (!isTracking) return 'secondary';
    if (isInside && hasActiveEntry) return 'default';
    if (isInside && !hasActiveEntry) return 'secondary';
    if (!isInside && hasActiveEntry) return 'destructive';
    return 'secondary';
  };

  const getStatusText = () => {
    if (!isTracking) return 'GPS Initializing...';
    if (isInside && hasActiveEntry) return 'On Site & Clocked In';
    if (isInside && !hasActiveEntry) return 'On Site (Ready to Auto Clock-In)';
    if (!isInside && hasActiveEntry) return 'Off Site (Still Clocked In)';
    return 'Off Site';
  };

  const formatDistance = (meters: number | null) => {
    if (meters === null) return '';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <div className="space-y-3">
      {/* Status Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Auto Clock-In Status</p>
                <p className="text-xs text-muted-foreground">{project.name}</p>
              </div>
            </div>
            <Badge variant={getStatusColor()}>{getStatusText()}</Badge>
          </div>

          {/* Distance Display */}
          {distance !== null && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Distance from site:</span>
              <span className="font-medium">{formatDistance(distance)}</span>
              {isInside ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
            </div>
          )}

          {/* Active Entry Info */}
          {hasActiveEntry && currentEntryId && (
            <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-muted-foreground">Currently clocked in to this project</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Action Alert */}
      {lastAction && (
        <Alert variant={lastAction.type === 'alert' ? 'destructive' : 'default'}>
          <AlertTitle className="flex items-center gap-2">
            {lastAction.type === 'clock-in' && <CheckCircle className="h-4 w-4" />}
            {lastAction.type === 'clock-out' && <Clock className="h-4 w-4" />}
            {lastAction.type === 'alert' && <AlertTriangle className="h-4 w-4" />}
            {lastAction.type === 'clock-in' && 'Auto Clock-In'}
            {lastAction.type === 'clock-out' && 'Auto Clock-Out'}
            {lastAction.type === 'alert' && 'Geofence Alert'}
          </AlertTitle>
          <AlertDescription>
            {lastAction.message}
            <span className="block text-xs mt-1 opacity-75">
              {lastAction.timestamp.toLocaleTimeString()}
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Warning when off-site and clocked in */}
      {!isInside && hasActiveEntry && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>You are off-site</AlertTitle>
          <AlertDescription>
            You have left the job site but are still clocked in. Make sure to clock out when your work is complete.
            {distance && ` You are ${formatDistance(distance)} from the site.`}
          </AlertDescription>
        </Alert>
      )}

      {/* Info when on-site and not clocked in */}
      {isInside && !hasActiveEntry && isTracking && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>You are on-site</AlertTitle>
          <AlertDescription>
            Auto clock-in is ready. You can manually clock in from the time clock, or the system will automatically clock you in when you enter the geofence.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default AutoClockInManager;
