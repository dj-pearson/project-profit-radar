import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TimesheetApprovalQueue } from '@/components/timesheets/TimesheetApprovalQueue';
import { TimesheetDetailModal } from '@/components/timesheets/TimesheetDetailModal';
import { useTimesheetApproval } from '@/hooks/useTimesheetApproval';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

export default function Timesheets() {
  const {
    pendingTimesheets,
    approvedTimesheets,
    isPendingLoading,
    isApprovedLoading,
    selectedIds,
    setSelectedIds,
    approveTimesheet,
    rejectTimesheet,
    bulkApproveTimesheets,
    bulkRejectTimesheets,
    isApproving,
    isRejecting,
    isBulkApproving,
    isBulkRejecting,
    fetchTimesheetDetail,
    fetchApprovalHistory,
  } = useTimesheetApproval();

  const [selectedTimesheetId, setSelectedTimesheetId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleViewDetails = (id: string) => {
    setSelectedTimesheetId(id);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedTimesheetId(null);
  };

  // Calculate stats
  const stats = {
    pending: pendingTimesheets?.length || 0,
    approved: approvedTimesheets?.length || 0,
    totalHoursPending: pendingTimesheets?.reduce((sum, t) => sum + (t.total_hours || 0), 0) || 0,
    totalHoursApproved: approvedTimesheets?.reduce((sum, t) => sum + (t.total_hours || 0), 0) || 0,
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Timesheet Management</h1>
        <p className="text-muted-foreground mt-2">
          Review and approve worker timesheets
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
                <p className="text-2xl font-bold mt-1">{stats.pending}</p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
              </div>
            </div>
            {stats.totalHoursPending > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {stats.totalHoursPending.toFixed(1)} hours
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold mt-1">{stats.approved}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-500" />
              </div>
            </div>
            {stats.totalHoursApproved > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {stats.totalHoursApproved.toFixed(1)} hours
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Requires Action</p>
                <p className="text-2xl font-bold mt-1">
                  {pendingTimesheets?.filter((t) => t.approval_status === 'submitted').length || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Submitted by workers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Selected</p>
                <p className="text-2xl font-bold mt-1">{selectedIds.length}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-blue-600 dark:text-blue-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Ready for batch action
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="relative">
            Pending Approval
            {stats.pending > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {stats.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <TimesheetApprovalQueue
            timesheets={pendingTimesheets || []}
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
            onViewDetails={handleViewDetails}
            onBulkApprove={bulkApproveTimesheets}
            onBulkReject={bulkRejectTimesheets}
            isLoading={isPendingLoading}
            isBulkApproving={isBulkApproving}
            isBulkRejecting={isBulkRejecting}
          />
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Approved Timesheets</CardTitle>
              <CardDescription>
                Recently approved timesheet entries
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isApprovedLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : approvedTimesheets && approvedTimesheets.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Worker</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Approved By</TableHead>
                        <TableHead>Approved At</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedTimesheets.map((timesheet: any) => (
                        <TableRow key={timesheet.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{timesheet.worker_name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{timesheet.worker_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{timesheet.project_name || 'N/A'}</p>
                              {timesheet.cost_code && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  {timesheet.cost_code}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(timesheet.start_time), 'MMM d, yyyy')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {timesheet.total_hours?.toFixed(2) || '0.00'}h
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {timesheet.approver_name || 'Unknown'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {timesheet.approved_at
                                ? format(new Date(timesheet.approved_at), 'MMM d, yyyy h:mm a')
                                : 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <button
                              onClick={() => handleViewDetails(timesheet.id)}
                              className="text-sm text-primary hover:underline"
                            >
                              View
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No approved timesheets yet</p>
                  <p className="text-sm">Approved timesheets will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      <TimesheetDetailModal
        timesheetId={selectedTimesheetId}
        open={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        onApprove={approveTimesheet}
        onReject={rejectTimesheet}
        fetchTimesheetDetail={fetchTimesheetDetail}
        fetchApprovalHistory={fetchApprovalHistory}
        isApproving={isApproving}
        isRejecting={isRejecting}
      />
    </div>
  );
}
