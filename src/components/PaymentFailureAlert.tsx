import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, CreditCard, RefreshCw, Clock, XCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface PaymentFailure {
  id: string;
  stripe_invoice_id: string;
  failure_reason: string;
  attempt_count: number;
  max_retries: number;
  next_retry_at: string;
  dunning_status: string;
  created_at: string;
}

const PaymentFailureAlert = () => {
  const [paymentFailures, setPaymentFailures] = useState<PaymentFailure[]>([]);
  const [loading, setLoading] = useState(false);
  const [retryingInvoice, setRetryingInvoice] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchPaymentFailures = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('payment_failures')
        .select(`
          *,
          subscribers!inner(user_id)
        `)
        .eq('subscribers.user_id', user.id)
        .in('dunning_status', ['active', 'suspended'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentFailures(data || []);
    } catch (error) {
      console.error('Error fetching payment failures:', error);
    }
  };

  const retryPayment = async (stripeInvoiceId: string) => {
    setRetryingInvoice(stripeInvoiceId);
    try {
      const { data, error } = await supabase.functions.invoke('process-invoice-payment', {
        body: {
          stripe_invoice_id: stripeInvoiceId,
          payment_method: 'stripe_payment_intent'
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Payment Retry Initiated",
          description: "Your payment is being processed. You'll be notified of the result.",
        });
        await fetchPaymentFailures();
      }
    } catch (error) {
      console.error('Payment retry error:', error);
      toast({
        title: "Retry Failed",
        description: error.message || "Failed to retry payment",
        variant: "destructive"
      });
    } finally {
      setRetryingInvoice(null);
    }
  };

  const updatePaymentMethod = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "Failed to open payment method update page",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchPaymentFailures();
  }, [user]);


  if (paymentFailures.length === 0) return null;

  // Show immediate alert for active failures
  const activeFailures = paymentFailures.filter(f => f.dunning_status === 'active');
  const suspendedFailures = paymentFailures.filter(f => f.dunning_status === 'suspended');

  return (
    <div className="space-y-4">
      {/* Critical Alert for Suspended Account */}
      {suspendedFailures.length > 0 && (
        <Alert className="border-red-500 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Account Suspended - Payment Required</p>
                <p className="text-sm">Your account has been suspended due to failed payment attempts. Please update your payment method immediately.</p>
              </div>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={updatePaymentMethod}
              >
                Update Payment Method
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Warning Alert for Active Failures */}
      {activeFailures.length > 0 && (
        <Alert className="border-orange-500 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Payment Issue Detected</p>
                <p className="text-sm">We're having trouble processing your payment. Your service may be interrupted if not resolved.</p>
              </div>
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Payment Failures</DialogTitle>
                    </DialogHeader>
                    <PaymentFailureDetails 
                      failures={paymentFailures}
                      onRetryPayment={retryPayment}
                      onUpdatePaymentMethod={updatePaymentMethod}
                      retryingInvoice={retryingInvoice}
                    />
                  </DialogContent>
                </Dialog>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={updatePaymentMethod}
                >
                  Fix Payment
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

interface PaymentFailureDetailsProps {
  failures: PaymentFailure[];
  onRetryPayment: (invoiceId: string) => void;
  onUpdatePaymentMethod: () => void;
  retryingInvoice: string | null;
}

const PaymentFailureDetails = ({ 
  failures, 
  onRetryPayment, 
  onUpdatePaymentMethod, 
  retryingInvoice 
}: PaymentFailureDetailsProps) => {
  const getStatusBadge = (status: string, attemptCount: number, maxRetries: number) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="outline" className="border-orange-500 text-orange-700">
            <Clock className="h-3 w-3 mr-1" />
            Retrying ({attemptCount}/{maxRetries})
          </Badge>
        );
      case 'suspended':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Account Suspended
          </Badge>
        );
      case 'resolved':
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Resolved
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getNextRetryText = (nextRetryAt: string) => {
    const nextRetry = new Date(nextRetryAt);
    const now = new Date();
    const diffMs = nextRetry.getTime() - now.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs <= 0) {
      return "Retry pending";
    } else if (diffHours < 24) {
      return `Next retry in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    } else {
      return `Next retry in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    }
  };

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      {failures.map((failure) => (
        <Card key={failure.id} className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Invoice: {failure.stripe_invoice_id.slice(-8)}
              </CardTitle>
              {getStatusBadge(failure.dunning_status, failure.attempt_count, failure.max_retries)}
            </div>
            <CardDescription className="text-xs">
              Failed on {new Date(failure.created_at).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="text-sm">
                <p className="font-medium text-red-600 mb-1">Failure Reason:</p>
                <p className="text-muted-foreground">{failure.failure_reason}</p>
              </div>

              {failure.dunning_status === 'active' && (
                <div className="text-sm">
                  <p className="font-medium mb-1">Retry Status:</p>
                  <p className="text-muted-foreground">
                    {getNextRetryText(failure.next_retry_at)}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {failure.dunning_status === 'active' && failure.attempt_count < failure.max_retries && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRetryPayment(failure.stripe_invoice_id)}
                    disabled={retryingInvoice === failure.stripe_invoice_id}
                    className="flex items-center gap-1"
                  >
                    {retryingInvoice === failure.stripe_invoice_id ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    Retry Now
                  </Button>
                )}
                <Button
                  variant="default"
                  size="sm"
                  onClick={onUpdatePaymentMethod}
                  className="flex items-center gap-1"
                >
                  <CreditCard className="h-3 w-3" />
                  Update Payment Method
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {failures.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
          <p>No payment issues found</p>
        </div>
      )}
    </div>
  );
};

export default PaymentFailureAlert;