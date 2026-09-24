import React, { useState } from 'react';
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
  CartesianGrid
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Building2, 
  Target,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  Download
} from 'lucide-react';
import { useExecutiveDashboard, type ExecutivePeriod, type ProjectHealth } from '@/hooks/useExecutiveDashboard';
import { ErrorState } from '@/components/common/ErrorState';
import { DashboardSkeleton } from '@/components/ui/skeletons';

const pct = (n: number | null | undefined) => (n == null ? '--' : `${n.toFixed(1)}%`);

const ExecutiveDashboard: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<ExecutivePeriod>('last_12_months');
  const dashboard = useExecutiveDashboard(selectedPeriod);
  const executiveMetrics = dashboard.data?.metrics;
  const trendData = dashboard.data?.trend ?? [];
  const projectHealth = dashboard.data?.projectHealth ?? [];
  const riskCounts = dashboard.data?.riskCounts;

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

  if (dashboard.isLoading) {
    return (
      <DashboardSkeleton label="Loading analytics" />
    );
  }

  if (dashboard.error || !executiveMetrics) {
    return (
      <ErrorState
        title="The executive dashboard could not be loaded"
        error={dashboard.error ?? 'Your account is not linked to a company.'}
        onRetry={dashboard.error ? () => { void dashboard.refetch(); } : undefined}
      />
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
          <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as ExecutivePeriod)}>
            <SelectTrigger className="w-48" aria-label="Reporting period">
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

      {/* Key Performance Indicators. No change badges: nothing here reads a
          prior period to compare against, so any delta would be invented. */}
      <ResponsiveGrid cols={{ default: 1, sm: 2, lg: 4, xl: 6 }}>
        <KPICard
          title="Revenue"
          value={`$${(executiveMetrics.totalRevenue / 1000000).toFixed(1)}M`}
          icon={DollarSign}
          subtitle="Paid invoices, this period"
        />
        <KPICard
          title="Active Projects"
          value={executiveMetrics.activeProjects}
          icon={Building2}
          subtitle={`of ${executiveMetrics.totalProjects} total`}
        />
        <KPICard
          title="Profit Margin"
          value={pct(executiveMetrics.avgProfitMargin)}
          icon={TrendingUp}
          subtitle="Average, budget less job costs"
        />
        <KPICard
          title="On-Time Delivery"
          value={pct(executiveMetrics.onTimeDelivery)}
          icon={Target}
          subtitle="Project delivery"
        />
        <KPICard
          title="Team Utilization"
          value="--"
          icon={Users}
          subtitle="Not tracked yet"
        />
        <KPICard
          title="Cash Flow"
          value={`$${(executiveMetrics.cashFlow / 1000).toFixed(0)}K`}
          icon={Activity}
          subtitle="Paid less pending, this period"
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
                      <p className="text-sm text-muted-foreground">Invoiced</p>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                        ${executiveMetrics.totalInvoiced.toLocaleString()}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        {executiveMetrics.invoiceCount} invoices this period
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Invoice</p>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {executiveMetrics.avgInvoice == null ? '--' : `$${Math.round(executiveMetrics.avgInvoice).toLocaleString()}`}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        This period
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-blue-600" />
                  </div>
                </div>

                <div className="p-4 bg-orange-50 dark:bg-orange-950/40 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Collection Rate</p>
                      <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                        {pct(executiveMetrics.collectionRate)}
                      </p>
                      <p className="text-xs text-orange-600 dark:text-orange-400">
                        Paid of invoiced, this period
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
                        --
                      </p>
                      <p className="text-xs text-orange-600 dark:text-orange-400">
                        Not tracked yet
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
                {projectHealth.length === 0 && (
                  <p className="text-sm text-muted-foreground">No active projects.</p>
                )}
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
                    <span className="font-medium">
                      {executiveMetrics.avgProjectDurationDays == null ? '--' : `${executiveMetrics.avgProjectDurationDays} days`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Cost per Square Foot</span>
                    <span className="font-medium">--</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Change Order Rate</span>
                    <span className="font-medium">--</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Safety Incident Rate</span>
                    <span className="font-medium">--</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Client Retention Rate</span>
                    <span className="font-medium">--</span>
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
                <div className="p-4 rounded-lg border border-red-500/40 bg-red-50 dark:bg-red-950/20">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-red-800 dark:text-red-200">High Risk</h4>
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {riskCounts ? riskCounts.critical : '--'} active projects more than 10% over budget or 10+ days past their end date
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-yellow-500/40 bg-yellow-50 dark:bg-yellow-950/20">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Medium Risk</h4>
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    {riskCounts ? riskCounts.warning : '--'} active projects 5-10% over budget or 5+ days past their end date
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-green-500/40 bg-green-50 dark:bg-green-950/20">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-green-800 dark:text-green-200">Low Risk</h4>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {riskCounts ? riskCounts.healthy : '--'} active projects within budget and schedule
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