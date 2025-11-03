import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Target,
  BarChart3,
  Lightbulb,
  Users,
  DollarSign,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface Insight {
  id: string;
  type: 'recommendation' | 'prediction' | 'alert' | 'opportunity';
  category: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  action_items: string[];
  metrics?: {
    current: number;
    predicted: number;
    improvement: number;
  };
}

interface Benchmark {
  metric: string;
  your_value: number;
  industry_average: number;
  top_quartile: number;
  performance: 'above' | 'average' | 'below';
}

export const AIInsights = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);

  useEffect(() => {
    loadInsightsData();
  }, []);

  const loadInsightsData = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would call an AI service or edge function
      // For now, we'll generate sample insights based on user data

      // Load user health score
      const { data: healthData } = await (supabase as any)
        .from('user_health_scores')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      // Load user metrics
      const { data: metricsData } = await (supabase as any)
        .from('revenue_metrics')
        .select('*')
        .order('period_start', { ascending: false })
        .limit(3);

      // Generate personalized insights
      const generatedInsights: Insight[] = [];

      // Recommendation: Feature adoption
      if (healthData && healthData.health_score < 70) {
        generatedInsights.push({
          id: '1',
          type: 'recommendation',
          category: 'feature_adoption',
          title: 'Increase feature adoption to boost productivity',
          description: "You're only using 40% of BuildDesk features. Enabling time tracking and automated workflows could save you 10+ hours per week.",
          impact: 'high',
          confidence: 85,
          action_items: [
            'Enable automated time tracking for your team',
            'Set up recurring invoice automation',
            'Create daily report templates',
          ],
          metrics: {
            current: 40,
            predicted: 75,
            improvement: 35,
          },
        });
      }

      // Prediction: Revenue growth
      if (metricsData && metricsData.length > 0) {
        const latestMRR = metricsData[0].mrr;
        generatedInsights.push({
          id: '2',
          type: 'prediction',
          category: 'revenue',
          title: 'MRR predicted to grow 23% next quarter',
          description: 'Based on your current growth rate and customer acquisition trends, your MRR is projected to reach $' + Math.round(latestMRR * 1.23).toLocaleString() + ' by next quarter.',
          impact: 'high',
          confidence: 78,
          action_items: [
            'Focus on customer retention to maintain growth',
            'Consider increasing marketing spend',
            'Upsell existing customers to higher-tier plans',
          ],
          metrics: {
            current: latestMRR,
            predicted: latestMRR * 1.23,
            improvement: 23,
          },
        });
      }

      // Alert: Potential churn risk
      generatedInsights.push({
        id: '3',
        type: 'alert',
        category: 'churn_risk',
        title: '3 customers at high risk of churning',
        description: "Three customers haven't logged in for 15+ days and have declining engagement scores. Immediate intervention recommended.",
        impact: 'high',
        confidence: 92,
        action_items: [
          'Send personalized outreach emails',
          'Schedule 1-on-1 check-in calls',
          'Offer exclusive training sessions',
        ],
      });

      // Opportunity: Referral program
      generatedInsights.push({
        id: '4',
        type: 'opportunity',
        category: 'growth',
        title: 'Referral program could add $2,400 MRR',
        description: 'Based on industry benchmarks, promoting your referral program more actively could generate 12 new customers in the next 3 months.',
        impact: 'medium',
        confidence: 71,
        action_items: [
          'Add referral CTA to dashboard',
          'Email customers about the referral program',
          'Increase referral reward to $75',
        ],
        metrics: {
          current: 0,
          predicted: 2400,
          improvement: 100,
        },
      });

      // Recommendation: Workflow automation
      generatedInsights.push({
        id: '5',
        type: 'recommendation',
        category: 'efficiency',
        title: 'Automate invoice reminders to save 5 hours/week',
        description: "You're manually following up on 15 overdue invoices per month. Setting up automated reminders could save significant time.",
        impact: 'medium',
        confidence: 88,
        action_items: [
          'Create automated invoice reminder workflow',
          'Set up 7-day, 14-day, and 30-day reminder sequence',
          'Enable payment link in reminder emails',
        ],
      });

      // Prediction: Project completion
      generatedInsights.push({
        id: '6',
        type: 'prediction',
        category: 'projects',
        title: '2 projects predicted to exceed budget',
        description: 'Based on current spending rates, "Downtown Plaza" and "Harbor Renovation" are 82% likely to exceed budgets by 15% and 8% respectively.',
        impact: 'high',
        confidence: 82,
        action_items: [
          'Review material costs and negotiate with vendors',
          'Optimize labor allocation',
          'Consider scope adjustments',
        ],
      });

      setInsights(generatedInsights);

      // Generate benchmarks
      const generatedBenchmarks: Benchmark[] = [
        {
          metric: 'Customer Churn Rate',
          your_value: 4.2,
          industry_average: 5.5,
          top_quartile: 2.8,
          performance: 'above',
        },
        {
          metric: 'Average Revenue Per User',
          your_value: 350,
          industry_average: 425,
          top_quartile: 600,
          performance: 'below',
        },
        {
          metric: 'Customer Lifetime Value',
          your_value: 4200,
          industry_average: 4800,
          top_quartile: 7200,
          performance: 'below',
        },
        {
          metric: 'Feature Adoption Rate',
          your_value: 68,
          industry_average: 65,
          top_quartile: 85,
          performance: 'average',
        },
        {
          metric: 'Net Revenue Retention',
          your_value: 112,
          industry_average: 105,
          top_quartile: 125,
          performance: 'above',
        },
        {
          metric: 'Time to Value (days)',
          your_value: 12,
          industry_average: 18,
          top_quartile: 7,
          performance: 'average',
        },
      ];

      setBenchmarks(generatedBenchmarks);
    } catch (error) {
      console.error('Failed to load insights:', error);
      toast({
        title: 'Error',
        description: 'Failed to load AI insights.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type: string) => {
    const icons = {
      recommendation: Lightbulb,
      prediction: TrendingUp,
      alert: AlertCircle,
      opportunity: Target,
    };
    return icons[type as keyof typeof icons] || Sparkles;
  };

  const getImpactBadge = (impact: string) => {
    const config = {
      high: { color: 'bg-red-500', label: 'High Impact' },
      medium: { color: 'bg-orange-500', label: 'Medium Impact' },
      low: { color: 'bg-yellow-500', label: 'Low Impact' },
    };
    const { color, label } = config[impact as keyof typeof config] || config.low;
    return <Badge className={`${color} text-white`}>{label}</Badge>;
  };

  const getPerformanceBadge = (performance: string) => {
    const config = {
      above: { color: 'bg-green-500', label: 'Above Average', icon: TrendingUp },
      average: { color: 'bg-blue-500', label: 'Average', icon: ArrowRight },
      below: { color: 'bg-orange-500', label: 'Below Average', icon: TrendingDown },
    };
    const { color, label, icon: Icon } = config[performance as keyof typeof config] || config.average;
    return (
      <Badge className={`${color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const formatMetric = (metric: string, value: number) => {
    if (metric.includes('Rate') || metric.includes('Adoption')) {
      return `${value}%`;
    }
    if (metric.includes('Revenue') || metric.includes('Value')) {
      return `$${value.toLocaleString()}`;
    }
    if (metric.includes('Time')) {
      return `${value} days`;
    }
    return value.toLocaleString();
  };

  if (loading) {
    return (
      <DashboardLayout title="AI Insights">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Sparkles className="w-12 h-12 text-construction-orange animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Generating AI insights...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const highImpactInsights = insights.filter(i => i.impact === 'high');
  const mediumImpactInsights = insights.filter(i => i.impact === 'medium');

  return (
    <DashboardLayout title="AI Insights">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-construction-dark flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-construction-orange" />
            AI Insights
          </h1>
          <p className="text-muted-foreground">
            Personalized recommendations and predictive insights powered by AI
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Insights</p>
                  <p className="text-2xl font-bold mt-2">{insights.length}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">High Priority</p>
                  <p className="text-2xl font-bold mt-2">{highImpactInsights.length}</p>
                </div>
                <div className="bg-red-100 p-3 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Opportunities</p>
                  <p className="text-2xl font-bold mt-2">
                    {insights.filter(i => i.type === 'opportunity').length}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Confidence</p>
                  <p className="text-2xl font-bold mt-2">
                    {Math.round(insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length)}%
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="insights">
          <TabsList>
            <TabsTrigger value="insights">Insights & Recommendations</TabsTrigger>
            <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          </TabsList>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-4">
            {/* High Impact */}
            <div>
              <h3 className="text-lg font-semibold mb-3">High Priority Insights</h3>
              <div className="space-y-3">
                {highImpactInsights.map((insight) => {
                  const Icon = getInsightIcon(insight.type);
                  return (
                    <Card key={insight.id} className="border-l-4 border-l-red-500">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="bg-purple-100 p-2 rounded-lg">
                              <Icon className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold mb-1">{insight.title}</h4>
                              <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {getImpactBadge(insight.impact)}
                            <Badge variant="outline">{insight.confidence}% confident</Badge>
                          </div>
                        </div>

                        {insight.metrics && (
                          <div className="bg-gray-50 rounded-lg p-4 mb-3">
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground">Current</p>
                                <p className="font-semibold">{insight.metrics.current.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Predicted</p>
                                <p className="font-semibold text-green-600">{insight.metrics.predicted.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Improvement</p>
                                <p className="font-semibold text-construction-orange">+{insight.metrics.improvement}%</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div>
                          <p className="text-sm font-medium mb-2">Recommended Actions:</p>
                          <ul className="space-y-1">
                            {insight.action_items.map((action, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="mt-4">
                          <Button size="sm">
                            Take Action
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Medium Impact */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Medium Priority Insights</h3>
              <div className="space-y-3">
                {mediumImpactInsights.map((insight) => {
                  const Icon = getInsightIcon(insight.type);
                  return (
                    <Card key={insight.id} className="border-l-4 border-l-orange-500">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="bg-purple-100 p-2 rounded-lg">
                              <Icon className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold mb-1">{insight.title}</h4>
                              <p className="text-sm text-muted-foreground">{insight.description}</p>
                            </div>
                          </div>
                          {getImpactBadge(insight.impact)}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Benchmarks Tab */}
          <TabsContent value="benchmarks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Benchmarks</CardTitle>
                <CardDescription>
                  Compare your metrics against industry averages and top performers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {benchmarks.map((benchmark, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">{benchmark.metric}</h4>
                        {getPerformanceBadge(benchmark.performance)}
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Your Value</p>
                          <p className="text-lg font-bold text-construction-orange">
                            {formatMetric(benchmark.metric, benchmark.your_value)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Industry Average</p>
                          <p className="text-lg font-semibold">
                            {formatMetric(benchmark.metric, benchmark.industry_average)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Top 25%</p>
                          <p className="text-lg font-semibold text-green-600">
                            {formatMetric(benchmark.metric, benchmark.top_quartile)}
                          </p>
                        </div>
                      </div>

                      <div className="relative h-2 bg-gray-200 rounded-full">
                        <div
                          className="absolute h-2 bg-construction-orange rounded-full"
                          style={{
                            width: `${Math.min((benchmark.your_value / benchmark.top_quartile) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AIInsights;
