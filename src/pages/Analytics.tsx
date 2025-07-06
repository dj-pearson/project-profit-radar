import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { KPICard } from '@/components/dashboard/KPICard';
import { LoadingState } from '@/components/ui/loading-spinner';
import { ResponsiveContainer, ResponsiveGrid } from '@/components/layout/ResponsiveContainer';
import PredictiveAnalytics from '@/components/analytics/PredictiveAnalytics';
import RiskAssessment from '@/components/analytics/RiskAssessment';
import TimelineOptimization from '@/components/analytics/TimelineOptimization';
import PerformanceBenchmarking from '@/components/analytics/PerformanceBenchmarking';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Building2, 
  Calendar,
  Target,
  Activity,
  BarChart3,
  Download,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsData {
  executiveMetrics: {
    totalRevenue: number;
    totalProjects: number;
    activeUsers: number;
    avgProfitMargin: number;
    projectsOnTime: number;
    projectsOnBudget: number;
  };
  projectPerformance: Array<{
    projectId: string;
    projectName: string;
    budgetVariance: number;
    scheduleVariance: number;
    profitMargin: number;
    completion: number;
  }>;
  resourceUtilization: Array<{
    period: string;
    laborHours: number;
    equipmentUsage: number;
    materialCost: number;
    efficiency: number;
  }>;
  revenueByPeriod: Array<{
    period: string;
    revenue: number;
    costs: number;
    profit: number;
  }>;
  trendData: Array<{
    month: string;
    projectsStarted: number;
    projectsCompleted: number;
    revenue: number;
    avgProjectValue: number;
  }>;
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
    
    if (!loading && user && userProfile && !userProfile.company_id) {
      navigate('/setup');
    }
    
    if (userProfile?.company_id) {
      loadAnalyticsData();
    }
  }, [user, userProfile, loading, navigate, selectedPeriod]);

  const loadAnalyticsData = async () => {
    try {
      setAnalyticsLoading(true);
      
      // Load projects data
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('company_id', userProfile?.company_id);

      if (projectsError) throw projectsError;

      // Load job costs
      const { data: jobCosts, error: costsError } = await supabase
        .from('job_costs')
        .select('*, projects(name)')
        .in('project_id', projects?.map(p => p.id) || []);

      if (costsError) throw costsError;

      // Create mock time entries data since table doesn't exist yet
      const timeEntries: any[] = [];

      // Process data
      const processedData = processAnalyticsData(projects || [], jobCosts || [], timeEntries || []);
      setAnalyticsData(processedData);

    } catch (error: any) {
      console.error('Error loading analytics:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load analytics data"
      });
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const processAnalyticsData = (projects: any[], jobCosts: any[], timeEntries: any[]): AnalyticsData => {
    // Calculate executive metrics
    const totalRevenue = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalCosts = jobCosts.reduce((sum, c) => sum + (c.total_cost || 0), 0);
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalCosts) / totalRevenue) * 100 : 0;
    
    const activeProjects = projects.filter(p => ['active', 'in_progress'].includes(p.status));
    const completedProjects = projects.filter(p => p.status === 'completed');
    const onTimeProjects = completedProjects.filter(p => 
      new Date(p.actual_end_date || p.end_date) <= new Date(p.end_date)
    );
    const onBudgetProjects = completedProjects.filter(p => {
      const projectCosts = jobCosts.filter(c => c.project_id === p.id).reduce((sum, c) => sum + (c.total_cost || 0), 0);
      return projectCosts <= (p.budget || 0);
    });

    // Project performance data
    const projectPerformance = projects.map(project => {
      const projectCosts = jobCosts.filter(c => c.project_id === project.id).reduce((sum, c) => sum + (c.total_cost || 0), 0);
      const budgetVariance = ((projectCosts - (project.budget || 0)) / (project.budget || 1)) * 100;
      const profitMargin = project.budget > 0 ? ((project.budget - projectCosts) / project.budget) * 100 : 0;
      
      return {
        projectId: project.id,
        projectName: project.name,
        budgetVariance,
        scheduleVariance: 0, // Calculate based on timeline
        profitMargin,
        completion: project.completion_percentage || 0
      };
    });

    // Resource utilization (mock data for demonstration)
    const resourceUtilization = Array.from({ length: 12 }, (_, i) => {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      return {
        period: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        laborHours: Math.floor(Math.random() * 1000) + 500,
        equipmentUsage: Math.floor(Math.random() * 80) + 60,
        materialCost: Math.floor(Math.random() * 50000) + 20000,
        efficiency: Math.floor(Math.random() * 20) + 75
      };
    }).reverse();

    // Revenue by period
    const revenueByPeriod = Array.from({ length: 12 }, (_, i) => {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const monthlyRevenue = Math.floor(Math.random() * 100000) + 50000;
      const monthlyCosts = monthlyRevenue * 0.7;
      return {
        period: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: monthlyRevenue,
        costs: monthlyCosts,
        profit: monthlyRevenue - monthlyCosts
      };
    }).reverse();

    // Trend data
    const trendData = Array.from({ length: 12 }, (_, i) => {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      return {
        month: month.toLocaleDateString('en-US', { month: 'short' }),
        projectsStarted: Math.floor(Math.random() * 5) + 1,
        projectsCompleted: Math.floor(Math.random() * 3) + 1,
        revenue: Math.floor(Math.random() * 100000) + 50000,
        avgProjectValue: Math.floor(Math.random() * 50000) + 25000
      };
    }).reverse();

    return {
      executiveMetrics: {
        totalRevenue,
        totalProjects: projects.length,
        activeUsers: 0, // Would need user activity data
        avgProfitMargin: profitMargin,
        projectsOnTime: onTimeProjects.length,
        projectsOnBudget: onBudgetProjects.length
      },
      projectPerformance,
      resourceUtilization,
      revenueByPeriod,
      trendData
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
    efficiency: {
      label: "Efficiency %",
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Analytics & Reporting</h1>
              <p className="text-sm text-muted-foreground">Executive insights and project performance metrics</p>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-48">
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
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <ResponsiveContainer className="py-6">
        <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview">Executive Overview</TabsTrigger>
            <TabsTrigger value="projects">Project Performance</TabsTrigger>
            <TabsTrigger value="resources">Resource Utilization</TabsTrigger>
            <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
            <TabsTrigger value="predictive">Predictive</TabsTrigger>
            <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
            <TabsTrigger value="optimization">Timeline Opt.</TabsTrigger>
            <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Executive KPIs */}
            <ResponsiveGrid cols={{ default: 1, sm: 2, lg: 6 }}>
              <KPICard
                title="Total Revenue"
                value={`$${(analyticsData.executiveMetrics.totalRevenue / 1000).toFixed(0)}K`}
                icon={DollarSign}
                subtitle="All projects"
                change="+12.5%"
                changeType="positive"
              />
              <KPICard
                title="Active Projects"
                value={analyticsData.executiveMetrics.totalProjects}
                icon={Building2}
                subtitle="In portfolio"
                change="+3"
                changeType="positive"
              />
              <KPICard
                title="Profit Margin"
                value={`${analyticsData.executiveMetrics.avgProfitMargin.toFixed(1)}%`}
                icon={TrendingUp}
                subtitle="Average"
                change="+2.1%"
                changeType="positive"
              />
              <KPICard
                title="On-Time Projects"
                value={`${analyticsData.executiveMetrics.projectsOnTime}/${analyticsData.executiveMetrics.totalProjects}`}
                icon={Target}
                subtitle="Delivery rate"
                change="92%"
                changeType="positive"
              />
              <KPICard
                title="On-Budget Projects"
                value={`${analyticsData.executiveMetrics.projectsOnBudget}/${analyticsData.executiveMetrics.totalProjects}`}
                icon={Activity}
                subtitle="Budget control"
                change="87%"
                changeType="positive"
              />
              <KPICard
                title="Efficiency Score"
                value="89%"
                icon={BarChart3}
                subtitle="Overall performance"
                change="+5%"
                changeType="positive"
              />
            </ResponsiveGrid>

            {/* Revenue & Profit Chart */}
            <ResponsiveGrid cols={{ default: 1, lg: 2 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Revenue & Profit Trends</CardTitle>
                  <CardDescription>Monthly financial performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
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
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Project Portfolio Status</CardTitle>
                  <CardDescription>Current project distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Completed', value: 35, fill: 'hsl(var(--chart-1))' },
                          { name: 'In Progress', value: 45, fill: 'hsl(var(--chart-2))' },
                          { name: 'Planning', value: 15, fill: 'hsl(var(--chart-3))' },
                          { name: 'On Hold', value: 5, fill: 'hsl(var(--chart-4))' }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
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
                    <div key={project.projectId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{project.projectName}</h4>
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
                  <CardTitle>Labor Utilization</CardTitle>
                  <CardDescription>Monthly labor hours and efficiency</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
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
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Efficiency Trends</CardTitle>
                  <CardDescription>Resource efficiency over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <LineChart data={analyticsData.resourceUtilization}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="efficiency"
                        stroke="var(--color-efficiency)"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </ResponsiveGrid>

            <Card>
              <CardHeader>
                <CardTitle>Resource Allocation</CardTitle>
                <CardDescription>Current resource distribution across projects</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <BarChart data={analyticsData.resourceUtilization.slice(-6)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="materialCost" fill="var(--color-revenue)" />
                    <Bar dataKey="laborHours" fill="var(--color-costs)" />
                  </BarChart>
                </ChartContainer>
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
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <BarChart data={analyticsData.trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="projectsStarted" fill="var(--color-revenue)" />
                      <Bar dataKey="projectsCompleted" fill="var(--color-profit)" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Average Project Value</CardTitle>
                  <CardDescription>Project value trends over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
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
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </ResponsiveGrid>

            <Card>
              <CardHeader>
                <CardTitle>Business Growth Indicators</CardTitle>
                <CardDescription>Key metrics indicating business trajectory</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveGrid cols={{ default: 1, sm: 2, lg: 4 }}>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">+23%</div>
                    <p className="text-sm text-muted-foreground">Revenue Growth (YoY)</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">+15%</div>
                    <p className="text-sm text-muted-foreground">Project Count Growth</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">+8%</div>
                    <p className="text-sm text-muted-foreground">Avg Project Value</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">92%</div>
                    <p className="text-sm text-muted-foreground">Client Retention</p>
                  </div>
                </ResponsiveGrid>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="predictive">
            <PredictiveAnalytics />
          </TabsContent>

          <TabsContent value="risk">
            <RiskAssessment />
          </TabsContent>

          <TabsContent value="optimization">
            <TimelineOptimization />
          </TabsContent>

          <TabsContent value="benchmarks">
            <PerformanceBenchmarking />
          </TabsContent>
        </Tabs>
      </ResponsiveContainer>
    </div>
  );
};

export default Analytics;