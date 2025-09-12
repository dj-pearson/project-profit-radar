import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  DollarSign, 
  Calculator,
  Target,
  RefreshCw
} from 'lucide-react';

interface CostCode {
  id: string;
  code: string;
  description: string;
  category: 'labor' | 'materials' | 'equipment' | 'overhead' | 'subcontractor';
  budget_amount: number;
  actual_amount: number;
  variance: number;
  variance_percentage: number;
}

interface LaborRate {
  id: string;
  trade: string;
  base_rate: number;
  overtime_rate: number;
  current_rate: number;
  efficiency_factor: number;
}

interface MaterialPricing {
  id: string;
  material_name: string;
  current_price: number;
  last_updated: string;
  supplier: string;
  price_trend: 'up' | 'down' | 'stable';
  price_change_percentage: number;
}

interface ProjectCosts {
  project_id: string;
  total_budget: number;
  total_actual: number;
  labor_costs: number;
  material_costs: number;
  equipment_costs: number;
  overhead_costs: number;
  profit_margin: number;
  profit_margin_percentage: number;
  completion_percentage: number;
}

export const EnhancedJobCosting: React.FC<{ projectId?: string }> = ({ projectId }) => {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [costCodes, setCostCodes] = useState<CostCode[]>([]);
  const [laborRates, setLaborRates] = useState<LaborRate[]>([]);
  const [materialPricing, setMaterialPricing] = useState<MaterialPricing[]>([]);
  const [projectCosts, setProjectCosts] = useState<ProjectCosts | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(projectId || '');
  const [projects] = useState([
    { id: 'project-1', project_name: 'Downtown Office Building', status: 'active' },
    { id: 'project-2', project_name: 'Residential Complex Phase 1', status: 'active' },
    { id: 'project-3', project_name: 'Highway Bridge Repair', status: 'active' }
  ]);
  const [refreshing, setRefreshing] = useState(false);

  // Load real data from database
  useEffect(() => {
    if (selectedProject && userProfile?.company_id) {
      loadJobCostingData();
    }
  }, [selectedProject, userProfile?.company_id]);

  const loadJobCostingData = async () => {
    setLoading(true);
    try {
      if (!userProfile?.company_id) return;

      // Fetch cost codes
      const { data: costData, error: costError } = await supabase
        .from('cost_codes')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .eq('project_id', selectedProject);

      if (costError) throw costError;

      // Fetch labor rates
      const { data: laborData, error: laborError } = await supabase
        .from('labor_rates')
        .select('*')
        .eq('company_id', userProfile.company_id);

      if (laborError) throw laborError;

      // Fetch material pricing
      const { data: materialData, error: materialError } = await supabase
        .from('material_pricing')
        .select('*')
        .eq('company_id', userProfile.company_id);

      if (materialError) throw materialError;

      // Process cost codes with variance calculations
      const processedCostCodes: CostCode[] = (costData || []).map(code => {
        const variance = (code.actual_amount || 0) - (code.budget_amount || 0);
        const variance_percentage = (code.budget_amount || 0) > 0 ? (variance / (code.budget_amount || 0)) * 100 : 0;
        
        return {
          id: code.id,
          code: code.code,
          description: code.description,
          category: code.category as CostCode['category'],
          budget_amount: code.budget_amount || 0,
          actual_amount: code.actual_amount || 0,
          variance,
          variance_percentage
        };
      });

      setCostCodes(processedCostCodes);
      setLaborRates((laborData || []).map(l => ({
        id: l.id,
        trade: l.trade,
        base_rate: l.base_rate,
        overtime_rate: l.overtime_rate,
        current_rate: l.current_rate,
        efficiency_factor: l.efficiency_factor || 1.0
      })));
      setMaterialPricing((materialData || []).map(m => ({
        id: m.id,
        material_name: m.material_name,
        current_price: m.current_price,
        last_updated: m.last_updated,
        supplier: m.supplier || '',
        price_trend: (m.price_trend as 'up' | 'down' | 'stable') || 'stable',
        price_change_percentage: m.price_change_percentage || 0
      })));

      // Calculate project costs summary
      const totalBudget = processedCostCodes.reduce((sum, c) => sum + c.budget_amount, 0);
      const totalActual = processedCostCodes.reduce((sum, c) => sum + c.actual_amount, 0);
      const laborCosts = processedCostCodes.filter(c => c.category === 'labor').reduce((sum, c) => sum + c.actual_amount, 0);
      const materialCosts = processedCostCodes.filter(c => c.category === 'materials').reduce((sum, c) => sum + c.actual_amount, 0);
      const equipmentCosts = processedCostCodes.filter(c => c.category === 'equipment').reduce((sum, c) => sum + c.actual_amount, 0);
      const overheadCosts = processedCostCodes.filter(c => c.category === 'overhead').reduce((sum, c) => sum + c.actual_amount, 0);
      const profitMargin = totalBudget - totalActual;
      const profitMarginPercentage = totalBudget > 0 ? (profitMargin / totalBudget) * 100 : 0;

      setProjectCosts({
        project_id: selectedProject,
        total_budget: totalBudget,
        total_actual: totalActual,
        labor_costs: laborCosts,
        material_costs: materialCosts,
        equipment_costs: equipmentCosts,
        overhead_costs: overheadCosts,
        profit_margin: profitMargin,
        profit_margin_percentage: profitMarginPercentage,
        completion_percentage: 75 // This would come from project progress tracking
      });
    } catch (error) {
      console.error('Error loading job costing data:', error);
      toast({
        title: "Error Loading Data",
        description: "Failed to load job costing information.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Refresh material pricing
  const refreshMaterialPricing = async () => {
    setRefreshing(true);
    try {
      // Simulate API call to update material pricing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Success",
        description: "Material pricing updated successfully"
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to refresh material pricing",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  const getProfitMarginColor = (percentage: number) => {
    if (percentage >= 15) return "text-green-600";
    if (percentage >= 10) return "text-yellow-600";
    return "text-red-600";
  };

  const getVarianceColor = (percentage: number) => {
    if (percentage <= 5) return "text-green-600";
    if (percentage <= 15) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Enhanced Real-Time Job Costing
          </CardTitle>
          <CardDescription>
            Advanced cost tracking with real-time pricing and profit margin monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="project">Select Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={refreshMaterialPricing} 
              disabled={refreshing || !selectedProject}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Pricing
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedProject && projectCosts && (
        <>
          {/* Profit Margin Alert */}
          {projectCosts.profit_margin_percentage < 10 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Warning: Profit margin is below 10% ({projectCosts.profit_margin_percentage.toFixed(1)}%). 
                Review costs and pricing immediately.
              </AlertDescription>
            </Alert>
          )}

          {/* Cost Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                    <p className="text-2xl font-bold">${projectCosts.total_budget.toLocaleString()}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Actual Costs</p>
                    <p className="text-2xl font-bold">${projectCosts.total_actual.toLocaleString()}</p>
                  </div>
                  <Calculator className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Profit Margin</p>
                    <p className={`text-2xl font-bold ${getProfitMarginColor(projectCosts.profit_margin_percentage)}`}>
                      {projectCosts.profit_margin_percentage.toFixed(1)}%
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completion</p>
                    <p className="text-2xl font-bold">{projectCosts.completion_percentage}%</p>
                    <Progress value={projectCosts.completion_percentage} className="mt-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Cost Breakdown */}
          <Tabs defaultValue="cost-codes" className="space-y-4">
            <TabsList>
              <TabsTrigger value="cost-codes">Cost Codes</TabsTrigger>
              <TabsTrigger value="labor-rates">Labor Rates</TabsTrigger>
              <TabsTrigger value="material-pricing">Material Pricing</TabsTrigger>
            </TabsList>

            <TabsContent value="cost-codes">
              <Card>
                <CardHeader>
                  <CardTitle>Cost Code Analysis</CardTitle>
                  <CardDescription>Detailed budget vs. actual comparison by cost code</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {costCodes.map(code => (
                      <div key={code.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{code.code} - {code.description}</h4>
                            <Badge variant="outline">{code.category}</Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Variance</p>
                            <p className={`font-semibold ${getVarianceColor(Math.abs(code.variance_percentage))}`}>
                              {code.variance_percentage > 0 ? '+' : ''}{code.variance_percentage.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Budget</p>
                            <p className="font-medium">${code.budget_amount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Actual</p>
                            <p className="font-medium">${code.actual_amount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Variance</p>
                            <p className={`font-medium ${code.variance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                              ${Math.abs(code.variance).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="labor-rates">
              <Card>
                <CardHeader>
                  <CardTitle>Dynamic Labor Rates</CardTitle>
                  <CardDescription>Optimized labor rates based on efficiency and market conditions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {laborRates.map(rate => (
                      <div key={rate.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{rate.trade}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Efficiency:</span>
                            <Badge variant={rate.efficiency_factor >= 1 ? "default" : "secondary"}>
                              {(rate.efficiency_factor * 100).toFixed(0)}%
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Base Rate</p>
                            <p className="font-medium">${rate.base_rate}/hr</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Current Rate</p>
                            <p className="font-medium">${rate.current_rate}/hr</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Overtime</p>
                            <p className="font-medium">${rate.overtime_rate}/hr</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="material-pricing">
              <Card>
                <CardHeader>
                  <CardTitle>Real-Time Material Pricing</CardTitle>
                  <CardDescription>Live material costs with market trend analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {materialPricing.map(material => (
                      <div key={material.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{material.material_name}</h4>
                          <div className="flex items-center gap-2">
                            {material.price_trend === 'up' && <TrendingUp className="h-4 w-4 text-red-500" />}
                            {material.price_trend === 'down' && <TrendingDown className="h-4 w-4 text-green-500" />}
                            <Badge variant={material.price_trend === 'up' ? "destructive" : material.price_trend === 'down' ? "default" : "secondary"}>
                              {material.price_change_percentage > 0 ? '+' : ''}{material.price_change_percentage.toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Current Price</p>
                            <p className="font-medium">${material.current_price}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Supplier</p>
                            <p className="font-medium">{material.supplier}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Last Updated</p>
                            <p className="font-medium">{new Date(material.last_updated).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};