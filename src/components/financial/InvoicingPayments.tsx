import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Send, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  total_amount: number;
  amount_due: number;
  status: string;
  due_date: string;
  paid_at?: string;
}

const InvoicingPayments = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load invoice data"
      });
    } finally {
      setLoading(false);
    }
  };

  const recentInvoices = invoices.slice(0, 3);
  const invoiceStats = {
    sent: invoices.filter(inv => inv.status === 'sent').length,
    paid: invoices.filter(inv => inv.status === 'paid').length,
    overdue: invoices.filter(inv => new Date(inv.due_date) < new Date() && inv.status !== 'paid').length,
    pending: invoices.filter(inv => inv.status === 'draft').length,
    totalOutstanding: invoices.filter(inv => inv.status !== 'paid').reduce((sum, inv) => sum + inv.amount_due, 0),
    conversionRate: Math.round((invoices.filter(inv => inv.status === 'paid').length / Math.max(invoices.length, 1)) * 100)
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'sent': return 'secondary';
      case 'overdue': return 'destructive';
      case 'pending': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-3 w-3" />;
      case 'sent': return <Send className="h-3 w-3" />;
      case 'overdue': return <AlertTriangle className="h-3 w-3" />;
      case 'pending': return <Clock className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Invoicing & Payments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-xl font-bold text-green-600">{invoiceStats.paid}</div>
                <div className="text-xs text-muted-foreground">Paid</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-xl font-bold text-red-600">{invoiceStats.overdue}</div>
                <div className="text-xs text-muted-foreground">Overdue</div>
              </div>
            </div>

            {/* Outstanding Amount */}
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Outstanding</span>
                <span className="font-bold text-lg">${invoiceStats.totalOutstanding.toLocaleString()}</span>
              </div>
            </div>

            {/* Conversion Rate */}
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Conversion Rate</span>
                <span className="font-bold text-lg text-green-600">{invoiceStats.conversionRate}%</span>
              </div>
            </div>
          </>
        )}

        {/* Recent Invoices */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Recent Invoices</h4>
          {recentInvoices.map(invoice => (
            <div key={invoice.id} className="flex items-center justify-between p-2 border rounded text-sm">
              <div>
                <div className="font-medium">{invoice.invoice_number}</div>
                <div className="text-xs text-muted-foreground">{invoice.client_name}</div>
              </div>
              <div className="text-right">
                <div className="font-medium">${invoice.total_amount.toLocaleString()}</div>
                <Badge variant={getStatusColor(invoice.status)} className="text-xs">
                  {getStatusIcon(invoice.status)}
                  <span className="ml-1">{invoice.status}</span>
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <Button className="w-full" size="sm">
            <Send className="h-4 w-4 mr-2" />
            Send Invoice
          </Button>
          <Button variant="outline" className="w-full" size="sm">
            Send Reminders
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoicingPayments;