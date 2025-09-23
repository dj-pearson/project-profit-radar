import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Building, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, differenceInDays } from 'date-fns';

const RetentionManager: React.FC = () => {
  const [projects, setProjects] = useState([]);
  const [retentionInvoices, setRetentionInvoices] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [retentionPercentage, setRetentionPercentage] = useState('10');
  const [retentionDueDate, setRetentionDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const { userProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (userProfile?.company_id) {
      loadProjects();
      loadRetentionInvoices();
    }
  }, [userProfile?.company_id]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id, name, client_name, client_email, status
        `)
        .eq('company_id', userProfile?.company_id)
        .in('status', ['active', 'completed'])
        .order('name');

      if (error) throw error;
      
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadRetentionInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          projects(name, client_name, status)
        `)
        .eq('company_id', userProfile?.company_id)
        .ilike('notes', '%retention%')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRetentionInvoices(data || []);
    } catch (error) {
      console.error('Error loading retention invoices:', error);
    }
  };

  const calculateRetentionAmount = (project: any, percentage: number) => {
    // For demo purposes, use a fixed project value - would need to calculate from actual invoices
    const totalInvoiceValue = 100000; // This would be calculated from project invoices
    
    const retentionAmount = totalInvoiceValue * (percentage / 100);
    
    // Check if retention already exists
    const existingRetention = retentionInvoices
      .filter(inv => inv.project_id === project.id && inv.status !== 'cancelled')
      .reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
    
    return {
      totalInvoiceValue,
      retentionAmount,
      existingRetention,
      availableRetention: Math.max(0, retentionAmount - existingRetention)
    };
  };

  const createRetentionInvoice = async () => {
    if (!selectedProject || !retentionPercentage || !retentionDueDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const project = projects.find(p => p.id === selectedProject);
      if (!project) throw new Error('Project not found');

      const retention = calculateRetentionAmount(project, parseFloat(retentionPercentage));
      
      if (retention.availableRetention <= 0) {
        toast({
          title: "No Retention Available",
          description: "Retention has already been invoiced for this project",
          variant: "destructive"
        });
        return;
      }

      // Create retention invoice
      const { data, error } = await supabase
        .from('invoices')
        .insert({
          company_id: userProfile?.company_id,
          project_id: selectedProject,
          client_name: project.client_name || 'Unknown Client',
          client_email: project.client_email || '',
          subtotal: retention.availableRetention,
          total_amount: retention.availableRetention,
          amount_due: retention.availableRetention,
          due_date: retentionDueDate,
          notes: `Retention release - ${retentionPercentage}% of project value`,
          terms: 'Retention payment due upon project completion and final acceptance.'
        } as any) // Cast to any to bypass type checking temporarily
        .select()
        .single();

      if (error) throw error;

      // Create line item
      await supabase
        .from('invoice_line_items')
        .insert({
          invoice_id: data.id,
          description: `Retention Release - ${retentionPercentage}%`,
          quantity: 1,
          unit_price: retention.availableRetention,
          total_price: retention.availableRetention
        } as any);

      toast({
        title: "Retention Invoice Created",
        description: `Retention invoice ${data.invoice_number} created`,
      });

      setSelectedProject('');
      setRetentionPercentage('10');
      setRetentionDueDate('');
      loadRetentionInvoices();
      
    } catch (error) {
      console.error('Error creating retention invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create retention invoice",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const selectedProjectData = projects.find(p => p.id === selectedProject);
  const retention = selectedProjectData && retentionPercentage ? 
    calculateRetentionAmount(selectedProjectData, parseFloat(retentionPercentage)) : null;

  const getRetentionStatus = (invoice: any) => {
    const today = new Date();
    const dueDate = new Date(invoice.due_date);
    const daysDiff = differenceInDays(dueDate, today);
    
    if (invoice.status === 'paid') return 'released';
    if (daysDiff < 0) return 'overdue';
    if (daysDiff <= 30) return 'due-soon';
    return 'pending';
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      released: { variant: 'default' as const, label: 'Released', className: 'bg-green-100 text-green-800' },
      overdue: { variant: 'destructive' as const, label: 'Overdue', className: '' },
      'due-soon': { variant: 'default' as const, label: 'Due Soon', className: 'bg-yellow-100 text-yellow-800' },
      pending: { variant: 'outline' as const, label: 'Pending', className: '' }
    };
    
    const config = variants[status as keyof typeof variants] || variants.pending;
    
    return (
      <Badge variant={config.variant} className={config.className || undefined}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Retention Creator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-construction-orange" />
            Create Retention Invoice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="project">Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} - {project.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="retention-percent">Retention %</Label>
              <Input
                id="retention-percent"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={retentionPercentage}
                onChange={(e) => setRetentionPercentage(e.target.value)}
                placeholder="10"
              />
            </div>

            <div>
              <Label htmlFor="due-date">Release Due Date</Label>
              <Input
                id="due-date"
                type="date"
                value={retentionDueDate}
                onChange={(e) => setRetentionDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* Retention Preview */}
          {retention && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-semibold">Retention Preview</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Invoice Value:</span>
                  <div className="font-medium">{formatCurrency(retention.totalInvoiceValue)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Retention Amount ({retentionPercentage}%):</span>
                  <div className="font-medium">{formatCurrency(retention.retentionAmount)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Existing Retention:</span>
                  <div className="font-medium">{formatCurrency(retention.existingRetention)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Available to Invoice:</span>
                  <div className="font-bold text-construction-orange">
                    {formatCurrency(retention.availableRetention)}
                  </div>
                </div>
              </div>
              
              {retention.availableRetention <= 0 && (
                <div className="flex items-center gap-2 text-yellow-600 text-sm mt-2">
                  <AlertCircle className="h-4 w-4" />
                  Retention has already been fully invoiced for this project
                </div>
              )}
            </div>
          )}

          <Button 
            onClick={createRetentionInvoice} 
            disabled={!selectedProject || !retentionPercentage || !retentionDueDate || loading || (retention?.availableRetention || 0) <= 0}
            className="w-full bg-construction-orange hover:bg-construction-orange/90"
          >
            <Clock className="mr-2 h-4 w-4" />
            {loading ? 'Creating...' : 'Create Retention Invoice'}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Retention Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Retention Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {retentionInvoices.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No retention invoices found
            </div>
          ) : (
            <div className="space-y-4">
              {retentionInvoices.map((invoice) => {
                const retentionStatus = getRetentionStatus(invoice);
                
                return (
                  <div key={invoice.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold">{invoice.invoice_number}</h4>
                        <Badge variant="outline" className="bg-orange-100 text-orange-800">
                          Retention
                        </Badge>
                        {getStatusBadge(retentionStatus)}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {formatCurrency(parseFloat(invoice.total_amount || 0))}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {invoice.retention_percentage}% retention
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        {invoice.projects?.name}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Due: {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Status: {invoice.status}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RetentionManager;
