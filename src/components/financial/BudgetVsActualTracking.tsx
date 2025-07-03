import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  DollarSign
} from 'lucide-react';

interface BudgetItem {
  id: string;
  cost_code: {
    code: string;
    name: string;
  };
  budgeted_amount: number;
  labor_budget: number;
  material_budget: number;
  equipment_budget: number;
  subcontractor_budget: number;
  actual_costs: {
    total: number;
    labor: number;
    materials: number;
    equipment: number;
    subcontractors: number;
  };
  variance: number;
  variance_percentage: number;
}

interface Project {
  id: string;
  name: string;
}

export const BudgetVsActualTracking: React.FC = () => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);

  useEffect(() => {
    if (userProfile?.company_id) {
      loadProjects();
    }
  }, [userProfile]);

  useEffect(() => {
    if (selectedProject) {
      loadBudgetData();
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', userProfile?.company_id)
        .order('name');

      if (error) throw error;
      setProjects(data || []);
      
      if (data && data.length > 0) {
        setSelectedProject(data[0].id);
      }
    } catch (error: any) {
      console.error('Error loading projects:', error);
    }
  };

  const loadBudgetData = async () => {
    if (!selectedProject) return;
    
    setLoading(true);
    try {
      // Load budget data
      const { data: budgets, error: budgetError } = await supabase
        .from('project_budgets')
        .select(`
          *,
          cost_codes(code, name)
        `)
        .eq('project_id', selectedProject);

      if (budgetError) throw budgetError;

      // Load actual costs from job_costs
      const { data: actualCosts, error: costsError } = await supabase
        .from('job_costs')
        .select('*')
        .eq('project_id', selectedProject);

      if (costsError) throw costsError;

      // Combine budget and actual data
      const budgetItemsData: BudgetItem[] = budgets?.map(budget => {
        const costs = actualCosts?.filter(cost => cost.cost_code_id === budget.cost_code_id) || [];
        
        const actualTotal = costs.reduce((sum, cost) => sum + (cost.total_cost || 0), 0);
        const actualLabor = costs.reduce((sum, cost) => sum + (cost.labor_cost || 0), 0);
        const actualMaterials = costs.reduce((sum, cost) => sum + (cost.material_cost || 0), 0);
        const actualEquipment = costs.reduce((sum, cost) => sum + (cost.equipment_cost || 0), 0);
        const actualOther = costs.reduce((sum, cost) => sum + (cost.other_cost || 0), 0);

        const variance = budget.budgeted_amount - actualTotal;
        const variancePercentage = budget.budgeted_amount > 0 
          ? (variance / budget.budgeted_amount) * 100 
          : 0;

        return {
          id: budget.id,
          cost_code: budget.cost_codes,
          budgeted_amount: budget.budgeted_amount,
          labor_budget: budget.labor_budget,
          material_budget: budget.material_budget,
          equipment_budget: budget.equipment_budget,
          subcontractor_budget: budget.subcontractor_budget,
          actual_costs: {
            total: actualTotal,
            labor: actualLabor,
            materials: actualMaterials,
            equipment: actualEquipment,
            subcontractors: actualOther
          },
          variance,
          variance_percentage: variancePercentage
        };
      }) || [];

      setBudgetItems(budgetItemsData);
    } catch (error: any) {
      console.error('Error loading budget data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVarianceStatus = (variancePercentage: number) => {
    if (variancePercentage > 10) return { status: 'good', color: 'text-green-600', icon: CheckCircle };
    if (variancePercentage < -10) return { status: 'over', color: 'text-red-600', icon: AlertTriangle };
    return { status: 'warning', color: 'text-orange-600', icon: TrendingDown };
  };

  const totalBudget = budgetItems.reduce((sum, item) => sum + item.budgeted_amount, 0);
  const totalActual = budgetItems.reduce((sum, item) => sum + item.actual_costs.total, 0);
  const totalVariance = totalBudget - totalActual;
  const totalVariancePercentage = totalBudget > 0 ? (totalVariance / totalBudget) * 100 : 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading budget data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Budget vs Actual Tracking
          </CardTitle>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold">${totalBudget.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Budget</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold">${totalActual.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Actual</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className={`text-2xl font-bold ${totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${totalVariance.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Variance</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className={`text-2xl font-bold ${totalVariancePercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalVariancePercentage.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Variance %</div>
          </div>
        </div>

        {/* Budget Items */}
        <div className="space-y-4">
          {budgetItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No budget data available for this project.</p>
              <Button variant="outline" className="mt-2">
                Create Budget
              </Button>
            </div>
          ) : (
            budgetItems.map((item) => {
              const { status, color, icon: StatusIcon } = getVarianceStatus(item.variance_percentage);
              const spentPercentage = item.budgeted_amount > 0 
                ? Math.min((item.actual_costs.total / item.budgeted_amount) * 100, 100)
                : 0;

              return (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium">
                        {item.cost_code.code} - {item.cost_code.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusIcon className={`h-4 w-4 ${color}`} />
                        <Badge variant={status === 'good' ? 'default' : status === 'over' ? 'destructive' : 'secondary'}>
                          {item.variance >= 0 ? 'Under Budget' : 'Over Budget'}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        ${item.actual_costs.total.toLocaleString()} / ${item.budgeted_amount.toLocaleString()}
                      </div>
                      <div className={`text-sm font-medium ${color}`}>
                        {item.variance >= 0 ? '+' : ''}${item.variance.toLocaleString()} ({item.variance_percentage.toFixed(1)}%)
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Budget Used</span>
                      <span>{spentPercentage.toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={spentPercentage} 
                      className={`h-2 ${spentPercentage > 100 ? 'bg-red-100' : ''}`}
                    />
                  </div>

                  {/* Breakdown */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Labor</div>
                      <div className="font-medium">
                        ${item.actual_costs.labor.toLocaleString()} / ${item.labor_budget.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Materials</div>
                      <div className="font-medium">
                        ${item.actual_costs.materials.toLocaleString()} / ${item.material_budget.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Equipment</div>
                      <div className="font-medium">
                        ${item.actual_costs.equipment.toLocaleString()} / ${item.equipment_budget.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Subcontractors</div>
                      <div className="font-medium">
                        ${item.actual_costs.subcontractors.toLocaleString()} / ${item.subcontractor_budget.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};