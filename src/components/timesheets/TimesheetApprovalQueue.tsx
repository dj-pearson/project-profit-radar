import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Clock,
  MapPin,
  User,
  Building2,
} from 'lucide-react';
import { format } from 'date-fns';
import { TimesheetEntry } from '@/hooks/useTimesheetApproval';

interface TimesheetApprovalQueueProps {
  timesheets: TimesheetEntry[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onViewDetails: (id: string) => void;
  onBulkApprove: (ids: string[], notes?: string) => void;
  onBulkReject: (ids: string[], reason: string) => void;
  isLoading?: boolean;
  isBulkApproving?: boolean;
  isBulkRejecting?: boolean;
}

export const TimesheetApprovalQueue = ({
  timesheets,
  selectedIds,
  onSelectedIdsChange,
  onViewDetails,
  onBulkApprove,
  onBulkReject,
  isLoading = false,
  isBulkApproving = false,
  isBulkRejecting = false,
}: TimesheetApprovalQueueProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [workerFilter, setWorkerFilter] = useState<string>('all');
  const [showBulkApproveDialog, setShowBulkApproveDialog] = useState(false);
  const [showBulkRejectDialog, setShowBulkRejectDialog] = useState(false);
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkRejectionReason, setBulkRejectionReason] = useState('');

  // Extract unique projects and workers for filters
  const uniqueProjects = useMemo(() => {
    const projects = new Set(timesheets.map((t) => t.project_name).filter(Boolean));
    return Array.from(projects);
  }, [timesheets]);

  const uniqueWorkers = useMemo(() => {
    const workers = new Set(timesheets.map((t) => t.worker_name).filter(Boolean));
    return Array.from(workers);
  }, [timesheets]);

  // Filter timesheets based on search and filters
  const filteredTimesheets = useMemo(() => {
    return timesheets.filter((timesheet) => {
      const matchesSearch =
        searchTerm === '' ||
        timesheet.worker_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        timesheet.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        timesheet.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesProject =
        projectFilter === 'all' || timesheet.project_name === projectFilter;

      const matchesWorker =
        workerFilter === 'all' || timesheet.worker_name === workerFilter;

      return matchesSearch && matchesProject && matchesWorker;
    });
  }, [timesheets, searchTerm, projectFilter, workerFilter]);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectedIdsChange(filteredTimesheets.map((t) => t.id));
    } else {
      onSelectedIdsChange([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectedIdsChange([...selectedIds, id]);
    } else {
      onSelectedIdsChange(selectedIds.filter((selectedId) => selectedId !== id));
    }
  };

  const isAllSelected =
    filteredTimesheets.length > 0 &&
    filteredTimesheets.every((t) => selectedIds.includes(t.id));

  const isSomeSelected =
    selectedIds.length > 0 &&
    !isAllSelected;

  // Bulk action handlers
  const handleBulkApproveConfirm = () => {
    onBulkApprove(selectedIds, bulkNotes);
    setShowBulkApproveDialog(false);
    setBulkNotes('');
  };

  const handleBulkRejectConfirm = () => {
    if (bulkRejectionReason.trim()) {
      onBulkReject(selectedIds, bulkRejectionReason);
      setShowBulkRejectDialog(false);
      setBulkRejectionReason('');
    }
  };

  const formatHours = (hours: number | null) => {
    if (hours === null) return 'N/A';
    return `${hours.toFixed(2)}h`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Timesheet Approval Queue</CardTitle>
              <CardDescription>
                {filteredTimesheets.length} timesheet{filteredTimesheets.length !== 1 ? 's' : ''}{' '}
                pending approval
                {selectedIds.length > 0 && ` • ${selectedIds.length} selected`}
              </CardDescription>
            </div>
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkRejectDialog(true)}
                  disabled={isBulkRejecting}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Selected ({selectedIds.length})
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowBulkApproveDialog(true)}
                  disabled={isBulkApproving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve Selected ({selectedIds.length})
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {/* Filters and Search */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by worker, project, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={workerFilter} onValueChange={setWorkerFilter}>
              <SelectTrigger className="w-[200px]">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <SelectValue placeholder="All Workers" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workers</SelectItem>
                {uniqueWorkers.map((worker) => (
                  <SelectItem key={worker} value={worker}>
                    {worker}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[200px]">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <SelectValue placeholder="All Projects" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {uniqueProjects.map((project) => (
                  <SelectItem key={project} value={project}>
                    {project}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {filteredTimesheets.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No pending timesheets</p>
              <p className="text-sm">All timesheets have been processed</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        ref={(el) => {
                          if (el) {
                            (el as any).indeterminate = isSomeSelected;
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Worker</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTimesheets.map((timesheet) => (
                    <TableRow key={timesheet.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(timesheet.id)}
                          onCheckedChange={(checked) =>
                            handleSelectOne(timesheet.id, checked as boolean)
                          }
                        />
                      </TableCell>
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
                        <div className="text-sm space-y-1">
                          <div>{format(new Date(timesheet.start_time), 'h:mm a')}</div>
                          <div className="text-muted-foreground">
                            {timesheet.end_time
                              ? format(new Date(timesheet.end_time), 'h:mm a')
                              : 'In Progress'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {formatHours(timesheet.total_hours)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {timesheet.location ? (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span className="max-w-[150px] truncate">
                              {timesheet.location}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No location</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            timesheet.approval_status === 'submitted' ? 'default' : 'secondary'
                          }
                        >
                          {timesheet.approval_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewDetails(timesheet.id)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Approve Dialog */}
      <AlertDialog open={showBulkApproveDialog} onOpenChange={setShowBulkApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve {selectedIds.length} Timesheets?</AlertDialogTitle>
            <AlertDialogDescription>
              This will approve all selected timesheets. You can optionally add notes that will be
              applied to all approvals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Add optional notes for these approvals..."
              value={bulkNotes}
              onChange={(e) => setBulkNotes(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkApproveConfirm}
              className="bg-green-600 hover:bg-green-700"
            >
              Approve All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Reject Dialog */}
      <AlertDialog open={showBulkRejectDialog} onOpenChange={setShowBulkRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject {selectedIds.length} Timesheets?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reject all selected timesheets. Please provide a reason for the rejection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reason for rejection (required)..."
              value={bulkRejectionReason}
              onChange={(e) => setBulkRejectionReason(e.target.value)}
              rows={3}
              className="border-destructive"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkRejectConfirm}
              disabled={!bulkRejectionReason.trim()}
              className="bg-destructive hover:bg-destructive/90"
            >
              Reject All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
