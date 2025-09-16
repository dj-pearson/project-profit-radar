import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign
} from 'lucide-react';

interface JobData {
  id: string;
  name: string;
  revenue: number;
  estimatedCosts: number;
  actualCosts: number;
  grossProfit: number;
  profitMargin: number;
  status: string;
  completion_percentage: number;
}

interface ProjectData {
  id: string;
  name: string;
  budget: number | null;
  completion_percentage: number | null;
  status: string | null;
}

interface JobCostData {
  project_id: string;
  labor_cost: number | null;
  material_cost: number | null;
  equipment_cost: number | null;
  other_cost: number | null;
}

interface ExpenseData {
  project_id: string;
  amount: number | null;
}

interface InvoiceData {
  project_id: string;
  amount_paid: number | null;
}

const JobProfitabilityOverview = () => {
  const { userProfile } = useAuth();
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [jobData, setJobData] = useState<JobData[]>([]);

  useEffect(() => {
    if (userProfile?.company_id) {
      loadJobData();
    }
  }, [userProfile?.company_id]);

  const loadJobData = async () => {
    try {
      setLoading(true);
      
      // Get projects with budget data
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, budget, completion_percentage, status')
        .eq('company_id', userProfile?.company_id)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Get actual job costs for all projects (bypass type inference)
      const jobCostsResult = await (supabase as any)
        .from('job_costs')
        .select('project_id, labor_cost, material_cost, equipment_cost, other_cost')
        .eq('company_id', userProfile?.company_id);
      const { data: jobCostsData, error: jobCostsError } = jobCostsResult;

      if (jobCostsError) throw jobCostsError;

      // Get actual expenses for all projects  
      const expensesResult = await (supabase as any)
        .from('expenses')
        .select('project_id, amount')
        .eq('company_id', userProfile?.company_id)
        .eq('payment_status', 'approved');
      const { data: expensesData, error: expensesError } = expensesResult;

      if (expensesError) throw expensesError;

      // Get actual revenue from paid invoices
      const invoicesResult = await (supabase as any)
        .from('invoices')
        .select('project_id, amount_paid')
        .eq('company_id', userProfile?.company_id)
        .in('status', ['paid', 'partially_paid']);
      const { data: invoicesData, error: invoicesError } = invoicesResult;

      if (invoicesError) throw invoicesError;

      // Cast data to proper types
      const jobCosts: JobCostData[] = jobCostsData || [];
      const expenses: ExpenseData[] = expensesData || [];
      const invoices: InvoiceData[] = invoicesData || [];

      // Transform projects data with actual financial data
      const transformedJobs: JobData[] = (projects || []).map(project => {
        const budget = Number(project.budget) || 0;
        const completion = project.completion_percentage || 0;
        
        // Calculate actual costs from job_costs table
        const projectJobCosts = jobCosts.filter(jc => jc.project_id === project.id);
        const jobCostTotal = projectJobCosts.reduce((sum, cost) => 
          sum + (Number(cost.labor_cost) || 0) + (Number(cost.material_cost) || 0) + 
          (Number(cost.equipment_cost) || 0) + (Number(cost.other_cost) || 0), 0
        );
        
        // Add expenses from expenses table
        const projectExpenses = expenses.filter(exp => exp.project_id === project.id);
        const expenseTotal = projectExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
        
        // Total actual costs
        const actualCosts = jobCostTotal + expenseTotal;
        
        // Calculate actual revenue from invoices
        const projectInvoices = invoices.filter(inv => inv.project_id === project.id);
        const actualRevenue = projectInvoices.reduce((sum, inv) => sum + (Number(inv.amount_paid) || 0), 0);
        
        // Use actual revenue if available, otherwise estimate based on completion and budget
        const revenue = actualRevenue > 0 ? actualRevenue : budget * (completion / 100);
        
        // Calculate profit and margin from real data
        const grossProfit = revenue - actualCosts;
        const profitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

        return {
          id: project.id,
          name: project.name,
          revenue,
          estimatedCosts: budget * 0.75, // Keep for comparison, but use actualCosts for calculations
          actualCosts,
          grossProfit,
          profitMargin,
          status: project.status === 'completed' ? 'Completed' : 'In Progress',
          completion_percentage: completion
        };
      });

      setJobData(transformedJobs);
    } catch (error) {
      console.error('Error loading job data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = jobData.reduce((sum, job) => sum + job.revenue, 0);
  const totalProfit = jobData.reduce((sum, job) => sum + job.grossProfit, 0);
  const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Job Profitability Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading project data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Job Profitability Overview - Real Data
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Actual Revenue</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">${totalProfit.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Actual Profit</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{overallMargin.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Actual Margin</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {jobData.map(job => {
            const isPositive = job.grossProfit > 0;
            
            return (
              <div key={job.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{job.name}</h4>
                  <Badge variant={job.status === 'Completed' ? 'default' : 'secondary'}>
                    {job.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm mb-3">
                  <div>
                    <span className="text-muted-foreground">Revenue:</span>
                    <div className="font-medium">${job.revenue.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Actual Costs:</span>
                    <div className="font-medium">${job.actualCosts.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Profit:</span>
                    <div className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      ${job.grossProfit.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Margin:</span>
                    <div className={`font-medium ${job.profitMargin > 15 ? 'text-green-600' : job.profitMargin > 5 ? 'text-orange-600' : 'text-red-600'}`}>
                      {job.profitMargin.toFixed(1)}%
                    </div>
                  </div>
                  <div className="flex items-center">
                    {job.profitMargin > 15 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
                
                <Progress value={job.profitMargin > 0 ? job.profitMargin : 0} className="h-2" />
              </div>
            );
          })}
        </div>

        {jobData.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No project data available. Add projects with budgets to see profitability analysis.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default JobProfitabilityOverview;