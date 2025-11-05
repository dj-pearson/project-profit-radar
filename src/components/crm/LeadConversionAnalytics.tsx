import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList } from "recharts";
import { Users, UserCheck, Clock, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

export const LeadConversionAnalytics = () => {
  const { userProfile } = useAuth();
  const [conversionData, setConversionData] = useState([]);
  const [sourceData, setSourceData] = useState([]);
  const [funnelData, setFunnelData] = useState([]);
  const [conversionMetrics, setConversionMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversionData();
  }, [userProfile]);

  const loadConversionData = async () => {
    if (!userProfile?.company_id) return;

    try {
      // Get all leads for the company
      const { data: leads } = await supabase
        .from('leads')
        .select('status, lead_source, created_at, estimated_budget') as any;

      // Generate monthly conversion data
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

        const qualified = monthLeads.filter(l => ['qualified', 'proposal', 'negotiation', 'closed_won'].includes(l.status)).length;
        const converted = monthLeads.filter(l => l.status === 'closed_won').length;

        monthlyData.push({
          month: monthName,
          leads: monthLeads.length,
          qualified,
          converted
        });
      }

      // Calculate lead sources
      const sourceCounts = {};
      leads?.forEach(lead => {
        const source = lead.lead_source || 'Other';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });

      const sourceChartData = Object.entries(sourceCounts).map(([name, value], index) => ({
        name,
        value,
        color: `hsl(var(--chart-${(index % 5) + 1}))`
      }));

      // Calculate funnel data
      const totalLeads = leads?.length || 0;
      const qualifiedLeads = leads?.filter(l => ['qualified', 'proposal', 'negotiation', 'closed_won'].includes(l.status)).length || 0;
      const proposalLeads = leads?.filter(l => ['proposal', 'negotiation', 'closed_won'].includes(l.status)).length || 0;
      const negotiationLeads = leads?.filter(l => ['negotiation', 'closed_won'].includes(l.status)).length || 0;
      const closedWonLeads = leads?.filter(l => l.status === 'closed_won').length || 0;

      const funnelChartData = [
        { name: "Leads", value: totalLeads, fill: "hsl(var(--chart-1))" },
        { name: "Qualified", value: qualifiedLeads, fill: "hsl(var(--chart-2))" },
        { name: "Proposal", value: proposalLeads, fill: "hsl(var(--chart-3))" },
        { name: "Negotiation", value: negotiationLeads, fill: "hsl(var(--chart-4))" },
        { name: "Closed Won", value: closedWonLeads, fill: "hsl(var(--chart-5))" },
      ];

      // Calculate metrics
      const conversionRate = totalLeads > 0 ? (closedWonLeads / totalLeads) * 100 : 0;
      const qualificationRate = totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0;
      const currentMonthLeads = monthlyData[monthlyData.length - 1]?.leads || 0;

      const metrics = [
        {
          title: "Lead-to-Customer",
          value: `${conversionRate.toFixed(1)}%`,
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
          value: `${qualificationRate.toFixed(0)}%`,
          change: "+5%",
          icon: UserCheck,
        },
        {
          title: "Monthly Leads",
          value: currentMonthLeads.toString(),
          change: "+4%",
          icon: Users,
        },
      ];

      setConversionData(monthlyData);
      setSourceData(sourceChartData);
      setFunnelData(funnelChartData);
      setConversionMetrics(metrics);
    } catch (error) {
      console.error('Error loading conversion data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading conversion analytics...</div>;
  }

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