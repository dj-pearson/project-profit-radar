import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useInsertMutation, useUpdateMutation } from '@/hooks/useSupabaseMutation';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import { useGPSLocation } from '@/hooks/useGPSLocation';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useToast } from '@/hooks/use-toast';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Wifi } from 'lucide-react';
import { ActiveTimer } from './ActiveTimer';
import { TimeSummaryCards } from './TimeSummaryCards';
import { TimeEntriesList } from './TimeEntriesList';

interface TimeEntry {
  id: string;
  description?: string;
  start_time: string;
  end_time?: string;
  total_hours?: number;
  location?: string;
  project_id?: string;
  task_id?: string;
  user_id: string;
  cost_code_id?: string;
  break_duration?: number;
  gps_latitude?: number;
  gps_longitude?: number;
  location_accuracy?: number;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
}

export const TimeTrackingDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings: financialSettings } = useFinancialSettings();
  const { getCurrentLocation, isLoading: locationLoading } = useGPSLocation();
  const [showLocationDialog, setShowLocationDialog] = React.useState(false);
  const [locationData, setLocationData] = React.useState<{
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    address?: string;
  } | null>(null);

  // Fetch time entries
  const { 
    data: timeEntries, 
    isLoading: entriesLoading, 
    error: entriesError,
    refetch: refetchEntries 
  } = useSupabaseQuery<TimeEntry[]>({
    queryKey: ['time_entries', user?.id],
    queryFn: async () => {
      return await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user?.id)
        .order('start_time', { ascending: false })
        .limit(10);
    },
    enabled: !!user?.id
  });

  // Fetch projects for count
  const { 
    data: projects, 
    isLoading: projectsLoading 
  } = useSupabaseQuery<Project[]>({
    queryKey: ['projects', user?.id],
    queryFn: async () => {
      return await supabase
        .from('projects')
        .select('id, name')
        .eq('created_by', user?.id)
        .order('name', { ascending: true });
    },
    enabled: !!user?.id
  });

  // Set up real-time subscription for time entries
  useRealtimeSubscription({
    table: 'time_entries',
    filter: `user_id=eq.${user?.id}`,
    onChange: () => {
      console.log('Time entry changed, refetching...');
      refetchEntries();
    },
    enabled: !!user?.id
  });

  // Mutations
  const insertMutation = useInsertMutation<TimeEntry>({
    tableName: 'time_entries',
    showSuccessToast: false,
  });

  const updateMutation = useUpdateMutation<TimeEntry>({
    tableName: 'time_entries',
    showSuccessToast: false,
  });

  // Find active entry
  const activeEntry = timeEntries?.find(entry => !entry.end_time) || null;

  // Calculate summaries
  const totalHours = timeEntries?.reduce((sum, entry) => sum + (entry.total_hours || 0), 0) || 0;
  const hourlyRate = 75; // Default rate - would come from company settings
  const totalEarnings = totalHours * hourlyRate;

  const startTimer = async () => {
    if (activeEntry) {
      toast({
        title: "Timer Already Running",
        description: "Please stop the current timer before starting a new one",
        variant: "destructive",
      });
      return;
    }

    // Get location first
    const result = await getCurrentLocation();
    
    if (result.coordinates) {
      setLocationData({
        latitude: result.coordinates.latitude,
        longitude: result.coordinates.longitude,
        accuracy: result.coordinates.accuracy,
        address: result.address
      });
      setShowLocationDialog(true);
    } else {
      // Start without location if user declines
      await startTimerWithLocation(null);
    }
  };

  const startTimerWithLocation = async (location: typeof locationData) => {
    try {
      await insertMutation.mutateAsync({
        user_id: user?.id,
        description: 'Work session',
        start_time: new Date().toISOString(),
        location: location?.address,
        gps_latitude: location?.latitude,
        gps_longitude: location?.longitude,
        location_accuracy: location?.accuracy
      });

      toast({
        title: "Timer Started",
        description: location ? "Started tracking with location" : "Started tracking your work session",
      });
      
      setShowLocationDialog(false);
      setLocationData(null);
      refetchEntries();
    } catch (error) {
      // Error handling done by mutation hook
    }
  };

  const stopTimer = async () => {
    if (!activeEntry) return;

    try {
      await updateMutation.mutateAsync({
        id: activeEntry.id,
        data: {
          end_time: new Date().toISOString()
        }
      });

      toast({
        title: "Timer Stopped",
        description: "Time entry has been completed",
      });
      
      refetchEntries();
    } catch (error) {
      // Error handling done by mutation hook
    }
  };

  if (entriesLoading || projectsLoading) {
    return <LoadingState />;
  }

  if (entriesError) {
    return (
      <ErrorState
        title="Failed to load time tracking data"
        error={entriesError.message}
        onRetry={refetchEntries}
      />
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Real-time indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Wifi className="h-3 w-3 mr-1 text-green-500" />
              Live Updates
            </Badge>
          </div>
        </div>

        <ActiveTimer
          activeEntry={activeEntry}
          onStart={startTimer}
          onStop={stopTimer}
          isLoading={insertMutation.isPending || updateMutation.isPending || locationLoading}
        />

        <TimeSummaryCards
          totalHours={totalHours}
          totalEarnings={totalEarnings}
          activeProjects={projects?.length || 0}
        />

        <TimeEntriesList
          entries={timeEntries || []}
          hourlyRate={hourlyRate}
        />
      </div>

      {/* Location Confirmation Dialog */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Location</DialogTitle>
            <DialogDescription>
              Start timer with your current location?
            </DialogDescription>
          </DialogHeader>
          
          {locationData && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted">
              <MapPin className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {locationData.address || 'Location captured'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {locationData.latitude?.toFixed(6)}, {locationData.longitude?.toFixed(6)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Accuracy: ±{Math.round(locationData.accuracy || 0)}m
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowLocationDialog(false);
                startTimerWithLocation(null);
              }}
              className="w-full sm:w-auto"
            >
              Start Without Location
            </Button>
            <Button
              onClick={() => startTimerWithLocation(locationData)}
              className="w-full sm:w-auto"
            >
              Start With Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
