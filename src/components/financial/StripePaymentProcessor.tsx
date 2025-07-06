import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email: string;
  total_amount: number;
  amount_due: number;
  status: string;
  due_date: string;
  stripe_payment_intent_id?: string;
}

const StripePaymentProcessor = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .in('status', ['sent', 'overdue'])
        .order('due_date', { ascending: true });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load invoices"
      });
    } finally {
      setLoading(false);
    }
  };

  const createStripeCheckout = async (invoice: Invoice) => {
    try {
      setProcessingPayment(invoice.id);
      
      const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
        body: {
          invoice_id: invoice.id,
          amount: Math.round(invoice.amount_due * 100), // Convert to cents
          currency: 'usd',
          customer_email: invoice.client_email,
          description: `Payment for Invoice ${invoice.invoice_number}`,
          success_url: `${window.location.origin}/payment-success?invoice_id=${invoice.id}`,
          cancel_url: `${window.location.origin}/invoices`
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe checkout in new tab
        window.open(data.url, '_blank');
        
        toast({
          title: "Payment Link Created",
          description: "Payment page opened in new tab. Share this link with your client."
        });
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        variant: "destructive",
        title: "Payment Error", 
        description: error.message || "Failed to create payment link"
      });
    } finally {
      setProcessingPayment(null);
    }
  };

  const sendPaymentLink = async (invoice: Invoice) => {
    try {
      setProcessingPayment(invoice.id);
      
      // First create the checkout session
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-stripe-checkout', {
        body: {
          invoice_id: invoice.id,
          amount: Math.round(invoice.amount_due * 100),
          currency: 'usd',
          customer_email: invoice.client_email,
          description: `Payment for Invoice ${invoice.invoice_number}`,
          success_url: `${window.location.origin}/payment-success?invoice_id=${invoice.id}`,
          cancel_url: `${window.location.origin}/invoices`
        }
      });

      if (checkoutError) throw checkoutError;

      // Then send email with payment link
      const { error: emailError } = await supabase.functions.invoke('send-notification', {
        body: {
          type: 'payment_request',
          to: invoice.client_email,
          subject: `Payment Request - Invoice ${invoice.invoice_number}`,
          template_data: {
            invoice_number: invoice.invoice_number,
            client_name: invoice.client_name,
            amount: invoice.amount_due,
            due_date: invoice.due_date,
            payment_url: checkoutData?.url
          }
        }
      });

      if (emailError) throw emailError;

      toast({
        title: "Payment Link Sent",
        description: `Payment request sent to ${invoice.client_email}`
      });

      // Update invoice status to indicate payment link was sent
      await supabase
        .from('invoices')
        .update({ 
          status: 'payment_requested',
          sent_at: new Date().toISOString()
        })
        .eq('id', invoice.id);

      loadInvoices();
    } catch (error) {
      console.error('Error sending payment link:', error);
      toast({
        variant: "destructive",
        title: "Send Failed",
        description: error.message || "Failed to send payment link"
      });
    } finally {
      setProcessingPayment(null);
    }
  };

  const openCustomerPortal = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        variant: "destructive",
        title: "Portal Error",
        description: "Failed to open customer portal"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    const isOverdue = new Date(dueDate) < new Date();
    
    if (status === 'paid') {
      return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
    } else if (isOverdue) {
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Overdue</Badge>;
    } else if (status === 'payment_requested') {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Payment Requested</Badge>;
    } else {
      return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.amount_due, 0);
  const overdueInvoices = invoices.filter(inv => new Date(inv.due_date) < new Date());
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.amount_due, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-construction-orange" />
                Payment Processing
              </CardTitle>
              <CardDescription>
                Manage invoice payments and Stripe integration
              </CardDescription>
            </div>
            <Button variant="outline" onClick={openCustomerPortal}>
              <Settings className="h-4 w-4 mr-2" />
              Stripe Portal
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold">${totalOutstanding.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">${overdueAmount.toLocaleString()}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Invoices</p>
                <p className="text-2xl font-bold">{invoices.length}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Processing</CardTitle>
          <CardDescription>
            Send payment links and process invoice payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading invoices...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">All Caught Up!</h3>
              <p className="text-muted-foreground">
                No outstanding invoices require payment processing
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {invoices.map(invoice => (
                <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">{invoice.invoice_number}</h3>
                      {getStatusBadge(invoice.status, invoice.due_date)}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Client: {invoice.client_name}</p>
                      <p>Amount Due: ${invoice.amount_due.toLocaleString()}</p>
                      <p>Due Date: {new Date(invoice.due_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => createStripeCheckout(invoice)}
                      disabled={processingPayment === invoice.id}
                    >
                      {processingPayment === invoice.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                      ) : (
                        <ExternalLink className="h-4 w-4 mr-2" />
                      )}
                      Payment Link
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => sendPaymentLink(invoice)}
                      disabled={processingPayment === invoice.id}
                      className="bg-construction-orange hover:bg-construction-orange/90"
                    >
                      {processingPayment === invoice.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-2" />
                      )}
                      Send to Client
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StripePaymentProcessor;