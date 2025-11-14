/**
 * Improved Budget Dashboard
 * Visual, intuitive budget tracking with real-time updates
 * Shows budget vs actual with alerts and forecasting
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Activity,
  Calendar,
  PieChart,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface BudgetCategory {
  id: string;
  name: string;
  code: string;
  budgeted: number;
  actual: number;
  committed: number;
  category_type: string;
}

interface ImprovedBudgetDashboardProps {
  projectId?: string;
}

export const ImprovedBudgetDashboard: React.FC<ImprovedBudgetDashboardProps> = ({
  projectId: initialProjectId
}) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState(initialProjectId || '');
  const [budgetData, setBudgetData] = useState<BudgetCategory[]>([]);
  const [projectDetails, setProjectDetails] = useState<any>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadBudgetData();
      loadProjectDetails();
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, total_budget, status')
        .eq('company_id', userProfile.company_id)
        .in('status', ['active', 'in_progress', 'on_hold'])
        .order('name');

      if (error) throw error;
      setProjects(data || []);

      if (!selectedProject && data && data.length > 0) {
        setSelectedProject(data[0].id);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadProjectDetails = async () => {
    if (!selectedProject) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, total_budget, start_date, end_date, expected_completion_date')
        .eq('id', selectedProject)
        .single();

      if (error) throw error;
      setProjectDetails(data);
    } catch (error) {
      console.error('Error loading project details:', error);
    }
  };

  const loadBudgetData = async () => {
    if (!selectedProject) return;

    setLoading(true);
    try {
      // Load budget data by cost code
      const { data: budgetItems, error: budgetError } = await supabase
        .from('project_budgets')
        .select(`
          id,
          cost_code_id,
          budgeted_amount,
          cost_codes (code, name, category)
        `)
        .eq('project_id', selectedProject);

      if (budgetError) throw budgetError;

      // Load actual costs
      const { data: actualCosts, error: costsError } = await supabase
        .from('financial_records')
        .select('cost_code_id, amount')
        .eq('project_id', selectedProject)
        .eq('record_type', 'expense');

      if (costsError) throw costsError;

      // Load committed costs (from purchase orders, etc.)
      const { data: committedCosts, error: committedError } = await supabase
        .from('purchase_orders')
        .select('cost_code_id, total_amount')
        .eq('project_id', selectedProject)
        .in('status', ['pending', 'approved']);

      if (committedError) throw committedError;

      // Aggregate data by cost code
      const aggregated = (budgetItems || []).map((item: any) => {
        const actual = (actualCosts || [])
          .filter((c: any) => c.cost_code_id === item.cost_code_id)
          .reduce((sum: number, c: any) => sum + c.amount, 0);

        const committed = (committedCosts || [])
          .filter((c: any) => c.cost_code_id === item.cost_code_id)
          .reduce((sum: number, c: any) => sum + c.total_amount, 0);

        return {
          id: item.cost_code_id,
          name: item.cost_codes?.name || 'Unknown',
          code: item.cost_codes?.code || '',
          budgeted: item.budgeted_amount || 0,
          actual: actual,
          committed: committed,
          category_type: item.cost_codes?.category || 'general'
        };
      });

      setBudgetData(aggregated);
    } catch (error) {
      console.error('Error loading budget data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    return budgetData.reduce(
      (totals, item) => ({
        budgeted: totals.budgeted + item.budgeted,
        actual: totals.actual + item.actual,
        committed: totals.committed + item.committed
      }),
      { budgeted: 0, actual: 0, committed: 0 }
    );
  };

  const getVariance = (budgeted: number, actual: number, committed: number) => {
    const projected = actual + committed;
    return budgeted - projected;
  };

  const getVariancePercentage = (budgeted: number, actual: number, committed: number) => {
    if (budgeted === 0) return 0;
    const variance = getVariance(budgeted, actual, committed);
    return (variance / budgeted) * 100;
  };

  const getStatusColor = (budgeted: number, actual: number, committed: number) => {
    const variancePct = getVariancePercentage(budgeted, actual, committed);
    if (variancePct > 10) return 'success';
    if (variancePct > 0) return 'warning';
    return 'danger';
  };

  const getStatusBadge = (budgeted: number, actual: number, committed: number) => {
    const variancePct = getVariancePercentage(budgeted, actual, committed);

    if (variancePct > 10) {
      return { variant: 'default' as const, text: 'Under Budget', icon: <CheckCircle className="h-3 w-3" /> };
    }
    if (variancePct > 0) {
      return { variant: 'secondary' as const, text: 'On Track', icon: <Activity className="h-3 w-3" /> };
    }
    return { variant: 'destructive' as const, text: 'Over Budget', icon: <AlertTriangle className="h-3 w-3" /> };
  };

  const getSpentPercentage = (budgeted: number, actual: number, committed: number) => {
    if (budgeted === 0) return 0;
    return Math.min(100, ((actual + committed) / budgeted) * 100);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const totals = calculateTotals();
  const overallStatus = getStatusBadge(totals.budgeted, totals.actual, totals.committed);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Budget Dashboard</h2>
          <p className="text-muted-foreground">Track spending and forecast costs in real-time</p>
        </div>

        <div className="w-full md:w-64">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger>
              <SelectValue placeholder="Select project..." />
            </SelectTrigger>
            <SelectContent>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Budget</span>
              <DollarSign className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">{formatCurrency(totals.budgeted)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Actual Spent</span>
              <TrendingDown className="h-4 w-4 text-orange-500" />
            </div>
            <div className="text-2xl font-bold">{formatCurrency(totals.actual)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totals.budgeted > 0 ? Math.round((totals.actual / totals.budgeted) * 100) : 0}% of budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Committed</span>
              <Activity className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold">{formatCurrency(totals.committed)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Pending obligations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Variance</span>
              {getVariance(totals.budgeted, totals.actual, totals.committed) >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className={`text-2xl font-bold ${
              getVariance(totals.budgeted, totals.actual, totals.committed) >= 0
                ? 'text-green-600'
                : 'text-red-600'
            }`}>
              {formatCurrency(Math.abs(getVariance(totals.budgeted, totals.actual, totals.committed)))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {getVariance(totals.budgeted, totals.actual, totals.committed) >= 0 ? 'Under' : 'Over'} budget
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Overall Budget Status</CardTitle>
              <CardDescription>{projectDetails?.name}</CardDescription>
            </div>
            <Badge variant={overallStatus.variant} className="flex items-center gap-1">
              {overallStatus.icon}
              {overallStatus.text}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Budget Utilization</span>
              <span className="font-medium">
                {Math.round(getSpentPercentage(totals.budgeted, totals.actual, totals.committed))}%
              </span>
            </div>
            <Progress
              value={getSpentPercentage(totals.budgeted, totals.actual, totals.committed)}
              className="h-3"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Spent: {formatCurrency(totals.actual)}</span>
              <span>Committed: {formatCurrency(totals.committed)}</span>
              <span>Remaining: {formatCurrency(totals.budgeted - totals.actual - totals.committed)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Breakdown by Cost Code</CardTitle>
          <CardDescription>Detailed view of spending across all categories</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading budget data...</div>
          ) : budgetData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No budget data available for this project
            </div>
          ) : (
            <div className="space-y-4">
              {budgetData.map((item) => {
                const variance = getVariance(item.budgeted, item.actual, item.committed);
                const status = getStatusBadge(item.budgeted, item.actual, item.committed);
                const spentPct = getSpentPercentage(item.budgeted, item.actual, item.committed);

                return (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{item.code} - {item.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Budget: {formatCurrency(item.budgeted)}
                        </p>
                      </div>
                      <Badge variant={status.variant} className="flex items-center gap-1">
                        {status.icon}
                        {status.text}
                      </Badge>
                    </div>

                    <Progress value={spentPct} className="h-2 mb-2" />

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Actual</p>
                        <p className="font-semibold">{formatCurrency(item.actual)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Committed</p>
                        <p className="font-semibold">{formatCurrency(item.committed)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Variance</p>
                        <p className={`font-semibold ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
                        </p>
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

export default ImprovedBudgetDashboard;
