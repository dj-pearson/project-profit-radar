import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard, DollarSign, Receipt, Loader2 } from 'lucide-react';

interface StripePaymentProcessorProps {
  invoiceId?: string;
  projectId?: string;
  amount: number;
  description: string;
  clientEmail?: string;
  onPaymentSuccess?: (paymentId: string) => void;
}

export const StripePaymentProcessor = ({ 
  invoiceId, 
  projectId, 
  amount, 
  description, 
  clientEmail,
  onPaymentSuccess 
}: StripePaymentProcessorProps) => {
  const [paymentMethod, setPaymentMethod] = useState<'stripe_checkout' | 'payment_intent'>('stripe_checkout');
  const [isProcessing, setIsProcessing] = useState(false);
  const [customAmount, setCustomAmount] = useState(amount);
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const handleStripeCheckout = async () => {
    try {
      setIsProcessing(true);

      const { data, error } = await supabase.functions.invoke('enhanced-create-checkout', {
        body: {
          amount: customAmount * 100, // Convert to cents
          currency: 'usd',
          description,
          invoice_id: invoiceId,
          project_id: projectId,
          client_email: clientEmail || user?.email,
          success_url: `${window.location.origin}/payment-success`,
          cancel_url: `${window.location.origin}/payment-cancelled`
        }
      });

      if (error) throw error;

      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      toast({
        title: "Payment Error",
        description: "Failed to initiate payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentIntent = async () => {
    try {
      setIsProcessing(true);

      const { data, error } = await supabase.functions.invoke('process-invoice-payment', {
        body: {
          invoice_id: invoiceId,
          payment_method: 'stripe_payment_intent',
          amount: customAmount
        }
      });

      if (error) throw error;

      if (data?.client_secret) {
        // In a real implementation, you'd integrate with Stripe Elements here
        toast({
          title: "Payment Intent Created",
          description: "Payment intent created successfully. Integration with Stripe Elements required.",
        });
        
        onPaymentSuccess?.(data.payment_intent_id);
      }
    } catch (error) {
      console.error('Payment intent error:', error);
      toast({
        title: "Payment Error",
        description: "Failed to create payment intent. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualPayment = async () => {
    try {
      setIsProcessing(true);

      const { data, error } = await supabase.functions.invoke('process-invoice-payment', {
        body: {
          invoice_id: invoiceId,
          payment_method: 'manual',
          amount: customAmount,
          notes: 'Manual payment recorded via Stripe processor'
        }
      });

      if (error) throw error;

      toast({
        title: "Payment Recorded",
        description: "Manual payment has been recorded successfully.",
      });

      onPaymentSuccess?.(data.payment_id);
    } catch (error) {
      console.error('Manual payment error:', error);
      toast({
        title: "Recording Error", 
        description: "Failed to record manual payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          <CardTitle>Payment Processing</CardTitle>
        </div>
        <CardDescription>
          Process payment for {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Amount */}
        <div className="space-y-2">
          <Label htmlFor="amount">Payment Amount</Label>
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={customAmount}
              onChange={(e) => setCustomAmount(parseFloat(e.target.value) || 0)}
              className="flex-1"
            />
            <Badge variant="outline">{formatCurrency(customAmount)}</Badge>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="space-y-2">
          <Label>Payment Method</Label>
          <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stripe_checkout">Stripe Checkout (Recommended)</SelectItem>
              <SelectItem value="payment_intent">Payment Intent (Custom Form)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payment Details */}
        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Description:</span>
            <span className="font-medium">{description}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Amount:</span>
            <span className="font-bold text-lg">{formatCurrency(customAmount)}</span>
          </div>
          {invoiceId && (
            <div className="flex justify-between text-sm">
              <span>Invoice ID:</span>
              <span className="font-medium">{invoiceId}</span>
            </div>
          )}
          {clientEmail && (
            <div className="flex justify-between text-sm">
              <span>Client Email:</span>
              <span className="font-medium">{clientEmail}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {paymentMethod === 'stripe_checkout' && (
            <Button 
              onClick={handleStripeCheckout}
              disabled={isProcessing || customAmount <= 0}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay with Stripe Checkout
                </>
              )}
            </Button>
          )}

          {paymentMethod === 'payment_intent' && (
            <Button 
              onClick={handlePaymentIntent}
              disabled={isProcessing || customAmount <= 0}
              variant="outline"
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating Intent...
                </>
              ) : (
                <>
                  <Receipt className="h-4 w-4 mr-2" />
                  Create Payment Intent
                </>
              )}
            </Button>
          )}

          <Button 
            onClick={handleManualPayment}
            disabled={isProcessing || customAmount <= 0}
            variant="secondary"
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Recording...
              </>
            ) : (
              <>
                <Receipt className="h-4 w-4 mr-2" />
                Record Manual Payment
              </>
            )}
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Stripe Checkout:</strong> Secure hosted payment page with card processing</p>
          <p><strong>Payment Intent:</strong> For custom payment forms (requires Stripe Elements integration)</p>
          <p><strong>Manual Payment:</strong> Record payments received outside the system</p>
        </div>
      </CardContent>
    </Card>
  );
};