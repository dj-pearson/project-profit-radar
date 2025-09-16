import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseTimeTrackingIntegrationProps {
  autoSync?: boolean;
  syncInterval?: number; // minutes
}

export const useTimeTrackingIntegration = ({
  autoSync = false,
  syncInterval = 60
}: UseTimeTrackingIntegrationProps = {}) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [pendingEntries, setPendingEntries] = useState<number>(0);

  // Check for completed time entries that haven't been synced
  const checkPendingTimeEntries = async () => {
    try {
      if (!userProfile?.company_id) return 0;

      // Get time entries from the last sync or last 24 hours
      const cutoffTime = lastSyncTime || new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const { data: timeEntries, error } = await supabase
        .from('time_entries')
        .select(`
          id,
          project_id,
          total_hours,
          start_time,
          projects!inner(company_id)
        `)
        .eq('projects.company_id', userProfile.company_id)
        .gte('updated_at', cutoffTime.toISOString())
        .not('total_hours', 'is', null)
        .not('end_time', 'is', null);

      if (error) throw error;

      // Check which ones don't have corresponding job_costs entries
      const pending = timeEntries?.length || 0;
      setPendingEntries(pending);
      
      return pending;
    } catch (error) {
      console.error('Error checking pending entries:', error);
      return 0;
    }
  };

  // Auto-sync completed time entries to job costs
  const autoSyncTimeEntries = async () => {
    try {
      if (!userProfile?.company_id || isAutoSyncing) return;

      setIsAutoSyncing(true);
      
      const cutoffTime = lastSyncTime || new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Get completed time entries that need syncing
      const { data: timeEntries, error: timeError } = await supabase
        .from('time_entries')
        .select(`
          project_id,
          cost_code_id,
          total_hours,
          start_time,
          user_id,
          projects!inner(company_id)
        `)
        .eq('projects.company_id', userProfile.company_id)
        .gte('updated_at', cutoffTime.toISOString())
        .not('total_hours', 'is', null)
        .not('end_time', 'is', null);

      if (timeError) throw timeError;

      if (!timeEntries || timeEntries.length === 0) {
        setLastSyncTime(new Date());
        return;
      }

      // Group by project, cost code, and date
      const groupedEntries = timeEntries.reduce((acc: any, entry: any) => {
        const date = entry.start_time.split('T')[0];
        const key = `${entry.project_id}-${entry.cost_code_id || 'null'}-${date}`;
        
        if (!acc[key]) {
          acc[key] = {
            project_id: entry.project_id,
            cost_code_id: entry.cost_code_id,
            date: date,
            total_hours: 0,
            labor_cost: 0,
            entry_count: 0
          };
        }
        
        acc[key].total_hours += Number(entry.total_hours);
        acc[key].labor_cost += Number(entry.total_hours) * 65; // Default rate
        acc[key].entry_count += 1;
        
        return acc;
      }, {});

      // Insert or update job_costs entries
      const jobCostUpdates = Object.values(groupedEntries).map((entry: any) => ({
        project_id: entry.project_id,
        cost_code_id: entry.cost_code_id,
        date: entry.date,
        description: `Auto-sync: Labor costs from ${entry.entry_count} time entries`,
        labor_hours: entry.total_hours,
        labor_cost: entry.labor_cost,
        material_cost: 0,
        equipment_cost: 0,
        other_cost: 0,
        total_cost: entry.labor_cost,
        created_by: userProfile.id
      }));

      let successCount = 0;
      for (const update of jobCostUpdates) {
        try {
          const { error: upsertError } = await supabase
            .from('job_costs')
            .upsert(update, {
              onConflict: 'project_id,cost_code_id,date',
              ignoreDuplicates: false
            });

          if (!upsertError) {
            successCount++;
          }
        } catch (error) {
          console.error('Error upserting job cost:', error);
        }
      }

      setLastSyncTime(new Date());
      setPendingEntries(0);

      if (successCount > 0) {
        toast({
          title: "Auto-sync Complete",
          description: `Updated ${successCount} job cost entries from time tracking`
        });
      }
      
    } catch (error) {
      console.error('Error in auto-sync:', error);
    } finally {
      setIsAutoSyncing(false);
    }
  };

  // Manual sync function
  const manualSync = async () => {
    await autoSyncTimeEntries();
  };

  // Setup auto-sync interval
  useEffect(() => {
    if (!autoSync || !userProfile?.company_id) return;

    const interval = setInterval(() => {
      checkPendingTimeEntries();
      autoSyncTimeEntries();
    }, syncInterval * 60 * 1000);

    // Initial check
    checkPendingTimeEntries();

    return () => clearInterval(interval);
  }, [autoSync, syncInterval, userProfile?.company_id, lastSyncTime]);

  return {
    lastSyncTime,
    isAutoSyncing,
    pendingEntries,
    manualSync,
    checkPendingTimeEntries
  };
};

export default useTimeTrackingIntegration;