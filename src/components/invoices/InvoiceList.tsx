import React, { useState, useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Eye, Edit, Send, DollarSign, Download, MoreHorizontal,
  ChevronUp, ChevronDown, ChevronsUpDown, Trash2, CheckCircle2, X,
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
import { toast } from '@/hooks/use-toast';
import { filterAndSortInvoices } from './invoiceListUtils';

interface InvoiceListProps {
  invoices: any[];
  loading: boolean;
  onInvoiceUpdate: () => void;
  highlightOverdue?: boolean;
}

const InvoiceList: React.FC<InvoiceListProps> = ({ 
  invoices, 
  loading, 
  onInvoiceUpdate,
  highlightOverdue = false 
}) => {
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  // Sorting, filtering, and bulk-selection state (US-088).
  const [sortField, setSortField] = useState<string>('due_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateField, setDateField] = useState<'invoice_date' | 'due_date'>('invoice_date');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Filter (status + date range) then sort. Applies to BOTH render paths.
  const displayInvoices = useMemo(
    () => filterAndSortInvoices(invoices, { statusFilter, dateField, dateFrom, dateTo, sortField, sortDir }),
    [invoices, statusFilter, dateField, dateFrom, dateTo, sortField, sortDir]
  );

  const allVisibleSelected =
    displayInvoices.length > 0 && displayInvoices.every((inv) => selectedIds.has(inv.id));
  const toggleSelectAll = () => {
    setSelectedIds(allVisibleSelected ? new Set() : new Set(displayInvoices.map((i) => i.id)));
  };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const runBulkStatus = async (status: 'sent' | 'paid') => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkLoading(true);
    try {
      const { error } = await supabase.from('invoices').update({ status }).in('id', ids);
      if (error) throw error;
      toast({ title: 'Invoices updated', description: `${ids.length} marked as ${status}.` });
      clearSelection();
      onInvoiceUpdate();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Bulk update failed', description: err.message });
    } finally {
      setBulkLoading(false);
    }
  };

  const bulkExport = () => {
    const rows = displayInvoices.filter((i) => selectedIds.has(i.id));
    if (rows.length === 0) return;
    const headers = ['Invoice #', 'Client', 'Status', 'Invoice Date', 'Due Date', 'Amount', 'Amount Paid'];
    const csv = [
      headers.join(','),
      ...rows.map((r) =>
        [
          r.invoice_number,
          r.client_name,
          r.status,
          (r.invoice_date || r.created_at || '').toString().slice(0, 10),
          (r.due_date || '').toString().slice(0, 10),
          r.total_amount,
          r.amount_paid || 0,
        ]
          .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const bulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} invoice(s)? This cannot be undone.`)) return;
    setBulkLoading(true);
    try {
      const { error } = await supabase.from('invoices').delete().in('id', ids);
      if (error) throw error;
      toast({ title: 'Invoices deleted', description: `${ids.length} invoice(s) removed.` });
      clearSelection();
      onInvoiceUpdate();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Bulk delete failed', description: err.message });
    } finally {
      setBulkLoading(false);
    }
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
      key: 'invoice_date',
      header: 'Date',
      sortable: true,
      hideOnMobile: true,
      render: (value, row) => formatDate(value || row.created_at),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
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

  const filterBar = (
    <div className="flex flex-wrap items-end gap-3 mb-4">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Status</label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Date field</label>
        <Select value={dateField} onValueChange={(v) => setDateField(v as 'invoice_date' | 'due_date')}>
          <SelectTrigger className="w-[140px]" aria-label="Date field to filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="invoice_date">Invoice date</SelectItem>
            <SelectItem value="due_date">Due date</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">From</label>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" aria-label="From date" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">To</label>
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" aria-label="To date" />
      </div>
      {(statusFilter !== 'all' || dateFrom || dateTo) && (
        <Button variant="ghost" size="sm" onClick={() => { setStatusFilter('all'); setDateFrom(''); setDateTo(''); }}>
          <X className="h-4 w-4 mr-1" /> Clear filters
        </Button>
      )}
      <div className="ml-auto text-sm text-muted-foreground self-center">
        {displayInvoices.length} invoice{displayInvoices.length === 1 ? '' : 's'}
      </div>
    </div>
  );

  const bulkToolbar = selectedIds.size > 0 && (
    <div
      role="region"
      aria-label="Bulk actions"
      className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-lg border bg-muted/40"
    >
      <span className="text-sm font-medium">{selectedIds.size} selected</span>
      <Button size="sm" variant="outline" disabled={bulkLoading} onClick={() => runBulkStatus('sent')}>
        <Send className="h-4 w-4 mr-1" /> Mark as Sent
      </Button>
      <Button size="sm" variant="outline" disabled={bulkLoading} onClick={() => runBulkStatus('paid')}>
        <CheckCircle2 className="h-4 w-4 mr-1" /> Mark as Paid
      </Button>
      <Button size="sm" variant="outline" disabled={bulkLoading} onClick={bulkExport}>
        <Download className="h-4 w-4 mr-1" /> Export Selected
      </Button>
      <Button size="sm" variant="destructive" disabled={bulkLoading} onClick={bulkDelete}>
        <Trash2 className="h-4 w-4 mr-1" /> Delete Selected
      </Button>
      <Button size="sm" variant="ghost" className="ml-auto" onClick={clearSelection}>
        Clear
      </Button>
    </div>
  );

  const VIRTUALIZE_THRESHOLD = 50;
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: displayInvoices.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 10,
    enabled: displayInvoices.length > VIRTUALIZE_THRESHOLD,
  });

  const renderSortableHeader = (col: TableColumn<any>) => {
    if (!col.sortable) {
      return typeof col.headerRender === 'function' ? col.headerRender() : col.header;
    }
    const active = sortField === col.key;
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => handleSort(String(col.key))}
        aria-label={`Sort by ${col.header}`}
      >
        {col.header}
        {active ? (
          sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    );
  };

  // For large lists, use virtualized rendering
  if (displayInvoices.length > VIRTUALIZE_THRESHOLD) {
    return (
      <>
        {filterBar}
        {bulkToolbar}
        <div ref={parentRef} style={{ maxHeight: '70vh', overflow: 'auto' }}>
          <table className="w-full caption-bottom text-sm">
            <thead className="sticky top-0 bg-background z-10 [&_tr]:border-b">
              <tr>
                <th className="h-12 w-12 px-4 text-left align-middle">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all invoices"
                  />
                </th>
                {invoiceColumns.map((col) => (
                  <th key={String(col.key)} className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    {renderSortableHeader(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ height: `${virtualizer.getTotalSize()}px` }}>
                <td colSpan={invoiceColumns.length + 1} style={{ padding: 0, position: 'relative' }}>
                  {virtualizer.getVirtualItems().map((virtualRow) => {
                    const invoice = displayInvoices[virtualRow.index];
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
                        <div className="px-4 w-12 shrink-0">
                          <Checkbox
                            checked={selectedIds.has(invoice.id)}
                            onCheckedChange={() => toggleSelect(invoice.id)}
                            aria-label={`Select invoice ${invoice.invoice_number}`}
                          />
                        </div>
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
      {filterBar}
      {bulkToolbar}
      <AccessibleTable
        caption={highlightOverdue ? "Overdue Invoices" : "Invoices"}
        hideCaption
        columns={invoiceColumns}
        data={displayInvoices}
        loading={loading}
        emptyContent="No invoices found"
        onSort={(column, direction) => { setSortField(column); setSortDir(direction === 'descending' ? 'desc' : 'asc'); }}
        sortColumn={sortField}
        sortDirection={sortDir === 'asc' ? 'ascending' : 'descending'}
        selectable
        selectedRows={[...selectedIds]}
        onSelectionChange={(ids) => setSelectedIds(new Set(ids as string[]))}
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