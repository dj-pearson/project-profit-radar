import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ComposedChart, Bar, Area } from "recharts";
import { TrendingUp, TrendingDown, Activity, Users, Target, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

export const PerformanceMetrics = () => {
  const { userProfile } = useAuth();
  const [performanceData, setPerformanceData] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [goalProgress, setGoalProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformanceData();
  }, [userProfile]);

  const loadPerformanceData = async () => {
    if (!userProfile?.company_id) return;

    try {
      // Get leads data
      const { data: leads } = await supabase
        .from('leads')
        .select('status, estimated_budget, created_at') as any;

      // Get activities data
      const { data: activities } = await supabase
        .from('lead_activities')
        .select('created_at')
        .eq('company_id', userProfile.company_id);

      // Generate monthly performance data
      const monthlyData = [];
      const currentDate = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        
        const monthLeads = leads?.filter(l => {
          const leadDate = new Date(l.created_at);
          return leadDate.getMonth() === date.getMonth() && 
                 leadDate.getFullYear() === date.getFullYear();
        }) || [];

        const monthActivities = activities?.filter(a => {
          const activityDate = new Date(a.created_at);
          return activityDate.getMonth() === date.getMonth() && 
                 activityDate.getFullYear() === date.getFullYear();
        }) || [];

        const closedDeals = monthLeads.filter(l => l.status === 'closed_won');
        const revenue = closedDeals.reduce((sum, l) => sum + (l.estimated_budget || 0), 0);
        const conversionRate = monthLeads.length > 0 ? (closedDeals.length / monthLeads.length) * 100 : 0;

        monthlyData.push({
          month: monthName,
          revenue,
          deals: closedDeals.length,
          leads: monthLeads.length,
          conversion: conversionRate,
          activities: monthActivities.length
        });
      }

      // Calculate current metrics
      const currentMonth = monthlyData[monthlyData.length - 1] || {};
      const previousMonth = monthlyData[monthlyData.length - 2] || {};
      
      const totalPipeline = leads?.filter(l => ['qualified', 'proposal', 'negotiation'].includes(l.status))
        .reduce((sum, l) => sum + (l.estimated_budget || 0), 0) || 0;

      const avgSalesCycle = 28; // Mock value - would need date tracking in real implementation
      const activitiesPerDay = (currentMonth.activities || 0) / 30;

      const kpiData = [
        {
          title: "Monthly Revenue",
          value: `$${((currentMonth.revenue || 0) / 1000).toFixed(0)}K`,
          change: "+11.3%",
          trend: "up",
          icon: TrendingUp,
          target: "$160K",
        },
        {
          title: "Deals Closed",
          value: (currentMonth.deals || 0).toString(),
          change: "+9.4%",
          trend: "up",
          icon: Target,
          target: "40",
        },
        {
          title: "Lead Conversion",
          value: `${(currentMonth.conversion || 0).toFixed(1)}%`,
          change: "+2.4%",
          trend: "up",
          icon: Users,
          target: "18%",
        },
        {
          title: "Avg. Sales Cycle",
          value: `${avgSalesCycle} days`,
          change: "-3 days",
          trend: "up",
          icon: Clock,
          target: "25 days",
        },
        {
          title: "Activities per Day",
          value: activitiesPerDay.toFixed(1),
          change: "+1.2",
          trend: "up",
          icon: Activity,
          target: "15",
        },
        {
          title: "Pipeline Value",
          value: `$${(totalPipeline / 1000).toFixed(0)}K`,
          change: "+15.2%",
          trend: "up",
          icon: TrendingUp,
          target: "$500K",
        },
      ];

      // Calculate goal progress
      const progressData = [
        { 
          metric: "Revenue Goal", 
          current: currentMonth.revenue || 0, 
          target: 180000, 
          percentage: ((currentMonth.revenue || 0) / 180000) * 100 
        },
        { 
          metric: "Deals Goal", 
          current: currentMonth.deals || 0, 
          target: 42, 
          percentage: ((currentMonth.deals || 0) / 42) * 100 
        },
        { 
          metric: "Lead Gen Goal", 
          current: currentMonth.leads || 0, 
          target: 220, 
          percentage: ((currentMonth.leads || 0) / 220) * 100 
        },
        { 
          metric: "Conversion Goal", 
          current: currentMonth.conversion || 0, 
          target: 20, 
          percentage: ((currentMonth.conversion || 0) / 20) * 100 
        },
      ];

      setPerformanceData(monthlyData);
      setKpis(kpiData);
      setGoalProgress(progressData);
    } catch (error) {
      console.error('Error loading performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading performance metrics...</div>;
  }

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