import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RevenueMetric {
  id: string;
  period_start: string;
  period_end: string;
  mrr: number;
  arr: number;
  new_mrr: number;
  expansion_mrr: number;
  contraction_mrr: number;
  churned_mrr: number;
  net_new_mrr: number;
  active_customers: number;
  new_customers: number;
  churned_customers: number;
  arpu: number;
  revenue_churn_rate: number;
  customer_churn_rate: number;
  avg_ltv: number;
  ltv_cac_ratio: number;
  payback_months: number;
}

interface CohortLTV {
  cohort: string;
  avg_ltv: number;
  customer_count: number;
  total_revenue: number;
}

export const RevenueAnalytics = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<RevenueMetric[]>([]);
  const [cohortLTV, setCohortLTV] = useState<CohortLTV[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'6m' | '12m' | 'all'>('12m');

  useEffect(() => {
    loadRevenueData();
  }, [selectedPeriod]);

  const loadRevenueData = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      if (selectedPeriod === '6m') {
        startDate.setMonth(startDate.getMonth() - 6);
      } else if (selectedPeriod === '12m') {
        startDate.setMonth(startDate.getMonth() - 12);
      } else {
        startDate.setFullYear(startDate.getFullYear() - 3); // All time = 3 years
      }

      // Load revenue metrics
      const { data: metricsData, error: metricsError } = await (supabase as any)
        .from('revenue_metrics')
        .select('*')
        .gte('period_start', startDate.toISOString())
        .order('period_start', { ascending: true });

      if (metricsError) throw metricsError;
      setMetrics((metricsData as unknown as RevenueMetric[]) || []);

      // Load cohort LTV data
      const { data: cohortData, error: cohortError } = await supabase
        .from('user_cohorts')
        .select(`
          signup_cohort,
          user_id,
          initial_mrr
        `);

      if (cohortError) throw cohortError;

      // Calculate LTV by cohort
      const cohortMap = new Map<string, { total_revenue: number; count: number }>();
      cohortData?.forEach((row) => {
        const cohort = row.signup_cohort;
        const ltv = (row.initial_mrr || 0) * 12; // Simplified LTV calculation

        if (!cohortMap.has(cohort)) {
          cohortMap.set(cohort, { total_revenue: 0, count: 0 });
        }

        const existing = cohortMap.get(cohort)!;
        existing.total_revenue += ltv;
        existing.count += 1;
      });

      const cohortLTVData: CohortLTV[] = Array.from(cohortMap.entries()).map(([cohort, data]) => ({
        cohort,
        customer_count: data.count,
        total_revenue: data.total_revenue,
        avg_ltv: data.count > 0 ? data.total_revenue / data.count : 0,
      }));

      setCohortLTV(cohortLTVData.sort((a, b) => a.cohort.localeCompare(b.cohort)));
    } catch (error) {
      console.error('Failed to load revenue data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load revenue analytics.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const currentMetric = metrics[metrics.length - 1];
  const previousMetric = metrics[metrics.length - 2];

  const calculateGrowth = (current?: number, previous?: number) => {
    if (!current || !previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value?: number) => {
    if (!value) return '0%';
    return `${value.toFixed(1)}%`;
  };

  const getTrendIcon = (growth: number) => {
    if (growth > 0) return <ArrowUp className="w-4 h-4 text-green-600" />;
    if (growth < 0) return <ArrowDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  const getTrendColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // Format data for charts
  const mrrChartData = metrics.map((m) => ({
    month: new Date(m.period_start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    MRR: m.mrr,
    'New MRR': m.new_mrr,
    'Expansion MRR': m.expansion_mrr,
    'Churned MRR': -Math.abs(m.churned_mrr),
    'Net New MRR': m.net_new_mrr,
  }));

  const customerChartData = metrics.map((m) => ({
    month: new Date(m.period_start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    'Active Customers': m.active_customers,
    'New Customers': m.new_customers,
    'Churned Customers': m.churned_customers,
  }));

  const ltvChartData = cohortLTV.map((c) => ({
    cohort: c.cohort,
    'Avg LTV': c.avg_ltv,
    'Customers': c.customer_count,
  }));

  if (loading) {
    return (
      <DashboardLayout title="Revenue Analytics">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <DollarSign className="w-12 h-12 text-construction-orange animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Loading revenue analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const mrrGrowth = calculateGrowth(currentMetric?.mrr, previousMetric?.mrr);
  const customerGrowth = calculateGrowth(currentMetric?.active_customers, previousMetric?.active_customers);

  return (
    <DashboardLayout title="Revenue Analytics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-construction-dark">Revenue Analytics</h1>
            <p className="text-muted-foreground">Track MRR, ARR, growth metrics, and customer lifetime value</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={selectedPeriod === '6m' ? 'default' : 'outline'}
              onClick={() => setSelectedPeriod('6m')}
            >
              6 Months
            </Button>
            <Button
              variant={selectedPeriod === '12m' ? 'default' : 'outline'}
              onClick={() => setSelectedPeriod('12m')}
            >
              12 Months
            </Button>
            <Button
              variant={selectedPeriod === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedPeriod('all')}
            >
              All Time
            </Button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Monthly Recurring Revenue</p>
                  <p className="text-2xl font-bold mt-2">{formatCurrency(currentMetric?.mrr)}</p>
                  <div className={`flex items-center gap-1 mt-1 text-sm ${getTrendColor(mrrGrowth)}`}>
                    {getTrendIcon(mrrGrowth)}
                    <span>{formatPercentage(Math.abs(mrrGrowth))} vs last month</span>
                  </div>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Annual Recurring Revenue</p>
                  <p className="text-2xl font-bold mt-2">{formatCurrency(currentMetric?.arr)}</p>
                  <p className="text-xs text-muted-foreground mt-1">MRR × 12</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Customers</p>
                  <p className="text-2xl font-bold mt-2">{currentMetric?.active_customers || 0}</p>
                  <div className={`flex items-center gap-1 mt-1 text-sm ${getTrendColor(customerGrowth)}`}>
                    {getTrendIcon(customerGrowth)}
                    <span>{formatPercentage(Math.abs(customerGrowth))} vs last month</span>
                  </div>
                </div>
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average LTV</p>
                  <p className="text-2xl font-bold mt-2">{formatCurrency(currentMetric?.avg_ltv)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    LTV:CAC {currentMetric?.ltv_cac_ratio?.toFixed(1) || 0}x
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Different Views */}
        <Tabs defaultValue="mrr" className="space-y-4">
          <TabsList>
            <TabsTrigger value="mrr">MRR Trends</TabsTrigger>
            <TabsTrigger value="growth">Growth Metrics</TabsTrigger>
            <TabsTrigger value="customers">Customer Metrics</TabsTrigger>
            <TabsTrigger value="ltv">LTV Analysis</TabsTrigger>
          </TabsList>

          {/* MRR Trends Tab */}
          <TabsContent value="mrr" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>MRR Trend</CardTitle>
                <CardDescription>Monthly recurring revenue over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={mrrChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Line type="monotone" dataKey="MRR" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>MRR Composition</CardTitle>
                  <CardDescription>Current month breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">New MRR</span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(currentMetric?.new_mrr)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Expansion MRR</span>
                      <span className="font-semibold text-blue-600">
                        {formatCurrency(currentMetric?.expansion_mrr)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Contraction MRR</span>
                      <span className="font-semibold text-orange-600">
                        -{formatCurrency(currentMetric?.contraction_mrr)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Churned MRR</span>
                      <span className="font-semibold text-red-600">
                        -{formatCurrency(currentMetric?.churned_mrr)}
                      </span>
                    </div>
                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Net New MRR</span>
                        <span className={`font-bold ${currentMetric?.net_new_mrr && currentMetric.net_new_mrr > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(currentMetric?.net_new_mrr)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Churn Metrics</CardTitle>
                  <CardDescription>Revenue and customer retention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Revenue Churn Rate</span>
                        <span className="font-semibold text-red-600">
                          {formatPercentage(currentMetric?.revenue_churn_rate)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{ width: `${Math.min(currentMetric?.revenue_churn_rate || 0, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Customer Churn Rate</span>
                        <span className="font-semibold text-red-600">
                          {formatPercentage(currentMetric?.customer_churn_rate)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{ width: `${Math.min(currentMetric?.customer_churn_rate || 0, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        Target: Keep both churn rates below 5% for healthy growth
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Growth Metrics Tab */}
          <TabsContent value="growth" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>MRR Growth Components</CardTitle>
                <CardDescription>Breakdown of MRR changes over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mrrChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="New MRR" fill="#10b981" />
                    <Bar dataKey="Expansion MRR" fill="#3b82f6" />
                    <Bar dataKey="Churned MRR" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Net New MRR Trend</CardTitle>
                <CardDescription>Monthly MRR growth after all changes</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={mrrChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="Net New MRR" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customer Metrics Tab */}
          <TabsContent value="customers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Growth</CardTitle>
                <CardDescription>Active customer count over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={customerChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Active Customers" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Acquisition</CardTitle>
                  <CardDescription>New customers per month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={customerChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="New Customers" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Average Revenue Per User</CardTitle>
                  <CardDescription>ARPU trend</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <p className="text-4xl font-bold text-construction-orange">
                      {formatCurrency(currentMetric?.arpu)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">Current ARPU</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* LTV Analysis Tab */}
          <TabsContent value="ltv" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground">Average LTV</p>
                    <p className="text-3xl font-bold mt-2">{formatCurrency(currentMetric?.avg_ltv)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground">LTV:CAC Ratio</p>
                    <p className="text-3xl font-bold mt-2">{currentMetric?.ltv_cac_ratio?.toFixed(1) || 0}x</p>
                    <p className="text-xs text-muted-foreground mt-1">Target: 3x or higher</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground">Payback Period</p>
                    <p className="text-3xl font-bold mt-2">{currentMetric?.payback_months || 0} mo</p>
                    <p className="text-xs text-muted-foreground mt-1">Target: 12 months or less</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>LTV by Cohort</CardTitle>
                <CardDescription>Average lifetime value grouped by signup month</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ltvChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="cohort" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="Avg LTV" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>LTV Insights</CardTitle>
                <CardDescription>Understanding customer lifetime value</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="bg-green-100 p-1 rounded">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">High LTV:CAC Ratio</p>
                      <p className="text-muted-foreground">
                        A ratio of 3x or higher indicates sustainable customer acquisition
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <div className="bg-blue-100 p-1 rounded">
                      <Calendar className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Payback Period</p>
                      <p className="text-muted-foreground">
                        Time to recover customer acquisition cost through revenue
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <div className="bg-purple-100 p-1 rounded">
                      <Users className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">Cohort Analysis</p>
                      <p className="text-muted-foreground">
                        Compare LTV across cohorts to identify seasonal patterns
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default RevenueAnalytics;
