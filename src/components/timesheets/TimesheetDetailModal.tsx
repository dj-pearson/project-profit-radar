import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Clock,
  MapPin,
  User,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  History,
} from 'lucide-react';
import { format } from 'date-fns';

interface TimesheetDetailModalProps {
  timesheetId: string | null;
  open: boolean;
  onClose: () => void;
  onApprove: (id: string, notes?: string) => void;
  onReject: (id: string, reason: string) => void;
  fetchTimesheetDetail: (id: string) => Promise<any>;
  fetchApprovalHistory: (id: string) => Promise<any>;
  isApproving?: boolean;
  isRejecting?: boolean;
}

export const TimesheetDetailModal = ({
  timesheetId,
  open,
  onClose,
  onApprove,
  onReject,
  fetchTimesheetDetail,
  fetchApprovalHistory,
  isApproving = false,
  isRejecting = false,
}: TimesheetDetailModalProps) => {
  const [timesheet, setTimesheet] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    if (timesheetId && open) {
      loadTimesheetData();
    }
  }, [timesheetId, open]);

  const loadTimesheetData = async () => {
    if (!timesheetId) return;

    setLoading(true);
    try {
      const [detailData, historyData] = await Promise.all([
        fetchTimesheetDetail(timesheetId),
        fetchApprovalHistory(timesheetId),
      ]);
      setTimesheet(detailData);
      setHistory(historyData);
    } catch (error) {
      console.error('Error loading timesheet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => {
    if (timesheetId) {
      onApprove(timesheetId, approvalNotes);
      onClose();
    }
  };

  const handleReject = () => {
    if (timesheetId && rejectionReason.trim()) {
      onReject(timesheetId, rejectionReason);
      onClose();
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', variant: 'secondary' as const, icon: AlertCircle },
      submitted: { label: 'Submitted', variant: 'default' as const, icon: Clock },
      approved: { label: 'Approved', variant: 'success' as const, icon: CheckCircle2 },
      rejected: { label: 'Rejected', variant: 'destructive' as const, icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const calculateDuration = () => {
    if (!timesheet?.start_time || !timesheet?.end_time) return null;

    const start = new Date(timesheet.start_time);
    const end = new Date(timesheet.end_time);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${diffHours}h ${diffMinutes}m`;
  };

  if (loading || !timesheet) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Timesheet Details</DialogTitle>
            {getStatusBadge(timesheet.approval_status)}
          </div>
          <DialogDescription>
            Review and approve or reject this timesheet entry
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            {/* Worker Information */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <User className="w-4 h-4" />
                Worker Information
              </h3>
              <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/50 rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <p className="text-sm font-medium">{timesheet.worker?.full_name || 'Unknown'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="text-sm">{timesheet.worker?.email || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Role</Label>
                  <p className="text-sm capitalize">{timesheet.worker?.role?.replace('_', ' ') || 'N/A'}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Project Information */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Project Information
              </h3>
              <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/50 rounded-lg">
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Project Name</Label>
                  <p className="text-sm font-medium">{timesheet.project?.name || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Location</Label>
                  <p className="text-sm">{timesheet.project?.site_address || 'N/A'}</p>
                </div>
                {timesheet.cost_code && (
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Cost Code</Label>
                    <p className="text-sm">
                      {timesheet.cost_code.code} - {timesheet.cost_code.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Time Information */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time Information
              </h3>
              <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/50 rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Start Time</Label>
                  <p className="text-sm font-medium">
                    {format(new Date(timesheet.start_time), 'PPp')}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">End Time</Label>
                  <p className="text-sm font-medium">
                    {timesheet.end_time
                      ? format(new Date(timesheet.end_time), 'PPp')
                      : 'In Progress'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Total Hours</Label>
                  <p className="text-sm font-medium">
                    {timesheet.total_hours?.toFixed(2) || calculateDuration() || 'N/A'} hours
                  </p>
                </div>
                {timesheet.break_duration && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Break Duration</Label>
                    <p className="text-sm">{timesheet.break_duration} minutes</p>
                  </div>
                )}
              </div>
            </div>

            {/* Location Information */}
            {timesheet.location && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location
                  </h3>
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <p className="text-sm">{timesheet.location}</p>
                    {(timesheet.gps_latitude && timesheet.gps_longitude) && (
                      <p className="text-xs text-muted-foreground mt-2">
                        GPS: {timesheet.gps_latitude.toFixed(6)}, {timesheet.gps_longitude.toFixed(6)}
                        {timesheet.location_accuracy && ` (±${timesheet.location_accuracy}m)`}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Description */}
            {timesheet.description && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Work Description</Label>
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <p className="text-sm">{timesheet.description}</p>
                  </div>
                </div>
              </>
            )}

            {/* Approval/Rejection Information */}
            {timesheet.approval_status !== 'pending' && timesheet.approval_status !== 'submitted' && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>
                    {timesheet.approval_status === 'approved' ? 'Approval' : 'Rejection'} Information
                  </Label>
                  <div className="p-4 bg-secondary/50 rounded-lg space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {timesheet.approval_status === 'approved' ? 'Approved' : 'Rejected'} By
                      </Label>
                      <p className="text-sm">{timesheet.approver?.full_name || 'Unknown'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Date</Label>
                      <p className="text-sm">
                        {timesheet.approved_at && format(new Date(timesheet.approved_at), 'PPp')}
                      </p>
                    </div>
                    {(timesheet.approval_notes || timesheet.rejection_reason) && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Notes</Label>
                        <p className="text-sm">
                          {timesheet.approval_notes || timesheet.rejection_reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Approval Form */}
            {(timesheet.approval_status === 'pending' || timesheet.approval_status === 'submitted') && (
              <>
                <Separator />
                {!showRejectForm ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="approval-notes">Approval Notes (Optional)</Label>
                      <Textarea
                        id="approval-notes"
                        placeholder="Add any notes about this approval..."
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                    <Textarea
                      id="rejection-reason"
                      placeholder="Please provide a reason for rejection..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={3}
                      className="border-destructive"
                    />
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <History className="w-4 h-4" />
                Approval History
              </h3>
              {history.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p>No history available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-4 bg-secondary/50 rounded-lg space-y-2 border-l-4 border-primary"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(entry.action)}
                          <span className="text-sm font-medium">
                            {entry.performed_by_user?.full_name || 'System'}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(entry.performed_at), 'PPp')}
                        </span>
                      </div>
                      {entry.previous_status && (
                        <p className="text-xs text-muted-foreground">
                          Changed from <strong>{entry.previous_status}</strong> to{' '}
                          <strong>{entry.new_status}</strong>
                        </p>
                      )}
                      {entry.notes && (
                        <p className="text-sm mt-2">{entry.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          {(timesheet.approval_status === 'pending' || timesheet.approval_status === 'submitted') && (
            <>
              {!showRejectForm ? (
                <>
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowRejectForm(true)}
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={isApproving}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isApproving ? 'Approving...' : 'Approve'}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectionReason('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={!rejectionReason.trim() || isRejecting}
                  >
                    {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
                  </Button>
                </>
              )}
            </>
          )}
          {(timesheet.approval_status === 'approved' || timesheet.approval_status === 'rejected') && (
            <Button onClick={onClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
