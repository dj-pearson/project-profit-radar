import { useEffect, useCallback } from 'react';
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
  onTaskComplete: (taskId: string, points: number) => Promise<void>
) => {
  const { user, userProfile } = useAuth();

  const checkTaskCompletion = useCallback(async () => {
    if (!user || !userProfile?.company_id) return;

    try {
      // Check: Complete Profile
      if (!progress.tasks_completed.includes('complete_profile')) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('first_name, last_name, phone, avatar_url')
          .eq('id', user.id)
          .single();

        if (profile?.first_name && profile?.last_name) {
          await onTaskComplete('complete_profile', 10);
        }
      }

      // Check: Create First Project
      if (!progress.tasks_completed.includes('create_first_project')) {
        const { data: projects } = await supabase
          .from('projects')
          .select('id')
          .eq('company_id', userProfile.company_id)
          .limit(1);

        if (projects && projects.length > 0) {
          await onTaskComplete('create_first_project', 25);
        }
      }

      // Check: Log Time Entry
      if (!progress.tasks_completed.includes('log_time_entry')) {
        const { data: timeEntries } = await supabase
          .from('time_entries')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (timeEntries && timeEntries.length > 0) {
          await onTaskComplete('log_time_entry', 20);
        }
      }

      // Check: Upload Document
      if (!progress.tasks_completed.includes('upload_document')) {
        const { data: documents } = await supabase
          .from('documents')
          .select('id')
          .eq('company_id', userProfile.company_id)
          .limit(1);

        if (documents && documents.length > 0) {
          await onTaskComplete('upload_document', 15);
        }
      }

      // Check: Invite Team Member
      if (!progress.tasks_completed.includes('invite_team_member')) {
        const { data: teamMembers } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('company_id', userProfile.company_id)
          .neq('id', user.id)
          .limit(1);

        if (teamMembers && teamMembers.length > 0) {
          await onTaskComplete('invite_team_member', 20);
        }
      }

      // Check: Create Daily Report
      if (!progress.tasks_completed.includes('create_daily_report')) {
        const { data: dailyReports } = await supabase
          .from('daily_reports')
          .select('id')
          .eq('company_id', userProfile.company_id)
          .limit(1);

        if (dailyReports && dailyReports.length > 0) {
          await onTaskComplete('create_daily_report', 15);
        }
      }

      // Check: Create Change Order
      if (!progress.tasks_completed.includes('create_change_order')) {
        const { data: changeOrders } = await supabase
          .from('change_orders')
          .select('id')
          .eq('company_id', userProfile.company_id)
          .limit(1);

        if (changeOrders && changeOrders.length > 0) {
          await onTaskComplete('create_change_order', 15);
        }
      }

      // Check: Connect QuickBooks
      // This would require checking company settings or integrations table
      if (!progress.tasks_completed.includes('connect_quickbooks')) {
        const { data: company } = await supabase
          .from('companies')
          .select('quickbooks_connected')
          .eq('id', userProfile.company_id)
          .single();

        if (company?.quickbooks_connected) {
          await onTaskComplete('connect_quickbooks', 30);
        }
      }

      // Check: Generate Report
      // This is tricky - we can check if they have any saved reports or views
      if (!progress.tasks_completed.includes('generate_report')) {
        const { data: reports } = await supabase
          .from('financial_records')
          .select('id')
          .eq('company_id', userProfile.company_id)
          .limit(1);

        // If they have financial records, they've likely generated a report
        if (reports && reports.length > 0) {
          await onTaskComplete('generate_report', 20);
        }
      }
    } catch (error) {
      console.error('Error checking task completion:', error);
      // Don't throw - this is background checking
    }
  }, [user, userProfile, progress.tasks_completed, onTaskComplete]);

  useEffect(() => {
    if (!user) return;

    // Initial check on mount
    checkTaskCompletion();

    // Set up interval to check every 30 seconds
    const interval = setInterval(checkTaskCompletion, 30000);

    return () => clearInterval(interval);
  }, [user, checkTaskCompletion]);

  // Also set up real-time subscriptions for instant detection
  useEffect(() => {
    if (!user || !userProfile?.company_id) return;

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
            onTaskComplete('create_first_project', 25);
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
            onTaskComplete('log_time_entry', 20);
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
            onTaskComplete('upload_document', 15);
          }
        )
        .subscribe();
      subscriptions.push(documentsSub);
    }

    // Subscribe to daily_reports table
    if (!progress.tasks_completed.includes('create_daily_report')) {
      const dailyReportsSub = supabase
        .channel('daily-reports-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'daily_reports',
            filter: `company_id=eq.${userProfile.company_id}`
          },
          () => {
            onTaskComplete('create_daily_report', 15);
          }
        )
        .subscribe();
      subscriptions.push(dailyReportsSub);
    }

    // Subscribe to change_orders table
    if (!progress.tasks_completed.includes('create_change_order')) {
      const changeOrdersSub = supabase
        .channel('change-orders-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'change_orders',
            filter: `company_id=eq.${userProfile.company_id}`
          },
          () => {
            onTaskComplete('create_change_order', 15);
          }
        )
        .subscribe();
      subscriptions.push(changeOrdersSub);
    }

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
            // Only count if it's not the current user
            if (payload.new.id !== user.id) {
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
  }, [user, userProfile, progress.tasks_completed, onTaskComplete]);
};
