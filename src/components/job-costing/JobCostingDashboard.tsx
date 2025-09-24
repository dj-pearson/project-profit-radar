import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Users,
  Calendar,
  Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface JobCostingDashboardProps {
  projectId: string;
}

interface JobCostingSummary {
  total_budgeted: number;
  total_actual: number;
  total_variance: number;
  variance_percentage: number;
  labor_budgeted: number;
  labor_actual: number;
  materials_budgeted: number;
  materials_actual: number;
  equipment_budgeted: number;
  equipment_actual: number;
  profit_margin_percentage: number;
}

interface CostBreakdown {
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
  percentage: number;
}

export const JobCostingDashboard: React.FC<JobCostingDashboardProps> = ({ projectId }) => {
  const [summary, setSummary] = useState<JobCostingSummary | null>(null);
  const [breakdown, setBreakdown] = useState<CostBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      loadJobCostingData();
    }
  }, [projectId]);

  const loadJobCostingData = async () => {
    try {
      // Load job costing summary
      const { data: summaryData } = await supabase
        .from('job_costing_summary')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (summaryData) {
        setSummary(summaryData);
        
        // Create breakdown from summary data
        const breakdownData: CostBreakdown[] = [
          {
            category: 'Labor',
            budgeted: summaryData.labor_budgeted || 0,
            actual: summaryData.labor_actual || 0,
            variance: (summaryData.labor_actual || 0) - (summaryData.labor_budgeted || 0),
            percentage: summaryData.labor_budgeted ? (summaryData.labor_actual / summaryData.labor_budgeted) * 100 : 0
          },
          {
            category: 'Materials',
            budgeted: summaryData.materials_budgeted || 0,
            actual: summaryData.materials_actual || 0,
            variance: (summaryData.materials_actual || 0) - (summaryData.materials_budgeted || 0),
            percentage: summaryData.materials_budgeted ? (summaryData.materials_actual / summaryData.materials_budgeted) * 100 : 0
          },
          {
            category: 'Equipment',
            budgeted: summaryData.equipment_budgeted || 0,
            actual: summaryData.equipment_actual || 0,
            variance: (summaryData.equipment_actual || 0) - (summaryData.equipment_budgeted || 0),
            percentage: summaryData.equipment_budgeted ? (summaryData.equipment_actual / summaryData.equipment_budgeted) * 100 : 0
          }
        ];
        
        setBreakdown(breakdownData);
      }
    } catch (error) {
      console.error('Error loading job costing data:', error);
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

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-destructive';
    if (variance < 0) return 'text-green-600';
    return 'text-muted-foreground';
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <TrendingUp className="h-4 w-4" />;
    if (variance < 0) return <TrendingDown className="h-4 w-4" />;
    return null;
  };

  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(8)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Budget</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(summary?.total_budgeted || 0)}
                </p>
              </div>
              <Target className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Actual Costs</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(summary?.total_actual || 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Variance</p>
                <div className="flex items-center gap-2">
                  <p className={cn("text-2xl font-bold", getVarianceColor(summary?.total_variance || 0))}>
                    {formatCurrency(summary?.total_variance || 0)}
                  </p>
                  {getVarianceIcon(summary?.total_variance || 0)}
                </div>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Profit Margin</p>
                <p className="text-2xl font-bold text-green-600">
                  {(summary?.profit_margin_percentage || 0).toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cost Breakdown by Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {breakdown.map((item) => (
              <div key={item.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.category}</span>
                  <Badge variant={item.variance > 0 ? "destructive" : "secondary"}>
                    {item.percentage.toFixed(1)}%
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Budget: {formatCurrency(item.budgeted)}</span>
                    <span>Actual: {formatCurrency(item.actual)}</span>
                  </div>
                  <Progress 
                    value={Math.min(item.percentage, 100)} 
                    className="h-2"
                  />
                  <div className="text-xs text-right">
                    <span className={getVarianceColor(item.variance)}>
                      {item.variance > 0 ? '+' : ''}{formatCurrency(item.variance)} variance
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Indicators</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Budget Performance</p>
                  <p className="text-xs text-muted-foreground">
                    {summary?.variance_percentage && summary.variance_percentage > 0 ? 'Over' : 'Under'} budget
                  </p>
                </div>
              </div>
              <Badge variant={summary?.variance_percentage && summary.variance_percentage > 10 ? "destructive" : "secondary"}>
                {Math.abs(summary?.variance_percentage || 0).toFixed(1)}%
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Profit Margin</p>
                  <p className="text-xs text-muted-foreground">Current project margin</p>
                </div>
              </div>
              <Badge variant={summary?.profit_margin_percentage && summary.profit_margin_percentage > 15 ? "default" : "secondary"}>
                {(summary?.profit_margin_percentage || 0).toFixed(1)}%
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Labor Efficiency</p>
                  <p className="text-xs text-muted-foreground">Labor cost performance</p>
                </div>
              </div>
              <Badge variant="outline">
                {summary?.labor_budgeted && summary.labor_actual 
                  ? ((summary.labor_actual / summary.labor_budgeted) * 100).toFixed(1)
                  : '0'}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};