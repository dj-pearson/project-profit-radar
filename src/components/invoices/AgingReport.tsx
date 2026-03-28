import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Download, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays, format } from 'date-fns';

interface AgingReportProps {
  invoices: any[];
}

interface AgingBucket {
  label: string;
  range: string;
  min: number;
  max: number;
  color: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  bgClass: string;
  textClass: string;
}

const BUCKETS: AgingBucket[] = [
  { label: 'Current', range: '0-30 days', min: 0, max: 30, color: '#22c55e', badgeVariant: 'default', bgClass: 'bg-green-50 dark:bg-green-950', textClass: 'text-green-700 dark:text-green-400' },
  { label: '31-60 Days', range: '31-60 days', min: 31, max: 60, color: '#eab308', badgeVariant: 'secondary', bgClass: 'bg-yellow-50 dark:bg-yellow-950', textClass: 'text-yellow-700 dark:text-yellow-400' },
  { label: '61-90 Days', range: '61-90 days', min: 61, max: 90, color: '#f97316', badgeVariant: 'outline', bgClass: 'bg-orange-50 dark:bg-orange-950', textClass: 'text-orange-700 dark:text-orange-400' },
  { label: '90+ Days', range: '90+ days', min: 91, max: Infinity, color: '#ef4444', badgeVariant: 'destructive', bgClass: 'bg-red-50 dark:bg-red-950', textClass: 'text-red-700 dark:text-red-400' },
];

const AgingReport: React.FC<AgingReportProps> = ({ invoices }) => {
  const { toast } = useToast();

  const unpaidInvoices = useMemo(() => {
    return invoices.filter(inv => inv.status !== 'paid' && inv.due_date);
  }, [invoices]);

  const bucketData = useMemo(() => {
    const today = new Date();

    const results = BUCKETS.map(bucket => ({
      ...bucket,
      total: 0,
      count: 0,
      invoices: [] as any[],
    }));

    unpaidInvoices.forEach(inv => {
      const dueDate = new Date(inv.due_date);
      const daysOutstanding = Math.max(0, differenceInDays(today, dueDate));
      const amount = Number(inv.total_amount) || 0;

      for (const result of results) {
        if (daysOutstanding >= result.min && daysOutstanding <= result.max) {
          result.total += amount;
          result.count += 1;
          result.invoices.push({ ...inv, daysOutstanding });
          break;
        }
      }
    });

    return results;
  }, [unpaidInvoices]);

  const chartData = bucketData.map(b => ({
    name: b.label,
    amount: Math.round(b.total * 100) / 100,
    fill: b.color,
  }));

  const allDetailInvoices = bucketData.flatMap(b => b.invoices);

  const handleExportCSV = () => {
    toast({ title: 'Export Started', description: 'CSV export has been initiated.' });
  };

  const handleExportPDF = () => {
    toast({ title: 'Export Started', description: 'PDF export has been initiated.' });
  };

  return (
    <div className="space-y-6">
      {/* Export Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportPDF}>
          <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
          Export PDF
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {bucketData.map(bucket => (
          <Card key={bucket.label} className={bucket.bgClass}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${bucket.textClass}`}>{bucket.label}</span>
                <Badge variant={bucket.badgeVariant}>{bucket.count} invoices</Badge>
              </div>
              <p className={`text-2xl font-bold ${bucket.textClass}`}>
                ${bucket.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{bucket.range}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-construction-orange" aria-hidden="true" />
            Aging Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unpaidInvoices.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No unpaid invoices to display.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(val) => `$${val.toLocaleString()}`} />
                <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']} />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <rect key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          {allDetailInvoices.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No unpaid invoices.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Client</th>
                    <th className="pb-2 font-medium">Invoice #</th>
                    <th className="pb-2 font-medium">Amount</th>
                    <th className="pb-2 font-medium">Due Date</th>
                    <th className="pb-2 font-medium">Days Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {allDetailInvoices
                    .sort((a, b) => b.daysOutstanding - a.daysOutstanding)
                    .map(inv => (
                      <tr key={inv.id} className="border-b last:border-0">
                        <td className="py-3">{inv.client_name}</td>
                        <td className="py-3 font-mono">{inv.invoice_number}</td>
                        <td className="py-3">
                          ${Number(inv.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3">{format(new Date(inv.due_date), 'MMM d, yyyy')}</td>
                        <td className="py-3">
                          <Badge
                            variant={
                              inv.daysOutstanding > 90
                                ? 'destructive'
                                : inv.daysOutstanding > 60
                                ? 'outline'
                                : inv.daysOutstanding > 30
                                ? 'secondary'
                                : 'default'
                            }
                          >
                            {inv.daysOutstanding} days
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgingReport;
