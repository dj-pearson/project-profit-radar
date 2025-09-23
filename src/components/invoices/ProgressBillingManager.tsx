import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, TrendingUp, Building, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const ProgressBillingManager: React.FC = () => {
  const [projects, setProjects] = useState([]);
  const [progressInvoices, setProgressInvoices] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [progressPercentage, setProgressPercentage] = useState('');
  const [loading, setLoading] = useState(false);
  const { userProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (userProfile?.company_id) {
      loadProjects();
      loadProgressInvoices();
    }
  }, [userProfile?.company_id]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client_name, completion_percentage')
        .eq('company_id', userProfile?.company_id)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadProgressInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          projects(name, client_name)
        `)
        .eq('company_id', userProfile?.company_id)
        .ilike('notes', '%progress%')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProgressInvoices(data || []);
    } catch (error) {
      console.error('Error loading progress invoices:', error);
    }
  };

  const calculateProgressBilling = (project: any, percentage: number) => {
    const totalBudget = 100000; // Default budget - would need to be set per project
    const currentProgress = percentage / 100;
    const currentBillableAmount = totalBudget * currentProgress;
    
    // Get previously billed amount (sum of previous progress invoices)
    const previouslyBilled = progressInvoices
      .filter(inv => inv.project_id === project.id && inv.status !== 'cancelled')
      .reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
    
    const currentAmountDue = Math.max(0, currentBillableAmount - previouslyBilled);
    
    return {
      totalBudget,
      currentBillableAmount,
      previouslyBilled,
      currentAmountDue,
      percentageComplete: percentage
    };
  };

  const createProgressInvoice = async () => {
    if (!selectedProject || !progressPercentage) {
      toast({
        title: "Missing Information",
        description: "Please select a project and enter progress percentage",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const project = projects.find(p => p.id === selectedProject);
      if (!project) throw new Error('Project not found');

      const billing = calculateProgressBilling(project, parseFloat(progressPercentage));
      
      if (billing.currentAmountDue <= 0) {
        toast({
          title: "No Amount Due",
          description: "The calculated progress billing amount is zero or negative",
          variant: "destructive"
        });
        return;
      }

      // Create invoice
      const { data, error } = await supabase
        .from('invoices')
        .insert({
          company_id: userProfile?.company_id,
          project_id: selectedProject,
          client_name: project.client_name || 'Unknown Client',
          client_email: project.client_email || '',
          subtotal: billing.currentAmountDue,
          total_amount: billing.currentAmountDue,
          amount_due: billing.currentAmountDue,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: `Progress billing for ${progressPercentage}% completion`,
          terms: 'Payment is due within 30 days of invoice date.'
        } as any) // Cast to any to bypass type checking temporarily
        .select()
        .single();

      if (error) throw error;

      // Create line item
      await supabase
        .from('invoice_line_items')
        .insert({
          invoice_id: data.id,
          description: `Project progress - ${progressPercentage}% complete`,
          quantity: 1,
          unit_price: billing.currentAmountDue,
          total_price: billing.currentAmountDue
        } as any);

      toast({
        title: "Progress Invoice Created",
        description: `Invoice ${data.invoice_number} created for ${progressPercentage}% progress`,
      });

      setSelectedProject('');
      setProgressPercentage('');
      loadProgressInvoices();
      
    } catch (error) {
      console.error('Error creating progress invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create progress invoice",
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
  const billing = selectedProjectData && progressPercentage ? 
    calculateProgressBilling(selectedProjectData, parseFloat(progressPercentage)) : null;

  return (
    <div className="space-y-6">
      {/* Progress Billing Creator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-construction-orange" />
            Create Progress Invoice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label htmlFor="progress">Progress Percentage</Label>
              <Input
                id="progress"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={progressPercentage}
                onChange={(e) => setProgressPercentage(e.target.value)}
                placeholder="Enter completion percentage"
              />
            </div>
          </div>

          {/* Billing Preview */}
          {billing && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-semibold">Billing Preview</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Budget:</span>
                  <div className="font-medium">{formatCurrency(billing.totalBudget)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Billable to Date:</span>
                  <div className="font-medium">{formatCurrency(billing.currentBillableAmount)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Previously Billed:</span>
                  <div className="font-medium">{formatCurrency(billing.previouslyBilled)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Current Amount Due:</span>
                  <div className="font-bold text-construction-orange">
                    {formatCurrency(billing.currentAmountDue)}
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button 
            onClick={createProgressInvoice} 
            disabled={!selectedProject || !progressPercentage || loading}
            className="w-full bg-construction-orange hover:bg-construction-orange/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            {loading ? 'Creating...' : 'Create Progress Invoice'}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Progress Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Progress Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {progressInvoices.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No progress invoices found
            </div>
          ) : (
            <div className="space-y-4">
              {progressInvoices.map((invoice) => (
                <div key={invoice.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold">{invoice.invoice_number}</h4>
                      <Badge variant="outline" className="bg-purple-100 text-purple-800">
                        Progress
                      </Badge>
                      <Badge variant={invoice.status === 'paid' ? 'default' : 'outline'}>
                        {invoice.status}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(parseFloat(invoice.total_amount || 0))}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {invoice.progress_percentage}% complete
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
                      {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                    </div>
                    <div>
                      Client: {invoice.client_name}
                    </div>
                  </div>
                  
                  {invoice.progress_percentage && (
                    <div className="mt-3">
                      <Progress 
                        value={parseFloat(invoice.progress_percentage)} 
                        className="h-2"
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        {invoice.progress_percentage}% complete
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressBillingManager;
