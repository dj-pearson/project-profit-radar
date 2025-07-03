import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CreditCard, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PaymentFailure {
  id: string;
  failure_reason: string;
  attempt_count: number;
  max_retries: number;
  next_retry_at: string | null;
  dunning_status: string;
  created_at: string;
}

const PaymentFailureAlert: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [paymentFailures, setPaymentFailures] = useState<PaymentFailure[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      checkPaymentFailures();
    }
  }, [user]);

  const checkPaymentFailures = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_failures')
        .select('*')
        .in('dunning_status', ['active', 'suspended'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentFailures(data || []);
    } catch (error) {
      console.error('Error checking payment failures:', error);
    }
  };

  const handleManagePayment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening payment management:', error);
      toast({
        title: "Error",
        description: "Failed to open payment management",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (paymentFailures.length === 0) {
    return null;
  }

  const activeFailures = paymentFailures.filter(f => f.dunning_status === 'active');
  const suspendedFailures = paymentFailures.filter(f => f.dunning_status === 'suspended');

  return (
    <div className="space-y-4">
      {suspendedFailures.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Account Suspended</AlertTitle>
          <AlertDescription className="text-red-700">
            Your account has been suspended due to failed payment attempts. Please update your payment method immediately to restore access.
            <div className="mt-3">
              <Button 
                onClick={handleManagePayment}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700"
                size="sm"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {loading ? 'Opening...' : 'Update Payment Method'}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {activeFailures.length > 0 && suspendedFailures.length === 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">Payment Issue</AlertTitle>
          <AlertDescription className="text-orange-700">
            We're having trouble processing your payment. 
            {activeFailures[0].next_retry_at && (
              <>
                {' '}We'll try again on {new Date(activeFailures[0].next_retry_at).toLocaleDateString()}.
              </>
            )}
            <div className="mt-2 text-sm">
              <p>Attempts: {activeFailures[0].attempt_count} of {activeFailures[0].max_retries}</p>
              <p>Reason: {activeFailures[0].failure_reason}</p>
            </div>
            <div className="mt-3">
              <Button 
                onClick={handleManagePayment}
                disabled={loading}
                variant="outline"
                size="sm"
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {loading ? 'Opening...' : 'Update Payment Method'}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default PaymentFailureAlert;