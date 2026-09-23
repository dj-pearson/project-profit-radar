import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { RoleGuard, ROLE_GROUPS } from '@/components/auth/RoleGuard';
import { AccessiblePageWrapper } from "@/components/accessibility/AccessiblePageWrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { DeferredChartContainer } from '@/components/ui/DeferredChartContainer';
import { KPICard } from '@/components/dashboard/KPICard';
import { LoadingState } from '@/components/ui/loading-spinner';
import { ResponsiveContainer, ResponsiveGrid } from '@/components/layout/ResponsiveContainer';
import { mobileGridClasses, mobileFilterClasses, mobileButtonClasses, mobileTextClasses } from '@/utils/mobileHelpers';
const PredictiveAnalytics = React.lazy(() => import('@/components/analytics/PredictiveAnalytics'));
const RiskAssessment = React.lazy(() => import('@/components/analytics/RiskAssessment'));
const TimelineOptimization = React.lazy(() => import('@/components/analytics/TimelineOptimization'));
const PerformanceBenchmarking = React.lazy(() => import('@/components/analytics/PerformanceBenchmarking'));
const ResourceOptimization = React.lazy(() => import('@/components/analytics/ResourceOptimization'));
const WorkflowAutomation = React.lazy(() => import('@/components/analytics/WorkflowAutomation'));
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, PieChart, Pie, Area, AreaChart } from 'recharts';
import { TrendingUp, DollarSign, Building2, Target, Activity, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  lastMonths,
  buildRevenueByPeriod,
  buildResourceUtilization,
  buildTrendData,
  buildStatusDistribution,
  isSeriesEmpty,
  type AnalyticsProjectRow,
  type AnalyticsJobCostRow,
  type AnalyticsTimeEntryRow,
  type AnalyticsInvoiceRow,
} from '@/lib/analyticsSeries';

/** Shown in place of a chart when the queried rows hold nothing to plot. */
const EmptyChart = ({ message }: { message: string }) => (
  <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
    {message}
  </div>
);

interface AnalyticsData {
  executiveMetrics: {
    totalRevenue: number;
    totalProjects: number;
    activeProjects: number;
    avgProfitMargin: number;
    projectsOnTime: number;
    completedProjects: number;
    projectsOnBudget: number;
  };
  projectPerformance: Array<{
    projectId: string;
    projectName: string;
    budgetVariance: number;
    profitMargin: number;
    completion: number;
  }>;
  statusDistribution: ReturnType<typeof buildStatusDistribution>;
  resourceUtilization: ReturnType<typeof buildResourceUtilization>;
  revenueByPeriod: ReturnType<typeof buildRevenueByPeriod>;
  trendData: ReturnType<typeof buildTrendData>;
}

const Analytics = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('last_12_months');
  const [selectedView, setSelectedView] = useState('overview');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    if (!loading && user && userProfile && !userProfile.company_id && userProfile.role !== 'root_admin') {
      navigate('/setup');
    }
    
    if (userProfile?.company_id) {
      loadAnalyticsData();
    }
  }, [user, userProfile, loading, navigate, selectedPeriod]);

  const loadAnalyticsData = useCallback(async () => {
    const companyId = userProfile?.company_id;
    if (!companyId) return;
    try {
      setAnalyticsLoading(true);

      const projectsResult = await supabase
        .from('projects')
        .select('id, name, status, budget, start_date, end_date, completed_at, completion_percentage')
        .eq('company_id', companyId);
      if (projectsResult.error) throw projectsResult.error;
      const projects = projectsResult.data || [];
      const projectIds = projects.map((p) => p.id);

      const months = lastMonths(12);
      const since = `${months[0].key}-01`;

      // Scoped by the company's project ids: job_costs.company_id and
      // time_entries.company_id are nullable, so filtering on them would drop rows.
      const [jobCostsResult, timeEntriesResult, invoicesResult] = projectIds.length
        ? await Promise.all([
            supabase
              .from('job_costs')
              .select('project_id, date, total_cost, material_cost')
              .in('project_id', projectIds),
            supabase
              .from('time_entries')
              .select('start_time, total_hours')
              .in('project_id', projectIds)
              .gte('start_time', since),
            supabase
              .from('invoices')
              .select('issue_date, total_amount, status')
              .eq('company_id', companyId)
              .gte('issue_date', since),
          ])
        : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];

      if (jobCostsResult.error) throw jobCostsResult.error;
      if (timeEntriesResult.error) throw timeEntriesResult.error;
      if (invoicesResult.error) throw invoicesResult.error;

      setAnalyticsData(
        processAnalyticsData(
          projects,
          (jobCostsResult.data || []) as AnalyticsJobCostRow[],
          (timeEntriesResult.data || []) as AnalyticsTimeEntryRow[],
          (invoicesResult.data || []) as AnalyticsInvoiceRow[],
        ),
      );
    } catch (error: unknown) {
      console.error('Error loading analytics:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load analytics data"
      });
    } finally {
      setAnalyticsLoading(false);
    }
  }, [userProfile?.company_id, toast]);

  const processAnalyticsData = (
    projects: Array<AnalyticsProjectRow & { name: string; end_date: string | null; completion_percentage: number | null }>,
    jobCosts: AnalyticsJobCostRow[],
    timeEntries: AnalyticsTimeEntryRow[],
    invoices: AnalyticsInvoiceRow[],
  ): AnalyticsData => {
    const costOf = (projectId: string) =>
      jobCosts.filter((c) => c.project_id === projectId).reduce((sum, c) => sum + (c.total_cost || 0), 0);

    const totalRevenue = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalCosts = jobCosts.reduce((sum, c) => sum + (c.total_cost || 0), 0);
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalCosts) / totalRevenue) * 100 : 0;

    const activeProjects = projects.filter((p) => ['active', 'in_progress'].includes(p.status ?? ''));
    const completedProjects = projects.filter((p) => p.status === 'completed');
    const onTimeProjects = completedProjects.filter(
      (p) => p.end_date && p.completed_at && new Date(p.completed_at) <= new Date(p.end_date),
    );
    const onBudgetProjects = completedProjects.filter((p) => costOf(p.id) <= (p.budget || 0));

    const projectPerformance = projects.map((project) => {
      const projectCosts = costOf(project.id);
      const budget = project.budget || 0;
      return {
        projectId: project.id,
        projectName: project.name,
        budgetVariance: ((projectCosts - budget) / (budget || 1)) * 100,
        profitMargin: budget > 0 ? ((budget - projectCosts) / budget) * 100 : 0,
        completion: project.completion_percentage || 0,
      };
    });

    const months = lastMonths(12);
    return {
      executiveMetrics: {
        totalRevenue,
        totalProjects: projects.length,
        activeProjects: activeProjects.length,
        avgProfitMargin: profitMargin,
        projectsOnTime: onTimeProjects.length,
        completedProjects: completedProjects.length,
        projectsOnBudget: onBudgetProjects.length,
      },
      projectPerformance,
      statusDistribution: buildStatusDistribution(projects),
      resourceUtilization: buildResourceUtilization(months, timeEntries, jobCosts),
      revenueByPeriod: buildRevenueByPeriod(months, invoices, jobCosts),
      trendData: buildTrendData(months, projects),
    };
  };

  const chartConfig = {
    revenue: {
      label: "Revenue",
      color: "hsl(var(--chart-1))",
    },
    costs: {
      label: "Costs", 
      color: "hsl(var(--chart-2))",
    },
    profit: {
      label: "Profit",
      color: "hsl(var(--chart-3))",
    },
    laborHours: {
      label: "Labor Hours",
      color: "hsl(var(--chart-4))",
    },
    materialCost: {
      label: "Material Cost",
      color: "hsl(var(--chart-5))",
    }
  };

  if (loading || analyticsLoading) {
    return <LoadingState message="Loading analytics..." />;
  }

  if (!analyticsData) {
    return <LoadingState message="Processing analytics data..." />;
  }

  return (
    <AccessiblePageWrapper pageTitle="Analytics">
    <RoleGuard allowedRoles={ROLE_GROUPS.ADMINS}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-card">
        <ResponsiveContainer>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
            <div>
              <h1 className={mobileTextClasses.title}>Analytics & Reporting</h1>
              <p className={mobileTextClasses.muted}>Executive insights and project performance metrics</p>
            </div>
            <div className={mobileFilterClasses.buttonGroup}>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className={mobileFilterClasses.input}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                  <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                  <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                  <SelectItem value="last_12_months">Last 12 Months</SelectItem>
                  <SelectItem value="ytd">Year to Date</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className={mobileButtonClasses.secondary} aria-label="Export analytics data">
                <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>
          </div>
        </ResponsiveContainer>
      </div>

      {/* Main Content */}
      <ResponsiveContainer className="py-6">
        <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-10 gap-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="projects" className="text-xs sm:text-sm">Projects</TabsTrigger>
            <TabsTrigger value="resources" className="text-xs sm:text-sm">Resources</TabsTrigger>
            <TabsTrigger value="optimization" className="text-xs sm:text-sm">AI Optimize</TabsTrigger>
            <TabsTrigger value="workflow" className="text-xs sm:text-sm">Workflows</TabsTrigger>
            <TabsTrigger value="trends" className="text-xs sm:text-sm">Trends</TabsTrigger>
            <TabsTrigger value="predictive" className="text-xs sm:text-sm">Predictive</TabsTrigger>
            <TabsTrigger value="risk" className="text-xs sm:text-sm">Risk</TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs sm:text-sm">Timeline</TabsTrigger>
            <TabsTrigger value="benchmarks" className="text-xs sm:text-sm">Benchmarks</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Executive KPIs */}
            <div className={mobileGridClasses.stats}>
              <KPICard
                title="Contract Value"
                value={`$${(analyticsData.executiveMetrics.totalRevenue / 1000).toFixed(0)}K`}
                icon={DollarSign}
                subtitle="Sum of project budgets"
              />
              <KPICard
                title="Active Projects"
                value={analyticsData.executiveMetrics.activeProjects}
                icon={Building2}
                subtitle={`${analyticsData.executiveMetrics.totalProjects} in portfolio`}
              />
              <KPICard
                title="Profit Margin"
                value={`${analyticsData.executiveMetrics.avgProfitMargin.toFixed(1)}%`}
                icon={TrendingUp}
                subtitle="Budgets vs. job costs"
              />
              <KPICard
                title="On-Time Projects"
                value={`${analyticsData.executiveMetrics.projectsOnTime}/${analyticsData.executiveMetrics.completedProjects}`}
                icon={Target}
                subtitle="Completed by end date"
              />
              <KPICard
                title="On-Budget Projects"
                value={`${analyticsData.executiveMetrics.projectsOnBudget}/${analyticsData.executiveMetrics.completedProjects}`}
                icon={Activity}
                subtitle="Completed within budget"
              />
            </div>

            {/* Revenue & Profit Chart */}
            <ResponsiveGrid cols={{ default: 1, lg: 2 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Revenue & Profit Trends</CardTitle>
                  <CardDescription>Invoiced revenue (excluding drafts and cancelled) and job costs by month</CardDescription>
                </CardHeader>
                <CardContent>
                  {isSeriesEmpty(analyticsData.revenueByPeriod, ['revenue', 'costs']) ? (
                    <EmptyChart message="No invoices or job costs in the last 12 months." />
                  ) : (
                  <DeferredChartContainer config={chartConfig} className="h-[300px]">
                    <AreaChart data={analyticsData.revenueByPeriod}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        formatter={(value, name) => [`$${Number(value).toLocaleString()}`, name]}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stackId="1"
                        stroke="var(--color-revenue)"
                        fill="var(--color-revenue)"
                        fillOpacity={0.8}
                      />
                      <Area
                        type="monotone"
                        dataKey="profit"
                        stackId="2"
                        stroke="var(--color-profit)"
                        fill="var(--color-profit)"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </DeferredChartContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Project Portfolio Status</CardTitle>
                  <CardDescription>Current project distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsData.statusDistribution.length === 0 ? (
                    <EmptyChart message="No projects yet." />
                  ) : (
                  <DeferredChartContainer config={chartConfig} className="h-[300px]">
                    <PieChart>
                      <Pie
                        data={analyticsData.statusDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </DeferredChartContainer>
                  )}
                </CardContent>
              </Card>
            </ResponsiveGrid>
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Performance Matrix</CardTitle>
                <CardDescription>Budget variance vs schedule performance by project</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.projectPerformance.slice(0, 10).map((project) => (
                    <div key={project.projectId} className="flex items-center justify-between p-4 border rounded-lg" role="article" aria-labelledby={`project-perf-${project.projectId}`}>
                      <div className="flex-1">
                        <h4 id={`project-perf-${project.projectId}`} className="font-medium">{project.projectName}</h4>
                        <p className="text-sm text-muted-foreground">{project.completion}% complete</p>
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="text-center">
                          <p className="text-muted-foreground">Budget Variance</p>
                          <p className={project.budgetVariance > 0 ? 'text-red-600' : 'text-green-600'}>
                            {project.budgetVariance > 0 ? '+' : ''}{project.budgetVariance.toFixed(1)}%
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">Profit Margin</p>
                          <p className={project.profitMargin > 20 ? 'text-green-600' : project.profitMargin > 10 ? 'text-yellow-600' : 'text-red-600'}>
                            {project.profitMargin.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources" className="space-y-6">
            <ResponsiveGrid cols={{ default: 1, lg: 2 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Labor Hours</CardTitle>
                  <CardDescription>Hours logged in time entries, by month</CardDescription>
                </CardHeader>
                <CardContent>
                  {isSeriesEmpty(analyticsData.resourceUtilization, ['laborHours']) ? (
                    <EmptyChart message="No time entries in the last 12 months." />
                  ) : (
                  <DeferredChartContainer config={chartConfig} className="h-[300px]">
                    <LineChart data={analyticsData.resourceUtilization}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="laborHours"
                        stroke="var(--color-laborHours)"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </DeferredChartContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Material Spend</CardTitle>
                  <CardDescription>Material cost from job costs, last 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  {isSeriesEmpty(analyticsData.resourceUtilization.slice(-6), ['materialCost']) ? (
                    <EmptyChart message="No material costs recorded in the last 6 months." />
                  ) : (
                  <DeferredChartContainer config={chartConfig} className="h-[300px]">
                    <BarChart data={analyticsData.resourceUtilization.slice(-6)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Material Cost']}
                      />
                      <Bar dataKey="materialCost" fill="var(--color-materialCost)" />
                    </BarChart>
                  </DeferredChartContainer>
                  )}
                </CardContent>
              </Card>
            </ResponsiveGrid>

            <Card>
              <CardHeader>
                <CardTitle>Equipment Usage and Efficiency</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Brikly doesn't track equipment utilization or a crew efficiency score yet, so there is nothing to chart here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <ResponsiveGrid cols={{ default: 1, lg: 2 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Project Activity Trends</CardTitle>
                  <CardDescription>Projects started vs completed by month</CardDescription>
                </CardHeader>
                <CardContent>
                  {isSeriesEmpty(analyticsData.trendData, ['projectsStarted', 'projectsCompleted']) ? (
                    <EmptyChart message="No projects started or completed in the last 12 months." />
                  ) : (
                  <DeferredChartContainer config={chartConfig} className="h-[300px]">
                    <BarChart data={analyticsData.trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="projectsStarted" fill="var(--color-revenue)" />
                      <Bar dataKey="projectsCompleted" fill="var(--color-profit)" />
                    </BarChart>
                  </DeferredChartContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Average Project Value</CardTitle>
                  <CardDescription>Average budget of projects started each month</CardDescription>
                </CardHeader>
                <CardContent>
                  {isSeriesEmpty(analyticsData.trendData, ['avgProjectValue']) ? (
                    <EmptyChart message="No projects with a budget started in the last 12 months." />
                  ) : (
                  <DeferredChartContainer config={chartConfig} className="h-[300px]">
                    <LineChart data={analyticsData.trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Avg Project Value']}
                      />
                      <Line
                        type="monotone"
                        dataKey="avgProjectValue"
                        stroke="var(--color-revenue)"
                        strokeWidth={3}
                        connectNulls
                      />
                    </LineChart>
                  </DeferredChartContainer>
                  )}
                </CardContent>
              </Card>
            </ResponsiveGrid>

          </TabsContent>

          <TabsContent value="predictive">
            <Suspense fallback={<LoadingState message="Loading predictive analytics..." />}>
              <PredictiveAnalytics />
            </Suspense>
          </TabsContent>

          <TabsContent value="risk">
            <Suspense fallback={<LoadingState message="Loading risk assessment..." />}>
              <RiskAssessment />
            </Suspense>
          </TabsContent>

          <TabsContent value="optimization">
            <Suspense fallback={<LoadingState message="Loading resource optimization..." />}>
              <ResourceOptimization />
            </Suspense>
          </TabsContent>

          <TabsContent value="workflow">
            <Suspense fallback={<LoadingState message="Loading workflow automation..." />}>
              <WorkflowAutomation />
            </Suspense>
          </TabsContent>

          <TabsContent value="timeline">
            <Suspense fallback={<LoadingState message="Loading timeline optimization..." />}>
              <TimelineOptimization />
            </Suspense>
          </TabsContent>

          <TabsContent value="benchmarks">
            <Suspense fallback={<LoadingState message="Loading benchmarks..." />}>
              <PerformanceBenchmarking />
            </Suspense>
          </TabsContent>
        </Tabs>
      </ResponsiveContainer>
    </div>
    </RoleGuard>
    </AccessiblePageWrapper>
  );
};

export default Analytics;