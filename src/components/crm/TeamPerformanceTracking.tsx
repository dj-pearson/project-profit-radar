import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Clock, DollarSign, TrendingUp, Star } from "lucide-react";

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

const teamData = [
  { name: "Sarah Chen", deals: 28, revenue: 340000, activities: 156, conversion: 24.5 },
  { name: "Mike Rodriguez", deals: 22, revenue: 285000, activities: 142, conversion: 19.8 },
  { name: "Emily Johnson", deals: 35, revenue: 425000, activities: 189, conversion: 31.2 },
  { name: "David Park", deals: 18, revenue: 220000, activities: 124, conversion: 16.4 },
  { name: "Lisa Thompson", deals: 26, revenue: 315000, activities: 167, conversion: 22.1 },
];

const performanceMetrics = [
  {
    title: "Top Performer",
    value: "Emily Johnson",
    subtitle: "$425K revenue",
    icon: Trophy,
    color: "text-yellow-500",
  },
  {
    title: "Avg Deal Size",
    value: "$12,850",
    subtitle: "+8% vs last month",
    icon: DollarSign,
    color: "text-green-500",
  },
  {
    title: "Team Conversion",
    value: "22.8%",
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

const radarData = [
  { skill: "Prospecting", sarah: 85, mike: 75, emily: 95 },
  { skill: "Qualification", sarah: 90, mike: 80, emily: 88 },
  { skill: "Presentation", sarah: 88, mike: 92, emily: 85 },
  { skill: "Negotiation", sarah: 82, mike: 78, emily: 90 },
  { skill: "Closing", sarah: 85, mike: 85, emily: 92 },
  { skill: "Follow-up", sarah: 90, mike: 88, emily: 85 },
];

const leaderboard = [
  {
    rank: 1,
    name: "Emily Johnson",
    avatar: "/placeholder.svg",
    deals: 35,
    revenue: 425000,
    conversion: 31.2,
    badge: "gold",
  },
  {
    rank: 2,
    name: "Sarah Chen",
    avatar: "/placeholder.svg",
    deals: 28,
    revenue: 340000,
    conversion: 24.5,
    badge: "silver",
  },
  {
    rank: 3,
    name: "Lisa Thompson",
    avatar: "/placeholder.svg",
    deals: 26,
    revenue: 315000,
    conversion: 22.1,
    badge: "bronze",
  },
  {
    rank: 4,
    name: "Mike Rodriguez",
    avatar: "/placeholder.svg",
    deals: 22,
    revenue: 285000,
    conversion: 19.8,
    badge: "none",
  },
  {
    rank: 5,
    name: "David Park",
    avatar: "/placeholder.svg",
    deals: 18,
    revenue: 220000,
    conversion: 16.4,
    badge: "none",
  },
];

export const TeamPerformanceTracking = () => {
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
            <CardTitle>Skills Assessment (Top 3 Performers)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar
                    name="Sarah Chen"
                    dataKey="sarah"
                    stroke="hsl(var(--chart-1))"
                    fill="hsl(var(--chart-1))"
                    fillOpacity={0.1}
                  />
                  <Radar
                    name="Mike Rodriguez"
                    dataKey="mike"
                    stroke="hsl(var(--chart-2))"
                    fill="hsl(var(--chart-2))"
                    fillOpacity={0.1}
                  />
                  <Radar
                    name="Emily Johnson"
                    dataKey="emily"
                    stroke="hsl(var(--chart-3))"
                    fill="hsl(var(--chart-3))"
                    fillOpacity={0.1}
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