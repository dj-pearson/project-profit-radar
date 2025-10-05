import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useInsertMutation, useUpdateMutation } from '@/hooks/useSupabaseMutation';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import { useToast } from '@/hooks/use-toast';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
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

    try {
      await insertMutation.mutateAsync({
        user_id: user?.id,
        description: 'Work session',
        start_time: new Date().toISOString()
      });

      toast({
        title: "Timer Started",
        description: "Started tracking your work session",
      });
      
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
    <div className="space-y-6">
      <ActiveTimer
        activeEntry={activeEntry}
        onStart={startTimer}
        onStop={stopTimer}
        isLoading={insertMutation.isPending || updateMutation.isPending}
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
  );
};
