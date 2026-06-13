import React, { useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Send, DollarSign, Download, MoreHorizontal } from 'lucide-react';
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
    count: invoices.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 10,
    enabled: invoices.length > VIRTUALIZE_THRESHOLD,
  });

  // For large lists, use virtualized rendering
  if (invoices.length > VIRTUALIZE_THRESHOLD) {
    return (
      <>
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
                    const invoice = invoices[virtualRow.index];
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
      <AccessibleTable
        caption={highlightOverdue ? "Overdue Invoices" : "Invoices"}
        hideCaption
        columns={invoiceColumns}
        data={invoices}
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