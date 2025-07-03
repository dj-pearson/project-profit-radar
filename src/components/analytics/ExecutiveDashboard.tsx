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
  const [selectedPeriod, setSelectedPeriod] = useState('last_12_months');
  const [executiveMetrics, setExecutiveMetrics] = useState<ExecutiveMetrics>({
    totalRevenue: 2850000,
    revenueGrowth: 23.5,
    totalProjects: 47,
    activeProjects: 18,
    completedProjects: 29,
    avgProfitMargin: 28.4,
    onTimeDelivery: 87.2,
    onBudgetProjects: 91.5,
    teamUtilization: 82.6,
    customerSatisfaction: 4.7,
    cashFlow: 425000,
    pendingInvoices: 185000
  });

  const [trendData] = useState<TrendData[]>([
    { period: 'Jan', revenue: 180000, projects: 3, costs: 125000, profit: 55000, efficiency: 78 },
    { period: 'Feb', revenue: 220000, projects: 4, costs: 155000, profit: 65000, efficiency: 82 },
    { period: 'Mar', revenue: 285000, projects: 5, costs: 198000, profit: 87000, efficiency: 85 },
    { period: 'Apr', revenue: 310000, projects: 4, costs: 215000, profit: 95000, efficiency: 88 },
    { period: 'May', revenue: 275000, projects: 3, costs: 190000, profit: 85000, efficiency: 84 },
    { period: 'Jun', revenue: 340000, projects: 6, costs: 235000, profit: 105000, efficiency: 89 },
    { period: 'Jul', revenue: 365000, projects: 5, costs: 250000, profit: 115000, efficiency: 91 },
    { period: 'Aug', revenue: 295000, projects: 4, costs: 205000, profit: 90000, efficiency: 86 },
    { period: 'Sep', revenue: 420000, projects: 7, costs: 285000, profit: 135000, efficiency: 93 },
    { period: 'Oct', revenue: 385000, projects: 5, costs: 265000, profit: 120000, efficiency: 90 },
    { period: 'Nov', revenue: 445000, projects: 6, costs: 300000, profit: 145000, efficiency: 94 },
    { period: 'Dec', revenue: 390000, projects: 5, costs: 270000, profit: 120000, efficiency: 92 }
  ]);

  const [projectHealth] = useState<ProjectHealth[]>([
    { id: '1', name: 'Downtown Office Complex', status: 'healthy', completion: 85, budgetVariance: -2.3, scheduleVariance: 3, riskScore: 2 },
    { id: '2', name: 'Residential Tower A', status: 'warning', completion: 65, budgetVariance: 8.5, scheduleVariance: -5, riskScore: 6 },
    { id: '3', name: 'Shopping Center Renovation', status: 'healthy', completion: 92, budgetVariance: -1.2, scheduleVariance: 2, riskScore: 1 },
    { id: '4', name: 'Industrial Warehouse', status: 'critical', completion: 45, budgetVariance: 15.2, scheduleVariance: -12, riskScore: 9 },
    { id: '5', name: 'Medical Center Wing', status: 'healthy', completion: 78, budgetVariance: 3.1, scheduleVariance: 1, riskScore: 3 }
  ]);

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