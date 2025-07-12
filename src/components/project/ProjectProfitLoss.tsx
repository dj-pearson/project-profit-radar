import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  Download,
  RefreshCw,
  Calculator
} from 'lucide-react';

interface ProjectFinancials {
  project_id: string;
  budget: number;
  actual_costs: number;
  invoiced_amount: number;
  payments_received: number;
  change_orders_value: number;
  estimated_completion_cost: number;
  profit_to_date: number;
  projected_final_profit: number;
  margin_percentage: number;
  cost_breakdown: {
    labor: number;
    materials: number;
    equipment: number;
    subcontractors: number;
    overhead: number;
    other: number;
  };
  revenue_breakdown: {
    base_contract: number;
    change_orders: number;
    allowances: number;
  };
}

interface ProjectPLProps {
  projectId: string;
  projectName: string;
  projectBudget: number;
}

const ProjectProfitLoss: React.FC<ProjectPLProps> = ({ 
  projectId, 
  projectName, 
  projectBudget 
}) => {
  const { userProfile } = useAuth();
  const [financials, setFinancials] = useState<ProjectFinancials | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadProjectFinancials();
  }, [projectId]);

  const loadProjectFinancials = async () => {
    try {
      setLoading(true);
      
      // Load job costs
      const { data: jobCosts, error: jobCostsError } = await supabase
        .from('job_costs')
        .select('*')
        .eq('project_id', projectId);

      if (jobCostsError) throw jobCostsError;

      // Load change orders
      const { data: changeOrders, error: changeOrdersError } = await supabase
        .from('change_orders')
        .select('*')
        .eq('project_id', projectId);

      if (changeOrdersError) throw changeOrdersError;

      // Load contractor payments
      const { data: contractorPayments, error: contractorPaymentsError } = await supabase
        .from('contractor_payments')
        .select('*')
        .eq('project_id', projectId);

      if (contractorPaymentsError) throw contractorPaymentsError;

      // Calculate financials
      const actualCosts = (jobCosts || []).reduce((sum, cost) => sum + (cost.total_cost || 0), 0);
      const contractorCosts = (contractorPayments || []).reduce((sum, payment) => sum + payment.amount, 0);
      const totalActualCosts = actualCosts + contractorCosts;

      const changeOrdersValue = (changeOrders || []).reduce((sum, co) => sum + co.amount, 0);
      const adjustedBudget = projectBudget + changeOrdersValue;

      // Cost breakdown from job costs
      const costBreakdown = {
        labor: (jobCosts || []).reduce((sum, cost) => sum + (cost.labor_cost || 0), 0),
        materials: (jobCosts || []).reduce((sum, cost) => sum + (cost.material_cost || 0), 0),
        equipment: (jobCosts || []).reduce((sum, cost) => sum + (cost.equipment_cost || 0), 0),
        subcontractors: contractorCosts,
        overhead: (jobCosts || []).reduce((sum, cost) => sum + (cost.other_cost || 0), 0),
        other: 0
      };

      const profitToDate = adjustedBudget - totalActualCosts;
      const marginPercentage = adjustedBudget > 0 ? (profitToDate / adjustedBudget) * 100 : 0;

      const calculatedFinancials: ProjectFinancials = {
        project_id: projectId,
        budget: projectBudget,
        actual_costs: totalActualCosts,
        invoiced_amount: 0, // TODO: Calculate from invoices
        payments_received: 0, // TODO: Calculate from payments
        change_orders_value: changeOrdersValue,
        estimated_completion_cost: totalActualCosts * 1.1, // Estimate 10% more
        profit_to_date: profitToDate,
        projected_final_profit: adjustedBudget - (totalActualCosts * 1.1),
        margin_percentage: marginPercentage,
        cost_breakdown: costBreakdown,
        revenue_breakdown: {
          base_contract: projectBudget,
          change_orders: changeOrdersValue,
          allowances: 0
        }
      };

      setFinancials(calculatedFinancials);
      setLastUpdated(new Date());

    } catch (error: any) {
      console.error('Error loading project financials:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load project financials"
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshFinancials = async () => {
    setRefreshing(true);
    await loadProjectFinancials();
    setRefreshing(false);
    toast({
      title: "Data Refreshed",
      description: "Project financial data has been updated"
    });
  };

  const getHealthStatus = () => {
    if (!financials) return { status: 'unknown', color: 'gray' };
    
    if (financials.margin_percentage > 15) {
      return { status: 'excellent', color: 'green' };
    } else if (financials.margin_percentage > 5) {
      return { status: 'good', color: 'blue' };
    } else if (financials.margin_percentage > 0) {
      return { status: 'warning', color: 'yellow' };
    } else {
      return { status: 'critical', color: 'red' };
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading financial data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!financials) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unable to load project financial data. Please try refreshing.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const health = getHealthStatus();
  const totalCosts = Object.values(financials.cost_breakdown).reduce((sum, cost) => sum + cost, 0);
  const totalRevenue = Object.values(financials.revenue_breakdown).reduce((sum, rev) => sum + rev, 0);

  return (
    <div className="space-y-6">
      {/* Header with Key Metrics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {projectName} - Profit & Loss
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`border-${health.color}-500 text-${health.color}-700`}>
                {health.status.toUpperCase()}
              </Badge>
              <Button variant="outline" size="sm" onClick={refreshFinancials} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <DollarSign className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold text-blue-600">
                ${totalRevenue.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total Contract Value</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <TrendingDown className="h-6 w-6 mx-auto mb-2 text-red-600" />
              <div className="text-2xl font-bold text-red-600">
                ${financials.actual_costs.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Actual Costs</div>
            </div>
            
            <div className={`text-center p-4 rounded-lg ${
              financials.profit_to_date > 0 ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <TrendingUp className={`h-6 w-6 mx-auto mb-2 ${
                financials.profit_to_date > 0 ? 'text-green-600' : 'text-red-600'
              }`} />
              <div className={`text-2xl font-bold ${
                financials.profit_to_date > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ${financials.profit_to_date.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Profit to Date</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Calculator className="h-6 w-6 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold text-purple-600">
                {financials.margin_percentage.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Profit Margin</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="projections">Projections</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Budget vs Actual */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Budget vs Actual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Budget Utilization</span>
                  <span className="font-bold">
                    {((financials.actual_costs / totalRevenue) * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={(financials.actual_costs / totalRevenue) * 100} 
                  className="h-2"
                />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Original Budget:</span>
                    <span>${financials.budget.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Change Orders:</span>
                    <span className={financials.change_orders_value >= 0 ? 'text-green-600' : 'text-red-600'}>
                      ${financials.change_orders_value.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Adjusted Budget:</span>
                    <span>${totalRevenue.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Project Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {financials.margin_percentage < 5 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Profit margin is below 5%. Review costs and pricing.
                    </AlertDescription>
                  </Alert>
                )}
                
                {financials.actual_costs > totalRevenue * 0.8 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Project has used 80%+ of budget. Monitor remaining costs carefully.
                    </AlertDescription>
                  </Alert>
                )}

                {financials.change_orders_value > financials.budget * 0.1 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Change orders exceed 10% of original budget.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="text-sm text-muted-foreground">
                  Last updated: {lastUpdated.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(financials.cost_breakdown).map(([category, amount]) => {
                  const percentage = totalCosts > 0 ? (amount / totalCosts) * 100 : 0;
                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="capitalize font-medium">{category}</span>
                        <div className="text-right">
                          <div className="font-bold">${amount.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">
                            {percentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(financials.revenue_breakdown).map(([source, amount]) => {
                  const percentage = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
                  return (
                    <div key={source} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="capitalize font-medium">
                          {source.replace('_', ' ')}
                        </span>
                        <div className="text-right">
                          <div className="font-bold">${amount.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">
                            {percentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Projections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Estimated Final Cost</div>
                  <div className="text-2xl font-bold">
                    ${financials.estimated_completion_cost.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Projected Final Profit</div>
                  <div className={`text-2xl font-bold ${
                    financials.projected_final_profit > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${financials.projected_final_profit.toLocaleString()}
                  </div>
                </div>
              </div>
              
              <Alert>
                <AlertDescription>
                  Projections are based on current spending trends and may change as the project progresses.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export P&L Report
        </Button>
        <Button variant="outline">
          <BarChart3 className="h-4 w-4 mr-2" />
          View Job Costing
        </Button>
      </div>
    </div>
  );
};

export default ProjectProfitLoss;