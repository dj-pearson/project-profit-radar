import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { 
  AlertTriangle, 
  Target, 
  Clock,
  Activity,
  Brain,
  Lightbulb
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PredictiveMetrics {
  projectCompletionPredictions: Array<{
    projectId: string;
    projectName: string;
    predictedEndDate: string;
    originalEndDate: string;
    confidenceScore: number;
    delayRisk: 'low' | 'medium' | 'high';
    delayDays: number;
  }>;
  budgetForecasting: Array<{
    projectId: string;
    projectName: string;
    predictedFinalCost: number;
    originalBudget: number;
    variancePercentage: number;
    overrunRisk: 'low' | 'medium' | 'high';
  }>;
  resourceDemandForecast: Array<{
    period: string;
    predictedLaborHours: number;
    predictedEquipmentNeeds: number;
    predictedMaterialCosts: number;
    capacity: number;
    utilization: number;
  }>;
  trendPredictions: Array<{
    month: string;
    predictedRevenue: number;
    predictedProjects: number;
    marketTrend: 'growing' | 'stable' | 'declining';
    confidence: number;
  }>;
}

const PredictiveAnalytics = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<PredictiveMetrics | null>(null);

  useEffect(() => {
    if (userProfile?.company_id) {
      loadPredictiveAnalytics();
    }
  }, [userProfile]);

  const loadPredictiveAnalytics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-predictive-analytics', {
        body: { company_id: userProfile?.company_id }
      });

      if (error) throw error;
      setPredictions(data);
    } catch (error: any) {
      console.error('Error loading predictive analytics:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load predictive analytics"
      });
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const chartConfig = {
    predicted: {
      label: "Predicted",
      color: "hsl(var(--chart-1))",
    },
    actual: {
      label: "Actual", 
      color: "hsl(var(--chart-2))",
    },
    confidence: {
      label: "Confidence",
      color: "hsl(var(--chart-3))",
    }
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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Brain className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Predictive Analytics</h2>
            <p className="text-muted-foreground">AI-powered project insights and forecasting</p>
          </div>
        </div>
        <Button onClick={loadPredictiveAnalytics} disabled={loading}>
          <Activity className="h-4 w-4 mr-2" />
          Refresh Predictions
        </Button>
      </div>

      <Tabs defaultValue="completion" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="completion">Project Completion</TabsTrigger>
          <TabsTrigger value="budget">Budget Forecasting</TabsTrigger>
          <TabsTrigger value="resources">Resource Demand</TabsTrigger>
          <TabsTrigger value="trends">Market Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="completion" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-600" />
                  On Track
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {predictions?.projectCompletionPredictions.filter(p => p.delayRisk === 'low').length || 0}
                </div>
                <p className="text-sm text-muted-foreground">Projects</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  At Risk
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {predictions?.projectCompletionPredictions.filter(p => p.delayRisk === 'medium').length || 0}
                </div>
                <p className="text-sm text-muted-foreground">Projects</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  High Risk
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {predictions?.projectCompletionPredictions.filter(p => p.delayRisk === 'high').length || 0}
                </div>
                <p className="text-sm text-muted-foreground">Projects</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Project Completion Predictions</CardTitle>
              <CardDescription>AI predictions based on historical data and current progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {predictions?.projectCompletionPredictions.map((project) => (
                  <div key={project.projectId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{project.projectName}</h4>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Original: </span>
                          {new Date(project.originalEndDate).toLocaleDateString()}
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Predicted: </span>
                          {new Date(project.predictedEndDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <Badge className={getRiskColor(project.delayRisk)}>
                          {project.delayRisk.toUpperCase()} RISK
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {project.delayDays > 0 ? `+${project.delayDays} days` : 'On time'}
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">{Math.round(project.confidenceScore * 100)}%</div>
                        <p className="text-xs text-muted-foreground">Confidence</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Budget Variance Predictions</CardTitle>
              <CardDescription>Forecasted final costs vs original budgets</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[400px]">
                <BarChart data={predictions?.budgetForecasting || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="projectName" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value, name) => [`$${Number(value).toLocaleString()}`, name]}
                  />
                  <Bar dataKey="originalBudget" fill="var(--color-actual)" name="Original Budget" />
                  <Bar dataKey="predictedFinalCost" fill="var(--color-predicted)" name="Predicted Cost" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Budget Overrun Risks</CardTitle>
              <CardDescription>Projects with potential budget issues</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {predictions?.budgetForecasting
                  .filter(p => p.overrunRisk === 'high' || p.overrunRisk === 'medium')
                  .map((project) => (
                    <div key={project.projectId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{project.projectName}</h4>
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Budget: </span>
                            ${project.originalBudget.toLocaleString()}
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Predicted: </span>
                            ${project.predictedFinalCost.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge className={getRiskColor(project.overrunRisk)}>
                          {project.overrunRisk.toUpperCase()} RISK
                        </Badge>
                        <div className="text-center">
                          <div className={`text-lg font-bold ${project.variancePercentage > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {project.variancePercentage > 0 ? '+' : ''}{project.variancePercentage.toFixed(1)}%
                          </div>
                          <p className="text-xs text-muted-foreground">Variance</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resource Demand Forecast</CardTitle>
              <CardDescription>Predicted resource needs over the next 12 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[400px]">
                <LineChart data={predictions?.resourceDemandForecast || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="predictedLaborHours"
                    stroke="var(--color-predicted)"
                    strokeWidth={2}
                    name="Labor Hours"
                  />
                  <Line
                    type="monotone"
                    dataKey="capacity"
                    stroke="var(--color-actual)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Capacity"
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-blue-600" />
                  Peak Demand Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {predictions?.resourceDemandForecast.reduce((max, curr) => 
                    curr.predictedLaborHours > max.predictedLaborHours ? curr : max, 
                    predictions?.resourceDemandForecast[0] || { predictedLaborHours: 0, period: 'N/A' }
                  ).period || 'N/A'}
                </div>
                <p className="text-sm text-muted-foreground">Highest labor demand</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Avg Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(predictions?.resourceDemandForecast.reduce((sum, curr) => sum + curr.utilization, 0) / (predictions?.resourceDemandForecast.length || 1) || 0)}%
                </div>
                <p className="text-sm text-muted-foreground">Next 12 months</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Capacity Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {predictions?.resourceDemandForecast.filter(p => p.utilization > 85).length || 0}
                </div>
                <p className="text-sm text-muted-foreground">Over-utilization periods</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Market Trend Predictions</CardTitle>
              <CardDescription>Revenue and project volume forecasting</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[400px]">
                <LineChart data={predictions?.trendPredictions || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value, name) => [
                      name === 'Predicted Revenue' ? `$${Number(value).toLocaleString()}` : value,
                      name
                    ]}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="predictedRevenue"
                    stroke="var(--color-predicted)"
                    strokeWidth={2}
                    name="Predicted Revenue"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="predictedProjects"
                    stroke="var(--color-confidence)"
                    strokeWidth={2}
                    name="Project Count"
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {predictions?.trendPredictions.slice(0, 3).map((trend, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    {trend.month}
                    <Badge variant={
                      trend.marketTrend === 'growing' ? 'default' :
                      trend.marketTrend === 'stable' ? 'secondary' : 'destructive'
                    }>
                      {trend.marketTrend}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <div className="text-lg font-bold">${(trend.predictedRevenue / 1000).toFixed(0)}K</div>
                      <p className="text-xs text-muted-foreground">Predicted Revenue</p>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{trend.predictedProjects}</div>
                      <p className="text-xs text-muted-foreground">Projects</p>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Confidence: {Math.round(trend.confidence * 100)}%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PredictiveAnalytics;