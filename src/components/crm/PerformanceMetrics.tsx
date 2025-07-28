import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ComposedChart, Bar, Area } from "recharts";
import { TrendingUp, TrendingDown, Activity, Users, Target, Clock } from "lucide-react";

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  deals: {
    label: "Deals",
    color: "hsl(var(--chart-2))",
  },
  leads: {
    label: "Leads",
    color: "hsl(var(--chart-3))",
  },
  conversion: {
    label: "Conversion Rate",
    color: "hsl(var(--chart-4))",
  },
};

const performanceData = [
  { month: "Jan", revenue: 85000, deals: 18, leads: 142, conversion: 12.7, activities: 245 },
  { month: "Feb", revenue: 92000, deals: 22, leads: 158, conversion: 13.9, activities: 268 },
  { month: "Mar", revenue: 108000, deals: 25, leads: 165, conversion: 15.2, activities: 289 },
  { month: "Apr", revenue: 125000, deals: 28, leads: 178, conversion: 15.7, activities: 312 },
  { month: "May", revenue: 142000, deals: 32, leads: 192, conversion: 16.7, activities: 335 },
  { month: "Jun", revenue: 158000, deals: 35, leads: 205, conversion: 17.1, activities: 358 },
];

const kpis = [
  {
    title: "Monthly Revenue",
    value: "$158,000",
    change: "+11.3%",
    trend: "up",
    icon: TrendingUp,
    target: "$160,000",
  },
  {
    title: "Deals Closed",
    value: "35",
    change: "+9.4%",
    trend: "up",
    icon: Target,
    target: "40",
  },
  {
    title: "Lead Conversion",
    value: "17.1%",
    change: "+2.4%",
    trend: "up",
    icon: Users,
    target: "18%",
  },
  {
    title: "Avg. Sales Cycle",
    value: "28 days",
    change: "-3 days",
    trend: "up",
    icon: Clock,
    target: "25 days",
  },
  {
    title: "Activities per Day",
    value: "12.8",
    change: "+1.2",
    trend: "up",
    icon: Activity,
    target: "15",
  },
  {
    title: "Pipeline Value",
    value: "$485,000",
    change: "+15.2%",
    trend: "up",
    icon: TrendingUp,
    target: "$500,000",
  },
];

const goalProgress = [
  { metric: "Revenue Goal", current: 158000, target: 180000, percentage: 87.8 },
  { metric: "Deals Goal", current: 35, target: 42, percentage: 83.3 },
  { metric: "Lead Gen Goal", current: 205, target: 220, percentage: 93.2 },
  { metric: "Conversion Goal", current: 17.1, target: 20, percentage: 85.5 },
];

export const PerformanceMetrics = () => {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const isPositive = kpi.trend === "up";
          
          return (
            <Card key={kpi.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`h-4 w-4 ${isPositive ? "text-success" : "text-destructive"}`} />
                  <div className={`flex items-center text-sm ${isPositive ? "text-success" : "text-destructive"}`}>
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {kpi.change}
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">{kpi.title}</h3>
                  <div className="text-2xl font-bold">{kpi.value}</div>
                  <div className="text-xs text-muted-foreground">Target: {kpi.target}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Performance Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar yAxisId="left" dataKey="revenue" fill="var(--color-revenue)" name="Revenue ($)" />
                <Line yAxisId="right" type="monotone" dataKey="deals" stroke="var(--color-deals)" strokeWidth={3} name="Deals" />
                <Line yAxisId="right" type="monotone" dataKey="conversion" stroke="var(--color-conversion)" strokeWidth={2} name="Conversion %" />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Goal Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Goal Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {goalProgress.map((goal) => (
              <div key={goal.metric} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{goal.metric}</span>
                  <span className="text-sm text-muted-foreground">
                    {typeof goal.current === 'number' && goal.current > 1000 
                      ? `$${(goal.current / 1000).toFixed(0)}K / $${(goal.target / 1000).toFixed(0)}K`
                      : `${goal.current} / ${goal.target}`
                    }
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full ${
                      goal.percentage >= 90 ? 'bg-success' : 
                      goal.percentage >= 70 ? 'bg-warning' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(goal.percentage, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{goal.percentage.toFixed(1)}% complete</span>
                  <span>{goal.percentage >= 90 ? 'On track' : goal.percentage >= 70 ? 'Needs attention' : 'Behind target'}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity & Lead Generation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Activity Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="activities" 
                    stroke="var(--color-leads)" 
                    strokeWidth={3}
                    name="Daily Activities"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Generation</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="leads" fill="var(--color-leads)" name="Leads Generated" />
                  <Line 
                    type="monotone" 
                    dataKey="conversion" 
                    stroke="var(--color-conversion)" 
                    strokeWidth={2}
                    name="Conversion Rate %"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};