import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, ArrowRight, Receipt, Loader2, Home, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<{
    amount?: number;
    invoiceId?: string;
    projectName?: string;
  } | null>(null);

  const invoiceId = searchParams.get('invoice_id');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!user) {
      const timer = setTimeout(() => {
        if (!user) {
          navigate('/auth');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }

    const fetchPaymentDetails = async () => {
      try {
        if (invoiceId) {
          const { data: invoice, error } = await supabase
            .from('invoices')
            .select(`
              *,
              projects (name)
            `)
            .eq('id', invoiceId)
            .single();

          if (!error && invoice) {
            setPaymentDetails({
              amount: invoice.amount,
              invoiceId: invoice.id,
              projectName: invoice.projects?.name,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching payment details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentDetails();
  }, [invoiceId, user, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Confirming your payment...</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Success Animation */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4 animate-in zoom-in duration-500 delay-200">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-lg text-muted-foreground">
            Thank you for your payment
          </p>
        </div>

        {/* Payment Details Card */}
        <Card className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-green-600" />
              Payment Receipt
            </CardTitle>
            <CardDescription>
              Your payment has been processed successfully
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentDetails?.amount && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="text-xl font-bold text-green-600">
                  {formatCurrency(paymentDetails.amount)}
                </span>
              </div>
            )}
            {paymentDetails?.projectName && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Project</span>
                <span className="font-medium">{paymentDetails.projectName}</span>
              </div>
            )}
            {paymentDetails?.invoiceId && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Invoice ID</span>
                <span className="font-mono text-sm">{paymentDetails.invoiceId.slice(0, 8)}...</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Status</span>
              <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                <CheckCircle className="h-4 w-4" />
                Confirmed
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Confirmation Alert */}
        <Alert className="border-green-500 bg-green-50 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            A receipt has been sent to your email address. You can also view this payment in your invoices.
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-700">
          <Button
            className="w-full bg-construction-orange hover:bg-construction-orange/90"
            size="lg"
            onClick={() => navigate('/dashboard')}
          >
            <Home className="h-4 w-4 mr-2" />
            Go to Dashboard
          </Button>

          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={() => navigate('/invoices')}
          >
            <FileText className="h-4 w-4 mr-2" />
            View All Invoices
          </Button>
        </div>

        {/* Support Link */}
        <p className="text-center text-sm text-muted-foreground mt-6 animate-in fade-in duration-700 delay-1000">
          Questions about this payment?{' '}
          <a href="mailto:support@builddesk.com" className="text-construction-blue hover:text-construction-orange">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccess;
