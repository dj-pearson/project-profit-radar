import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CreditCard, Receipt, DollarSign, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PaymentProcessorProps {
  invoice: {
    id: string;
    invoice_number: string;
    client_name: string;
    client_email: string;
    total_amount: number;
    amount_paid: number;
    amount_due: number;
    status: string;
  };
  onPaymentProcessed?: () => void;
}

const PaymentProcessor = ({ invoice, onPaymentProcessed }: PaymentProcessorProps) => {
  const [paymentMethod, setPaymentMethod] = useState<'stripe_checkout' | 'manual'>('stripe_checkout');
  const [manualAmount, setManualAmount] = useState(invoice.amount_due);
  const [manualNotes, setManualNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handlePayment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-invoice-payment', {
        body: {
          invoice_id: invoice.id,
          payment_method: paymentMethod,
          manual_payment_amount: paymentMethod === 'manual' ? manualAmount : undefined,
          manual_payment_notes: paymentMethod === 'manual' ? manualNotes : undefined
        }
      });

      if (error) throw error;

      if (data.success) {
        if (paymentMethod === 'stripe_checkout' && data.checkout_url) {
          // Open Stripe checkout in new tab
          window.open(data.checkout_url, '_blank');
          setIsOpen(false);
          toast({
            title: "Payment Processing",
            description: "Redirected to Stripe checkout. Complete payment to update invoice status.",
          });
        } else if (paymentMethod === 'manual') {
          toast({
            title: "Payment Recorded",
            description: `Manual payment of $${manualAmount} has been recorded.`,
          });
          setIsOpen(false);
          onPaymentProcessed?.();
        }
      }

    } catch (error) {
      console.error('Payment processing error:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Draft', className: 'bg-gray-500' },
      sent: { label: 'Sent', className: 'bg-blue-500' },
      viewed: { label: 'Viewed', className: 'bg-purple-500' },
      paid: { label: 'Paid', className: 'bg-green-500' },
      overdue: { label: 'Overdue', className: 'bg-red-500' },
      cancelled: { label: 'Cancelled', className: 'bg-gray-400' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const isFullyPaid = invoice.amount_due <= 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Invoice {invoice.invoice_number}
            </CardTitle>
            <CardDescription>
              {invoice.client_name} • {invoice.client_email}
            </CardDescription>
          </div>
          {getStatusBadge(invoice.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Summary */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-lg font-semibold">${invoice.total_amount.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Amount Paid</p>
            <p className="text-lg font-semibold text-green-600">${invoice.amount_paid.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Amount Due</p>
            <p className="text-lg font-semibold text-construction-orange">${invoice.amount_due.toFixed(2)}</p>
          </div>
        </div>

        {/* Payment Actions */}
        {!isFullyPaid && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-construction-orange hover:bg-construction-orange/90">
                <CreditCard className="mr-2 h-4 w-4" />
                Process Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Process Payment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="payment-method">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stripe_checkout">
                        <div className="flex items-center">
                          <CreditCard className="mr-2 h-4 w-4" />
                          Stripe Checkout
                        </div>
                      </SelectItem>
                      <SelectItem value="manual">
                        <div className="flex items-center">
                          <DollarSign className="mr-2 h-4 w-4" />
                          Manual Payment
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentMethod === 'stripe_checkout' && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      Client will be redirected to Stripe to complete payment of ${invoice.amount_due.toFixed(2)}
                    </p>
                  </div>
                )}

                {paymentMethod === 'manual' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="manual-amount">Payment Amount</Label>
                      <Input
                        id="manual-amount"
                        type="number"
                        min="0"
                        max={invoice.amount_due}
                        step="0.01"
                        value={manualAmount}
                        onChange={(e) => setManualAmount(parseFloat(e.target.value) || 0)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Maximum: ${invoice.amount_due.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="manual-notes">Payment Notes</Label>
                      <Textarea
                        id="manual-notes"
                        placeholder="e.g., Check #1234, Cash payment, Bank transfer"
                        value={manualNotes}
                        onChange={(e) => setManualNotes(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                )}

                <Button 
                  onClick={handlePayment}
                  disabled={loading || (paymentMethod === 'manual' && (manualAmount <= 0 || manualAmount > invoice.amount_due))}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : paymentMethod === 'stripe_checkout' ? (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Open Stripe Checkout
                    </>
                  ) : (
                    <>
                      <DollarSign className="mr-2 h-4 w-4" />
                      Record Manual Payment
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {isFullyPaid && (
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-green-700 font-medium">Invoice Paid in Full</p>
            <p className="text-sm text-green-600">This invoice has been completely paid.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentProcessor;