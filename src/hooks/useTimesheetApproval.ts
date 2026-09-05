/**
 * Timesheet Approval Hook
 */
import { useState } from 'react';
import { logger } from '@/lib/logger';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
    const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Tenant scoping for these views is enforced in the database: migration
  // 20260613120000 (US-197) sets security_invoker=true on
  // pending_timesheet_approvals / approved_timesheets so the caller's
  // time_entries RLS applies (managers see their company; other tenants are
  // filtered out). Do not assume these are global.
  // Fetch pending timesheets
  const { data: pendingTimesheets, isLoading: isPendingLoading } = useQuery({
    queryKey: ['pending-timesheets'],
    queryFn: async () => {
            const { data, error } = await supabase
        .from('pending_timesheet_approvals')
        .select('*')
        .order('submitted_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TimesheetEntry[];
    },
  });

  // Fetch approved timesheets
  const { data: approvedTimesheets, isLoading: isApprovedLoading } = useQuery({
    queryKey: ['approved-timesheets'],
    queryFn: async () => {
            const { data, error } = await supabase
        .from('approved_timesheets')
        .select('*')
        .order('approved_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  /**
   * One timesheet, with the people on it (US-336).
   *
   * The worker and approver used to be embedded as
   * `user_profiles!time_entries_user_id_fkey`. That constraint is real, but it
   * points at auth.users, not user_profiles: time_entries.user_id references
   * auth.users(id) and user_profiles.id references auth.users(id), so the two
   * tables are siblings with no relationship between them for PostgREST to
   * resolve. It returned an error, and `if (error) throw error` turned that
   * into a detail view that did not open at all.
   *
   * project and cost_code stay embedded - those are genuine foreign keys.
   */
  const fetchTimesheetDetail = async (id: string) => {
    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        project:projects(name, site_address, client_name),
        cost_code:cost_codes(code, description)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    const ids = [data.user_id, data.approved_by].filter(Boolean) as string[];
    if (ids.length === 0) return { ...data, worker: null, approver: null };

    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, email, role')
      .in('id', ids);

    // Degrade, do not throw: the hours are the point of this screen and a
    // missing name should not close it.
    if (profileError) {
      logger.error('Timesheet detail loaded without the names on it', profileError);
      return { ...data, worker: null, approver: null };
    }

    const byId = new Map((profiles || []).map((p) => [p.id, p]));
    return {
      ...data,
      worker: byId.get(data.user_id) ?? null,
      approver: data.approved_by ? byId.get(data.approved_by) ?? null : null,
    };
  };

  /**
   * Who did what to this timesheet (US-336).
   *
   * performed_by was embedded as
   * `user_profiles!timesheet_approval_history_performed_by_fkey`. That column
   * references auth.users(id) - 20251110000001 is the only migration that
   * creates this table - so the constraint does not relate the two tables and
   * PostgREST refused the query.
   */
  const fetchApprovalHistory = async (timeEntryId: string) => {
    const { data, error } = await supabase
      .from('timesheet_approval_history')
      .select('*')
      .eq('time_entry_id', timeEntryId)
      .order('performed_at', { ascending: false });

    if (error) throw error;

    const rows = data || [];
    const ids = [...new Set(rows.map((r) => r.performed_by).filter(Boolean))] as string[];
    if (ids.length === 0) return rows as TimesheetApprovalHistoryEntry[];

    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, email')
      .in('id', ids);

    // The history is the record; a missing name should not hide it.
    if (profileError) {
      logger.error('Approval history loaded without the names on it', profileError);
      return rows as TimesheetApprovalHistoryEntry[];
    }

    const byId = new Map((profiles || []).map((p) => [p.id, p]));
    return rows.map((r) => ({
      ...r,
      performed_by_user: r.performed_by ? byId.get(r.performed_by) ?? null : null,
    })) as TimesheetApprovalHistoryEntry[];
  };

  // Approve single timesheet
  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
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
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['approved-timesheets'] });
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

  // Reject single timesheet
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
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
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['approved-timesheets'] });
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

  // Bulk approve timesheets
  const bulkApproveMutation = useMutation({
    mutationFn: async ({ ids, notes }: { ids: string[]; notes?: string }) => {
            const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Parameter names must match the SQL signature exactly: PostgREST resolves
      // an RPC by named arguments, so p_-prefixed keys matched no function and
      // this returned PGRST202 every time. bulk_approve_timesheets is declared
      // (timesheet_ids, approver_id, notes) in
      // 20251110000001_timesheet_approval_system.sql.
      const { data, error } = await supabase.rpc('bulk_approve_timesheets', {
        timesheet_ids: ids,
        approver_id: user.id,
        notes: notes || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pending-timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['approved-timesheets'] });
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

  // Bulk reject timesheets
  const bulkRejectMutation = useMutation({
    mutationFn: async ({ ids, reason }: { ids: string[]; reason: string }) => {
            const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Same mismatch as the approve path above — note rejection_reason was
      // already correct, which is what a half-finished rename looks like.
      // Declared (timesheet_ids, rejector_id, rejection_reason).
      const { data, error } = await supabase.rpc('bulk_reject_timesheets', {
        timesheet_ids: ids,
        rejector_id: user.id,
        rejection_reason: reason,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pending-timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['approved-timesheets'] });
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
