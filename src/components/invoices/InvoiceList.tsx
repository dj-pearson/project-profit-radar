import React, { useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Eye,
  Edit,
  Send,
  DollarSign,
  Download,
  MoreHorizontal,
  Calendar,
  User,
  Building,
  Trash2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import PaymentProcessor from '@/components/PaymentProcessor';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AccessibleTable, type TableColumn } from '@/components/accessibility/AccessibleTable';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InvoiceListProps {
  invoices: any[];
  loading: boolean;
  onInvoiceUpdate: () => void;
  highlightOverdue?: boolean;
}

const INVOICE_STATUSES = ['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled'] as const;

const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  loading,
  onInvoiceUpdate,
  highlightOverdue = false
}) => {
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const { toast } = useToast();

  // Filter invoices
  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    if (dateFrom && inv.due_date < dateFrom) return false;
    if (dateTo && inv.due_date > dateTo) return false;
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvoices.map((inv) => inv.id)));
    }
  };

  const handleBulkStatusUpdate = async (status: string) => {
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from('invoices')
      .update({ status })
      .in('id', ids);

    if (error) {
      toast({ title: 'Error', description: `Failed to update invoices: ${error.message}`, variant: 'destructive' });
      return;
    }

    toast({ title: 'Success', description: `${ids.length} invoice(s) marked as ${status}` });
    setSelectedIds(new Set());
    onInvoiceUpdate();
  };

  const handleBulkExport = () => {
    const selected = filteredInvoices.filter((inv) => selectedIds.has(inv.id));
    const csvRows = [
      ['Invoice #', 'Client', 'Status', 'Due Date', 'Amount'].join(','),
      ...selected.map((inv) =>
        [inv.invoice_number, inv.client_name, inv.status, inv.due_date, inv.total_amount].join(',')
      ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${selected.length} invoice(s) exported to CSV` });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from('invoices')
      .delete()
      .in('id', ids);

    if (error) {
      toast({ title: 'Error', description: `Failed to delete invoices: ${error.message}`, variant: 'destructive' });
      return;
    }

    toast({ title: 'Deleted', description: `${ids.length} invoice(s) deleted` });
    setSelectedIds(new Set());
    onInvoiceUpdate();
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: { variant: 'secondary' as const, label: 'Draft', className: '' },
      sent: { variant: 'outline' as const, label: 'Sent', className: '' },
      viewed: { variant: 'default' as const, label: 'Viewed', className: '' },
      partial: { variant: 'default' as const, label: 'Partial', className: '' },
      paid: { variant: 'default' as const, label: 'Paid', className: 'bg-green-100 text-green-800' },
      overdue: { variant: 'destructive' as const, label: 'Overdue', className: '' },
      cancelled: { variant: 'secondary' as const, label: 'Cancelled', className: '' }
    };
    
    const config = variants[status as keyof typeof variants] || variants.draft;
    
    return (
      <Badge 
        variant={config.variant} 
        className={config.className || undefined}
      >
        {config.label}
      </Badge>
    );
  };

  const getInvoiceTypeBadge = (type: string) => {
    const variants = {
      standard: { label: 'Standard', className: 'bg-blue-100 text-blue-800' },
      progress: { label: 'Progress', className: 'bg-purple-100 text-purple-800' },
      retention: { label: 'Retention', className: 'bg-orange-100 text-orange-800' },
      final: { label: 'Final', className: 'bg-green-100 text-green-800' }
    };
    
    const config = variants[type as keyof typeof variants] || variants.standard;
    
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const handleProcessPayment = (invoice: any) => {
    setSelectedInvoice(invoice);
    setShowPaymentDialog(true);
  };

  const handlePaymentProcessed = () => {
    setShowPaymentDialog(false);
    setSelectedInvoice(null);
    onInvoiceUpdate();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading invoices...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const invoiceColumns: TableColumn<any>[] = [
    {
      key: 'select',
      header: 'Select',
      headerRender: () => (
        <Checkbox
          checked={filteredInvoices.length > 0 && selectedIds.size === filteredInvoices.length}
          onCheckedChange={toggleSelectAll}
          aria-label="Select all invoices"
        />
      ),
      render: (_value, row) => (
        <Checkbox
          checked={selectedIds.has(row.id)}
          onCheckedChange={() => toggleSelect(row.id)}
          aria-label={`Select invoice ${row.invoice_number}`}
        />
      ),
    },
    {
      key: 'invoice_number',
      header: 'Invoice #',
      sortable: true,
      render: (value) => <span className="font-semibold">{value}</span>,
    },
    {
      key: 'client_name',
      header: 'Client',
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          {getStatusBadge(value)}
          {row.invoice_type && getInvoiceTypeBadge(row.invoice_type)}
        </div>
      ),
    },
    {
      key: 'due_date',
      header: 'Due Date',
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'projects',
      header: 'Project',
      hideOnMobile: true,
      render: (value) => value?.name || <span className="text-muted-foreground">-</span>,
    },
    {
      key: 'total_amount',
      header: 'Amount',
      sortable: true,
      align: 'right',
      render: (value, row) => (
        <div className="text-right">
          <div className="font-semibold">{formatCurrency(parseFloat(value || 0))}</div>
          {row.amount_paid > 0 && (
            <div className="text-xs text-green-600">
              Paid: {formatCurrency(parseFloat(row.amount_paid || 0))}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerRender: () => <span className="sr-only">Actions</span>,
      render: (_value, invoice) => (
        <div className="flex items-center gap-2">
          {invoice.status !== 'paid' && parseFloat(invoice.amount_due || 0) > 0 && (
            <Button
              size="sm"
              onClick={() => handleProcessPayment(invoice)}
              className="bg-construction-orange hover:bg-construction-orange/90"
              aria-label={`Process payment for invoice ${invoice.invoice_number}`}
            >
              <DollarSign className="mr-2 h-4 w-4" aria-hidden="true" />
              Pay
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" aria-label={`Actions for invoice ${invoice.invoice_number}`}>
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" aria-hidden="true" />
                Edit Invoice
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {invoice.status === 'draft' && (
                <DropdownMenuItem>
                  <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                  Send to Client
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const VIRTUALIZE_THRESHOLD = 50;
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: filteredInvoices.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 10,
    enabled: filteredInvoices.length > VIRTUALIZE_THRESHOLD,
  });

  const filtersBar = (
    <div className="flex items-center gap-3 flex-wrap mb-4">
      <div className="flex items-center gap-2">
        <Label htmlFor="status-filter" className="text-sm whitespace-nowrap">Status</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger id="status-filter" className="w-[150px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {INVOICE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="date-from" className="text-sm whitespace-nowrap">From</Label>
        <Input id="date-from" type="date" className="w-[160px]" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="date-to" className="text-sm whitespace-nowrap">To</Label>
        <Input id="date-to" type="date" className="w-[160px]" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>
    </div>
  );

  const bulkActionsBar = selectedIds.size > 0 && (
    <Card className="border-primary/20 bg-primary/5 mb-4">
      <CardContent className="py-3 flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm font-medium">{selectedIds.size} selected</span>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => handleBulkStatusUpdate('sent')}>
            <Send className="mr-1 h-4 w-4" />
            Mark as Sent
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleBulkStatusUpdate('paid')}>
            <CheckCircle className="mr-1 h-4 w-4" />
            Mark as Paid
          </Button>
          <Button variant="outline" size="sm" onClick={handleBulkExport}>
            <Download className="mr-1 h-4 w-4" />
            Export Selected
          </Button>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
            <Trash2 className="mr-1 h-4 w-4" />
            Delete Selected
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Clear</Button>
        </div>
      </CardContent>
    </Card>
  );

  // For large lists, use virtualized rendering
  if (filteredInvoices.length > VIRTUALIZE_THRESHOLD) {
    return (
      <>
        {filtersBar}
        {bulkActionsBar}
        <div ref={parentRef} style={{ maxHeight: '70vh', overflow: 'auto' }}>
          <table className="w-full caption-bottom text-sm">
            <thead className="sticky top-0 bg-background z-10 [&_tr]:border-b">
              <tr>
                {invoiceColumns.map((col) => (
                  <th key={String(col.key)} className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    {typeof col.headerRender === 'function' ? col.headerRender() : col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ height: `${virtualizer.getTotalSize()}px` }}>
                <td colSpan={invoiceColumns.length} style={{ padding: 0, position: 'relative' }}>
                  {virtualizer.getVirtualItems().map((virtualRow) => {
                    const invoice = filteredInvoices[virtualRow.index];
                    return (
                      <div
                        key={virtualRow.key}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                          display: 'flex',
                          alignItems: 'center',
                          borderBottom: '1px solid hsl(var(--border))',
                        }}
                      >
                        {invoiceColumns.map((col) => {
                          const value = invoice[col.key as keyof typeof invoice];
                          return (
                            <div key={String(col.key)} className="px-4 flex-1" style={{ textAlign: col.align || 'left' }}>
                              {col.render ? col.render(value, invoice) : String(value ?? '')}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Process Payment</DialogTitle>
            </DialogHeader>
            {selectedInvoice && (
              <PaymentProcessor
                invoice={selectedInvoice}
                onPaymentProcessed={handlePaymentProcessed}
              />
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      {filtersBar}
      {bulkActionsBar}
      <AccessibleTable
        caption={highlightOverdue ? "Overdue Invoices" : "Invoices"}
        hideCaption
        columns={invoiceColumns}
        data={filteredInvoices}
        loading={loading}
        emptyContent="No invoices found"
        className={highlightOverdue ? '[&_tr]:border-red-100' : ''}
      />

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <PaymentProcessor 
              invoice={selectedInvoice} 
              onPaymentProcessed={handlePaymentProcessed}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InvoiceList;