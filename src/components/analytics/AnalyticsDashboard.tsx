/**
 * Analytics Dashboard Component
 * Comprehensive business intelligence dashboard
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Users,
  Briefcase,
  AlertTriangle,
  Target,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { analyticsEngine, type AnalyticsFilters } from '@/services/analytics/analyticsEngine';
import { DashboardSkeleton } from '@/components/ui/skeletons';

interface AnalyticsDashboardProps {
  companyId: string;
  className?: string;
}

const COLORS = {
  primary: 'hsl(var(--primary))',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
};

export function AnalyticsDashboard({ companyId, className }: AnalyticsDashboardProps) {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'30d' | '90d' | '6m' | '1y'>('90d');

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const startDate = new Date();

      switch (dateRange) {
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        case '6m':
          startDate.setMonth(now.getMonth() - 6);
          break;
        case '1y':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      const filters: AnalyticsFilters = {
        companyId,
        startDate,
        endDate: now,
        includeCompleted: true,
      };

      const data = await analyticsEngine.getDashboard(filters);
      setDashboard(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [companyId, dateRange]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!dashboard) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No analytics data available
        </CardContent>
      </Card>
    );
  }

  const { companyMetrics, topProjects, bottomProjects, teamPerformance, trends, forecasts, kpis } = dashboard;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Comprehensive business intelligence and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date Range Selector */}
          <div className="flex items-center gap-1 rounded-lg border p-1">
            {(['30d', '90d', '6m', '1y'] as const).map((range) => (
              <Button
                key={range}
                variant={dateRange === range ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDateRange(range)}
              >
                {range.toUpperCase()}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={loadDashboard}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus;
          const trendColor =
            kpi.trend === 'up'
              ? 'text-green-600'
              : kpi.trend === 'down'
              ? 'text-red-600'
              : 'text-muted-foreground';

          return (
            <Card key={kpi.name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.name}</CardTitle>
                <Badge
                  variant={
                    kpi.status === 'good'
                      ? 'default'
                      : kpi.status === 'warning'
                      ? 'secondary'
                      : 'destructive'
                  }
                >
                  {kpi.status}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {kpi.unit === '$' && '$'}
                  {kpi.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  {kpi.unit === '%' && '%'}
                </div>
                <div className={cn('flex items-center text-xs', trendColor)}>
                  <TrendIcon className="mr-1 h-4 w-4" />
                  <span>
                    {kpi.changePercent > 0 ? '+' : ''}
                    {kpi.changePercent.toFixed(1)}% from last period
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Company Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${companyMetrics.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {companyMetrics.totalProfitMarginPercent.toFixed(1)}% profit margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companyMetrics.activeProjects}</div>
            <p className="text-xs text-muted-foreground">
              {companyMetrics.completedProjects} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Utilization</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companyMetrics.teamUtilization.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Resource efficiency</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companyMetrics.projectSuccessRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">On-time & on-budget</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends & Forecasts</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="team">Team Performance</TabsTrigger>
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue & Costs Trend</CardTitle>
              <CardDescription>Historical performance and future forecasts</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={[...trends, ...forecasts.map(f => ({ ...f, period: f.period, isForeast: true }))]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    name="Revenue"
                  />
                  <Line
                    type="monotone"
                    dataKey="costs"
                    stroke={COLORS.danger}
                    strokeWidth={2}
                    name="Costs"
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke={COLORS.success}
                    strokeWidth={2}
                    name="Profit"
                  />
                  <Line
                    type="monotone"
                    dataKey="predictedRevenue"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Predicted Revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Project Activity</CardTitle>
                <CardDescription>Started vs Completed projects</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="projectsStarted" fill={COLORS.info} name="Started" />
                    <Bar dataKey="projectsCompleted" fill={COLORS.success} name="Completed" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Forecasts</CardTitle>
                <CardDescription>Next 3 months predictions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {forecasts.map((forecast, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{forecast.period}</p>
                        <p className="text-sm text-muted-foreground">
                          ${forecast.predictedProfit.toLocaleString()} profit
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{forecast.confidence.toFixed(0)}% confidence</Badge>
                        {forecast.trend === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : forecast.trend === 'down' ? (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        ) : (
                          <Minus className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Projects</CardTitle>
                <CardDescription>Highest efficiency scores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topProjects.map((project) => (
                    <div key={project.projectId} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{project.projectName}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{project.completionPercent}% complete</span>
                          <span>•</span>
                          <span className={project.onBudget ? 'text-green-600' : 'text-red-600'}>
                            {project.onBudget ? 'On budget' : 'Over budget'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="default">{project.efficiency}%</Badge>
                        <p className="text-sm text-muted-foreground">
                          {project.profitMarginPercent.toFixed(1)}% margin
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Projects Needing Attention</CardTitle>
                <CardDescription>Highest risk scores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bottomProjects.map((project) => (
                    <div key={project.projectId} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{project.projectName}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{project.completionPercent}% complete</span>
                          {project.riskScore > 50 && (
                            <>
                              <span>•</span>
                              <span className="text-red-600 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                High risk
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="destructive">{project.efficiency}%</Badge>
                        <p className="text-sm text-muted-foreground">
                          ${project.budgetVariance.toLocaleString()} variance
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
              <CardDescription>Individual contributor metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamPerformance.slice(0, 10).map((member) => (
                  <div key={member.userId} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{member.userName}</p>
                      <p className="text-sm text-muted-foreground capitalize">{member.role}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-right">
                      <div>
                        <p className="text-sm font-medium">{member.totalHours.toFixed(0)}h</p>
                        <p className="text-xs text-muted-foreground">Total hours</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{member.utilizationRate.toFixed(0)}%</p>
                        <p className="text-xs text-muted-foreground">Utilization</p>
                      </div>
                      <div>
                        <Badge
                          variant={
                            member.performanceScore >= 75
                              ? 'default'
                              : member.performanceScore >= 50
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {member.performanceScore}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Example usage:
 *
 * ```tsx
 * import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
 *
 * function Dashboard() {
 *   const { companyId } = useAuth();
 *
 *   return (
 *     <div className="container mx-auto p-6">
 *       <AnalyticsDashboard companyId={companyId} />
 *     </div>
 *   );
 * }
 * ```
 */
