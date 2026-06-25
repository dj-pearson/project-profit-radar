/**
 * QuickBooks sync history table (US-070).
 *
 * Shows the last 20 syncs with date, type, status, record counts, and duration;
 * failed syncs expose error details and a Retry button (re-invokes the
 * quickbooks-sync edge function for that sync type). company_id-scoped (RLS).
 */
import { Fragment, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { History, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import {
  summarizeSyncHistory,
  type SyncLogRow,
  type SyncStatus,
} from '@/lib/integrations/quickbooksSync';

const SYNC_HISTORY_LIMIT = 20;

const statusBadge: Record<SyncStatus, { label: string; className: string }> = {
  success: { label: 'Success', className: 'bg-green-100 text-green-700 border-green-200' },
  error: { label: 'Failed', className: 'bg-red-100 text-red-700 border-red-200' },
  pending: { label: 'In Progress', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  other: { label: 'Unknown', className: '' },
};

function fmtDateTime(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function fmtDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function QuickBooksSyncHistory() {
  const { userProfile } = useAuth();
  const queryClient = useQueryClient();
  const companyId = userProfile?.company_id;
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['quickbooks-sync-history', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('quickbooks_sync_logs')
        .select(
          'id, sync_type, status, started_at, completed_at, duration_seconds, errors_count, records_processed, error_details'
        )
        .eq('company_id', companyId)
        .order('started_at', { ascending: false })
        .limit(SYNC_HISTORY_LIMIT);
      if (error) throw error;
      return summarizeSyncHistory((rows ?? []) as SyncLogRow[]);
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (syncType: string) => {
      const { error } = await supabase.functions.invoke('quickbooks-sync', {
        body: {
          company_id: companyId,
          sync_type: syncType === 'full' ? 'full' : 'incremental',
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Retry started', description: 'A new sync has been queued.' });
      setTimeout(
        () => queryClient.invalidateQueries({ queryKey: ['quickbooks-sync-history', companyId] }),
        3000
      );
    },
    onError: (e: unknown) => {
      toast({
        variant: 'destructive',
        title: 'Retry failed',
        description: e instanceof Error ? e.message : 'Could not start the sync.',
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" aria-hidden="true" /> Sync History
        </CardTitle>
        <CardDescription>
          Last {SYNC_HISTORY_LIMIT} syncs.{' '}
          {data && data.totalSyncs > 0 && (
            <span>
              {Math.round(data.successRate * 100)}% success · {data.totalRecordsProcessed} records processed
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !data || data.entries.length === 0 ? (
          <EmptyState
            icon={History}
            title="No syncs yet"
            description="Run a sync to populate the history log here."
          />
        ) : (
          <>
            {data.lastError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Most recent failure: {data.lastError.errorMessage ?? 'Unknown error'}.
                  <Button
                    variant="link"
                    className="h-auto p-0 ml-2 text-destructive underline"
                    onClick={() => retryMutation.mutate(data.lastError!.syncType)}
                    disabled={retryMutation.isPending}
                  >
                    Retry now
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 px-3 font-medium">Type</th>
                    <th className="py-2 px-3 font-medium">Status</th>
                    <th className="py-2 px-3 font-medium text-right">Records</th>
                    <th className="py-2 px-3 font-medium text-right">Duration</th>
                    <th className="py-2 px-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((e) => {
                    const badge = statusBadge[e.status];
                    const isOpen = expanded === e.id;
                    return (
                      <Fragment key={e.id}>
                        <tr className="border-b last:border-0">
                          <td className="py-2 pr-3">{fmtDateTime(e.startedAt)}</td>
                          <td className="py-2 px-3 capitalize">{e.syncType}</td>
                          <td className="py-2 px-3">
                            <Badge variant="outline" className={badge.className}>
                              {e.status === 'success' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {e.status === 'error' && <AlertCircle className="h-3 w-3 mr-1" />}
                              {e.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                              {badge.label}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-right">{e.totalRecords}</td>
                          <td className="py-2 px-3 text-right">{fmtDuration(e.durationSeconds)}</td>
                          <td className="py-2 px-3 text-right">
                            {e.canRetry ? (
                              <div className="flex items-center justify-end gap-2">
                                {e.errorMessage && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => setExpanded(isOpen ? null : e.id)}
                                  >
                                    {isOpen ? 'Hide' : 'Details'}
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => retryMutation.mutate(e.syncType)}
                                  disabled={retryMutation.isPending}
                                >
                                  <RefreshCw className="h-3 w-3 mr-1" /> Retry
                                </Button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                        {isOpen && e.errorMessage && (
                          <tr className="bg-muted/40">
                            <td colSpan={6} className="py-2 px-3 text-xs text-red-700">
                              {e.errorsCount > 0 && <span className="font-medium">{e.errorsCount} error(s): </span>}
                              {e.errorMessage}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default QuickBooksSyncHistory;
