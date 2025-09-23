import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, FileText, Clock, TrendingUp, AlertTriangle } from 'lucide-react';

interface InvoiceStatsProps {
  invoices: any[];
}

const InvoiceStats: React.FC<InvoiceStatsProps> = ({ invoices }) => {
  const stats = React.useMemo(() => {
    const totalInvoices = invoices.length;
    const totalValue = invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
    const totalOutstanding = invoices
      .filter(inv => ['sent', 'partial', 'overdue'].includes(inv.status))
      .reduce((sum, inv) => sum + parseFloat(inv.amount_due || 0), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + parseFloat(inv.amount_paid || 0), 0);
    const overdueCount = invoices.filter(inv => inv.status === 'overdue').length;
    const overdueAmount = invoices
      .filter(inv => inv.status === 'overdue')
      .reduce((sum, inv) => sum + parseFloat(inv.amount_due || 0), 0);
    
    const paidCount = invoices.filter(inv => inv.status === 'paid').length;
    const paymentRate = totalInvoices > 0 ? (paidCount / totalInvoices * 100) : 0;

    return {
      totalInvoices,
      totalValue,
      totalOutstanding,
      totalPaid,
      overdueCount,
      overdueAmount,
      paymentRate
    };
  }, [invoices]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border-l-4 border-l-construction-orange">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
          <FileText className="h-4 w-4 text-construction-orange" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalInvoices}</div>
          <p className="text-xs text-muted-foreground">
            Total value: {formatCurrency(stats.totalValue)}
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
          <DollarSign className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(stats.totalPaid)}
          </div>
          <p className="text-xs text-muted-foreground">
            Payment rate: {stats.paymentRate.toFixed(1)}%
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-yellow-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
          <Clock className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">
            {formatCurrency(stats.totalOutstanding)}
          </div>
          <p className="text-xs text-muted-foreground">
            Awaiting payment
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(stats.overdueAmount)}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.overdueCount} invoice{stats.overdueCount !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceStats;