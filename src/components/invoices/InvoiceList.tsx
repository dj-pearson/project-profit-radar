import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Edit, 
  Send, 
  DollarSign, 
  Download, 
  MoreHorizontal,
  Calendar,
  User,
  Building
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
      draft: { variant: 'secondary' as const, label: 'Draft' },
      sent: { variant: 'outline' as const, label: 'Sent' },
      viewed: { variant: 'default' as const, label: 'Viewed' },
      partial: { variant: 'default' as const, label: 'Partial' },
      paid: { variant: 'default' as const, label: 'Paid', className: 'bg-green-100 text-green-800' },
      overdue: { variant: 'destructive' as const, label: 'Overdue' },
      cancelled: { variant: 'secondary' as const, label: 'Cancelled' }
    };
    
    const config = variants[status as keyof typeof variants] || variants.draft;
    
    return (
      <Badge 
        variant={config.variant} 
        className={config.className}
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

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-muted-foreground">No invoices found</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {invoices.map((invoice) => (
          <Card 
            key={invoice.id} 
            className={`transition-all hover:shadow-md ${
              highlightOverdue && invoice.status === 'overdue' ? 'border-red-200 bg-red-50' : ''
            }`}
          >
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Invoice Info */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">{invoice.invoice_number}</h3>
                    {getStatusBadge(invoice.status)}
                    {getInvoiceTypeBadge(invoice.invoice_type)}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {invoice.client_name}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Due: {formatDate(invoice.due_date)}
                    </div>
                    {invoice.projects?.name && (
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        {invoice.projects.name}
                      </div>
                    )}
                  </div>
                </div>

                {/* Amount Info */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      {formatCurrency(parseFloat(invoice.total_amount || 0))}
                    </div>
                    {invoice.amount_due > 0 && (
                      <div className="text-sm text-muted-foreground">
                        Due: {formatCurrency(parseFloat(invoice.amount_due || 0))}
                      </div>
                    )}
                    {invoice.amount_paid > 0 && (
                      <div className="text-sm text-green-600">
                        Paid: {formatCurrency(parseFloat(invoice.amount_paid || 0))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {invoice.status !== 'paid' && parseFloat(invoice.amount_due || 0) > 0 && (
                      <Button 
                        size="sm" 
                        onClick={() => handleProcessPayment(invoice)}
                        className="bg-construction-orange hover:bg-construction-orange/90"
                      >
                        <DollarSign className="mr-2 h-4 w-4" />
                        Pay
                      </Button>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Invoice
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Download PDF
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {invoice.status === 'draft' && (
                          <DropdownMenuItem>
                            <Send className="mr-2 h-4 w-4" />
                            Send to Client
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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
};

export default InvoiceList;