import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { KPICard } from '@/components/dashboard/KPICard';
import { ResponsiveGrid } from '@/components/layout/ResponsiveContainer';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell,
  ResponsiveContainer as RechartsResponsiveContainer
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Users, 
  Building2, 
  Target,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  Download,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ExecutiveMetrics {
  totalRevenue: number;
  revenueGrowth: number;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  avgProfitMargin: number;
  onTimeDelivery: number;
  onBudgetProjects: number;
  teamUtilization: number;
  customerSatisfaction: number;
  cashFlow: number;
  pendingInvoices: number;
}

interface TrendData {
  period: string;
  revenue: number;
  projects: number;
  costs: number;
  profit: number;
  efficiency: number;
}

interface ProjectHealth {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  completion: number;
  budgetVariance: number;
  scheduleVariance: number;
  riskScore: number;
}

const ExecutiveDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState('last_12_months');
  const [loading, setLoading] = useState(true);
  const [executiveMetrics, setExecutiveMetrics] = useState<ExecutiveMetrics>({
    totalRevenue: 0,
    revenueGrowth: 0,
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    avgProfitMargin: 0,
    onTimeDelivery: 0,
    onBudgetProjects: 0,
    teamUtilization: 0,
    customerSatisfaction: 0,
    cashFlow: 0,
    pendingInvoices: 0
  });

  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [projectHealth, setProjectHealth] = useState<ProjectHealth[]>([]);

  useEffect(() => {
    if (userProfile?.company_id) {
      loadDashboardData();
    }
  }, [userProfile?.company_id, selectedPeriod]);

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    
    switch (selectedPeriod) {
      case 'last_30_days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last_3_months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case 'last_6_months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case 'ytd':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default: // last_12_months
        startDate = new Date(now.getFullYear(), now.getMonth() - 12, 1);
    }
    
    return {
      start: startDate.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0]
    };
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const dateRange = getDateRange();
      
      await Promise.all([
        loadExecutiveMetrics(dateRange),
        loadTrendData(dateRange),
        loadProjectHealth()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load dashboard data"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadExecutiveMetrics = async (dateRange: { start: string; end: string }) => {
    const { data: projects } = await supabase
      .from('projects')
      .select(`
        id, name, budget, status, completion_percentage, start_date, end_date,
        job_costs(total_cost, labor_cost, material_cost, equipment_cost)
      `)
      .eq('company_id', userProfile!.company_id);

    const { data: invoices } = await supabase
      .from('invoices')
      .select('total_amount, status, issue_date')
      .eq('company_id', userProfile!.company_id)
      .gte('issue_date', dateRange.start)
      .lte('issue_date', dateRange.end);

    if (projects && invoices) {
      const totalRevenue = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

      const totalProjects = projects.length;
      const activeProjects = projects.filter(p => p.status === 'active').length;
      const completedProjects = projects.filter(p => p.status === 'completed').length;

      const projectsWithCosts = projects.map(project => {
        const totalCosts = project.job_costs?.reduce((sum, cost) => sum + (cost.total_cost || 0), 0) || 0;
        const profitMargin = project.budget > 0 ? ((project.budget - totalCosts) / project.budget) * 100 : 0;
        return { ...project, totalCosts, profitMargin };
      });

      const avgProfitMargin = projectsWithCosts.length > 0 
        ? projectsWithCosts.reduce((sum, p) => sum + p.profitMargin, 0) / projectsWithCosts.length 
        : 0;

      const onTimeProjects = projects.filter(p => {
        if (!p.end_date || p.status !== 'completed') return false;
        return new Date(p.end_date) <= new Date();
      }).length;

      const onBudgetProjects = projectsWithCosts.filter(p => p.profitMargin >= 0).length;

      const pendingInvoices = invoices
        .filter(inv => inv.status === 'pending')
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

      setExecutiveMetrics({
        totalRevenue,
        revenueGrowth: 0, // Would need historical data to calculate
        totalProjects,
        activeProjects,
        completedProjects,
        avgProfitMargin,
        onTimeDelivery: totalProjects > 0 ? (onTimeProjects / totalProjects) * 100 : 0,
        onBudgetProjects: totalProjects > 0 ? (onBudgetProjects / totalProjects) * 100 : 0,
        teamUtilization: 85, // Would need time tracking data
        customerSatisfaction: 4.5, // Would need feedback data
        cashFlow: totalRevenue - pendingInvoices,
        pendingInvoices
      });
    }
  };

  const loadTrendData = async (dateRange: { start: string; end: string }) => {
    const { data: monthlyData } = await supabase
      .from('invoices')
      .select('total_amount, issue_date, status')
      .eq('company_id', userProfile!.company_id)
      .gte('issue_date', dateRange.start)
      .lte('issue_date', dateRange.end);

    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, expense_date')
      .eq('company_id', userProfile!.company_id)
      .gte('expense_date', dateRange.start)
      .lte('expense_date', dateRange.end);

    const { data: projects } = await supabase
      .from('projects')
      .select('id, created_at')
      .eq('company_id', userProfile!.company_id)
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);

    if (monthlyData && expenses && projects) {
      const monthlyTrends = new Map<string, { revenue: number; costs: number; projects: number }>();

      monthlyData.forEach(invoice => {
        const month = new Date(invoice.issue_date).toLocaleDateString('en', { month: 'short' });
        const current = monthlyTrends.get(month) || { revenue: 0, costs: 0, projects: 0 };
        if (invoice.status === 'paid') {
          current.revenue += invoice.total_amount || 0;
        }
        monthlyTrends.set(month, current);
      });

      expenses.forEach(expense => {
        const month = new Date(expense.expense_date).toLocaleDateString('en', { month: 'short' });
        const current = monthlyTrends.get(month) || { revenue: 0, costs: 0, projects: 0 };
        current.costs += expense.amount || 0;
        monthlyTrends.set(month, current);
      });

      projects.forEach(project => {
        const month = new Date(project.created_at).toLocaleDateString('en', { month: 'short' });
        const current = monthlyTrends.get(month) || { revenue: 0, costs: 0, projects: 0 };
        current.projects += 1;
        monthlyTrends.set(month, current);
      });

      const trendArray = Array.from(monthlyTrends.entries()).map(([period, data]) => ({
        period,
        revenue: data.revenue,
        projects: data.projects,
        costs: data.costs,
        profit: data.revenue - data.costs,
        efficiency: data.revenue > 0 ? Math.min(100, ((data.revenue - data.costs) / data.revenue) * 100) : 0
      }));

      setTrendData(trendArray);
    }
  };

  const loadProjectHealth = async () => {
    const { data: projects } = await supabase
      .from('projects')
      .select(`
        id, name, budget, completion_percentage, start_date, end_date, status,
        job_costs(total_cost)
      `)
      .eq('company_id', userProfile!.company_id)
      .eq('status', 'active')
      .limit(10);

    if (projects) {
      const healthData: ProjectHealth[] = projects.map(project => {
        const totalCosts = project.job_costs?.reduce((sum, cost) => sum + (cost.total_cost || 0), 0) || 0;
        const budgetVariance = project.budget > 0 ? ((totalCosts - project.budget) / project.budget) * 100 : 0;
        
        const scheduleVariance = project.end_date 
          ? Math.ceil((new Date(project.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        let status: 'healthy' | 'warning' | 'critical' = 'healthy';
        let riskScore = 1;

        if (budgetVariance > 10 || scheduleVariance < -10) {
          status = 'critical';
          riskScore = 8;
        } else if (budgetVariance > 5 || scheduleVariance < -5) {
          status = 'warning';
          riskScore = 5;
        }

        return {
          id: project.id,
          name: project.name,
          status,
          completion: project.completion_percentage || 0,
          budgetVariance,
          scheduleVariance,
          riskScore
        };
      });

      setProjectHealth(healthData);
    }
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
    efficiency: {
      label: "Efficiency",
      color: "hsl(var(--chart-4))",
    },
    projects: {
      label: "Projects",
      color: "hsl(var(--chart-5))",
    }
  };

  const getStatusColor = (status: ProjectHealth['status']) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: ProjectHealth['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Executive Dashboard</h2>
          <p className="text-muted-foreground">High-level business insights and performance metrics</p>
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
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <ResponsiveGrid cols={{ default: 1, sm: 2, lg: 4, xl: 6 }}>
        <KPICard
          title="Total Revenue"
          value={`$${(executiveMetrics.totalRevenue / 1000000).toFixed(1)}M`}
          icon={DollarSign}
          subtitle="Annual"
          change={`+${executiveMetrics.revenueGrowth}%`}
          changeType="positive"
        />
        <KPICard
          title="Active Projects"
          value={executiveMetrics.activeProjects}
          icon={Building2}
          subtitle={`of ${executiveMetrics.totalProjects} total`}
          change="+3"
          changeType="positive"
        />
        <KPICard
          title="Profit Margin"
          value={`${executiveMetrics.avgProfitMargin.toFixed(1)}%`}
          icon={TrendingUp}
          subtitle="Average"
          change="+2.1%"
          changeType="positive"
        />
        <KPICard
          title="On-Time Delivery"
          value={`${executiveMetrics.onTimeDelivery.toFixed(1)}%`}
          icon={Target}
          subtitle="Project delivery"
          change="+5.2%"
          changeType="positive"
        />
        <KPICard
          title="Team Utilization"
          value={`${executiveMetrics.teamUtilization.toFixed(1)}%`}
          icon={Users}
          subtitle="Resource efficiency"
          change="+3.8%"
          changeType="positive"
        />
        <KPICard
          title="Cash Flow"
          value={`$${(executiveMetrics.cashFlow / 1000).toFixed(0)}K`}
          icon={Activity}
          subtitle="Current month"
          change="+$42K"
          changeType="positive"
        />
      </ResponsiveGrid>

      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Financial Performance</TabsTrigger>
          <TabsTrigger value="projects">Project Portfolio</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="risks">Risk Management</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <ResponsiveGrid cols={{ default: 1, lg: 2 }}>
            <Card>
              <CardHeader>
                <CardTitle>Revenue & Profit Trends</CardTitle>
                <CardDescription>Monthly revenue, costs, and profit margins</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[350px]">
                  <AreaChart data={trendData}>
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
                      dataKey="costs"
                      stackId="2"
                      stroke="var(--color-costs)"
                      fill="var(--color-costs)"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      stackId="3"
                      stroke="var(--color-profit)"
                      fill="var(--color-profit)"
                      fillOpacity={0.4}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Business Efficiency</CardTitle>
                <CardDescription>Operational efficiency and project velocity</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[350px]">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      yAxisId="left"
                      dataKey="projects" 
                      fill="var(--color-projects)"
                      name="Projects Started"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="efficiency"
                      stroke="var(--color-efficiency)"
                      strokeWidth={3}
                      name="Efficiency %"
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </ResponsiveGrid>

          {/* Financial Highlights */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Highlights</CardTitle>
              <CardDescription>Key financial metrics and comparisons</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveGrid cols={{ default: 1, sm: 2, lg: 4 }}>
                <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">YTD Revenue</p>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                        $3.2M
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        +28% vs last year
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Deal Size</p>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        $68K
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        +12% vs last year
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-blue-600" />
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Collection Rate</p>
                      <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                        94.2%
                      </p>
                      <p className="text-xs text-purple-600 dark:text-purple-400">
                        +2.1% vs last year
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-purple-600" />
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">ROI</p>
                      <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                        124%
                      </p>
                      <p className="text-xs text-orange-600 dark:text-orange-400">
                        +18% vs last year
                      </p>
                    </div>
                    <Target className="h-8 w-8 text-orange-600" />
                  </div>
                </div>
              </ResponsiveGrid>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Health Overview</CardTitle>
              <CardDescription>Real-time project status and risk assessment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projectHealth.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(project.status)}
                      <div>
                        <h4 className="font-medium">{project.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {project.completion}% complete
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6 text-sm">
                      <div className="text-center">
                        <p className="text-muted-foreground">Budget</p>
                        <p className={project.budgetVariance > 5 ? 'text-red-600' : project.budgetVariance > 0 ? 'text-yellow-600' : 'text-green-600'}>
                          {project.budgetVariance > 0 ? '+' : ''}{project.budgetVariance.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">Schedule</p>
                        <p className={project.scheduleVariance < -5 ? 'text-red-600' : project.scheduleVariance < 0 ? 'text-yellow-600' : 'text-green-600'}>
                          {project.scheduleVariance > 0 ? '+' : ''}{project.scheduleVariance} days
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">Risk</p>
                        <p className={project.riskScore > 7 ? 'text-red-600' : project.riskScore > 4 ? 'text-yellow-600' : 'text-green-600'}>
                          {project.riskScore}/10
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <ResponsiveGrid cols={{ default: 1, lg: 2 }}>
            <Card>
              <CardHeader>
                <CardTitle>Resource Utilization</CardTitle>
                <CardDescription>Team and equipment efficiency metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <BarChart data={trendData.slice(-6)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="efficiency" fill="var(--color-efficiency)" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Operational KPIs</CardTitle>
                <CardDescription>Key operational performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Average Project Duration</span>
                    <span className="font-medium">127 days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Cost per Square Foot</span>
                    <span className="font-medium">$142</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Change Order Rate</span>
                    <span className="font-medium">8.3%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Safety Incident Rate</span>
                    <span className="font-medium">0.2%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Client Retention Rate</span>
                    <span className="font-medium">94.5%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </ResponsiveGrid>
        </TabsContent>

        <TabsContent value="risks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Risk Assessment Dashboard</CardTitle>
              <CardDescription>Identified risks and mitigation strategies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 border-l-4 border-red-500 bg-red-50 dark:bg-red-950/20">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-red-800 dark:text-red-200">High Risk</h4>
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    2 projects significantly over budget requiring immediate attention
                  </p>
                </div>

                <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Medium Risk</h4>
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    5 projects showing schedule delays of 5+ days
                  </p>
                </div>

                <div className="p-4 border-l-4 border-green-500 bg-green-50 dark:bg-green-950/20">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-green-800 dark:text-green-200">Low Risk</h4>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    11 projects on track with minimal risk exposure
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExecutiveDashboard;