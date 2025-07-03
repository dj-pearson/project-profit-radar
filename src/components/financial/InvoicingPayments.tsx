import React from 'react';
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

const InvoicingPayments = () => {
  // Mock data - replace with real data from Supabase
  const invoiceData = {
    sent: 12,
    paid: 8,
    overdue: 3,
    pending: 1,
    totalOutstanding: 34750,
    conversionRate: 78
  };

  const recentInvoices = [
    {
      id: '1',
      number: 'INV-2024-001',
      client: 'Smith Residence',
      amount: 8500,
      status: 'paid',
      dueDate: '2024-01-15',
      paidDate: '2024-01-12'
    },
    {
      id: '2',
      number: 'INV-2024-002',
      client: 'Tech Corp Office',
      amount: 15000,
      status: 'overdue',
      dueDate: '2024-01-10',
      paidDate: null
    },
    {
      id: '3',
      number: 'INV-2024-003',
      client: 'Warehouse Project',
      amount: 11250,
      status: 'sent',
      dueDate: '2024-01-25',
      paidDate: null
    }
  ];

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
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-xl font-bold text-green-600">{invoiceData.paid}</div>
            <div className="text-xs text-muted-foreground">Paid</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-xl font-bold text-red-600">{invoiceData.overdue}</div>
            <div className="text-xs text-muted-foreground">Overdue</div>
          </div>
        </div>

        {/* Outstanding Amount */}
        <div className="p-3 border rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Outstanding</span>
            <span className="font-bold text-lg">${invoiceData.totalOutstanding.toLocaleString()}</span>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="p-3 border rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Conversion Rate</span>
            <span className="font-bold text-lg text-green-600">{invoiceData.conversionRate}%</span>
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Recent Invoices</h4>
          {recentInvoices.map(invoice => (
            <div key={invoice.id} className="flex items-center justify-between p-2 border rounded text-sm">
              <div>
                <div className="font-medium">{invoice.number}</div>
                <div className="text-xs text-muted-foreground">{invoice.client}</div>
              </div>
              <div className="text-right">
                <div className="font-medium">${invoice.amount.toLocaleString()}</div>
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