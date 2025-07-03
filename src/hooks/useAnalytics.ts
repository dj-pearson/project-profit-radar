import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsFilters {
  dateRange: {
    start: string;
    end: string;
  };
  projectIds?: string[];
  userIds?: string[];
  categories?: string[];
}

interface AnalyticsMetric {
  name: string;
  value: number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  period: string;
}

interface ChartDataPoint {
  period: string;
  value: number;
  label?: string;
  category?: string;
}

export const useAnalytics = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  const getFinancialMetrics = useCallback(async (filters: AnalyticsFilters) => {
    if (!userProfile?.company_id) return [];

    setLoading(true);
    try {
      const { data: expenses, error: expenseError } = await supabase
        .from('expenses')
        .select('amount, expense_date, created_at')
        .eq('company_id', userProfile.company_id)
        .gte('expense_date', filters.dateRange.start)
        .lte('expense_date', filters.dateRange.end);

      if (expenseError) throw expenseError;

      // Group by period and calculate metrics
      const periodData = new Map<string, number>();
      
      expenses?.forEach(item => {
        const period = new Date(item.expense_date).toISOString().slice(0, 7); // YYYY-MM
        const current = periodData.get(period) || 0;
        periodData.set(period, current + (item.amount || 0));
      });

      const periods = Array.from(periodData.entries()).map(([period, value]) => ({
        period,
        value,
        name: 'Expenses'
      }));

      return periods;
    } catch (error) {
      console.error('Error calculating financial metrics:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to calculate financial metrics"
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [userProfile?.company_id, toast]);

  const getProjectPerformance = useCallback(async (filters: AnalyticsFilters) => {
    if (!userProfile?.company_id) return [];

    try {
      const { data: projects, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          budget,
          completion_percentage,
          status,
          start_date,
          end_date,
          job_costs(total_cost, labor_cost, material_cost, equipment_cost)
        `)
        .eq('company_id', userProfile.company_id)
        .gte('created_at', filters.dateRange.start)
        .lte('created_at', filters.dateRange.end);

      if (error) throw error;

      return projects?.map(project => {
        const totalCosts = project.job_costs?.reduce((sum, cost) => sum + (cost.total_cost || 0), 0) || 0;
        const budgetVariance = project.budget > 0 ? ((totalCosts - project.budget) / project.budget) * 100 : 0;
        const profitMargin = project.budget > 0 ? ((project.budget - totalCosts) / project.budget) * 100 : 0;

        return {
          id: project.id,
          name: project.name,
          budgetVariance,
          profitMargin,
          completion: project.completion_percentage || 0,
          status: project.status,
          totalCosts,
          budget: project.budget || 0
        };
      }) || [];
    } catch (error) {
      console.error('Error getting project performance:', error);
      return [];
    }
  }, [userProfile?.company_id]);

  const getResourceUtilization = useCallback(async (filters: AnalyticsFilters) => {
    if (!userProfile?.company_id) return [];

    try {
      // Get equipment usage data
      const { data: equipmentUsage, error: equipmentError } = await supabase
        .from('equipment_usage')
        .select('hours_used, start_date, project_id')
        .gte('start_date', filters.dateRange.start)
        .lte('start_date', filters.dateRange.end);

      if (equipmentError) throw equipmentError;

      // Group by month
      const monthlyData = new Map<string, {
        equipmentHours: number;
        projects: Set<string>;
      }>();

      equipmentUsage?.forEach(usage => {
        const month = new Date(usage.start_date).toISOString().slice(0, 7);
        const current = monthlyData.get(month) || { 
          equipmentHours: 0, 
          projects: new Set() 
        };
        
        current.equipmentHours += usage.hours_used || 0;
        if (usage.project_id) current.projects.add(usage.project_id);
        monthlyData.set(month, current);
      });

      return Array.from(monthlyData.entries()).map(([period, data]) => ({
        period,
        equipmentHours: data.equipmentHours,
        activeProjects: data.projects.size,
        efficiency: data.equipmentHours > 0 ? Math.min(100, (data.equipmentHours / (40 * 10)) * 100) : 0 // Assuming utilization target
      }));
    } catch (error) {
      console.error('Error getting resource utilization:', error);
      return [];
    }
  }, [userProfile?.company_id]);

  const getFinancialTrends = useCallback(async (filters: AnalyticsFilters) => {
    if (!userProfile?.company_id) return [];

    try {
      // Get invoice data for revenue
      const { data: invoices, error: invoiceError } = await supabase
        .from('invoices')
        .select('total_amount, issue_date, status')
        .eq('company_id', userProfile.company_id)
        .gte('issue_date', filters.dateRange.start)
        .lte('issue_date', filters.dateRange.end);

      if (invoiceError) throw invoiceError;

      // Get expense data for costs
      const { data: expenses, error: expenseError } = await supabase
        .from('expenses')
        .select('amount, expense_date')
        .eq('company_id', userProfile.company_id)
        .gte('expense_date', filters.dateRange.start)
        .lte('expense_date', filters.dateRange.end);

      if (expenseError) throw expenseError;

      // Group by month
      const monthlyFinancials = new Map<string, {
        revenue: number;
        expenses: number;
        invoiceCount: number;
      }>();

      invoices?.forEach(invoice => {
        const month = new Date(invoice.issue_date).toISOString().slice(0, 7);
        const current = monthlyFinancials.get(month) || { 
          revenue: 0, 
          expenses: 0, 
          invoiceCount: 0 
        };
        
        current.revenue += invoice.total_amount || 0;
        current.invoiceCount += 1;
        monthlyFinancials.set(month, current);
      });

      expenses?.forEach(expense => {
        const month = new Date(expense.expense_date).toISOString().slice(0, 7);
        const current = monthlyFinancials.get(month) || { 
          revenue: 0, 
          expenses: 0, 
          invoiceCount: 0 
        };
        
        current.expenses += expense.amount || 0;
        monthlyFinancials.set(month, current);
      });

      return Array.from(monthlyFinancials.entries()).map(([period, data]) => ({
        period,
        revenue: data.revenue,
        expenses: data.expenses,
        profit: data.revenue - data.expenses,
        profitMargin: data.revenue > 0 ? ((data.revenue - data.expenses) / data.revenue) * 100 : 0,
        invoiceCount: data.invoiceCount
      }));
    } catch (error) {
      console.error('Error getting financial trends:', error);
      return [];
    }
  }, [userProfile?.company_id]);

  const exportAnalytics = useCallback((data: any[], filename: string) => {
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, []);

  const convertToCSV = (data: any[]) => {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
  };

  return {
    loading,
    metrics,
    chartData,
    getFinancialMetrics,
    getProjectPerformance,
    getResourceUtilization,
    getFinancialTrends,
    exportAnalytics
  };
};