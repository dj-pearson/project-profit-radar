/**
 * Timesheet Approval Hook
 * Updated with multi-tenant site_id isolation
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface TimesheetEntry {
  id: string;
  user_id: string;
  project_id: string;
  start_time: string;
  end_time: string | null;
  total_hours: number | null;
  break_duration: number | null;
  description: string | null;
  location: string | null;
  approval_status: 'pending' | 'submitted' | 'approved' | 'rejected';
  submitted_at: string | null;
  created_at: string;
  worker_name: string | null;
  worker_email: string | null;
  project_name: string | null;
  project_location: string | null;
  cost_code: string | null;
  cost_code_description: string | null;
}

export interface TimesheetApprovalHistoryEntry {
  id: string;
  time_entry_id: string;
  action: string;
  performed_by: string | null;
  performed_at: string;
  notes: string | null;
  previous_status: string | null;
  new_status: string | null;
}

export const useTimesheetApproval = () => {
  const { toast } = useToast();
  const { siteId } = useAuth();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Fetch pending timesheets with site isolation
  const { data: pendingTimesheets, isLoading: isPendingLoading } = useQuery({
    queryKey: ['pending-timesheets', siteId],
    queryFn: async () => {
      if (!siteId) throw new Error('No site ID - multi-tenant isolation required');

      const { data, error } = await supabase
        .from('pending_timesheet_approvals')
        .select('*')
        .eq('site_id', siteId)  // CRITICAL: Site isolation
        .order('submitted_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TimesheetEntry[];
    },
    enabled: !!siteId,
  });

  // Fetch approved timesheets with site isolation
  const { data: approvedTimesheets, isLoading: isApprovedLoading } = useQuery({
    queryKey: ['approved-timesheets', siteId],
    queryFn: async () => {
      if (!siteId) throw new Error('No site ID - multi-tenant isolation required');

      const { data, error } = await supabase
        .from('approved_timesheets')
        .select('*')
        .eq('site_id', siteId)  // CRITICAL: Site isolation
        .order('approved_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!siteId,
  });

  // Fetch timesheet detail with site isolation
  const fetchTimesheetDetail = async (id: string) => {
    if (!siteId) throw new Error('No site ID - multi-tenant isolation required');

    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        worker:user_profiles!time_entries_user_id_fkey(full_name, email, role),
        project:projects(name, site_address, client_name),
        cost_code:cost_codes(code, description),
        approver:user_profiles!time_entries_approved_by_fkey(full_name, email)
      `)
      .eq('site_id', siteId)  // CRITICAL: Site isolation
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  };

  // Fetch approval history with site isolation
  const fetchApprovalHistory = async (timeEntryId: string) => {
    if (!siteId) throw new Error('No site ID - multi-tenant isolation required');

    const { data, error } = await supabase
      .from('timesheet_approval_history')
      .select(`
        *,
        performed_by_user:user_profiles!timesheet_approval_history_performed_by_fkey(full_name, email)
      `)
      .eq('site_id', siteId)  // CRITICAL: Site isolation
      .eq('time_entry_id', timeEntryId)
      .order('performed_at', { ascending: false });

    if (error) throw error;
    return data as TimesheetApprovalHistoryEntry[];
  };

  // Approve single timesheet with site isolation
  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      if (!siteId) throw new Error('No site ID - multi-tenant isolation required');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('time_entries')
        .update({
          approval_status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          approval_notes: notes || null,
        })
        .eq('site_id', siteId)  // CRITICAL: Site isolation on update
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-timesheets', siteId] });
      queryClient.invalidateQueries({ queryKey: ['approved-timesheets', siteId] });
      toast({
        title: 'Timesheet Approved',
        description: 'The timesheet has been approved successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Approval Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reject single timesheet with site isolation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      if (!siteId) throw new Error('No site ID - multi-tenant isolation required');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('time_entries')
        .update({
          approval_status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('site_id', siteId)  // CRITICAL: Site isolation on update
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-timesheets', siteId] });
      queryClient.invalidateQueries({ queryKey: ['approved-timesheets', siteId] });
      toast({
        title: 'Timesheet Rejected',
        description: 'The timesheet has been rejected.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Rejection Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Bulk approve timesheets with site isolation
  const bulkApproveMutation = useMutation({
    mutationFn: async ({ ids, notes }: { ids: string[]; notes?: string }) => {
      if (!siteId) throw new Error('No site ID - multi-tenant isolation required');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('bulk_approve_timesheets', {
        p_timesheet_ids: ids,
        p_approver_id: user.id,
        p_notes: notes || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pending-timesheets', siteId] });
      queryClient.invalidateQueries({ queryKey: ['approved-timesheets', siteId] });
      setSelectedIds([]);
      toast({
        title: 'Bulk Approval Complete',
        description: `Successfully approved ${data[0]?.success_count || 0} timesheets.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Bulk Approval Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Bulk reject timesheets with site isolation
  const bulkRejectMutation = useMutation({
    mutationFn: async ({ ids, reason }: { ids: string[]; reason: string }) => {
      if (!siteId) throw new Error('No site ID - multi-tenant isolation required');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('bulk_reject_timesheets', {
        p_timesheet_ids: ids,
        p_rejector_id: user.id,
        rejection_reason: reason,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pending-timesheets', siteId] });
      queryClient.invalidateQueries({ queryKey: ['approved-timesheets', siteId] });
      setSelectedIds([]);
      toast({
        title: 'Bulk Rejection Complete',
        description: `Successfully rejected ${data[0]?.success_count || 0} timesheets.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Bulk Rejection Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    // Data
    pendingTimesheets,
    approvedTimesheets,
    isPendingLoading,
    isApprovedLoading,

    // Selection state
    selectedIds,
    setSelectedIds,

    // Mutations
    approveTimesheet: approveMutation.mutate,
    rejectTimesheet: rejectMutation.mutate,
    bulkApproveTimesheets: bulkApproveMutation.mutate,
    bulkRejectTimesheets: bulkRejectMutation.mutate,

    // Loading states
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isBulkApproving: bulkApproveMutation.isPending,
    isBulkRejecting: bulkRejectMutation.isPending,

    // Utility functions
    fetchTimesheetDetail,
    fetchApprovalHistory,
  };
};
