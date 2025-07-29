import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const chartConfig = {
  actual: {
    label: "Actual Revenue",
    color: "hsl(var(--chart-1))",
  },
  forecast: {
    label: "Forecasted Revenue",
    color: "hsl(var(--chart-2))",
  },
  pipeline: {
    label: "Pipeline Value",
    color: "hsl(var(--chart-3))",
  },
};

export const RevenueForecasting = () => {
  const { userProfile } = useAuth();
  const [revenueData, setRevenueData] = useState([]);
  const [metrics, setMetrics] = useState({
    totalPipeline: 0,
    avgDealSize: 0,
    conversionRate: 0,
    forecast: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRevenueData();
  }, [userProfile]);

  const loadRevenueData = async () => {
    if (!userProfile?.company_id) return;

    try {
      // Get pipeline data from leads
      const { data: leads } = await supabase
        .from('leads')
        .select('estimated_budget, status, created_at, decision_timeline')
        .eq('company_id', userProfile.company_id);

      // Get completed projects for actual revenue
      const { data: projects } = await supabase
        .from('projects')
        .select('budget, status, created_at, completion_percentage')
        .eq('company_id', userProfile.company_id)
        .eq('status', 'completed');

      // Calculate metrics
      const pipelineValue = leads?.filter(l => ['qualified', 'proposal', 'negotiation'].includes(l.status))
        .reduce((sum, lead) => sum + (lead.estimated_budget || 0), 0) || 0;
      
      const avgDeal = leads?.length > 0 
        ? leads.reduce((sum, lead) => sum + (lead.estimated_budget || 0), 0) / leads.length 
        : 0;

      const totalBudget = projects?.reduce((sum, p) => sum + (p.budget || 0), 0) || 0;
      const conversionRate = leads?.length > 0 ? (projects?.length || 0) / leads.length * 100 : 0;

      // Generate monthly data
      const monthlyData = [];
      const currentDate = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        
        const monthRevenue = projects?.filter(p => {
          const projectDate = new Date(p.created_at);
          return projectDate.getMonth() === date.getMonth() && 
                 projectDate.getFullYear() === date.getFullYear();
        }).reduce((sum, p) => sum + (p.budget || 0), 0) || 0;

        const monthPipeline = leads?.filter(l => {
          const leadDate = new Date(l.created_at);
          return leadDate.getMonth() === date.getMonth() && 
                 leadDate.getFullYear() === date.getFullYear();
        }).reduce((sum, l) => sum + (l.estimated_budget || 0), 0) || 0;

        monthlyData.push({
          month: monthName,
          actual: i < 2 ? monthRevenue : null, // Only show actual for past months
          forecast: Math.max(monthRevenue * 1.1, avgDeal * 3), // Simple forecast
          pipeline: monthPipeline
        });
      }

      setRevenueData(monthlyData);
      setMetrics({
        totalPipeline: pipelineValue,
        avgDealSize: avgDeal,
        conversionRate,
        forecast: avgDeal * 10 // Simple quarterly forecast
      });
    } catch (error) {
      console.error('Error loading revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const forecastMetrics = [
    {
      title: "Q2 Forecast",
      value: `$${(metrics.forecast / 1000).toFixed(0)}K`,
      change: "+12.5%",
      trend: "up",
      icon: Target,
    },
    {
      title: "Pipeline Value",
      value: `$${(metrics.totalPipeline / 1000).toFixed(0)}K`,
      change: "+8.3%",
      trend: "up",
      icon: DollarSign,
    },
    {
      title: "Conversion Rate",
      value: `${metrics.conversionRate.toFixed(1)}%`,
      change: "+2.1%",
      trend: "up",
      icon: TrendingUp,
    },
    {
      title: "Avg Deal Size",
      value: `$${(metrics.avgDealSize / 1000).toFixed(0)}K`,
      change: "-3.2%",
      trend: "down",
      icon: DollarSign,
    },
  ];

  if (loading) {
    return <div className="text-center py-8">Loading revenue data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Forecast Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {forecastMetrics.map((metric) => {
          const Icon = metric.icon;
          const TrendIcon = metric.trend === "up" ? TrendingUp : TrendingDown;
          
          return (
            <Card key={metric.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      {metric.title}
                    </span>
                  </div>
                  <div className={`flex items-center space-x-1 text-sm ${
                    metric.trend === "up" ? "text-success" : "text-destructive"
                  }`}>
                    <TrendIcon className="h-3 w-3" />
                    <span>{metric.change}</span>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold">{metric.value}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revenue Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Forecast vs Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="var(--color-actual)"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="var(--color-forecast)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="pipeline"
                  stroke="var(--color-pipeline)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Quarterly Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quarterly Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { quarter: "Q1", target: 400000, actual: 455000 },
                  { quarter: "Q2", target: 450000, actual: 520000 },
                  { quarter: "Q3", target: 500000, actual: 0 },
                  { quarter: "Q4", target: 550000, actual: 0 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="quarter" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="target" fill="var(--color-forecast)" name="Target" />
                  <Bar dataKey="actual" fill="var(--color-actual)" name="Actual" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Forecast Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Last Quarter</span>
                <span className="font-semibold text-success">94.2% accuracy</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">This Quarter</span>
                <span className="font-semibold">85.7% accuracy</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">YTD Average</span>
                <span className="font-semibold">89.1% accuracy</span>
              </div>
              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground mb-2">Confidence Level</div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: "87%" }}></div>
                </div>
                <div className="text-right text-sm text-muted-foreground mt-1">87%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};