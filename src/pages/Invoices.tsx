import React, { useState, useEffect } from 'react';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter, FileText, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usePersistedState } from '@/hooks/usePersistedState';
import { TableSkeleton } from '@/components/ui/loading-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/logger';
import InvoiceGenerator from '@/components/InvoiceGenerator';
import InvoiceList from '@/components/invoices/InvoiceList';
import InvoiceStats from '@/components/invoices/InvoiceStats';
import ProgressBillingManager from '@/components/invoices/ProgressBillingManager';
import RetentionManager from '@/components/invoices/RetentionManager';

const Invoices: React.FC = () => {
  const [activeTab, setActiveTab] = usePersistedState<string>('invoices-active-tab', 'overview');
  const [showInvoiceGenerator, setShowInvoiceGenerator] = useState(false);
  const [searchTerm, setSearchTerm] = usePersistedState<string>('invoices-search', '');
  const [statusFilter, setStatusFilter] = usePersistedState<string>('invoices-status-filter', 'all');
  const [invoiceDateFrom, setInvoiceDateFrom] = usePersistedState<string>('invoices-date-from', '');
  const [invoiceDateTo, setInvoiceDateTo] = usePersistedState<string>('invoices-date-to', '');
  const [dueDateFrom, setDueDateFrom] = usePersistedState<string>('invoices-due-from', '');
  const [dueDateTo, setDueDateTo] = usePersistedState<string>('invoices-due-to', '');
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (userProfile?.company_id) {
      loadInvoices();
    }
  }, [userProfile?.company_id]);

  const loadInvoices = async () => {
    if (!userProfile?.company_id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          projects(name),
          invoice_payments(payment_amount, payment_date)
        `)
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      logger.error('Error loading invoices', error instanceof Error ? error : undefined);
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceCreated = (newInvoice: any) => {
    setInvoices(prev => [newInvoice, ...prev]);
    setShowInvoiceGenerator(false);
    toast({
      title: "Invoice Created",
      description: `Invoice ${newInvoice.invoice_number} has been created successfully.`,
    });
  };

  // Inclusive range check; empty bounds are treated as open-ended.
  const inDateRange = (value: string | undefined, from: string, to: string) => {
    if (!from && !to) return true;
    if (!value) return false;
    const day = value.slice(0, 10); // normalize to yyyy-MM-dd for lexical compare
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const invoiceDate = invoice.issue_date || invoice.invoice_date || invoice.created_at;
    const matchesInvoiceDate = inDateRange(invoiceDate, invoiceDateFrom, invoiceDateTo);
    const matchesDueDate = inDateRange(invoice.due_date, dueDateFrom, dueDateTo);
    return matchesSearch && matchesStatus && matchesInvoiceDate && matchesDueDate;
  });

  const clearDateFilters = () => {
    setInvoiceDateFrom('');
    setInvoiceDateTo('');
    setDueDateFrom('');
    setDueDateTo('');
  };

  const hasDateFilters = invoiceDateFrom || invoiceDateTo || dueDateFrom || dueDateTo;

  if (showInvoiceGenerator) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => setShowInvoiceGenerator(false)}
            className="mb-4"
          >
            ← Back to Invoices
          </Button>
        </div>
        <InvoiceGenerator onInvoiceCreated={handleInvoiceCreated} />
      </div>
    );
  }

  if (loading && invoices.length === 0) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Invoice Management</h1>
            <p className="text-muted-foreground">Manage invoices, progress billing, and retention</p>
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <TableSkeleton rows={5} columns={5} />
      </div>
    );
  }

  return (
    <AccessiblePageWrapper pageTitle="Invoices">
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Invoice Management</h1>
          <p className="text-muted-foreground">Manage invoices, progress billing, and retention</p>
        </div>
        <Button
          onClick={() => setShowInvoiceGenerator(true)}
          className="bg-construction-orange hover:bg-construction-orange/90"
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Create Invoice
          <kbd className="ml-2 hidden lg:inline-block px-2 py-0.5 text-xs bg-background/20 rounded border border-background/40" aria-hidden="true">
            Ctrl+I
          </kbd>
        </Button>
      </div>

      {/* Stats Overview */}
      <InvoiceStats invoices={invoices} />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" aria-label="Invoice management sections">
        <TabsList className="grid w-full grid-cols-4" aria-label="Invoice categories">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <FileText className="h-4 w-4" aria-hidden="true" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" aria-hidden="true" />
            Progress Billing
          </TabsTrigger>
          <TabsTrigger value="retention" className="flex items-center gap-2">
            <Clock className="h-4 w-4" aria-hidden="true" />
            Retention
          </TabsTrigger>
          <TabsTrigger value="overdue" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            Overdue
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-construction-orange" aria-hidden="true" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4" role="search" aria-label="Search and filter invoices">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                      placeholder="Search invoices..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      aria-label="Search invoices by client name or invoice number"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48" aria-label="Filter by invoice status">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date range filters: invoice date and due date */}
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-muted-foreground">Invoice date</legend>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={invoiceDateFrom}
                      onChange={(e) => setInvoiceDateFrom(e.target.value)}
                      aria-label="Invoice date from"
                    />
                    <span className="text-muted-foreground" aria-hidden="true">–</span>
                    <Input
                      type="date"
                      value={invoiceDateTo}
                      onChange={(e) => setInvoiceDateTo(e.target.value)}
                      aria-label="Invoice date to"
                    />
                  </div>
                </fieldset>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-muted-foreground">Due date</legend>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={dueDateFrom}
                      onChange={(e) => setDueDateFrom(e.target.value)}
                      aria-label="Due date from"
                    />
                    <span className="text-muted-foreground" aria-hidden="true">–</span>
                    <Input
                      type="date"
                      value={dueDateTo}
                      onChange={(e) => setDueDateTo(e.target.value)}
                      aria-label="Due date to"
                    />
                  </div>
                </fieldset>
              </div>
              {hasDateFilters && (
                <div className="mt-2">
                  <Button variant="ghost" size="sm" onClick={clearDateFilters}>
                    Clear date filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoice List */}
          <InvoiceList 
            invoices={filteredInvoices} 
            loading={loading}
            onInvoiceUpdate={loadInvoices}
          />
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <ProgressBillingManager />
        </TabsContent>

        <TabsContent value="retention" className="space-y-4">
          <RetentionManager />
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                Overdue Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InvoiceList 
                invoices={filteredInvoices.filter(inv => inv.status === 'overdue')} 
                loading={loading}
                onInvoiceUpdate={loadInvoices}
                highlightOverdue={true}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </AccessiblePageWrapper>
  );
};

export default Invoices;