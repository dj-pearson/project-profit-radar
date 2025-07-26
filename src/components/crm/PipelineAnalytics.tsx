import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/utils/formatters";
import {
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";

interface PipelineMetrics {
  totalPipelineValue: number;
  weightedPipelineValue: number;
  dealsCount: number;
  averageDealSize: number;
  averageCycleTime: number;
  winRate: number;
  conversionRate: number;
  velocityByStage: Array<{
    stageName: string;
    averageDays: number;
    dealsCount: number;
    conversionRate: number;
  }>;
  dealsByStage: Array<{
    stageName: string;
    count: number;
    value: number;
    color: string;
  }>;
  trendData: Array<{
    date: string;
    created: number;
    won: number;
    lost: number;
    pipeline: number;
  }>;
}

interface PipelineAnalyticsProps {
  timeRange?: string;
}

export const PipelineAnalytics: React.FC<PipelineAnalyticsProps> = ({
  timeRange = "30d",
}) => {
  const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const { toast } = useToast();
  const { userProfile } = useAuth();

  useEffect(() => {
    loadPipelineMetrics();
  }, [selectedTimeRange]);

  const loadPipelineMetrics = async () => {
    try {
      if (!userProfile?.company_id) return;

      const endDate = new Date();
      const startDate = new Date();

      switch (selectedTimeRange) {
        case "7d":
          startDate.setDate(endDate.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(endDate.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(endDate.getDate() - 90);
          break;
        case "1y":
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      // Load deals data
      const { data: dealsData, error: dealsError } = await supabase
        .from("deals")
        .select(
          `
          *,
          current_stage:pipeline_stages(name, color_code, probability_weight, stage_order)
        `
        )
        .eq("company_id", userProfile.company_id)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (dealsError) throw dealsError;

      // Load stage history for velocity analysis
      const { data: historyData, error: historyError } = await supabase
        .from("deal_stage_history")
        .select(
          `
          *,
          deal:deals!inner(company_id),
          to_stage:pipeline_stages(name, stage_order)
        `
        )
        .eq("deal.company_id", userProfile.company_id)
        .gte("moved_at", startDate.toISOString())
        .lte("moved_at", endDate.toISOString());

      if (historyError) throw historyError;

      // Calculate metrics
      const activeDeals = dealsData?.filter((d) => d.status === "active") || [];
      const wonDeals = dealsData?.filter((d) => d.status === "won") || [];
      const lostDeals = dealsData?.filter((d) => d.status === "lost") || [];

      const totalPipelineValue = activeDeals.reduce(
        (sum, deal) => sum + deal.estimated_value,
        0
      );
      const weightedPipelineValue = activeDeals.reduce((sum, deal) => {
        const probability = deal.current_stage?.probability_weight || 0;
        return sum + (deal.estimated_value * probability) / 100;
      }, 0);

      const averageDealSize = dealsData?.length
        ? dealsData.reduce((sum, deal) => sum + deal.estimated_value, 0) /
          dealsData.length
        : 0;

      const winRate =
        wonDeals.length + lostDeals.length > 0
          ? (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100
          : 0;

      // Calculate velocity by stage
      const velocityByStage = historyData?.reduce((acc, history) => {
        const stageName =
          history.to_stage &&
          typeof history.to_stage === "object" &&
          "name" in history.to_stage
            ? history.to_stage.name
            : "Unknown";
        if (!acc[stageName]) {
          acc[stageName] = { totalDays: 0, count: 0 };
        }
        acc[stageName].totalDays += history.days_in_previous_stage || 0;
        acc[stageName].count += 1;
        return acc;
      }, {} as Record<string, { totalDays: number; count: number }>);

      const velocityArray = Object.entries(velocityByStage || {}).map(
        ([stageName, data]) => ({
          stageName,
          averageDays: data.count > 0 ? data.totalDays / data.count : 0,
          dealsCount: data.count,
          conversionRate: 0, // Calculate based on progression
        })
      );

      // Deals by stage
      const dealsByStage = activeDeals.reduce((acc, deal) => {
        const stageName = deal.current_stage?.name || "Unknown";
        const stageColor = deal.current_stage?.color_code || "#6B7280";

        const existing = acc.find((item) => item.stageName === stageName);
        if (existing) {
          existing.count += 1;
          existing.value += deal.estimated_value;
        } else {
          acc.push({
            stageName,
            count: 1,
            value: deal.estimated_value,
            color: stageColor,
          });
        }
        return acc;
      }, [] as Array<{ stageName: string; count: number; value: number; color: string }>);

      // Trend data (simplified - daily aggregates)
      const trendData = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        const dateStr = date.toISOString().split("T")[0];

        const dayDeals =
          dealsData?.filter((d) => d.created_at?.split("T")[0] === dateStr) ||
          [];

        return {
          date: dateStr,
          created: dayDeals.length,
          won: dayDeals.filter((d) => d.status === "won").length,
          lost: dayDeals.filter((d) => d.status === "lost").length,
          pipeline: dayDeals
            .filter((d) => d.status === "active")
            .reduce((sum, d) => sum + d.estimated_value, 0),
        };
      });

      setMetrics({
        totalPipelineValue,
        weightedPipelineValue,
        dealsCount: dealsData?.length || 0,
        averageDealSize,
        averageCycleTime: 0, // Calculate from history
        winRate,
        conversionRate: 0, // Calculate from funnel
        velocityByStage: velocityArray,
        dealsByStage,
        trendData,
      });
    } catch (error: any) {
      toast({
        title: "Error loading pipeline analytics",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const COLORS = [
    "#3B82F6",
    "#EF4444",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
    "#EC4899",
    "#6B7280",
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pipeline Analytics</h2>
          <p className="text-muted-foreground">
            Performance insights and trends
          </p>
        </div>
        <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="animate-fade-in">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Pipeline
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(metrics.totalPipelineValue)}
                </p>
                <div className="flex items-center space-x-1 text-xs text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  <span>
                    Weighted: {formatCurrency(metrics.weightedPipelineValue)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Deals
                </p>
                <p className="text-2xl font-bold">{metrics.dealsCount}</p>
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <DollarSign className="h-3 w-3" />
                  <span>Avg: {formatCurrency(metrics.averageDealSize)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Win Rate
                </p>
                <p className="text-2xl font-bold">
                  {metrics.winRate.toFixed(1)}%
                </p>
                <Progress value={metrics.winRate} className="h-1 mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Avg Cycle Time
                </p>
                <p className="text-2xl font-bold">
                  {metrics.averageCycleTime.toFixed(0)}d
                </p>
                <div className="text-xs text-muted-foreground">
                  Deal lifecycle
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="velocity" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="velocity">Velocity</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="conversion">Conversion</TabsTrigger>
        </TabsList>

        <TabsContent value="velocity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Stage Velocity Analysis</span>
              </CardTitle>
              <CardDescription>
                Average time deals spend in each pipeline stage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.velocityByStage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stageName" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [
                      name === "averageDays"
                        ? `${Number(value).toFixed(1)} days`
                        : value,
                      name === "averageDays" ? "Average Days" : "Deals Count",
                    ]}
                  />
                  <Bar
                    dataKey="averageDays"
                    fill="#3B82F6"
                    name="averageDays"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5" />
                  <span>Deals by Stage</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Tooltip formatter={(value, name) => [value, name]} />
                    <RechartsPieChart data={metrics.dealsByStage}>
                      {metrics.dealsByStage.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color || COLORS[index % COLORS.length]}
                        />
                      ))}
                    </RechartsPieChart>
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stage Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.dealsByStage.map((stage, index) => (
                    <div
                      key={stage.stageName}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{
                            backgroundColor:
                              stage.color || COLORS[index % COLORS.length],
                          }}
                        />
                        <div>
                          <p className="font-medium">{stage.stageName}</p>
                          <p className="text-sm text-muted-foreground">
                            {stage.count} deals
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatCurrency(stage.value)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(stage.value / stage.count)} avg
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Deal Activity Trends</span>
              </CardTitle>
              <CardDescription>
                Daily deal creation and closure trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={metrics.trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="created"
                    stackId="1"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="won"
                    stackId="1"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="lost"
                    stackId="1"
                    stroke="#EF4444"
                    fill="#EF4444"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Conversion Funnel</span>
              </CardTitle>
              <CardDescription>
                Stage-to-stage conversion rates and bottlenecks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.velocityByStage.map((stage, index) => (
                  <div key={stage.stageName} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{stage.stageName}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                          {stage.dealsCount} deals
                        </span>
                        <span className="text-sm font-medium">
                          {stage.averageDays.toFixed(1)} days avg
                        </span>
                      </div>
                    </div>
                    <Progress
                      value={(stage.dealsCount / metrics.dealsCount) * 100}
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
