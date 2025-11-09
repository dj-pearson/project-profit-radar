import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Filter, FileText, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usePersistedState } from '@/hooks/usePersistedState';
import { TableSkeleton } from '@/components/ui/loading-skeleton';
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
      console.error('Error loading invoices:', error);
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

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

  return (
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
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
          <kbd className="ml-2 hidden lg:inline-block px-2 py-0.5 text-xs bg-background/20 rounded border border-background/40">
            Ctrl+I
          </kbd>
        </Button>
      </div>

      {/* Stats Overview */}
      <InvoiceStats invoices={invoices} />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Progress Billing
          </TabsTrigger>
          <TabsTrigger value="retention" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Retention
          </TabsTrigger>
          <TabsTrigger value="overdue" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Overdue
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-construction-orange" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search invoices..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border rounded-md bg-background"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
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
                <AlertTriangle className="h-5 w-5" />
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
  );
};

export default Invoices;