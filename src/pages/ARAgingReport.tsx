import React, { useEffect, useMemo, useState } from 'react';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Download, FileText, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { exportRowsToCsv } from '@/lib/exportCsv';
import {
  buildAgingRows, summarizeBuckets, totalOutstanding,
  AGING_BUCKETS, type AgingInvoiceRow, type AgingBucketKey,
} from '@/lib/reports/agingReport';

const BUCKET_COLORS: Record<AgingBucketKey, string> = {
  current: '#22c55e',
  '31-60': '#eab308',
  '61-90': '#f97316',
  '90+': '#ef4444',
};

const ARAgingReport: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AgingInvoiceRow[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<AgingBucketKey | 'all'>('all');

  const loadInvoices = async () => {
    if (!userProfile?.company_id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, client_name, due_date, status, total_amount, amount_due, amount_paid')
        .eq('company_id', userProfile.company_id);
      if (error) throw error;
      setRows(buildAgingRows((data ?? []) as never[]));
    } catch (error) {
      logger.error('Error loading aging report', error instanceof Error ? error : undefined);
      toast({ title: 'Error', description: 'Failed to load aging report', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.company_id) loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.company_id]);

  const summary = useMemo(() => summarizeBuckets(rows), [rows]);
  const grandTotal = useMemo(() => totalOutstanding(rows), [rows]);

  const chartData = useMemo(
    () => summary.map((s) => ({ name: s.label, amount: Math.round(s.total), fill: BUCKET_COLORS[s.key] })),
    [summary]
  );

  const visibleRows = useMemo(
    () => (selectedBucket === 'all' ? rows : rows.filter((r) => r.bucket === selectedBucket)),
    [rows, selectedBucket]
  );

  const handleExportCsv = () => {
    exportRowsToCsv(`ar-aging-${new Date().toISOString().slice(0, 10)}.csv`, visibleRows, [
      { header: 'Invoice #', value: (r) => r.invoice_number },
      { header: 'Client', value: (r) => r.client_name ?? '' },
      { header: 'Due Date', value: (r) => r.due_date ?? '' },
      { header: 'Days Outstanding', value: (r) => r.daysOutstanding },
      { header: 'Bucket', value: (r) => r.bucket },
      { header: 'Outstanding', value: (r) => r.outstanding.toFixed(2) },
    ]);
    toast({ title: 'Exported', description: 'Aging report downloaded as CSV.' });
  };

  const handleExportPdf = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Accounts Receivable Aging Report', 14, 18);
      doc.setFontSize(10);
      doc.text(`Generated ${new Date().toLocaleDateString()}`, 14, 25);
      autoTable(doc, {
        startY: 32,
        head: [['Bucket', 'Invoices', 'Total Outstanding']],
        body: summary.map((s) => [s.label, String(s.count), formatCurrency(s.total)]),
        foot: [['Total', String(rows.length), formatCurrency(grandTotal)]],
      });
      const summaryEndY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 72;
      autoTable(doc, {
        startY: summaryEndY + 8,
        head: [['Invoice #', 'Client', 'Due Date', 'Days', 'Outstanding']],
        body: visibleRows.map((r) => [
          r.invoice_number,
          r.client_name ?? '',
          r.due_date ?? '',
          String(r.daysOutstanding),
          formatCurrency(r.outstanding),
        ]),
      });
      doc.save(`ar-aging-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast({ title: 'Exported', description: 'Aging report downloaded as PDF.' });
    } catch (error) {
      logger.error('Error exporting aging PDF', error instanceof Error ? error : undefined);
      toast({ title: 'Error', description: 'Failed to export PDF', variant: 'destructive' });
    }
  };

  return (
    <AccessiblePageWrapper pageTitle="Accounts Receivable Aging">
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">A/R Aging Report</h1>
            <p className="text-muted-foreground">Outstanding invoices grouped by days past due</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadInvoices} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExportCsv} disabled={loading || rows.length === 0}>
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              CSV
            </Button>
            <Button variant="outline" onClick={handleExportPdf} disabled={loading || rows.length === 0}>
              <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
              PDF
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {loading ? (
            [1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24" />)
          ) : (
            <>
              {summary.map((s) => (
                <Card
                  key={s.key}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedBucket(s.key)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedBucket(s.key); } }}
                  className={`cursor-pointer transition-colors ${selectedBucket === s.key ? 'ring-2 ring-construction-orange' : ''}`}
                  aria-pressed={selectedBucket === s.key}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: BUCKET_COLORS[s.key] }} aria-hidden="true" />
                      {s.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(s.total)}</div>
                    <p className="text-xs text-muted-foreground">{s.count} invoice{s.count === 1 ? '' : 's'}</p>
                  </CardContent>
                </Card>
              ))}
              <Card
                role="button"
                tabIndex={0}
                onClick={() => setSelectedBucket('all')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedBucket('all'); } }}
                className={`cursor-pointer transition-colors bg-muted/30 ${selectedBucket === 'all' ? 'ring-2 ring-construction-orange' : ''}`}
                aria-pressed={selectedBucket === 'all'}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Outstanding</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(grandTotal)}</div>
                  <p className="text-xs text-muted-foreground">{rows.length} invoice{rows.length === 1 ? '' : 's'}</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Aging Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-72 w-full" />
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <AlertTriangle className="h-10 w-10 mb-3 opacity-50" aria-hidden="true" />
                <p>No outstanding invoices. Everything is paid up.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="amount" name="Outstanding" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Drill-down table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {selectedBucket === 'all'
                ? 'All Outstanding Invoices'
                : `Invoices — ${AGING_BUCKETS.find((b) => b.key === selectedBucket)?.label}`}
            </CardTitle>
            {selectedBucket !== 'all' && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedBucket('all')}>
                Show all
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : visibleRows.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center">No invoices in this bucket.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Days Outstanding</TableHead>
                    <TableHead>Bucket</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.invoice_number}</TableCell>
                      <TableCell>{r.client_name ?? '—'}</TableCell>
                      <TableCell>{r.due_date ? new Date(r.due_date).toLocaleDateString() : '—'}</TableCell>
                      <TableCell className="text-right">{r.daysOutstanding}</TableCell>
                      <TableCell>
                        <Badge variant="outline" style={{ borderColor: BUCKET_COLORS[r.bucket], color: BUCKET_COLORS[r.bucket] }}>
                          {AGING_BUCKETS.find((b) => b.key === r.bucket)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(r.outstanding)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AccessiblePageWrapper>
  );
};

export default ARAgingReport;
