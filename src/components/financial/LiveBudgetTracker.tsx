import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/formatters';

interface LiveBudgetTrackerProps {
  projectId: string;
}

interface BudgetCategory {
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
  percentage: number;
}

export const LiveBudgetTracker: React.FC<LiveBudgetTrackerProps> = ({ projectId }) => {
  const { userProfile } = useAuth();
  const [budgetData, setBudgetData] = useState<BudgetCategory[]>([]);
  const [totalBudget, setTotalBudget] = useState(0);
  const [totalActual, setTotalActual] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    if (projectId && userProfile?.company_id) {
      loadBudgetData();
      
      // Set up real-time subscription
      const channel = supabase
        .channel('budget-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'job_costs',
          filter: `project_id=eq.${projectId}`
        }, () => {
          loadBudgetData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [projectId, userProfile]);

  const loadBudgetData = async () => {
    try {
      // Get project budget
      const { data: project } = await supabase
        .from('projects')
        .select('budget, name')
        .eq('id', projectId)
        .single();

      // Get actual costs by category
      const { data: costs } = await supabase
        .from('job_costs')
        .select('labor_cost, material_cost, equipment_cost, other_cost')
        .eq('project_id', projectId);

      if (!costs || !project) return;

      // Calculate totals by category
      const actualTotals = costs.reduce((acc, cost) => ({
        labor: acc.labor + (cost.labor_cost || 0),
        material: acc.material + (cost.material_cost || 0),
        equipment: acc.equipment + (cost.equipment_cost || 0),
        other: acc.other + (cost.other_cost || 0)
      }), { labor: 0, material: 0, equipment: 0, other: 0 });

      // Assume budget distribution (this would normally come from project budgets table)
      const budget = project.budget || 0;
      const budgetDistribution = {
        labor: budget * 0.45,
        material: budget * 0.35,
        equipment: budget * 0.15,
        other: budget * 0.05
      };

      const budgetCategories: BudgetCategory[] = Object.keys(actualTotals).map(category => {
        const budgeted = budgetDistribution[category as keyof typeof budgetDistribution];
        const actual = actualTotals[category as keyof typeof actualTotals];
        const variance = actual - budgeted;
        const percentage = budgeted > 0 ? (actual / budgeted) * 100 : 0;

        return {
          category: category.charAt(0).toUpperCase() + category.slice(1),
          budgeted,
          actual,
          variance,
          percentage
        };
      });

      setBudgetData(budgetCategories);
      setTotalBudget(budget);
      setTotalActual(Object.values(actualTotals).reduce((sum, val) => sum + val, 0));
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading budget data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-red-600';
    if (variance < -1000) return 'text-green-600';
    return 'text-yellow-600';
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <TrendingUp className="h-4 w-4 text-red-600" />;
    return <TrendingDown className="h-4 w-4 text-green-600" />;
  };

  const totalVariance = totalActual - totalBudget;
  const totalPercentage = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

  if (loading) {
    return <div className="flex justify-center p-4">Loading budget data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overall Budget Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Live Budget Status
            </div>
            <Badge variant={totalVariance > 0 ? 'destructive' : 'secondary'}>
              {totalPercentage.toFixed(1)}% Used
            </Badge>
          </CardTitle>
          <CardDescription>
            Last updated: {lastUpdate.toLocaleTimeString()}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold">{formatCurrency(totalBudget)}</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Actual Costs</p>
                <p className="text-2xl font-bold">{formatCurrency(totalActual)}</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Variance</p>
                <p className={`text-2xl font-bold ${getVarianceColor(totalVariance)}`}>
                  {totalVariance > 0 ? '+' : ''}{formatCurrency(totalVariance)}
                </p>
              </div>
            </div>

            <Progress value={Math.min(totalPercentage, 100)} className="w-full" />

            {totalVariance > totalBudget * 0.1 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Project is significantly over budget. Consider reviewing costs and adjusting scope.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Budget by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {budgetData.map((category) => (
              <div key={category.category} className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">{category.category}</h4>
                  <div className="flex items-center gap-2">
                    {getVarianceIcon(category.variance)}
                    <span className="text-sm font-mono">
                      {formatCurrency(category.actual)} / {formatCurrency(category.budgeted)}
                    </span>
                  </div>
                </div>
                
                <Progress 
                  value={Math.min(category.percentage, 100)} 
                  className="w-full"
                />
                
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{category.percentage.toFixed(1)}% used</span>
                  <span className={getVarianceColor(category.variance)}>
                    {category.variance > 0 ? '+' : ''}{formatCurrency(category.variance)} variance
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};