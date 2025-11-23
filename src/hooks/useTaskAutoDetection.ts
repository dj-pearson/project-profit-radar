import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface OnboardingProgress {
  tasks_completed: string[];
  total_points: number;
}

/**
 * Auto-detects when onboarding checklist tasks are completed
 * Checks database periodically and marks tasks as complete automatically
 */
export const useTaskAutoDetection = (
  progress: OnboardingProgress,
  onTaskComplete: (taskId: string, points: number) => Promise<void>,
  isLoading: boolean = false
) => {
  const { user, userProfile } = useAuth();
  const processingTasks = useRef<Set<string>>(new Set());

  const checkTaskCompletion = useCallback(async () => {
    if (!user || !userProfile?.company_id) return;

    try {
      // Check: Complete Profile
      if (!progress.tasks_completed.includes('complete_profile') && !processingTasks.current.has('complete_profile')) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('first_name, last_name, phone, avatar_url')
          .eq('id', user.id)
          .single();

        if (profile?.first_name && profile?.last_name) {
          processingTasks.current.add('complete_profile');
          await onTaskComplete('complete_profile', 10);
          processingTasks.current.delete('complete_profile');
        }
      }

      // Check: Create First Project
      if (!progress.tasks_completed.includes('create_first_project') && !processingTasks.current.has('create_first_project')) {
        const { data: projects } = await supabase
          .from('projects')
          .select('id')
          .eq('company_id', userProfile.company_id)
          .limit(1);

        if (projects && projects.length > 0) {
          processingTasks.current.add('create_first_project');
          await onTaskComplete('create_first_project', 25);
          processingTasks.current.delete('create_first_project');
        }
      }

      // Check: Log Time Entry
      if (!progress.tasks_completed.includes('log_time_entry') && !processingTasks.current.has('log_time_entry')) {
        const { data: timeEntries } = await supabase
          .from('time_entries')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (timeEntries && timeEntries.length > 0) {
          processingTasks.current.add('log_time_entry');
          await onTaskComplete('log_time_entry', 20);
          processingTasks.current.delete('log_time_entry');
        }
      }

      // Check: Upload Document
      if (!progress.tasks_completed.includes('upload_document') && !processingTasks.current.has('upload_document')) {
        const { data: documents } = await supabase
          .from('documents')
          .select('id')
          .eq('company_id', userProfile.company_id)
          .limit(1);

        if (documents && documents.length > 0) {
          processingTasks.current.add('upload_document');
          await onTaskComplete('upload_document', 15);
          processingTasks.current.delete('upload_document');
        }
      }

      // Check: Invite Team Member
      if (!progress.tasks_completed.includes('invite_team_member') && !processingTasks.current.has('invite_team_member')) {
        const { data: teamMembers } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('company_id', userProfile.company_id)
          .neq('id', user.id)
          .limit(1);

        if (teamMembers && teamMembers.length > 0) {
          processingTasks.current.add('invite_team_member');
          await onTaskComplete('invite_team_member', 20);
          processingTasks.current.delete('invite_team_member');
        }
      }

      // Check: Create Daily Report
      if (!progress.tasks_completed.includes('create_daily_report') && !processingTasks.current.has('create_daily_report')) {
        try {
          const { data: dailyReports, error } = await supabase
            .from('daily_reports')
            .select('id, projects!inner(id)')
            .eq('projects.company_id', userProfile.company_id)
            .limit(1);

          if (!error && dailyReports && dailyReports.length > 0) {
            processingTasks.current.add('create_daily_report');
            await onTaskComplete('create_daily_report', 15);
            processingTasks.current.delete('create_daily_report');
          }
        } catch (e) {
          // Silently fail if table doesn't exist or has RLS issues
        }
      }

      // Check: Create Change Order
      if (!progress.tasks_completed.includes('create_change_order') && !processingTasks.current.has('create_change_order')) {
        try {
          const { data: changeOrders, error } = await supabase
            .from('change_orders')
            .select('id')
            .eq('company_id', userProfile.company_id)
            .limit(1);

          if (!error && changeOrders && changeOrders.length > 0) {
            processingTasks.current.add('create_change_order');
            await onTaskComplete('create_change_order', 15);
            processingTasks.current.delete('create_change_order');
          }
        } catch (e) {
          // Silently fail if table doesn't exist or has RLS issues
        }
      }

      // Check: Connect QuickBooks
      // This would require checking company settings or integrations table
      if (!progress.tasks_completed.includes('connect_quickbooks') && !processingTasks.current.has('connect_quickbooks')) {
        try {
          const { data: company, error } = await supabase
            .from('companies')
            .select('quickbooks_connected')
            .eq('id', userProfile.company_id)
            .single();

          if (!error && company?.quickbooks_connected) {
            processingTasks.current.add('connect_quickbooks');
            await onTaskComplete('connect_quickbooks', 30);
            processingTasks.current.delete('connect_quickbooks');
          }
        } catch (e) {
          // Silently fail if column doesn't exist
        }
      }

      // Check: Generate Report
      // NOTE: Disabled - financial_records table doesn't exist yet
      // Re-enable when table is created
      // if (!progress.tasks_completed.includes('generate_report')) {
      //   // Check logic here
      // }
    } catch (error) {
      console.error('Error checking task completion:', error);
      // Don't throw - this is background checking
    }
  }, [user, userProfile, progress.tasks_completed, onTaskComplete]);

  useEffect(() => {
    if (!user || isLoading) return;

    // Initial check on mount (only after progress is loaded)
    checkTaskCompletion();

    // Set up interval to check every 30 seconds
    const interval = setInterval(checkTaskCompletion, 30000);

    return () => clearInterval(interval);
  }, [user, isLoading, checkTaskCompletion]);

  // Also set up real-time subscriptions for instant detection
  useEffect(() => {
    if (!user || !userProfile?.company_id || isLoading) return;

    const subscriptions: any[] = [];

    // Subscribe to projects table
    if (!progress.tasks_completed.includes('create_first_project')) {
      const projectsSub = supabase
        .channel('projects-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'projects',
            filter: `company_id=eq.${userProfile.company_id}`
          },
          () => {
            // Double-check task is still incomplete before triggering
            if (!progress.tasks_completed.includes('create_first_project')) {
              onTaskComplete('create_first_project', 25);
            }
          }
        )
        .subscribe();
      subscriptions.push(projectsSub);
    }

    // Subscribe to time_entries table
    if (!progress.tasks_completed.includes('log_time_entry')) {
      const timeEntriesSub = supabase
        .channel('time-entries-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'time_entries',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            // Double-check task is still incomplete before triggering
            if (!progress.tasks_completed.includes('log_time_entry')) {
              onTaskComplete('log_time_entry', 20);
            }
          }
        )
        .subscribe();
      subscriptions.push(timeEntriesSub);
    }

    // Subscribe to documents table
    if (!progress.tasks_completed.includes('upload_document')) {
      const documentsSub = supabase
        .channel('documents-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'documents',
            filter: `company_id=eq.${userProfile.company_id}`
          },
          () => {
            // Double-check task is still incomplete before triggering
            if (!progress.tasks_completed.includes('upload_document')) {
              onTaskComplete('upload_document', 15);
            }
          }
        )
        .subscribe();
      subscriptions.push(documentsSub);
    }

    // Realtime subscriptions for daily_reports and change_orders are disabled to avoid
    // invalid filters (these tables may not have company_id columns). We'll rely on
    // periodic checks above instead.
    // If needed later, add proper subscriptions scoped by project_id or user context.


    // Subscribe to user_profiles for team invites
    if (!progress.tasks_completed.includes('invite_team_member')) {
      const teamMembersSub = supabase
        .channel('team-members-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_profiles',
            filter: `company_id=eq.${userProfile.company_id}`
          },
          (payload) => {
            // Only count if it's not the current user and task not already complete
            if (payload.new.id !== user.id && !progress.tasks_completed.includes('invite_team_member')) {
              onTaskComplete('invite_team_member', 20);
            }
          }
        )
        .subscribe();
      subscriptions.push(teamMembersSub);
    }

    // Cleanup subscriptions
    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [user, userProfile, progress.tasks_completed, onTaskComplete, isLoading]);
};
