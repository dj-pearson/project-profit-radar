import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  RefreshCw,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  AlertTriangle
} from 'lucide-react';

interface Refund {
  id: string;
  amount: number;
  reason: string;
  reason_description: string;
  status: string;
  created_at: string;
  stripe_refund_id: string | null;
  invoice?: { invoice_number: string };
  requested_by_user?: { full_name: string };
  approved_by_user?: { full_name: string };
}

const REFUND_REASONS = [
  { value: 'duplicate', label: 'Duplicate Payment' },
  { value: 'fraudulent', label: 'Fraudulent Charge' },
  { value: 'requested_by_customer', label: 'Customer Request' },
  { value: 'service_issue', label: 'Service Issue' },
  { value: 'product_defective', label: 'Product/Service Defective' },
  { value: 'other', label: 'Other' }
];

const RefundWorkflow: React.FC = () => {
  const { toast } = useToast();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Form state
  const [newRefund, setNewRefund] = useState({
    amount: '',
    reason: '',
    reason_description: '',
    invoice_id: '',
    notes: ''
  });

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-refund', {
        body: { action: 'list' }
      });

      if (error) throw error;
      setRefunds(data.refunds || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch refunds',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRefund = async () => {
    if (!newRefund.amount || !newRefund.reason) {
      toast({
        title: 'Validation Error',
        description: 'Amount and reason are required',
        variant: 'destructive'
      });
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-refund', {
        body: {
          action: 'create',
          amount: parseFloat(newRefund.amount),
          reason: newRefund.reason,
          reason_description: newRefund.reason_description,
          invoice_id: newRefund.invoice_id || undefined,
          notes: newRefund.notes
        }
      });

      if (error) throw error;

      toast({
        title: 'Refund Created',
        description: data.message || 'Refund request submitted successfully'
      });

      setDialogOpen(false);
      setNewRefund({ amount: '', reason: '', reason_description: '', invoice_id: '', notes: '' });
      fetchRefunds();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create refund',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async (refundId: string) => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-refund', {
        body: { action: 'approve', refund_id: refundId }
      });

      if (error) throw error;

      toast({
        title: 'Refund Approved',
        description: 'Refund has been approved and is being processed'
      });

      fetchRefunds();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve refund',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (refundId: string) => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-refund', {
        body: { action: 'reject', refund_id: refundId }
      });

      if (error) throw error;

      toast({
        title: 'Refund Rejected',
        description: 'Refund request has been rejected'
      });

      fetchRefunds();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject refund',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending Approval</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'canceled':
        return <Badge className="bg-gray-100 text-gray-800"><XCircle className="w-3 h-3 mr-1" />Canceled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const pendingRefunds = refunds.filter(r => r.status === 'pending');
  const totalRefunded = refunds
    .filter(r => r.status === 'succeeded')
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Refund Management</h2>
          <p className="text-muted-foreground">Process and track refund requests</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Refund
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Refund Request</DialogTitle>
              <DialogDescription>
                Submit a new refund request for processing
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-9"
                    value={newRefund.amount}
                    onChange={(e) => setNewRefund({ ...newRefund, amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Select
                  value={newRefund.reason}
                  onValueChange={(value) => setNewRefund({ ...newRefund, reason: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {REFUND_REASONS.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Provide additional details..."
                  value={newRefund.reason_description}
                  onChange={(e) => setNewRefund({ ...newRefund, reason_description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Invoice ID (Optional)</Label>
                <Input
                  placeholder="inv_..."
                  value={newRefund.invoice_id}
                  onChange={(e) => setNewRefund({ ...newRefund, invoice_id: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRefund} disabled={processing}>
                {processing ? 'Creating...' : 'Create Refund'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRefunds.length}</div>
            <p className="text-xs text-muted-foreground">
              {pendingRefunds.length > 0 ? 'Requires action' : 'All clear'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Refunded (This Month)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRefunded)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{refunds.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      {pendingRefunds.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Pending Approvals
            </CardTitle>
            <CardDescription>These refunds require your approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRefunds.map((refund) => (
                <div
                  key={refund.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border"
                >
                  <div>
                    <div className="font-medium">{formatCurrency(refund.amount)}</div>
                    <div className="text-sm text-muted-foreground">
                      {REFUND_REASONS.find(r => r.value === refund.reason)?.label}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(refund.id)}
                      disabled={processing}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(refund.id)}
                      disabled={processing}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refunds Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Refund History</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchRefunds} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : refunds.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No refunds found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refunds.map((refund) => (
                  <TableRow key={refund.id}>
                    <TableCell>
                      {new Date(refund.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(refund.amount)}
                    </TableCell>
                    <TableCell>
                      {REFUND_REASONS.find(r => r.value === refund.reason)?.label}
                    </TableCell>
                    <TableCell>
                      {refund.invoice?.invoice_number || '-'}
                    </TableCell>
                    <TableCell>
                      {refund.requested_by_user?.full_name || '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(refund.status)}</TableCell>
                    <TableCell>
                      {refund.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleApprove(refund.id)}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReject(refund.id)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RefundWorkflow;
