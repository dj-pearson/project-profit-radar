import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  MessageSquare,
  Settings,
  BarChart3,
  FileText,
  Camera,
  Play,
  Pause,
  XCircle,
  Target,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import {
  tradeHandoffService,
  HandoffStatus,
  TradeCoordination,
  ConflictResolution,
  TradePerformanceMetrics,
  QualityCheckItem,
} from "@/services/TradeHandoffService";
import { toast } from "sonner";

interface TradeHandoffManagerProps {
  projectId: string;
}

export default function TradeHandoffManager({
  projectId,
}: TradeHandoffManagerProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);

  // State for different data types
  const [handoffStatuses, setHandoffStatuses] = useState<HandoffStatus[]>([]);
  const [upcomingHandoffs, setUpcomingHandoffs] = useState<HandoffStatus[]>([]);
  const [conflicts, setConflicts] = useState<ConflictResolution[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<
    TradePerformanceMetrics[]
  >([]);

  // Dialog states
  const [selectedHandoff, setSelectedHandoff] = useState<HandoffStatus | null>(
    null
  );
  const [showQualityDialog, setShowQualityDialog] = useState(false);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadHandoffData();
    }
  }, [projectId]);

  const loadHandoffData = async () => {
    setLoading(true);
    try {
      const [statuses, upcoming, projectConflicts, metrics] =
        await Promise.allSettled([
          tradeHandoffService.getProjectHandoffStatuses(projectId),
          tradeHandoffService.getUpcomingHandoffs(projectId, 7),
          tradeHandoffService.detectTradeConflicts(projectId),
          tradeHandoffService.generateTradePerformanceReport(projectId),
        ]);

      if (statuses.status === "fulfilled") {
        setHandoffStatuses(statuses.value);
      }
      if (upcoming.status === "fulfilled") {
        setUpcomingHandoffs(upcoming.value);
      }
      if (projectConflicts.status === "fulfilled") {
        setConflicts(projectConflicts.value);
      }
      if (metrics.status === "fulfilled") {
        setPerformanceMetrics(metrics.value);
      }
    } catch (error) {
      console.error("Error loading handoff data:", error);
      toast.error("Failed to load handoff data");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSequence = async () => {
    setLoading(true);
    try {
      await tradeHandoffService.generateHandoffSequence(projectId);
      await loadHandoffData();
      toast.success("Handoff sequence generated successfully");
    } catch (error) {
      toast.error("Failed to generate handoff sequence");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (
    handoffId: string,
    status: HandoffStatus["status"],
    percentage?: number
  ) => {
    try {
      await tradeHandoffService.updateHandoffStatus(
        handoffId,
        status,
        percentage
      );
      await loadHandoffData();
      toast.success(`Handoff status updated to ${status}`);
    } catch (error) {
      toast.error("Failed to update handoff status");
    }
  };

  const handleQualityCheck = async (
    handoffId: string,
    checkId: string,
    passed: boolean,
    notes?: string
  ) => {
    try {
      await tradeHandoffService.performQualityCheck(
        handoffId,
        checkId,
        passed,
        notes
      );
      await loadHandoffData();
      toast.success("Quality check completed");
    } catch (error) {
      toast.error("Failed to complete quality check");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "in_progress":
        return "bg-blue-500";
      case "ready":
        return "bg-yellow-500";
      case "delayed":
        return "bg-orange-500";
      case "blocked":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4" />;
      case "in_progress":
        return <Play className="h-4 w-4" />;
      case "ready":
        return <Target className="h-4 w-4" />;
      case "delayed":
        return <Clock className="h-4 w-4" />;
      case "blocked":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Pause className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      case "low":
        return "outline";
      default:
        return "outline";
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Trade Handoff Coordination
          </h2>
          <p className="text-muted-foreground">
            Manage trade transitions, quality checks, and coordination meetings
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleGenerateSequence}
            disabled={loading}
            variant="outline"
          >
            <Settings className="h-4 w-4 mr-2" />
            Generate Sequence
          </Button>
          <Button onClick={loadHandoffData} disabled={loading}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Handoffs
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                handoffStatuses.filter((h) =>
                  ["ready", "in_progress"].includes(h.status)
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Currently in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conflicts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {conflicts.filter((c) => c.status === "open").length}
            </div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completion Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {handoffStatuses.length > 0
                ? formatPercentage(
                    handoffStatuses.filter((h) => h.status === "completed")
                      .length / handoffStatuses.length
                  )
                : "0%"}
            </div>
            <p className="text-xs text-muted-foreground">Handoffs completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingHandoffs.length}</div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="handoffs">Handoffs</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Handoffs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  Upcoming Handoffs
                </CardTitle>
                <CardDescription>
                  Handoffs requiring attention in the next 7 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingHandoffs.slice(0, 5).map((handoff) => (
                    <div
                      key={handoff.handoff_id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${getStatusColor(
                            handoff.status
                          )}`}
                        />
                        <div>
                          <div className="font-medium">
                            {handoff.from_trade} → {handoff.to_trade}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Due: {formatDate(handoff.estimated_completion)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {handoff.completion_percentage}%
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {handoff.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {upcomingHandoffs.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      No upcoming handoffs
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Critical Issues */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Critical Issues
                </CardTitle>
                <CardDescription>
                  High-priority conflicts and blockers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {conflicts
                    .filter((c) => ["high", "critical"].includes(c.severity))
                    .slice(0, 5)
                    .map((conflict) => (
                      <div
                        key={conflict.conflict_id}
                        className="p-3 border rounded-lg border-l-4 border-l-destructive"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">
                              {conflict.conflict_type} conflict
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {conflict.description}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Trades: {conflict.involved_trades.join(", ")}
                            </div>
                          </div>
                          <Badge variant={getSeverityColor(conflict.severity)}>
                            {conflict.severity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  {conflicts.filter((c) =>
                    ["high", "critical"].includes(c.severity)
                  ).length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      No critical issues
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Handoffs Tab */}
        <TabsContent value="handoffs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trade Handoff Sequence</CardTitle>
              <CardDescription>
                Complete handoff workflow with status tracking and quality
                controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {handoffStatuses.map((handoff, index) => (
                  <Card
                    key={handoff.handoff_id}
                    className="border-l-4"
                    style={{
                      borderLeftColor: getStatusColor(handoff.status).replace(
                        "bg-",
                        "#"
                      ),
                    }}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(handoff.status)}
                          <div>
                            <h4 className="font-semibold text-lg">
                              {handoff.from_trade} → {handoff.to_trade}
                            </h4>
                            <p className="text-muted-foreground">
                              Estimated completion:{" "}
                              {formatDate(handoff.estimated_completion)}
                            </p>
                            {handoff.actual_completion && (
                              <p className="text-sm text-green-600">
                                Completed:{" "}
                                {formatDate(handoff.actual_completion)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{handoff.status}</Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedHandoff(handoff);
                              setShowQualityDialog(true);
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Quality
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                          <div className="text-sm font-medium">Progress</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress
                              value={handoff.completion_percentage}
                              className="flex-1"
                            />
                            <span className="text-sm font-medium">
                              {handoff.completion_percentage}%
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            Quality Checks
                          </div>
                          <div className="text-lg font-bold">
                            {handoff.quality_checks_completed}/
                            {handoff.quality_checks_total}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Status</div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(handoff.status)}
                            <span className="font-medium">
                              {handoff.status}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Actions</div>
                          <div className="flex gap-1 mt-1">
                            {handoff.status === "ready" && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleUpdateStatus(
                                    handoff.handoff_id,
                                    "in_progress"
                                  )
                                }
                              >
                                Start
                              </Button>
                            )}
                            {handoff.status === "in_progress" && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleUpdateStatus(
                                    handoff.handoff_id,
                                    "completed",
                                    100
                                  )
                                }
                              >
                                Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {handoff.delay_reasons.length > 0 && (
                        <Alert className="mt-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Delays Reported</AlertTitle>
                          <AlertDescription>
                            {handoff.delay_reasons.join(", ")}
                          </AlertDescription>
                        </Alert>
                      )}

                      {handoff.blocking_issues.length > 0 && (
                        <Alert className="mt-4" variant="destructive">
                          <XCircle className="h-4 w-4" />
                          <AlertTitle>Blocking Issues</AlertTitle>
                          <AlertDescription>
                            {handoff.blocking_issues.length} issue(s) blocking
                            progress
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {handoffStatuses.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">
                      No Handoffs Configured
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Generate a handoff sequence to get started
                    </p>
                    <Button onClick={handleGenerateSequence} disabled={loading}>
                      Generate Handoff Sequence
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quality Tab */}
        <TabsContent value="quality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quality Control Management</CardTitle>
              <CardDescription>
                Manage quality checks and inspections for trade handoffs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {handoffStatuses
                  .filter((h) => h.status !== "completed")
                  .map((handoff) => (
                    <Card key={handoff.handoff_id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold">
                            {handoff.from_trade} → {handoff.to_trade}
                          </h4>
                          <Badge variant="outline">{handoff.status}</Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Quality Checks Progress</span>
                            <span>
                              {handoff.quality_checks_completed}/
                              {handoff.quality_checks_total}
                            </span>
                          </div>
                          <Progress
                            value={
                              handoff.quality_checks_total > 0
                                ? (handoff.quality_checks_completed /
                                    handoff.quality_checks_total) *
                                  100
                                : 0
                            }
                          />
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedHandoff(handoff);
                              setShowQualityDialog(true);
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Perform Checks
                          </Button>
                          <Button size="sm" variant="outline">
                            <Camera className="h-4 w-4 mr-1" />
                            Add Photos
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conflicts Tab */}
        <TabsContent value="conflicts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conflict Resolution</CardTitle>
              <CardDescription>
                Manage and resolve conflicts between trades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conflicts.map((conflict) => (
                  <Card
                    key={conflict.conflict_id}
                    className="border-l-4 border-l-destructive"
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-lg">
                            {conflict.conflict_type} Conflict
                          </h4>
                          <p className="text-muted-foreground mt-1">
                            {conflict.description}
                          </p>
                        </div>
                        <Badge variant={getSeverityColor(conflict.severity)}>
                          {conflict.severity}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                          <div className="text-sm font-medium">
                            Involved Trades
                          </div>
                          <div className="text-sm">
                            {conflict.involved_trades.join(", ")}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Status</div>
                          <div className="text-sm font-semibold">
                            {conflict.status}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Reported By</div>
                          <div className="text-sm">{conflict.reported_by}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Mediator</div>
                          <div className="text-sm">
                            {conflict.assigned_mediator || "Unassigned"}
                          </div>
                        </div>
                      </div>

                      {conflict.resolution_strategy && (
                        <div className="bg-muted p-3 rounded mb-4">
                          <div className="text-sm font-medium mb-1">
                            Resolution Strategy
                          </div>
                          <div className="text-sm">
                            {conflict.resolution_strategy}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Add Update
                        </Button>
                        <Button size="sm" variant="outline">
                          <Users className="h-4 w-4 mr-1" />
                          Schedule Meeting
                        </Button>
                        {conflict.status === "open" && (
                          <Button size="sm">Assign Mediator</Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {conflicts.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No Active Conflicts</h3>
                    <p className="text-muted-foreground">
                      All trades are coordinating smoothly
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trade Performance Metrics</CardTitle>
              <CardDescription>
                Performance analysis and metrics for trade coordination
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceMetrics.map((metrics) => (
                  <Card key={metrics.trade_name}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-lg">
                          {metrics.trade_name}
                        </h4>
                        <Badge variant="outline">
                          {formatPercentage(metrics.handoff_success_rate)}{" "}
                          success
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <div className="text-sm font-medium">
                            Success Rate
                          </div>
                          <div className="text-2xl font-bold text-green-600">
                            {formatPercentage(metrics.handoff_success_rate)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            Avg Handoff Time
                          </div>
                          <div className="text-2xl font-bold">
                            {metrics.average_handoff_time.toFixed(1)}h
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            Quality Score
                          </div>
                          <div className="text-2xl font-bold text-blue-600">
                            {formatPercentage(metrics.quality_score)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            On-Time Rate
                          </div>
                          <div className="text-2xl font-bold text-orange-600">
                            {formatPercentage(metrics.on_time_completion_rate)}
                          </div>
                        </div>
                      </div>

                      <Separator className="my-4" />

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">
                            Rework Incidents
                          </div>
                          <div className="font-medium">
                            {metrics.rework_incidents}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">
                            Communication Score
                          </div>
                          <div className="font-medium">
                            {formatPercentage(metrics.communication_score)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">
                            Participation Rate
                          </div>
                          <div className="font-medium">
                            {formatPercentage(
                              metrics.coordination_participation
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {performanceMetrics.length === 0 && (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No Performance Data</h3>
                    <p className="text-muted-foreground">
                      Metrics will appear as handoffs are completed
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quality Check Dialog */}
      <Dialog open={showQualityDialog} onOpenChange={setShowQualityDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Quality Checks</DialogTitle>
            <DialogDescription>
              Complete quality checks for {selectedHandoff?.from_trade} →{" "}
              {selectedHandoff?.to_trade} handoff
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Quality check items would be rendered here */}
            <div className="text-center py-8 text-muted-foreground">
              Quality check interface would be implemented here
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
