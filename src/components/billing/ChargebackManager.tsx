import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  RefreshCw,
  AlertTriangle,
  Shield,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Upload,
  DollarSign,
  TrendingDown
} from 'lucide-react';

interface Chargeback {
  id: string;
  amount: number;
  currency: string;
  reason: string;
  reason_description: string;
  status: string;
  evidence_submitted: boolean;
  evidence_due_by: string | null;
  fee_amount: number;
  fee_applied: boolean;
  net_impact: number;
  created_at: string;
  resolved_at: string | null;
  stripe_dispute_id: string | null;
  invoice?: { invoice_number: string };
  evidence?: Record<string, unknown>;
}

interface ChargebackSummary {
  total: number;
  pending: number;
  under_review: number;
  won: number;
  lost: number;
  total_amount: number;
  total_fees: number;
}

const ChargebackManager: React.FC = () => {
  const { toast } = useToast();
  const [chargebacks, setChargebacks] = useState<Chargeback[]>([]);
  const [summary, setSummary] = useState<ChargebackSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedChargeback, setSelectedChargeback] = useState<Chargeback | null>(null);
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Evidence form state
  const [evidence, setEvidence] = useState({
    product_description: '',
    customer_name: '',
    customer_email_address: '',
    service_date: '',
    service_documentation: '',
    uncategorized_text: ''
  });

  useEffect(() => {
    fetchChargebacks();
  }, []);

  const fetchChargebacks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('handle-chargeback', {
        body: { action: 'list' }
      });

      if (error) throw error;
      setChargebacks(data.chargebacks || []);
      setSummary(data.summary || null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch chargebacks',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncFromStripe = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('handle-chargeback', {
        body: { action: 'sync' }
      });

      if (error) throw error;

      toast({
        title: 'Sync Complete',
        description: data.message || `Synced ${data.synced} chargebacks from Stripe`
      });

      fetchChargebacks();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sync chargebacks from Stripe',
        variant: 'destructive'
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmitEvidence = async () => {
    if (!selectedChargeback) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('handle-chargeback', {
        body: {
          action: 'submit_evidence',
          chargeback_id: selectedChargeback.id,
          evidence
        }
      });

      if (error) throw error;

      toast({
        title: 'Evidence Submitted',
        description: 'Your evidence has been submitted for review'
      });

      setEvidenceDialogOpen(false);
      setSelectedChargeback(null);
      setEvidence({
        product_description: '',
        customer_name: '',
        customer_email_address: '',
        service_date: '',
        service_documentation: '',
        uncategorized_text: ''
      });
      fetchChargebacks();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit evidence',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptChargeback = async (chargebackId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('handle-chargeback', {
        body: { action: 'accept', chargeback_id: chargebackId }
      });

      if (error) throw error;

      toast({
        title: 'Chargeback Accepted',
        description: 'The dispute has been closed in your favor of the customer'
      });

      fetchChargebacks();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to accept chargeback',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'needs_response':
      case 'warning_needs_response':
        return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="w-3 h-3 mr-1" />Needs Response</Badge>;
      case 'under_review':
      case 'warning_under_review':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Under Review</Badge>;
      case 'won':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Won</Badge>;
      case 'lost':
        return <Badge className="bg-gray-100 text-gray-800"><XCircle className="w-3 h-3 mr-1" />Lost</Badge>;
      case 'charge_refunded':
        return <Badge className="bg-purple-100 text-purple-800"><RefreshCw className="w-3 h-3 mr-1" />Refunded</Badge>;
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

  const getDaysUntilDue = (dueDate: string | null) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const now = new Date();
    const days = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const urgentChargebacks = chargebacks.filter(c =>
    ['needs_response', 'warning_needs_response'].includes(c.status)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Chargeback Management</h2>
          <p className="text-muted-foreground">Handle disputes and protect your revenue</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSyncFromStripe} disabled={syncing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync from Stripe
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Needs Response
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Won/Lost Ratio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.won}/{summary.lost}
              </div>
              <Progress
                value={summary.won + summary.lost > 0 ?
                  (summary.won / (summary.won + summary.lost)) * 100 : 0}
                className="mt-2"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Total at Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.total_amount)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Fees Incurred
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(summary.total_fees)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Urgent Chargebacks Alert */}
      {urgentChargebacks.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-5 h-5" />
              Urgent: Response Required
            </CardTitle>
            <CardDescription className="text-red-700">
              These chargebacks need your immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {urgentChargebacks.map((chargeback) => {
                const daysLeft = getDaysUntilDue(chargeback.evidence_due_by);
                return (
                  <div
                    key={chargeback.id}
                    className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-200"
                  >
                    <div>
                      <div className="font-medium">{formatCurrency(chargeback.amount)}</div>
                      <div className="text-sm text-muted-foreground">{chargeback.reason}</div>
                      {daysLeft !== null && (
                        <div className={`text-xs ${daysLeft <= 3 ? 'text-red-600 font-semibold' : 'text-orange-600'}`}>
                          {daysLeft} days left to respond
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAcceptChargeback(chargeback.id)}
                      >
                        Accept Loss
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedChargeback(chargeback);
                          setEvidenceDialogOpen(true);
                        }}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Submit Evidence
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chargebacks Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Chargebacks</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All ({chargebacks.length})</TabsTrigger>
              <TabsTrigger value="open">Open ({chargebacks.filter(c => !c.resolved_at).length})</TabsTrigger>
              <TabsTrigger value="resolved">Resolved ({chargebacks.filter(c => c.resolved_at).length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <ChargebackTable
                chargebacks={chargebacks}
                loading={loading}
                onSubmitEvidence={(c) => {
                  setSelectedChargeback(c);
                  setEvidenceDialogOpen(true);
                }}
                getStatusBadge={getStatusBadge}
                formatCurrency={formatCurrency}
              />
            </TabsContent>

            <TabsContent value="open" className="mt-4">
              <ChargebackTable
                chargebacks={chargebacks.filter(c => !c.resolved_at)}
                loading={loading}
                onSubmitEvidence={(c) => {
                  setSelectedChargeback(c);
                  setEvidenceDialogOpen(true);
                }}
                getStatusBadge={getStatusBadge}
                formatCurrency={formatCurrency}
              />
            </TabsContent>

            <TabsContent value="resolved" className="mt-4">
              <ChargebackTable
                chargebacks={chargebacks.filter(c => c.resolved_at)}
                loading={loading}
                onSubmitEvidence={(c) => {
                  setSelectedChargeback(c);
                  setEvidenceDialogOpen(true);
                }}
                getStatusBadge={getStatusBadge}
                formatCurrency={formatCurrency}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Evidence Submission Dialog */}
      <Dialog open={evidenceDialogOpen} onOpenChange={setEvidenceDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submit Dispute Evidence</DialogTitle>
            <DialogDescription>
              Provide documentation to support your case
              {selectedChargeback && (
                <span className="block mt-1 text-sm">
                  Dispute Amount: {formatCurrency(selectedChargeback.amount)} - {selectedChargeback.reason}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input
                  value={evidence.customer_name}
                  onChange={(e) => setEvidence({ ...evidence, customer_name: e.target.value })}
                  placeholder="Customer's full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Customer Email</Label>
                <Input
                  type="email"
                  value={evidence.customer_email_address}
                  onChange={(e) => setEvidence({ ...evidence, customer_email_address: e.target.value })}
                  placeholder="customer@example.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Service/Product Description</Label>
              <Textarea
                value={evidence.product_description}
                onChange={(e) => setEvidence({ ...evidence, product_description: e.target.value })}
                placeholder="Describe the product or service provided..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Service Date</Label>
              <Input
                type="date"
                value={evidence.service_date}
                onChange={(e) => setEvidence({ ...evidence, service_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Service Documentation</Label>
              <Textarea
                value={evidence.service_documentation}
                onChange={(e) => setEvidence({ ...evidence, service_documentation: e.target.value })}
                placeholder="Contracts, agreements, delivery confirmations, etc."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Additional Information</Label>
              <Textarea
                value={evidence.uncategorized_text}
                onChange={(e) => setEvidence({ ...evidence, uncategorized_text: e.target.value })}
                placeholder="Any other relevant information..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEvidenceDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitEvidence} disabled={submitting}>
              <Upload className="w-4 h-4 mr-2" />
              {submitting ? 'Submitting...' : 'Submit Evidence'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Separate table component for reusability
interface ChargebackTableProps {
  chargebacks: Chargeback[];
  loading: boolean;
  onSubmitEvidence: (chargeback: Chargeback) => void;
  getStatusBadge: (status: string) => React.ReactNode;
  formatCurrency: (amount: number) => string;
}

const ChargebackTable: React.FC<ChargebackTableProps> = ({
  chargebacks,
  loading,
  onSubmitEvidence,
  getStatusBadge,
  formatCurrency
}) => {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (chargebacks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No chargebacks found
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Evidence</TableHead>
          <TableHead>Fee</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {chargebacks.map((chargeback) => (
          <TableRow key={chargeback.id}>
            <TableCell>
              {new Date(chargeback.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell className="font-medium">
              {formatCurrency(chargeback.amount)}
            </TableCell>
            <TableCell className="max-w-[200px] truncate">
              {chargeback.reason}
            </TableCell>
            <TableCell>{getStatusBadge(chargeback.status)}</TableCell>
            <TableCell>
              {chargeback.evidence_submitted ? (
                <Badge variant="outline" className="bg-green-50">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Submitted
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-yellow-50">
                  <Clock className="w-3 h-3 mr-1" />
                  Pending
                </Badge>
              )}
            </TableCell>
            <TableCell>
              {chargeback.fee_applied ?
                formatCurrency(chargeback.fee_amount) : '-'}
            </TableCell>
            <TableCell>
              {['needs_response', 'warning_needs_response'].includes(chargeback.status) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSubmitEvidence(chargeback)}
                >
                  <FileText className="w-4 h-4" />
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default ChargebackManager;
