import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { XCircle, ArrowLeft, RefreshCw, HelpCircle, Home, CreditCard } from 'lucide-react';

export const PaymentCancelled = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const invoiceId = searchParams.get('invoice_id');

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Cancelled Icon */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-100 rounded-full mb-4 animate-in zoom-in duration-500 delay-200">
            <XCircle className="w-12 h-12 text-orange-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Cancelled
          </h1>
          <p className="text-lg text-muted-foreground">
            Your payment was not processed
          </p>
        </div>

        {/* Info Card */}
        <Card className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-orange-600" />
              What Happened?
            </CardTitle>
            <CardDescription>
              Your payment was cancelled before completion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Don't worry - no charges have been made to your account. This can happen if:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-2">
              <li>You clicked the back button or closed the payment window</li>
              <li>The payment session timed out</li>
              <li>There was a temporary connection issue</li>
            </ul>
          </CardContent>
        </Card>

        {/* Reassurance Alert */}
        <Alert className="border-blue-500 bg-blue-50 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
          <CreditCard className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>No charges were made.</strong> Your card has not been charged.
            You can try again whenever you're ready.
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-700">
          <Button
            className="w-full bg-construction-orange hover:bg-construction-orange/90"
            size="lg"
            onClick={() => navigate(invoiceId ? `/invoices?id=${invoiceId}` : '/invoices')}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Payment Again
          </Button>

          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={() => navigate('/dashboard')}
          >
            <Home className="h-4 w-4 mr-2" />
            Return to Dashboard
          </Button>

          <Button
            variant="ghost"
            className="w-full"
            size="lg"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>

        {/* Support Link */}
        <p className="text-center text-sm text-muted-foreground mt-6 animate-in fade-in duration-700 delay-1000">
          Having trouble with payments?{' '}
          <a href="mailto:support@builddesk.com" className="text-construction-blue hover:text-construction-orange">
            Contact our support team
          </a>
        </p>
      </div>
    </div>
  );
};

export default PaymentCancelled;
