import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList } from "recharts";
import { Users, UserCheck, Clock, Target } from "lucide-react";

const chartConfig = {
  leads: {
    label: "Total Leads",
    color: "hsl(var(--chart-1))",
  },
  qualified: {
    label: "Qualified Leads",
    color: "hsl(var(--chart-2))",
  },
  converted: {
    label: "Converted",
    color: "hsl(var(--chart-3))",
  },
};

const conversionData = [
  { month: "Jan", leads: 120, qualified: 85, converted: 18 },
  { month: "Feb", leads: 135, qualified: 92, converted: 22 },
  { month: "Mar", leads: 142, qualified: 98, converted: 24 },
  { month: "Apr", leads: 158, qualified: 110, converted: 28 },
  { month: "May", leads: 165, qualified: 118, converted: 31 },
  { month: "Jun", leads: 172, qualified: 125, converted: 34 },
];

const sourceData = [
  { name: "Website", value: 35, color: "hsl(var(--chart-1))" },
  { name: "Referrals", value: 28, color: "hsl(var(--chart-2))" },
  { name: "Social Media", value: 20, color: "hsl(var(--chart-3))" },
  { name: "Email", value: 12, color: "hsl(var(--chart-4))" },
  { name: "Other", value: 5, color: "hsl(var(--chart-5))" },
];

const funnelData = [
  { name: "Leads", value: 1000, fill: "hsl(var(--chart-1))" },
  { name: "Qualified", value: 680, fill: "hsl(var(--chart-2))" },
  { name: "Proposal", value: 340, fill: "hsl(var(--chart-3))" },
  { name: "Negotiation", value: 170, fill: "hsl(var(--chart-4))" },
  { name: "Closed Won", value: 85, fill: "hsl(var(--chart-5))" },
];

const conversionMetrics = [
  {
    title: "Lead-to-Customer",
    value: "8.5%",
    change: "+1.2%",
    icon: Target,
  },
  {
    title: "Avg. Time to Close",
    value: "32 days",
    change: "-3 days",
    icon: Clock,
  },
  {
    title: "Qualification Rate",
    value: "68%",
    change: "+5%",
    icon: UserCheck,
  },
  {
    title: "Monthly Leads",
    value: "172",
    change: "+4%",
    icon: Users,
  },
];

export const LeadConversionAnalytics = () => {
  return (
    <div className="space-y-6">
      {/* Conversion Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {conversionMetrics.map((metric) => {
          const Icon = metric.icon;
          
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
                  <span className="text-sm text-success">{metric.change}</span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold">{metric.value}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Conversion Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Conversion Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={conversionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="leads"
                  stackId="1"
                  stroke="var(--color-leads)"
                  fill="var(--color-leads)"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="qualified"
                  stackId="2"
                  stroke="var(--color-qualified)"
                  fill="var(--color-qualified)"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="converted"
                  stackId="3"
                  stroke="var(--color-converted)"
                  fill="var(--color-converted)"
                  fillOpacity={0.8}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {funnelData.map((stage, index) => {
                const percentage = index === 0 ? 100 : Math.round((stage.value / funnelData[0].value) * 100);
                
                return (
                  <div key={stage.name} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{stage.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {stage.value} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-3">
                      <div 
                        className="h-3 rounded-full" 
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: stage.fill
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Rate by Source */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Rate by Source</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { source: "Referrals", rate: 15.2, leads: 185, conversions: 28 },
              { source: "Website", rate: 8.7, leads: 312, conversions: 27 },
              { source: "Social Media", rate: 6.3, leads: 158, conversions: 10 },
              { source: "Email", rate: 12.1, leads: 99, conversions: 12 },
              { source: "Other", rate: 4.2, leads: 48, conversions: 2 },
            ].map((item) => (
              <div key={item.source} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">{item.source}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.conversions} conversions from {item.leads} leads
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{item.rate}%</div>
                  <div className="text-sm text-muted-foreground">conversion rate</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};