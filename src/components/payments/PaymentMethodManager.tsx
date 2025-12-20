import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CreditCard, Plus, Trash2, Shield, Calendar, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PaymentMethod {
  id: string;
  type: string;
  card_brand?: string;
  last_four?: string;
  exp_month?: number;
  exp_year?: number;
  is_default: boolean;
  created_at: string;
}

export const PaymentMethodManager = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingMethod, setAddingMethod] = useState(false);
  const { userProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (userProfile?.company_id) {
      loadPaymentMethods();
    }
  }, [userProfile?.company_id]);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch payment methods from Stripe via edge function
      const { data, error: fetchError } = await supabase.functions.invoke('get-payment-methods');

      if (fetchError) {
        // Check if it's a "function not found" error
        if (fetchError.message?.includes('not found') || fetchError.message?.includes('404')) {
          // Edge function doesn't exist yet - show empty state gracefully
          setPaymentMethods([]);
          return;
        }
        throw fetchError;
      }

      setPaymentMethods(data?.payment_methods || []);
    } catch (err) {
      console.error('Error loading payment methods:', err);
      setError('Unable to load payment methods. Please try again later.');
      setPaymentMethods([]);
    } finally {
      setLoading(false);
    }
  };

  const addPaymentMethod = async () => {
    try {
      setAddingMethod(true);
      
      // In a real implementation, this would use Stripe Elements to collect payment method
      const { data, error } = await supabase.functions.invoke('setup-payment-method');
      
      if (error) throw error;
      
      if (data?.setup_intent_client_secret) {
        // Redirect to Stripe setup page or use Stripe Elements
        toast({
          title: "Payment Method Setup",
          description: "Redirecting to secure payment method setup...",
        });
      }
      
      await loadPaymentMethods();
    } catch (error) {
      console.error('Error adding payment method:', error);
      toast({
        title: "Setup Error",
        description: "Failed to setup new payment method",
        variant: "destructive"
      });
    } finally {
      setAddingMethod(false);
    }
  };

  const removePaymentMethod = async (methodId: string) => {
    try {
      const { error } = await supabase.functions.invoke('remove-payment-method', {
        body: { payment_method_id: methodId }
      });
      
      if (error) throw error;
      
      toast({
        title: "Payment Method Removed",
        description: "Payment method has been successfully removed",
      });
      
      await loadPaymentMethods();
    } catch (error) {
      console.error('Error removing payment method:', error);
      toast({
        title: "Removal Error",
        description: "Failed to remove payment method",
        variant: "destructive"
      });
    }
  };

  const setDefaultPaymentMethod = async (methodId: string) => {
    try {
      const { error } = await supabase.functions.invoke('set-default-payment-method', {
        body: { payment_method_id: methodId }
      });
      
      if (error) throw error;
      
      toast({
        title: "Default Updated",
        description: "Default payment method has been updated",
      });
      
      await loadPaymentMethods();
    } catch (error) {
      console.error('Error setting default payment method:', error);
      toast({
        title: "Update Error",
        description: "Failed to update default payment method",
        variant: "destructive"
      });
    }
  };

  const getCardIcon = (brand: string) => {
    const brandLower = brand?.toLowerCase();
    if (brandLower === 'visa') return '💳';
    if (brandLower === 'mastercard') return '💳';
    if (brandLower === 'amex') return '💳';
    return '💳';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64 mt-2" />
            </div>
            <Skeleton className="h-10 w-28" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48 mt-1" />
                  </div>
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">Error Loading Payment Methods</p>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadPaymentMethods} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Methods
            </CardTitle>
            <CardDescription>
              Manage your saved payment methods for quick checkout
            </CardDescription>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Method
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Payment Method</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <p className="text-sm font-medium text-blue-700">Secure Setup</p>
                  </div>
                  <p className="text-sm text-blue-600">
                    Your payment information is securely processed by Stripe and never stored on our servers.
                  </p>
                </div>
                <Button 
                  onClick={addPaymentMethod}
                  disabled={addingMethod}
                  className="w-full"
                >
                  {addingMethod ? "Setting up..." : "Setup New Payment Method"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {paymentMethods.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">No Payment Methods</p>
            <p className="text-muted-foreground mb-4">
              Add a payment method to streamline your billing
            </p>
            <Button onClick={addPaymentMethod} disabled={addingMethod}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Payment Method
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">
                    {getCardIcon(method.card_brand || 'card')}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium capitalize">
                        {method.card_brand} •••• {method.last_four}
                      </p>
                      {method.is_default && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Expires {method.exp_month}/{method.exp_year}
                      </div>
                      <span>Added {new Date(method.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {!method.is_default && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setDefaultPaymentMethod(method.id)}
                    >
                      Set Default
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => removePaymentMethod(method.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};