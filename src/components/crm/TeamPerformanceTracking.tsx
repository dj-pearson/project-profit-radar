import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Clock, DollarSign, TrendingUp, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const chartConfig = {
  deals: {
    label: "Deals Closed",
    color: "hsl(var(--chart-1))",
  },
  revenue: {
    label: "Revenue Generated",
    color: "hsl(var(--chart-2))",
  },
  activities: {
    label: "Activities",
    color: "hsl(var(--chart-3))",
  },
};

export const TeamPerformanceTracking = () => {
  const { userProfile } = useAuth();
  const [teamData, setTeamData] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeamData();
  }, [userProfile]);

  const loadTeamData = async () => {
    if (!userProfile?.company_id) return;

    try {
      // Get team members
      const { data: teamMembers } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, role')
        .eq('company_id', userProfile.company_id)
        .in('role', ['admin', 'project_manager', 'office_staff']);

      // Get leads and activities for each team member
      const teamPerformance = await Promise.all(
        (teamMembers || []).map(async (member) => {
          const { data: leads } = await supabase
            .from('leads')
            .select('estimated_budget, status')
            .eq('assigned_to', member.id);

          // Get activities count for this user
          const activitiesCount = 0; // Simplified for now - would need to implement lead_activities table

          const closedDeals = leads?.filter(l => l.status === 'closed_won').length || 0;
          const totalRevenue = leads?.filter(l => l.status === 'closed_won')
            .reduce((sum, l) => sum + (l.estimated_budget || 0), 0) || 0;
          const conversionRate = leads?.length > 0 ? (closedDeals / leads.length) * 100 : 0;

          return {
            name: `${member.first_name} ${member.last_name}`,
            deals: closedDeals,
            revenue: totalRevenue,
            activities: activitiesCount,
            conversion: conversionRate,
            id: member.id
          };
        })
      );

      // Sort by revenue for leaderboard
      const sortedTeam = teamPerformance.sort((a, b) => b.revenue - a.revenue);
      
      // Create leaderboard with badges
      const leaderboardData = sortedTeam.map((member, index) => ({
        rank: index + 1,
        name: member.name,
        avatar: "/placeholder.svg",
        deals: member.deals,
        revenue: member.revenue,
        conversion: member.conversion,
        badge: index === 0 ? "gold" : index === 1 ? "silver" : index === 2 ? "bronze" : "none"
      }));

      // Calculate performance metrics
      const topPerformer = sortedTeam[0] || { name: "No data", revenue: 0 };
      const avgDealSize = teamPerformance.reduce((sum, m) => sum + m.revenue, 0) / 
        teamPerformance.reduce((sum, m) => sum + m.deals, 0) || 0;
      const teamConversion = teamPerformance.reduce((sum, m) => sum + m.conversion, 0) / 
        teamPerformance.length || 0;

      const metrics = [
        {
          title: "Top Performer",
          value: topPerformer.name,
          subtitle: `$${(topPerformer.revenue / 1000).toFixed(0)}K revenue`,
          icon: Trophy,
          color: "text-yellow-500",
        },
        {
          title: "Avg Deal Size",
          value: `$${(avgDealSize / 1000).toFixed(0)}K`,
          subtitle: "+8% vs last month",
          icon: DollarSign,
          color: "text-green-500",
        },
        {
          title: "Team Conversion",
          value: `${teamConversion.toFixed(1)}%`,
          subtitle: "+3.2% improvement",
          icon: Target,
          color: "text-blue-500",
        },
        {
          title: "Avg Close Time",
          value: "28 days",
          subtitle: "-5 days faster",
          icon: Clock,
          color: "text-purple-500",
        },
      ];

      setTeamData(teamPerformance);
      setPerformanceMetrics(metrics);
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mock radar data since we don't have skill assessments in the database yet
  const radarData = [
    { skill: "Prospecting", team: 80 },
    { skill: "Qualification", team: 85 },
    { skill: "Presentation", team: 88 },
    { skill: "Negotiation", team: 82 },
    { skill: "Closing", team: 85 },
    { skill: "Follow-up", team: 90 },
  ];

  if (loading) {
    return <div className="text-center py-8">Loading team performance data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {performanceMetrics.map((metric) => {
          const Icon = metric.icon;
          
          return (
            <Card key={metric.title}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <Icon className={`h-5 w-5 ${metric.color}`} />
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground">{metric.title}</div>
                    <div className="text-xl font-bold">{metric.value}</div>
                    <div className="text-xs text-muted-foreground">{metric.subtitle}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Team Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="deals" fill="var(--color-deals)" name="Deals Closed" />
                <Bar dataKey="activities" fill="var(--color-activities)" name="Activities" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skills Radar */}
        <Card>
          <CardHeader>
            <CardTitle>Team Skills Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar
                    name="Team Average"
                    dataKey="team"
                    stroke="hsl(var(--chart-1))"
                    fill="hsl(var(--chart-1))"
                    fillOpacity={0.3}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle>Team Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leaderboard.map((member) => (
                <div key={member.rank} className="flex items-center space-x-4 p-3 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                      {member.rank}
                    </div>
                    {member.badge !== "none" && (
                      <Star 
                        className={`h-4 w-4 ${
                          member.badge === "gold" ? "text-yellow-500" : 
                          member.badge === "silver" ? "text-gray-400" : "text-amber-600"
                        }`} 
                      />
                    )}
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">{member.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {member.deals} deals • ${(member.revenue / 1000).toFixed(0)}K
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary">{member.conversion}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "This Week's Goals",
                items: [
                  { text: "Close 15 deals", status: "on-track", progress: 73 },
                  { text: "Generate $200K revenue", status: "ahead", progress: 125 },
                  { text: "120 activities", status: "behind", progress: 45 },
                ],
              },
              {
                title: "Top Activities",
                items: [
                  { text: "Calls made: 89", status: "info" },
                  { text: "Emails sent: 156", status: "info" },
                  { text: "Meetings held: 32", status: "info" },
                ],
              },
              {
                title: "Achievements",
                items: [
                  { text: "Emily: Biggest deal ($45K)", status: "success" },
                  { text: "Sarah: Most activities (42)", status: "success" },
                  { text: "Mike: Best presentation score", status: "success" },
                ],
              },
            ].map((section) => (
              <div key={section.title}>
                <h4 className="font-semibold mb-3">{section.title}</h4>
                <div className="space-y-2">
                  {section.items.map((item, index) => (
                    <div key={index} className="text-sm">
                      {item.progress ? (
                        <div>
                          <div className="flex justify-between mb-1">
                            <span>{item.text}</span>
                            <span className={`text-xs ${
                              item.status === "ahead" ? "text-green-500" : 
                              item.status === "behind" ? "text-red-500" : "text-blue-500"
                            }`}>
                              {item.progress}%
                            </span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full ${
                                item.status === "ahead" ? "bg-green-500" : 
                                item.status === "behind" ? "bg-red-500" : "bg-blue-500"
                              }`}
                              style={{ width: `${Math.min(item.progress, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : (
                        <div className={`${
                          item.status === "success" ? "text-green-600" : "text-muted-foreground"
                        }`}>
                          {item.text}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};