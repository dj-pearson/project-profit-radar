import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Calendar,
  DollarSign,
  AlertTriangle,
  MessageSquare,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChangeOrder {
  id: string;
  change_order_number: string;
  title: string;
  description: string;
  amount: number;
  status: string;
  client_approved: boolean | null;
  client_approved_at?: string;
  client_rejection_reason?: string;
  created_at: string;
  requested_by?: string;
  impact_schedule?: string;
  impact_budget?: string;
  justification?: string;
  attachments?: string[];
}

interface ClientChangeOrderApprovalProps {
  changeOrders: ChangeOrder[];
  onApprove?: (changeOrderId: string, comments?: string) => Promise<void>;
  onReject?: (changeOrderId: string, reason: string) => Promise<void>;
  onRequestChanges?: (changeOrderId: string, feedback: string) => Promise<void>;
}

export const ClientChangeOrderApproval: React.FC<ClientChangeOrderApprovalProps> = ({
  changeOrders,
  onApprove,
  onReject,
  onRequestChanges
}) => {
  const [selectedChangeOrder, setSelectedChangeOrder] = useState<ChangeOrder | null>(null);
  const [dialogType, setDialogType] = useState<'approve' | 'reject' | 'request_changes' | null>(null);
  const [comments, setComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (changeOrder: ChangeOrder) => {
    if (changeOrder.client_approved === true) {
      return <Badge className="bg-green-600 text-white">Approved</Badge>;
    }
    if (changeOrder.client_approved === false) {
      return <Badge className="bg-red-600 text-white">Rejected</Badge>;
    }
    return (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
        <Clock className="h-3 w-3 mr-1" />
        Pending Approval
      </Badge>
    );
  };

  const handleApprove = async (changeOrder: ChangeOrder) => {
    setSelectedChangeOrder(changeOrder);
    setDialogType('approve');
  };

  const handleReject = async (changeOrder: ChangeOrder) => {
    setSelectedChangeOrder(changeOrder);
    setDialogType('reject');
    setRejectionReason('');
  };

  const handleRequestChanges = async (changeOrder: ChangeOrder) => {
    setSelectedChangeOrder(changeOrder);
    setDialogType('request_changes');
    setComments('');
  };

  const confirmApprove = async () => {
    if (!selectedChangeOrder) return;

    try {
      setProcessingId(selectedChangeOrder.id);

      if (onApprove) {
        await onApprove(selectedChangeOrder.id, comments);
      } else {
        // Default approval logic
        const { error } = await supabase
          .from('change_orders')
          .update({
            client_approved: true,
            client_approved_at: new Date().toISOString(),
            status: 'approved'
          })
          .eq('id', selectedChangeOrder.id);

        if (error) throw error;
      }

      toast({
        title: "Change order approved",
        description: "The change order has been approved successfully"
      });

      setDialogType(null);
      setSelectedChangeOrder(null);
      setComments('');
    } catch (error: any) {
      console.error('Error approving change order:', error);
      toast({
        variant: "destructive",
        title: "Approval failed",
        description: error.message || "Failed to approve change order"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const confirmReject = async () => {
    if (!selectedChangeOrder || !rejectionReason.trim()) {
      toast({
        variant: "destructive",
        title: "Reason required",
        description: "Please provide a reason for rejecting this change order"
      });
      return;
    }

    try {
      setProcessingId(selectedChangeOrder.id);

      if (onReject) {
        await onReject(selectedChangeOrder.id, rejectionReason);
      } else {
        // Default rejection logic
        const { error } = await supabase
          .from('change_orders')
          .update({
            client_approved: false,
            client_approved_at: new Date().toISOString(),
            client_rejection_reason: rejectionReason,
            status: 'rejected'
          })
          .eq('id', selectedChangeOrder.id);

        if (error) throw error;
      }

      toast({
        title: "Change order rejected",
        description: "The change order has been rejected"
      });

      setDialogType(null);
      setSelectedChangeOrder(null);
      setRejectionReason('');
    } catch (error: any) {
      console.error('Error rejecting change order:', error);
      toast({
        variant: "destructive",
        title: "Rejection failed",
        description: error.message || "Failed to reject change order"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const confirmRequestChanges = async () => {
    if (!selectedChangeOrder || !comments.trim()) {
      toast({
        variant: "destructive",
        title: "Feedback required",
        description: "Please provide feedback for the requested changes"
      });
      return;
    }

    try {
      setProcessingId(selectedChangeOrder.id);

      if (onRequestChanges) {
        await onRequestChanges(selectedChangeOrder.id, comments);
      } else {
        // Default request changes logic - could send a message or update status
        toast({
          title: "Feedback sent",
          description: "Your feedback has been sent to the project team"
        });
      }

      setDialogType(null);
      setSelectedChangeOrder(null);
      setComments('');
    } catch (error: any) {
      console.error('Error requesting changes:', error);
      toast({
        variant: "destructive",
        title: "Request failed",
        description: error.message || "Failed to send feedback"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingChangeOrders = changeOrders.filter(co => co.client_approved === null);
  const approvedChangeOrders = changeOrders.filter(co => co.client_approved === true);
  const rejectedChangeOrders = changeOrders.filter(co => co.client_approved === false);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Change Orders</CardTitle>
              <CardDescription>
                Review and approve project modifications
              </CardDescription>
            </div>
            {pendingChangeOrders.length > 0 && (
              <Badge className="bg-yellow-600 text-white">
                {pendingChangeOrders.length} Pending
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {changeOrders.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Change Orders</h3>
              <p className="text-muted-foreground">
                No change orders have been submitted for this project
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pending Change Orders */}
              {pendingChangeOrders.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground">Pending Approval</h3>
                  {pendingChangeOrders.map((changeOrder) => (
                    <div
                      key={changeOrder.id}
                      className="border-2 border-yellow-300 dark:border-yellow-700 rounded-lg p-4 bg-yellow-50/50 dark:bg-yellow-950/20"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-lg">{changeOrder.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              #{changeOrder.change_order_number}
                            </Badge>
                          </div>
                          {getStatusBadge(changeOrder)}
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                            {formatCurrency(changeOrder.amount)}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-4">
                        {changeOrder.description}
                      </p>

                      {/* Expandable Details */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedId(expandedId === changeOrder.id ? null : changeOrder.id)}
                        className="mb-3 text-xs"
                      >
                        {expandedId === changeOrder.id ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                        {expandedId === changeOrder.id ? 'Hide' : 'Show'} Details
                      </Button>

                      {expandedId === changeOrder.id && (
                        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 mb-4 space-y-3 text-sm">
                          {changeOrder.justification && (
                            <div>
                              <h5 className="font-semibold mb-1">Justification</h5>
                              <p className="text-muted-foreground">{changeOrder.justification}</p>
                            </div>
                          )}
                          {changeOrder.impact_schedule && (
                            <div>
                              <h5 className="font-semibold mb-1 flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                Schedule Impact
                              </h5>
                              <p className="text-muted-foreground">{changeOrder.impact_schedule}</p>
                            </div>
                          )}
                          {changeOrder.impact_budget && (
                            <div>
                              <h5 className="font-semibold mb-1 flex items-center">
                                <DollarSign className="h-4 w-4 mr-1" />
                                Budget Impact
                              </h5>
                              <p className="text-muted-foreground">{changeOrder.impact_budget}</p>
                            </div>
                          )}
                          <div className="flex items-center text-xs text-muted-foreground pt-2 border-t">
                            <Calendar className="h-3 w-3 mr-1" />
                            Submitted {formatDate(changeOrder.created_at)}
                            {changeOrder.requested_by && ` by ${changeOrder.requested_by}`}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleApprove(changeOrder)}
                          disabled={processingId === changeOrder.id}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRequestChanges(changeOrder)}
                          disabled={processingId === changeOrder.id}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Request Changes
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                          onClick={() => handleReject(changeOrder)}
                          disabled={processingId === changeOrder.id}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Approved Change Orders */}
              {approvedChangeOrders.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground">Approved</h3>
                  {approvedChangeOrders.map((changeOrder) => (
                    <div
                      key={changeOrder.id}
                      className="border rounded-lg p-4 bg-green-50/30 dark:bg-green-950/10"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{changeOrder.title}</h4>
                            <Badge variant="outline">#{changeOrder.change_order_number}</Badge>
                          </div>
                          {getStatusBadge(changeOrder)}
                          {changeOrder.client_approved_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Approved on {formatDate(changeOrder.client_approved_at)}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-700 dark:text-green-400">
                            {formatCurrency(changeOrder.amount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Rejected Change Orders */}
              {rejectedChangeOrders.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground">Rejected</h3>
                  {rejectedChangeOrders.map((changeOrder) => (
                    <div
                      key={changeOrder.id}
                      className="border rounded-lg p-4 bg-red-50/30 dark:bg-red-950/10"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{changeOrder.title}</h4>
                            <Badge variant="outline">#{changeOrder.change_order_number}</Badge>
                          </div>
                          {getStatusBadge(changeOrder)}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-red-700 dark:text-red-400">
                            {formatCurrency(changeOrder.amount)}
                          </p>
                        </div>
                      </div>
                      {changeOrder.client_rejection_reason && (
                        <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded text-sm">
                          <p className="font-medium text-xs text-muted-foreground mb-1">Rejection Reason:</p>
                          <p>{changeOrder.client_rejection_reason}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={dialogType === 'approve'} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Change Order</DialogTitle>
            <DialogDescription>
              You are about to approve change order #{selectedChangeOrder?.change_order_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">{selectedChangeOrder?.title}</h4>
              <p className="text-sm text-muted-foreground mb-3">{selectedChangeOrder?.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Amount:</span>
                <span className="text-2xl font-bold text-green-600">
                  {selectedChangeOrder && formatCurrency(selectedChangeOrder.amount)}
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="approval-comments">Comments (Optional)</Label>
              <Textarea
                id="approval-comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add any comments about this approval..."
                className="mt-2"
              />
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                By approving, you authorize the additional cost and any schedule changes.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmApprove}
              className="bg-green-600 hover:bg-green-700"
              disabled={processingId !== null}
            >
              {processingId ? 'Processing...' : 'Confirm Approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={dialogType === 'reject'} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Change Order</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting change order #{selectedChangeOrder?.change_order_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">{selectedChangeOrder?.title}</h4>
              <p className="text-sm text-muted-foreground">{selectedChangeOrder?.description}</p>
            </div>

            <div>
              <Label htmlFor="rejection-reason">Reason for Rejection *</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please explain why you're rejecting this change order..."
                className="mt-2"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmReject}
              variant="destructive"
              disabled={processingId !== null || !rejectionReason.trim()}
            >
              {processingId ? 'Processing...' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Changes Dialog */}
      <Dialog open={dialogType === 'request_changes'} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Changes</DialogTitle>
            <DialogDescription>
              Provide feedback for change order #{selectedChangeOrder?.change_order_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">{selectedChangeOrder?.title}</h4>
              <p className="text-sm text-muted-foreground">{selectedChangeOrder?.description}</p>
            </div>

            <div>
              <Label htmlFor="change-request-comments">Your Feedback *</Label>
              <Textarea
                id="change-request-comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Describe what changes you'd like to see..."
                className="mt-2"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmRequestChanges}
              disabled={processingId !== null || !comments.trim()}
            >
              {processingId ? 'Sending...' : 'Send Feedback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
