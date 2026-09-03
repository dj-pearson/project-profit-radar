import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { computeJobProfit } from '@/lib/jobProfit';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

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


interface JobCostData {
  project_id: string;
  labor_cost: number | null;
  material_cost: number | null;
  equipment_cost: number | null;
  other_cost: number | null;
}

interface InvoiceData {
  project_id: string;
  amount_paid: number | null;
}

const JobProfitabilityOverview = () => {
  const { userProfile } = useAuth();
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
      const jobCostsResult = await (supabase as unknown as { from: (table: string) => ReturnType<typeof supabase.from> })
        .from('job_costs')
        .select('project_id, labor_cost, material_cost, equipment_cost, other_cost')
        .eq('company_id', userProfile?.company_id);
      const { data: jobCostsData, error: jobCostsError } = jobCostsResult;

      if (jobCostsError) throw jobCostsError;

      // Expenses are NOT fetched here any more. An approved expense posts
      // itself into job_costs (US-322), so reading both and adding them would
      // count every receipt twice.

      // Get actual revenue from paid invoices
      const invoicesResult = await (supabase as unknown as { from: (table: string) => ReturnType<typeof supabase.from> })
        .from('invoices')
        .select('project_id, amount_paid')
        .eq('company_id', userProfile?.company_id)
        .in('status', ['paid', 'partially_paid']);
      const { data: invoicesData, error: invoicesError } = invoicesResult;

      if (invoicesError) throw invoicesError;

      // Cast data to proper types
      const jobCosts: JobCostData[] = jobCostsData || [];
      const invoices: InvoiceData[] = invoicesData || [];

      // Transform projects data with actual financial data
      const transformedJobs: JobData[] = (projects || []).map(project => {
        const budget = Number(project.budget) || 0;
        const completion = project.completion_percentage || 0;
        
        // US-322: one definition of job profit, shared with
        // ProjectProfitLoss. This screen and that one used to disagree - it
        // added expenses on top of job_costs and counted only collected cash,
        // while that one excluded expenses and counted the budget.
        //
        // Expenses are no longer added on top: an approved expense posts
        // itself into job_costs, so summing both would count it twice.
        const projectJobCosts = jobCosts.filter(jc => jc.project_id === project.id);
        const projectInvoices = invoices.filter(inv => inv.project_id === project.id);
        const collectedToDate = projectInvoices.reduce(
          (sum, inv) => sum + (Number(inv.amount_paid) || 0), 0
        );

        const profitResult = computeJobProfit({
          jobCosts: projectJobCosts,
          collectedToDate,
          // Budget earned so far, as the last fallback when nothing has been
          // collected yet. computeJobProfit labels which basis it used.
          currentContractValue: budget * (completion / 100),
        });

        const actualCosts = profitResult.cost;
        const revenue = profitResult.revenue;
        const grossProfit = profitResult.profit;
        const profitMargin = profitResult.marginPercent;

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