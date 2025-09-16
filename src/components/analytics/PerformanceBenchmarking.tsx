import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  RefreshCw,
  Target,
  Award,
  AlertCircle
} from 'lucide-react';

interface BenchmarkMetrics {
  industryComparison: {
    avgProfitMargin: number;
    avgCompletionRate: number;
    avgBudgetVariance: number;
    avgSafetyIncidents: number;
    avgClientSatisfaction: number;
    avgProductivity: number;
  };
  performanceMetrics: Array<{
    metric: string;
    current: number;
    target: number;
    benchmark: number;
    trend: string;
  }>;
  competitiveAnalysis: {
    marketPosition: number;
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  historicalTrends: Array<{
    month: string;
    performance: number;
    industry: number;
  }>;
  improvementOpportunities: Array<{
    area: string;
    currentScore: number;
    potentialScore: number;
    impact: string;
    difficulty: string;
    actions: string[];
  }>;
  kpiDashboard: {
    overallScore: number;
    categories: Array<{
      name: string;
      score: number;
      trend: string;
    }>;
  };
}

export default function PerformanceBenchmarking() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkMetrics | null>(null);

  useEffect(() => {
    if (profile?.company_id) {
      loadBenchmarkData();
    }
  }, [profile]);

  const loadBenchmarkData = async () => {
    if (!profile?.company_id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-performance-benchmarks', {
        body: { company_id: profile.company_id }
      });

      if (error) throw error;

      setBenchmarkData(data);
      toast({
        title: "Performance Benchmarks Updated",
        description: "Latest industry comparisons have been loaded."
      });
    } catch (error: any) {
      console.error('Error loading benchmark data:', error);
      toast({
        title: "Error Loading Benchmarks",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (percentile: number) => {
    if (percentile >= 80) return "text-green-600 bg-green-50";
    if (percentile >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return "text-red-600 bg-red-50";
      case 'medium': return "text-yellow-600 bg-yellow-50";
      case 'low': return "text-green-600 bg-green-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const chartConfig = {
    performance: {
      label: "Your Performance",
      color: "hsl(var(--primary))",
    },
    industry: {
      label: "Industry Average",
      color: "hsl(var(--muted-foreground))",
    },
  };

  if (loading && !benchmarkData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Generating performance benchmarks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Performance Benchmarking</h2>
          <p className="text-muted-foreground">
            Compare your performance against industry standards and top performers
          </p>
        </div>
        <Button onClick={loadBenchmarkData} disabled={loading}>
          {loading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Update Benchmarks
        </Button>
      </div>

      {benchmarkData && (
        <>
          {/* KPI Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{benchmarkData.kpiDashboard.overallScore}</div>
                <Progress value={benchmarkData.kpiDashboard.overallScore} className="mt-2" />
              </CardContent>
            </Card>
            
            {benchmarkData.kpiDashboard.categories.map((category) => (
              <Card key={category.name}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    {category.name}
                    {getTrendIcon(category.trend)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{category.score}</div>
                  <Progress value={category.score} className="mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed Analysis Tabs */}
          <Tabs defaultValue="comparison" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="comparison">Industry Comparison</TabsTrigger>
              <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
              <TabsTrigger value="competitive">Competitive Analysis</TabsTrigger>
              <TabsTrigger value="trends">Historical Trends</TabsTrigger>
              <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
            </TabsList>

            <TabsContent value="comparison" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Industry Comparison</CardTitle>
                  <CardDescription>
                    How your company performs compared to industry averages
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Profit Margin', yours: benchmarkData.performanceMetrics.find(m => m.metric === 'Profit Margin')?.current || 0, industry: benchmarkData.industryComparison.avgProfitMargin },
                        { name: 'Completion Rate', yours: benchmarkData.performanceMetrics.find(m => m.metric === 'Project Success Rate')?.current || 0, industry: benchmarkData.industryComparison.avgCompletionRate },
                        { name: 'Budget Control', yours: 100 - (benchmarkData.performanceMetrics.find(m => m.metric === 'Budget Variance')?.current || 0), industry: 100 - benchmarkData.industryComparison.avgBudgetVariance }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="yours" fill="hsl(var(--primary))" name="Your Company" />
                        <Bar dataKey="industry" fill="hsl(var(--muted-foreground))" name="Industry Average" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          vs Industry Average
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-sm px-2 py-1 rounded-md ${getPerformanceColor(benchmarkData.competitiveAnalysis.marketPosition)}`}>
                          {benchmarkData.competitiveAnalysis.marketPosition}th percentile
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Award className="h-4 w-4" />
                          vs Top Performers
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-muted-foreground">
                          Gap analysis vs 95th percentile
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Key Insights
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-muted-foreground">
                          {benchmarkData.competitiveAnalysis.strengths.length} strengths identified
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {benchmarkData.performanceMetrics.map((metric) => (
                  <Card key={metric.metric}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {metric.metric}
                        {getTrendIcon(metric.trend)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-2xl font-bold">{metric.current}%</div>
                          <div className="text-sm text-muted-foreground">Current</div>
                        </div>
                        <div>
                          <div className="text-xl text-primary">{metric.target}%</div>
                          <div className="text-sm text-muted-foreground">Target</div>
                        </div>
                        <div>
                          <div className="text-xl text-muted-foreground">{metric.benchmark}%</div>
                          <div className="text-sm text-muted-foreground">Industry Avg</div>
                        </div>
                      </div>
                      <Progress 
                        value={(metric.current / metric.target) * 100} 
                        className="mb-2" 
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0%</span>
                        <span>{metric.target}% (Target)</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="competitive" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Competitive Position</CardTitle>
                    <CardDescription>Radar chart showing your position across key metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={[
                          { metric: 'Profitability', yours: 80, industry: 75 },
                          { metric: 'Efficiency', yours: 75, industry: 80 },
                          { metric: 'Quality', yours: 85, industry: 78 },
                          { metric: 'Safety', yours: 70, industry: 82 },
                          { metric: 'Innovation', yours: 60, industry: 65 }
                        ]}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="metric" />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} />
                          <Radar
                            name="Your Company"
                            dataKey="yours"
                            stroke="hsl(var(--primary))"
                            fill="hsl(var(--primary))"
                            fillOpacity={0.3}
                          />
                          <Radar
                            name="Industry Average"
                            dataKey="industry"
                            stroke="hsl(var(--muted-foreground))"
                            fill="hsl(var(--muted-foreground))"
                            fillOpacity={0.1}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-green-600">Strengths</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {benchmarkData.competitiveAnalysis.strengths.map((strength, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-red-600">Areas for Improvement</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {benchmarkData.competitiveAnalysis.weaknesses.map((weakness, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                            {weakness}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Trends</CardTitle>
                  <CardDescription>
                    12-month performance comparison with industry benchmarks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={benchmarkData.historicalTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="performance" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          name="Your Performance"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="industry" 
                          stroke="hsl(var(--muted-foreground))" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name="Industry Average"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="opportunities" className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {benchmarkData.improvementOpportunities.map((opportunity, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {opportunity.area}
                        <Badge className={getImpactColor(opportunity.impact)}>
                          {opportunity.impact} impact
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Current Score</div>
                          <div className="text-2xl font-bold">{opportunity.currentScore}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Potential Score</div>
                          <div className="text-2xl font-bold text-green-600">{opportunity.potentialScore}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Improvement</div>
                          <div className="text-2xl font-bold text-primary">
                            +{opportunity.potentialScore - opportunity.currentScore}
                          </div>
                        </div>
                      </div>
                      
                      <Progress 
                        value={(opportunity.currentScore / 100) * 100} 
                        className="mb-4" 
                      />
                      
                      <div>
                        <div className="text-sm font-medium mb-2">Recommended Actions:</div>
                        <ul className="space-y-1">
                          {opportunity.actions.map((action, actionIndex) => (
                            <li key={actionIndex} className="flex items-center gap-2 text-sm">
                              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                        <span>Difficulty: <Badge variant="outline">{opportunity.difficulty}</Badge></span>
                        <span>Impact: <Badge variant="outline">{opportunity.impact}</Badge></span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}