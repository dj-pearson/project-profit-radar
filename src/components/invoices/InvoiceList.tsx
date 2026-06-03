import React, { useState, useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Eye,
  Edit,
  Send,
  DollarSign,
  Download,
  MoreHorizontal,
  CheckCircle2,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import PaymentProcessor from '@/components/PaymentProcessor';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AccessibleTable, type TableColumn, type SortDirection } from '@/components/accessibility/AccessibleTable';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface InvoiceListProps {
  invoices: any[];
  loading: boolean;
  onInvoiceUpdate: () => void;
  highlightOverdue?: boolean;
}

/** Columns the user can sort by, mapped to a comparable accessor. */
type SortKey = 'invoice_number' | 'client_name' | 'status' | 'due_date' | 'total_amount';

const SORT_ACCESSORS: Record<SortKey, (inv: any) => string | number> = {
  invoice_number: (inv) => String(inv.invoice_number ?? '').toLowerCase(),
  client_name: (inv) => String(inv.client_name ?? '').toLowerCase(),
  status: (inv) => String(inv.status ?? '').toLowerCase(),
  due_date: (inv) => (inv.due_date ? new Date(inv.due_date).getTime() : 0),
  total_amount: (inv) => parseFloat(inv.total_amount ?? inv.total ?? 0) || 0,
};

const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  loading,
  onInvoiceUpdate,
  highlightOverdue = false,
}) => {
  const { toast } = useToast();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  // Sort state — clicking a header cycles ascending → descending → none.
  const [sortColumn, setSortColumn] = useState<string | undefined>(undefined);
  const [sortDirection, setSortDirection] = useState<SortDirection>('none');

  // Selection state for bulk actions (keyed by invoice id).
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const handleSort = (column: string, direction: SortDirection) => {
    setSortColumn(direction === 'none' ? undefined : column);
    setSortDirection(direction);
  };

  // Apply the active sort. Both the standard and virtualized render paths read
  // from this so sorting behaves identically regardless of list size.
  const displayInvoices = useMemo(() => {
    if (!sortColumn || sortDirection === 'none') return invoices;
    const accessor = SORT_ACCESSORS[sortColumn as SortKey];
    if (!accessor) return invoices;
    const sorted = [...invoices].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av < bv) return -1;
      if (av > bv) return 1;
      return 0;
    });
    return sortDirection === 'descending' ? sorted.reverse() : sorted;
  }, [invoices, sortColumn, sortDirection]);

  const allSelected = displayInvoices.length > 0 && displayInvoices.every((inv) => selectedIds.has(inv.id));
  const someSelected = displayInvoices.some((inv) => selectedIds.has(inv.id)) && !allSelected;

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((prev) => {
      if (displayInvoices.every((inv) => prev.has(inv.id))) return new Set();
      return new Set(displayInvoices.map((inv) => inv.id));
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedInvoices = displayInvoices.filter((inv) => selectedIds.has(inv.id));

  // MARK: Bulk actions

  const bulkUpdateStatus = async (status: 'sent' | 'paid') => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const { error } = await supabase.from('invoices').update({ status }).in('id', ids);
      if (error) throw error;
      toast({
        title: 'Invoices updated',
        description: `${ids.length} invoice${ids.length > 1 ? 's' : ''} marked as ${status}.`,
      });
      clearSelection();
      onInvoiceUpdate();
    } catch (error) {
      logger.error('Bulk invoice status update failed', error instanceof Error ? error : undefined);
      toast({ title: 'Error', description: 'Failed to update invoices.', variant: 'destructive' });
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const { error } = await supabase.from('invoices').delete().in('id', ids);
      if (error) throw error;
      toast({
        title: 'Invoices deleted',
        description: `${ids.length} invoice${ids.length > 1 ? 's' : ''} deleted.`,
      });
      clearSelection();
      setShowDeleteDialog(false);
      onInvoiceUpdate();
    } catch (error) {
      logger.error('Bulk invoice delete failed', error instanceof Error ? error : undefined);
      toast({ title: 'Error', description: 'Failed to delete invoices.', variant: 'destructive' });
    } finally {
      setBulkBusy(false);
    }
  };

  const exportSelectedCsv = () => {
    if (selectedInvoices.length === 0) return;
    const headers = ['Invoice #', 'Client', 'Status', 'Due Date', 'Project', 'Total', 'Amount Paid'];
    const rows = selectedInvoices.map((inv) => [
      inv.invoice_number ?? '',
      inv.client_name ?? '',
      inv.status ?? '',
      inv.due_date ?? '',
      inv.projects?.name ?? '',
      inv.total_amount ?? inv.total ?? '',
      inv.amount_paid ?? '',
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${selectedInvoices.length} invoice(s) exported to CSV.` });
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

  const selectColumn: TableColumn<any> = {
    key: 'select',
    header: 'Select',
    width: '2.5rem',
    headerRender: () => (
      <Checkbox
        checked={allSelected ? true : someSelected ? 'indeterminate' : false}
        onCheckedChange={toggleAll}
        aria-label={allSelected ? 'Deselect all invoices' : 'Select all invoices'}
      />
    ),
    render: (_value, invoice) => (
      <Checkbox
        checked={selectedIds.has(invoice.id)}
        onCheckedChange={() => toggleOne(invoice.id)}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Select invoice ${invoice.invoice_number}`}
      />
    ),
  };

  const invoiceColumns: TableColumn<any>[] = [
    selectColumn,
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

  /** Bulk actions toolbar — shown only when at least one invoice is selected. */
  const bulkToolbar = selectedIds.size > 0 && (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
      <span className="text-sm font-medium">{selectedIds.size} selected</span>
      <div className="flex-1" />
      <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => bulkUpdateStatus('sent')}>
        <Send className="mr-2 h-4 w-4" aria-hidden="true" />
        Mark as Sent
      </Button>
      <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => bulkUpdateStatus('paid')}>
        <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
        Mark as Paid
      </Button>
      <Button size="sm" variant="outline" disabled={bulkBusy} onClick={exportSelectedCsv}>
        <Download className="mr-2 h-4 w-4" aria-hidden="true" />
        Export Selected
      </Button>
      <Button size="sm" variant="destructive" disabled={bulkBusy} onClick={() => setShowDeleteDialog(true)}>
        <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
        Delete Selected
      </Button>
      <Button size="sm" variant="ghost" onClick={clearSelection} aria-label="Clear selection">
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );

  const deleteDialog = (
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {selectedIds.size} invoice{selectedIds.size > 1 ? 's' : ''}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the selected invoices. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={bulkBusy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={bulkBusy}
            onClick={(e) => {
              e.preventDefault();
              bulkDelete();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const paymentDialog = (
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

  const renderSortIcon = (key: string) => {
    if (sortColumn !== key || sortDirection === 'none') {
      return <ChevronsUpDown className="h-4 w-4 opacity-50" aria-hidden="true" />;
    }
    return sortDirection === 'ascending'
      ? <ChevronUp className="h-4 w-4" aria-hidden="true" />
      : <ChevronDown className="h-4 w-4" aria-hidden="true" />;
  };

  const cycleSort = (key: string) => {
    let next: SortDirection = 'ascending';
    if (sortColumn === key) {
      next = sortDirection === 'ascending' ? 'descending' : sortDirection === 'descending' ? 'none' : 'ascending';
    }
    handleSort(key, next);
  };

  // For large lists, use virtualized rendering (sort + selection still apply).
  if (displayInvoices.length > VIRTUALIZE_THRESHOLD) {
    return (
      <div className="space-y-3">
        {bulkToolbar}
        <div ref={parentRef} style={{ maxHeight: '70vh', overflow: 'auto' }}>
          <table className="w-full caption-bottom text-sm">
            <thead className="sticky top-0 bg-background z-10 [&_tr]:border-b">
              <tr>
                {invoiceColumns.map((col) => (
                  <th
                    key={String(col.key)}
                    className={`h-12 px-4 align-middle font-medium text-muted-foreground ${col.align === 'right' ? 'text-right' : 'text-left'} ${col.sortable ? 'cursor-pointer select-none hover:text-foreground' : ''}`}
                    aria-sort={col.sortable && sortColumn === col.key ? sortDirection : undefined}
                    onClick={col.sortable ? () => cycleSort(String(col.key)) : undefined}
                  >
                    <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
                      {typeof col.headerRender === 'function' ? col.headerRender() : col.header}
                      {col.sortable && renderSortIcon(String(col.key))}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ height: `${virtualizer.getTotalSize()}px` }}>
                <td colSpan={invoiceColumns.length} style={{ padding: 0, position: 'relative' }}>
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
                        {invoiceColumns.map((col) => {
                          const value = invoice[col.key as keyof typeof invoice];
                          return (
                            <div key={String(col.key)} className="px-4 flex-1" style={{ textAlign: col.align || 'left' }}>
                              {col.render ? col.render(value, invoice, virtualRow.index) : String(value ?? '')}
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
        {deleteDialog}
        {paymentDialog}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bulkToolbar}
      <AccessibleTable
        caption={highlightOverdue ? "Overdue Invoices" : "Invoices"}
        hideCaption
        columns={invoiceColumns}
        data={displayInvoices}
        loading={loading}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
        emptyContent="No invoices found"
        className={highlightOverdue ? '[&_tr]:border-red-100' : ''}
      />
      {deleteDialog}
      {paymentDialog}
    </div>
  );
};

export default InvoiceList;
