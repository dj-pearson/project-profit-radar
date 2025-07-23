import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { TrendingUp, Users, Mail, MousePointer, UserCheck, UserX } from "lucide-react";

interface FunnelAnalyticsProps {
  funnelId: string;
}

interface AnalyticsData {
  total_subscribers: number;
  active_subscribers: number;
  completed_subscribers: number;
  unsubscribed_subscribers: number;
  completion_rate: number;
  step_performance: Array<{
    step_order: number;
    step_name: string;
    emails_sent: number;
    emails_opened: number;
    emails_clicked: number;
    open_rate: number;
    click_rate: number;
  }>;
}

export function FunnelAnalytics({ funnelId }: FunnelAnalyticsProps) {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["funnel-analytics", funnelId],
    queryFn: async () => {
      // Get funnel subscribers data
      const { data: subscribers, error: subscribersError } = await supabase
        .from("funnel_subscribers")
        .select("status")
        .eq("funnel_id", funnelId);

      if (subscribersError) throw subscribersError;

      // Get step performance data
      const { data: steps, error: stepsError } = await supabase
        .from("funnel_steps")
        .select("id, step_order, name, open_rate, click_rate")
        .eq("funnel_id", funnelId)
        .order("step_order");

      if (stepsError) throw stepsError;

      // Calculate metrics
      const totalSubscribers = subscribers.length;
      const activeSubscribers = subscribers.filter(s => s.status === 'active').length;
      const completedSubscribers = subscribers.filter(s => s.status === 'completed').length;
      const unsubscribedSubscribers = subscribers.filter(s => s.status === 'unsubscribed').length;
      const completionRate = totalSubscribers > 0 ? (completedSubscribers / totalSubscribers) * 100 : 0;

      // Mock step performance data (in real implementation, this would come from email logs)
      const stepPerformance = steps.map((step, index) => ({
        step_order: step.step_order,
        step_name: step.name,
        emails_sent: Math.max(0, totalSubscribers - (index * 5)), // Mock decreasing sends
        emails_opened: Math.floor((Math.max(0, totalSubscribers - (index * 5))) * (step.open_rate / 100)),
        emails_clicked: Math.floor((Math.max(0, totalSubscribers - (index * 5))) * (step.click_rate / 100)),
        open_rate: step.open_rate,
        click_rate: step.click_rate,
      }));

      return {
        total_subscribers: totalSubscribers,
        active_subscribers: activeSubscribers,
        completed_subscribers: completedSubscribers,
        unsubscribed_subscribers: unsubscribedSubscribers,
        completion_rate: completionRate,
        step_performance: stepPerformance,
      } as AnalyticsData;
    },
  });

  if (isLoading) {
    return <div>Loading analytics...</div>;
  }

  if (!analytics) {
    return <div>No analytics data available</div>;
  }

  const performanceData = analytics.step_performance.map(step => ({
    name: `Step ${step.step_order}`,
    sent: step.emails_sent,
    opened: step.emails_opened,
    clicked: step.emails_clicked,
    openRate: step.open_rate,
    clickRate: step.click_rate,
  }));

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_subscribers}</div>
            <p className="text-xs text-muted-foreground">
              All time subscribers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.active_subscribers}</div>
            <p className="text-xs text-muted-foreground">
              Currently in funnel
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.completion_rate.toFixed(1)}%</div>
            <Progress value={analytics.completion_rate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unsubscribed</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.unsubscribed_subscribers}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.total_subscribers > 0 
                ? ((analytics.unsubscribed_subscribers / analytics.total_subscribers) * 100).toFixed(1)
                : 0}% unsubscribe rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Step Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Step Performance</CardTitle>
          <CardDescription>
            Email engagement metrics by funnel step
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="sent" fill="hsl(var(--primary))" name="Sent" />
              <Bar dataKey="opened" fill="hsl(var(--secondary))" name="Opened" />
              <Bar dataKey="clicked" fill="hsl(var(--accent))" name="Clicked" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Engagement Rates Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Rates</CardTitle>
          <CardDescription>
            Open and click rates by funnel step
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => [`${value}%`, '']} />
              <Line 
                type="monotone" 
                dataKey="openRate" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Open Rate"
              />
              <Line 
                type="monotone" 
                dataKey="clickRate" 
                stroke="hsl(var(--secondary))" 
                strokeWidth={2}
                name="Click Rate"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Step Details */}
      <Card>
        <CardHeader>
          <CardTitle>Step Details</CardTitle>
          <CardDescription>
            Detailed performance metrics for each step
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.step_performance.map((step) => (
              <div key={step.step_order} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Step {step.step_order}: {step.step_name}</h4>
                  <div className="flex space-x-4 text-sm text-muted-foreground">
                    <span className="flex items-center">
                      <Mail className="h-4 w-4 mr-1" />
                      {step.emails_sent} sent
                    </span>
                    <span className="flex items-center">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      {step.open_rate}% open
                    </span>
                    <span className="flex items-center">
                      <MousePointer className="h-4 w-4 mr-1" />
                      {step.click_rate}% click
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Open Rate</div>
                    <Progress value={step.open_rate} className="h-2" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Click Rate</div>
                    <Progress value={step.click_rate} className="h-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}