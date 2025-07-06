import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  Target,
  Award,
  BarChart3,
  Users,
  DollarSign,
  Clock,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface BenchmarkMetrics {
  industryComparison: {
    category: string;
    yourScore: number;
    industryAverage: number;
    topPercentile: number;
    rank: string;
    improvement: number;
  }[];
  performanceMetrics: {
    metric: string;
    current: number;
    target: number;
    benchmark: number;
    trend: 'up' | 'down' | 'stable';
    percentile: number;
    unit: string;
  }[];
  competitiveAnalysis: {
    companySize: string;
    profitMargin: number;
    projectSuccessRate: number;
    timelyDelivery: number;
    customerSatisfaction: number;
    costEfficiency: number;
    yourRanking: number;
    totalCompanies: number;
  };
  historicalTrends: Array<{
    period: string;
    efficiency: number;
    profitability: number;
    quality: number;
    timeline: number;
    industryAvg: number;
  }>;
  improvementOpportunities: Array<{
    area: string;
    currentScore: number;
    potentialScore: number;
    impact: 'high' | 'medium' | 'low';
    difficulty: 'easy' | 'medium' | 'hard';
    timeframe: string;
    actions: string[];
  }>;
  kpiDashboard: {
    projectSuccessRate: { value: number; target: number; benchmark: number };
    avgProfitMargin: { value: number; target: number; benchmark: number };
    clientRetentionRate: { value: number; target: number; benchmark: number };
    timeToCompletion: { value: number; target: number; benchmark: number };
    costVariance: { value: number; target: number; benchmark: number };
    qualityScore: { value: number; target: number; benchmark: number };
  };
}

const PerformanceBenchmarking = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkMetrics | null>(null);

  useEffect(() => {
    if (userProfile?.company_id) {
      loadBenchmarkData();
    }
  }, [userProfile]);

  const loadBenchmarkData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-performance-benchmarks', {
        body: { company_id: userProfile?.company_id }
      });

      if (error) throw error;
      setBenchmarkData(data);
    } catch (error: any) {
      console.error('Error loading benchmark data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load performance benchmarks"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (percentile: number) => {
    if (percentile >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (percentile >= 75) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (percentile >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowUp className="h-4 w-4 text-green-600" />;
      case 'down': return <ArrowDown className="h-4 w-4 text-red-600" />;
      case 'stable': return <Minus className="h-4 w-4 text-gray-600" />;
      default: return null;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const chartConfig = {
    yourScore: {
      label: "Your Score",
      color: "hsl(var(--chart-1))",
    },
    industryAverage: {
      label: "Industry Average",
      color: "hsl(var(--chart-2))",
    },
    topPercentile: {
      label: "Top 10%",
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
          <Trophy className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Performance Benchmarking</h2>
            <p className="text-muted-foreground">Compare your performance against industry standards and competitors</p>
          </div>
        </div>
        <Button onClick={loadBenchmarkData} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Update Benchmarks
        </Button>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {benchmarkData?.kpiDashboard && Object.entries(benchmarkData.kpiDashboard).map(([key, kpi]) => {
          const percentile = (kpi.value / kpi.benchmark) * 100;
          const isAboveTarget = kpi.value >= kpi.target;
          
          return (
            <Card key={key}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">{kpi.value.toFixed(1)}{key.includes('Rate') || key.includes('Margin') ? '%' : key.includes('Time') ? ' days' : ''}</div>
                    <Badge className={getPerformanceColor(percentile)}>
                      {Math.round(percentile)}th percentile
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Target: {kpi.target.toFixed(1)}</span>
                      <span>Benchmark: {kpi.benchmark.toFixed(1)}</span>
                    </div>
                    <Progress value={(kpi.value / kpi.benchmark) * 100} className="h-2" />
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${isAboveTarget ? 'text-green-600' : 'text-red-600'}`}>
                    {isAboveTarget ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    <span>{isAboveTarget ? 'Above' : 'Below'} target</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="comparison" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="comparison">Industry Comparison</TabsTrigger>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
          <TabsTrigger value="competitive">Competitive Analysis</TabsTrigger>
          <TabsTrigger value="trends">Historical Trends</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Industry Benchmark Comparison</CardTitle>
              <CardDescription>How you stack up against industry averages and top performers</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[400px]">
                <BarChart data={benchmarkData?.industryComparison || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="yourScore" fill="var(--color-yourScore)" name="Your Score" />
                  <Bar dataKey="industryAverage" fill="var(--color-industryAverage)" name="Industry Average" />
                  <Bar dataKey="topPercentile" fill="var(--color-topPercentile)" name="Top 10%" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benchmarkData?.industryComparison.map((item) => (
              <Card key={item.category}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span>{item.category}</span>
                    <Badge className={getPerformanceColor((item.yourScore / item.topPercentile) * 100)}>
                      {item.rank}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Your Score</span>
                      <span className="font-bold">{item.yourScore.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Industry Average</span>
                      <span>{item.industryAverage.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Top 10%</span>
                      <span>{item.topPercentile.toFixed(1)}</span>
                    </div>
                    <div className={`flex items-center gap-1 text-sm ${item.improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {item.improvement >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      <span>{Math.abs(item.improvement).toFixed(1)}% vs last quarter</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics Dashboard</CardTitle>
              <CardDescription>Key performance indicators with targets and benchmarks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {benchmarkData?.performanceMetrics.map((metric) => (
                  <div key={metric.metric} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{metric.metric}</h4>
                        {getTrendIcon(metric.trend)}
                      </div>
                      <Badge className={getPerformanceColor(metric.percentile)}>
                        {metric.percentile}th percentile
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Current</div>
                        <div className="text-lg font-bold">{metric.current.toFixed(1)}{metric.unit}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Target</div>
                        <div className="text-lg">{metric.target.toFixed(1)}{metric.unit}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Benchmark</div>
                        <div className="text-lg">{metric.benchmark.toFixed(1)}{metric.unit}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Gap to Target</div>
                        <div className={`text-lg ${metric.current >= metric.target ? 'text-green-600' : 'text-red-600'}`}>
                          {(metric.current - metric.target).toFixed(1)}{metric.unit}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <Progress value={(metric.current / metric.benchmark) * 100} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitive" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Competitive Position</CardTitle>
              <CardDescription>Your ranking among similar-sized construction companies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">#{benchmarkData?.competitiveAnalysis.yourRanking}</div>
                    <div className="text-sm text-muted-foreground">
                      out of {benchmarkData?.competitiveAnalysis.totalCompanies} companies
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Company Size: {benchmarkData?.competitiveAnalysis.companySize}
                    </div>
                  </div>
                </div>
                
                <div>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <RadarChart data={[
                      { metric: 'Profit Margin', score: benchmarkData?.competitiveAnalysis.profitMargin || 0 },
                      { metric: 'Success Rate', score: benchmarkData?.competitiveAnalysis.projectSuccessRate || 0 },
                      { metric: 'Timely Delivery', score: benchmarkData?.competitiveAnalysis.timelyDelivery || 0 },
                      { metric: 'Customer Satisfaction', score: benchmarkData?.competitiveAnalysis.customerSatisfaction || 0 },
                      { metric: 'Cost Efficiency', score: benchmarkData?.competitiveAnalysis.costEfficiency || 0 }
                    ]}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar
                        name="Your Performance"
                        dataKey="score"
                        stroke="var(--color-yourScore)"
                        fill="var(--color-yourScore)"
                        fillOpacity={0.3}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </RadarChart>
                  </ChartContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historical Performance Trends</CardTitle>
              <CardDescription>Your performance evolution over time vs industry averages</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[400px]">
                <LineChart data={benchmarkData?.historicalTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="efficiency"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    name="Efficiency"
                  />
                  <Line
                    type="monotone"
                    dataKey="profitability"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    name="Profitability"
                  />
                  <Line
                    type="monotone"
                    dataKey="quality"
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={2}
                    name="Quality"
                  />
                  <Line
                    type="monotone"
                    dataKey="timeline"
                    stroke="hsl(var(--chart-4))"
                    strokeWidth={2}
                    name="Timeline"
                  />
                  <Line
                    type="monotone"
                    dataKey="industryAvg"
                    stroke="hsl(var(--chart-5))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Industry Average"
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {benchmarkData?.improvementOpportunities.map((opportunity, index) => (
              <Card key={index} className="border-l-4 border-l-primary">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{opportunity.area}</span>
                    <div className="flex items-center space-x-2">
                      <Badge className={getImpactColor(opportunity.impact)}>
                        {opportunity.impact.toUpperCase()} IMPACT
                      </Badge>
                      <Badge variant="outline">
                        {opportunity.difficulty} to implement
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Current Score</div>
                        <div className="text-2xl font-bold">{opportunity.currentScore.toFixed(1)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Potential Score</div>
                        <div className="text-2xl font-bold text-green-600">{opportunity.potentialScore.toFixed(1)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Improvement</div>
                        <div className="text-2xl font-bold text-blue-600">
                          +{(opportunity.potentialScore - opportunity.currentScore).toFixed(1)}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium mb-2">Timeframe: {opportunity.timeframe}</div>
                      <Progress 
                        value={(opportunity.currentScore / opportunity.potentialScore) * 100} 
                        className="h-2 mb-3" 
                      />
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium mb-2">Recommended Actions:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {opportunity.actions.map((action, actionIndex) => (
                          <li key={actionIndex} className="text-sm text-muted-foreground">{action}</li>
                        ))}
                      </ul>
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

export default PerformanceBenchmarking;