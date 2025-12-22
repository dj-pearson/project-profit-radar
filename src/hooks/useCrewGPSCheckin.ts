/**
 * Crew GPS Check-in Hook
 * Handles GPS-verified crew arrival and departure from job sites
 * Updated with multi-tenant site_id isolation
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useGPSLocation } from '@/hooks/useGPSLocation';

export interface CrewAssignment {
  id: string;
  user_id: string;
  project_id: string;
  assigned_date: string;
  status: string;
  is_onsite: boolean;
  gps_checkin_timestamp: string | null;
  gps_checkout_timestamp: string | null;
  gps_checkin_verified: boolean;
  distance_from_site: number | null;
  crew_member_name: string;
  project_name: string;
  project_location: string;
  geofence_latitude: number | null;
  geofence_longitude: number | null;
  geofence_radius_meters: number | null;
}

export interface CrewPresence {
  assignment_id: string;
  project_id: string;
  assigned_date: string;
  status: string;
  is_onsite: boolean;
  gps_checkin_timestamp: string | null;
  gps_checkout_timestamp: string | null;
  distance_from_site: number | null;
  gps_checkin_verified: boolean;
  user_id: string;
  crew_member_name: string;
  crew_member_email: string;
  crew_member_phone: string | null;
  crew_member_role: string;
  project_name: string;
  project_location: string;
  geofence_latitude: number | null;
  geofence_longitude: number | null;
  geofence_radius_meters: number | null;
  geofence_name: string | null;
  geofence_type: string | null;
  hours_onsite: number;
  presence_status: string;
}

interface GPSCheckInResult {
  success: boolean;
  verified: boolean;
  distance_meters: number;
  allowed_radius_meters: number;
  message: string;
  error?: string;
}

export const useCrewGPSCheckin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { location, error: gpsError, requestLocation } = useGPSLocation();

  // Get my pending check-ins (assigned to me today) with site isolation
  const { data: myPendingCheckins, isLoading: loadingPending } = useQuery({
    queryKey: ['crew-pending-checkin', user?.id],
    queryFn: async () => {
      if (!user?.id || !siteId) return [];

      const { data, error } = await supabase
        .from('crew_assignments_pending_checkin')
        .select('*')
          // CRITICAL: Site isolation
        .eq('user_id', user.id);

      if (error) throw error;
      return data as CrewAssignment[];
    },
    enabled: !!user?.id,
  });

  // Get all crew presence (for dashboard - project managers/supervisors) with site isolation
  const { data: crewPresence, isLoading: loadingPresence } = useQuery({
    queryKey: ['crew-presence'],
    queryFn: async () => {
      if (!siteId) return [];

      const { data, error } = await supabase
        .from('crew_presence_dashboard')
        .select('*')
          // CRITICAL: Site isolation
        .order('is_onsite', { ascending: false })
        .order('gps_checkin_timestamp', { ascending: false });

      if (error) throw error;
      return data as CrewPresence[];
    },
    enabled: !!siteId,
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  // GPS Check-in mutation
  const checkinMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      if (!location) {
        throw new Error('GPS location not available. Please enable location services.');
      }

      // Call the database function to verify and record check-in
      const { data, error } = await supabase.rpc('verify_crew_gps_checkin', {
        p_assignment_id: assignmentId,
        p_latitude: location.latitude,
        p_longitude: location.longitude,
        p_accuracy: location.accuracy,
      });

      if (error) throw error;
      return data as GPSCheckInResult;
    },
    onSuccess: (result, assignmentId) => {
      if (result.success && result.verified) {
        toast({
          title: 'Check-in Successful',
          description: result.message,
          variant: 'default',
        });
      } else if (result.success && !result.verified) {
        toast({
          title: 'Check-in Failed',
          description: result.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to verify check-in',
          variant: 'destructive',
        });
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['crew-pending-checkin'] });
      queryClient.invalidateQueries({ queryKey: ['crew-presence'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Check-in Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // GPS Check-out mutation with site isolation
  const checkoutMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      if (!location) {
        throw new Error('GPS location not available. Please enable location services.');
      }
      if (!siteId) {
        throw new Error('No site ID - multi-tenant isolation required');
      }

      const { data, error } = await supabase
        .from('crew_assignments')
        .update({
          gps_checkout_timestamp: new Date().toISOString(),
          gps_checkout_lat: location.latitude,
          gps_checkout_lng: location.longitude,
          is_onsite: false,
          status: 'completed',
        })
        .eq('id', assignmentId)
          // CRITICAL: Site isolation
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Check-out Successful',
        description: 'You have been checked out from the site.',
      });

      queryClient.invalidateQueries({ queryKey: ['crew-pending-checkin'] });
      queryClient.invalidateQueries({ queryKey: ['crew-presence'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Check-out Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Helper function to check-in
  const performCheckin = useCallback(async (assignmentId: string) => {
    // First ensure we have current location
    await requestLocation();

    // Wait a moment for location to be available
    setTimeout(() => {
      checkinMutation.mutate(assignmentId);
    }, 500);
  }, [checkinMutation, requestLocation]);

  // Helper function to check-out
  const performCheckout = useCallback(async (assignmentId: string) => {
    // Ensure we have current location
    await requestLocation();

    setTimeout(() => {
      checkoutMutation.mutate(assignmentId);
    }, 500);
  }, [checkoutMutation, requestLocation]);

  // Calculate distance to site (for UI display)
  const calculateDistanceToSite = useCallback((
    siteLat: number | null,
    siteLng: number | null
  ): number | null => {
    if (!location || !siteLat || !siteLng) return null;

    const R = 6371000; // Earth's radius in meters
    const φ1 = (location.latitude * Math.PI) / 180;
    const φ2 = (siteLat * Math.PI) / 180;
    const Δφ = ((siteLat - location.latitude) * Math.PI) / 180;
    const Δλ = ((siteLng - location.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }, [location]);

  return {
    // Data
    myPendingCheckins: myPendingCheckins || [],
    crewPresence: crewPresence || [],
    currentLocation: location,

    // Loading states
    loadingPending,
    loadingPresence,
    checkingIn: checkinMutation.isPending,
    checkingOut: checkoutMutation.isPending,

    // Actions
    performCheckin,
    performCheckout,
    requestLocation,
    calculateDistanceToSite,

    // Errors
    gpsError,
  };
};
