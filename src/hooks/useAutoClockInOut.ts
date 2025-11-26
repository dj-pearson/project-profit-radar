/**
 * Auto Clock-In/Out Hook
 *
 * Automatically creates time entries when users enter/exit geofences.
 * Integrates with GPS tracking and the database.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGeofencing, type UseGeofencingReturn } from './useGeofencing';
import { useToast } from './use-toast';
import type { GeofenceBoundary } from '@/services/geofencingService';

export interface AutoClockConfig {
  enabled: boolean;
  autoClockIn: boolean;
  autoClockOut: boolean;
  notifyOnEntry: boolean;
  notifyOnExit: boolean;
  graceDistance: number; // meters - extra buffer for accuracy issues
}

export interface UseAutoClockInOutOptions {
  projectId?: string;
  onClockIn?: (geofence: GeofenceBoundary) => void;
  onClockOut?: (geofence: GeofenceBoundary, hoursWorked: number) => void;
  enabled?: boolean;
}

export interface UseAutoClockInOutReturn {
  isLoading: boolean;
  isInGeofence: boolean;
  currentGeofence: GeofenceBoundary | null;
  activeTimeEntry: TimeEntryState | null;
  geofences: GeofenceBoundary[];
  error: string | null;

  // Manual controls
  manualClockIn: (geofenceId: string) => Promise<void>;
  manualClockOut: () => Promise<void>;
  refreshGeofences: () => Promise<void>;

  // Geofencing state
  geofencingState: UseGeofencingReturn;
}

interface TimeEntryState {
  id: string;
  startTime: Date;
  geofenceId: string;
  projectId?: string;
}

export const useAutoClockInOut = (options: UseAutoClockInOutOptions = {}): UseAutoClockInOutReturn => {
  const { projectId, onClockIn, onClockOut, enabled = true } = options;
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isInGeofence, setIsInGeofence] = useState(false);
  const [currentGeofence, setCurrentGeofence] = useState<GeofenceBoundary | null>(null);
  const [activeTimeEntry, setActiveTimeEntry] = useState<TimeEntryState | null>(null);
  const [geofences, setGeofences] = useState<GeofenceBoundary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const previousGeofenceRef = useRef<string | null>(null);
  const processingRef = useRef(false);

  const geofencingState = useGeofencing({
    autoStart: enabled,
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 5000
  });

  const { currentLocation, isTracking, addGeofence, removeGeofence } = geofencingState;

  // Load geofences from database
  const loadGeofences = useCallback(async () => {
    if (!userProfile?.company_id) return;

    try {
      setIsLoading(true);

      // Build query for geofences
      let query = supabase
        .from('geofences')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .eq('is_active', true);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const loadedGeofences: GeofenceBoundary[] = (data || []).map((g: any) => ({
        id: g.id,
        name: g.name,
        latitude: g.latitude,
        longitude: g.longitude,
        radius: g.radius,
        projectId: g.project_id,
        autoClockIn: g.auto_clock_in,
        autoClockOut: g.auto_clock_out,
        entryAlert: g.entry_alert,
        exitAlert: g.exit_alert
      }));

      setGeofences(loadedGeofences);

      // Register geofences with the service
      loadedGeofences.forEach(geofence => {
        addGeofence(geofence);
      });

    } catch (err: any) {
      console.error('Error loading geofences:', err);
      setError(err.message || 'Failed to load geofences');
    } finally {
      setIsLoading(false);
    }
  }, [userProfile?.company_id, projectId, addGeofence]);

  // Load any active time entry on mount
  const loadActiveTimeEntry = useCallback(async () => {
    if (!userProfile?.id) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('gps_time_entries')
        .select('*')
        .eq('user_id', userProfile.id)
        .is('clock_out_time', null)
        .order('clock_in_time', { ascending: false })
        .limit(1)
        .single();

      if (data && !fetchError) {
        setActiveTimeEntry({
          id: data.id,
          startTime: new Date(data.clock_in_time),
          geofenceId: data.geofence_id,
          projectId: data.project_id
        });
      }
    } catch (err) {
      // No active time entry, that's fine
      console.log('No active time entry found');
    }
  }, [userProfile?.id]);

  // Check if current location is inside any geofence
  useEffect(() => {
    if (!currentLocation || geofences.length === 0) return;

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371e3; // Earth's radius in meters
      const phi1 = (lat1 * Math.PI) / 180;
      const phi2 = (lat2 * Math.PI) / 180;
      const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
      const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

      const a = Math.sin(deltaPhi / 2) ** 2 +
                Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    };

    // Find which geofence the user is inside
    let insideGeofence: GeofenceBoundary | null = null;

    for (const geofence of geofences) {
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        geofence.latitude,
        geofence.longitude
      );

      // Check if inside radius (with accuracy buffer)
      const effectiveRadius = geofence.radius + (currentLocation.accuracy || 0);

      if (distance <= effectiveRadius) {
        insideGeofence = geofence;
        break;
      }
    }

    setIsInGeofence(!!insideGeofence);
    setCurrentGeofence(insideGeofence);

    // Handle geofence transitions
    handleGeofenceTransition(insideGeofence);

  }, [currentLocation, geofences]);

  // Handle entering/exiting geofences
  const handleGeofenceTransition = useCallback(async (newGeofence: GeofenceBoundary | null) => {
    if (processingRef.current) return;

    const previousId = previousGeofenceRef.current;
    const newId = newGeofence?.id || null;

    // No transition
    if (previousId === newId) return;

    processingRef.current = true;

    try {
      // Exit previous geofence
      if (previousId && !newId && activeTimeEntry) {
        const prevGeofence = geofences.find(g => g.id === previousId);
        if (prevGeofence?.autoClockOut) {
          await performClockOut();
        }
      }

      // Enter new geofence
      if (newId && !previousId && newGeofence) {
        if (newGeofence.autoClockIn && !activeTimeEntry) {
          await performClockIn(newGeofence);
        }
      }

      previousGeofenceRef.current = newId;
    } finally {
      processingRef.current = false;
    }
  }, [activeTimeEntry, geofences]);

  // Perform clock in
  const performClockIn = async (geofence: GeofenceBoundary) => {
    if (!userProfile?.id || !currentLocation) return;

    try {
      const { data, error: insertError } = await supabase
        .from('gps_time_entries')
        .insert({
          user_id: userProfile.id,
          company_id: userProfile.company_id,
          project_id: geofence.projectId || projectId,
          geofence_id: geofence.id,
          clock_in_time: new Date().toISOString(),
          clock_in_latitude: currentLocation.latitude,
          clock_in_longitude: currentLocation.longitude,
          clock_in_accuracy: currentLocation.accuracy,
          clock_in_verified: true,
          device_type: 'web'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setActiveTimeEntry({
        id: data.id,
        startTime: new Date(data.clock_in_time),
        geofenceId: geofence.id,
        projectId: geofence.projectId || projectId
      });

      if (geofence.entryAlert) {
        toast({
          title: 'Clocked In',
          description: `You've been automatically clocked in at ${geofence.name}`,
        });
      }

      onClockIn?.(geofence);

    } catch (err: any) {
      console.error('Error clocking in:', err);
      toast({
        variant: 'destructive',
        title: 'Clock In Failed',
        description: err.message || 'Failed to record clock in'
      });
    }
  };

  // Perform clock out
  const performClockOut = async () => {
    if (!activeTimeEntry || !currentLocation) return;

    try {
      const clockOutTime = new Date();
      const hoursWorked = (clockOutTime.getTime() - activeTimeEntry.startTime.getTime()) / (1000 * 60 * 60);

      const { error: updateError } = await supabase
        .from('gps_time_entries')
        .update({
          clock_out_time: clockOutTime.toISOString(),
          clock_out_latitude: currentLocation.latitude,
          clock_out_longitude: currentLocation.longitude,
          clock_out_accuracy: currentLocation.accuracy,
          clock_out_verified: true,
          total_hours: hoursWorked
        })
        .eq('id', activeTimeEntry.id);

      if (updateError) throw updateError;

      const geofence = geofences.find(g => g.id === activeTimeEntry.geofenceId);

      if (geofence?.exitAlert) {
        toast({
          title: 'Clocked Out',
          description: `You've worked ${hoursWorked.toFixed(2)} hours at ${geofence.name}`,
        });
      }

      onClockOut?.(geofence!, hoursWorked);

      setActiveTimeEntry(null);

    } catch (err: any) {
      console.error('Error clocking out:', err);
      toast({
        variant: 'destructive',
        title: 'Clock Out Failed',
        description: err.message || 'Failed to record clock out'
      });
    }
  };

  // Manual clock in
  const manualClockIn = async (geofenceId: string) => {
    const geofence = geofences.find(g => g.id === geofenceId);
    if (geofence) {
      await performClockIn(geofence);
    }
  };

  // Manual clock out
  const manualClockOut = async () => {
    await performClockOut();
  };

  // Initialize
  useEffect(() => {
    if (enabled && userProfile?.company_id) {
      loadGeofences();
      loadActiveTimeEntry();
    }
  }, [enabled, userProfile?.company_id, loadGeofences, loadActiveTimeEntry]);

  return {
    isLoading,
    isInGeofence,
    currentGeofence,
    activeTimeEntry,
    geofences,
    error,
    manualClockIn,
    manualClockOut,
    refreshGeofences: loadGeofences,
    geofencingState
  };
};
