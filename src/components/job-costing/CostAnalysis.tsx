import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CostAnalysisProps {
  projectId: string;
}

interface CostData {
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
  percentage: number;
}

interface TrendData {
  period: string;
  costs: number;
  budget: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const CostAnalysis: React.FC<CostAnalysisProps> = ({ projectId }) => {
  const [costData, setCostData] = useState<CostData[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [timeRange, setTimeRange] = useState('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      loadAnalysisData();
    }
  }, [projectId, timeRange]);

  const loadAnalysisData = async () => {
    try {
      // Load budget vs actual data by category
      const { data: budgetData } = await supabase
        .from('budget_line_items')
        .select('category, budgeted_total, actual_total')
        .eq('project_id', projectId);

      if (budgetData) {
        // Aggregate by category
        const categoryTotals = budgetData.reduce((acc, item) => {
          if (!acc[item.category]) {
            acc[item.category] = { budgeted: 0, actual: 0 };
          }
          acc[item.category].budgeted += item.budgeted_total || 0;
          acc[item.category].actual += item.actual_total || 0;
          return acc;
        }, {} as Record<string, { budgeted: number; actual: number }>);

        const costAnalysis: CostData[] = Object.entries(categoryTotals).map(([category, data]) => ({
          category: category.charAt(0).toUpperCase() + category.slice(1),
          budgeted: data.budgeted,
          actual: data.actual,
          variance: data.actual - data.budgeted,
          percentage: data.budgeted > 0 ? (data.actual / data.budgeted) * 100 : 0
        }));

        setCostData(costAnalysis);
      }

      // Generate sample trend data (in real implementation, this would come from historical data)
      const trends: TrendData[] = [
        { period: 'Week 1', costs: 25000, budget: 28000 },
        { period: 'Week 2', costs: 32000, budget: 30000 },
        { period: 'Week 3', costs: 28000, budget: 25000 },
        { period: 'Week 4', costs: 35000, budget: 32000 },
        { period: 'Week 5', costs: 42000, budget: 38000 },
        { period: 'Week 6', costs: 38000, budget: 40000 }
      ];

      setTrendData(trends);
    } catch (error) {
      console.error('Error loading analysis data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTotalVariance = () => {
    return costData.reduce((sum, item) => sum + item.variance, 0);
  };

  const getWorstPerformer = () => {
    return costData.reduce((worst, current) => 
      current.variance > worst.variance ? current : worst,
      costData[0] || { category: 'N/A', variance: 0 }
    );
  };

  const getBestPerformer = () => {
    return costData.reduce((best, current) => 
      current.variance < best.variance ? current : best,
      costData[0] || { category: 'N/A', variance: 0 }
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading analysis...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Analysis Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cost Performance Analysis</CardTitle>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Variance</p>
                <p className={`text-2xl font-bold ${getTotalVariance() > 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {formatCurrency(getTotalVariance())}
                </p>
              </div>
              {getTotalVariance() > 0 ? 
                <TrendingUp className="h-8 w-8 text-destructive" /> :
                <TrendingDown className="h-8 w-8 text-green-600" />
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Worst Performer</p>
                <p className="text-lg font-semibold">{getWorstPerformer().category}</p>
                <p className="text-sm text-destructive">
                  {formatCurrency(getWorstPerformer().variance)} over
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Best Performer</p>
                <p className="text-lg font-semibold">{getBestPerformer().category}</p>
                <p className="text-sm text-green-600">
                  {formatCurrency(Math.abs(getBestPerformer().variance))} under
                </p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget vs Actual Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Budget vs Actual by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={costData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), '']} />
                <Bar dataKey="budgeted" fill="#8884d8" name="Budget" />
                <Bar dataKey="actual" fill="#82ca9d" name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={costData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="actual"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {costData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Actual Cost']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cost Trend Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Trend Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => [formatCurrency(Number(value)), '']} />
              <Line type="monotone" dataKey="budget" stroke="#8884d8" strokeDasharray="5 5" name="Budget" />
              <Line type="monotone" dataKey="costs" stroke="#82ca9d" name="Actual Costs" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Cost Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Category Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {costData.map((item, index) => (
              <div key={item.category} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold">{item.category}</h4>
                  <Badge variant={item.variance > 0 ? "destructive" : "secondary"}>
                    {item.variance > 0 ? 'Over Budget' : 'Under Budget'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Budget</p>
                    <p className="text-lg font-medium">{formatCurrency(item.budgeted)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Actual</p>
                    <p className="text-lg font-medium">{formatCurrency(item.actual)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Variance</p>
                    <p className={`text-lg font-medium ${item.variance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                      {item.variance > 0 ? '+' : ''}{formatCurrency(item.variance)}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Performance</span>
                    <span>{item.percentage.toFixed(1)}% of budget</span>
                  </div>
                  <Progress 
                    value={Math.min(item.percentage, 150)} 
                    className="h-2"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};