import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  constructionFlowEngine,
  ValidationResult,
  OptimizedSchedule,
  ScheduleConflict,
  InspectionSchedule,
} from "@/services/ConstructionFlowEngine";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  Zap,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Eye,
  Play,
  Settings,
  Target,
} from "lucide-react";
import { format } from "date-fns";

interface Project {
  id: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
}

interface Task {
  id: string;
  name: string;
  construction_phase: string;
  start_date: string;
  end_date: string;
  status: string;
  inspection_required: boolean;
}

export const ConstructionTimelineManager: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [scheduleConflicts, setScheduleConflicts] = useState<ScheduleConflict[]>([]);
  const [optimizedSchedule, setOptimizedSchedule] = useState<OptimizedSchedule | null>(null);
  const [inspectionSchedules, setInspectionSchedules] = useState<InspectionSchedule[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<ScheduleConflict | null>(null);

  useEffect(() => {
    loadData();
  }, [userProfile?.company_id]);

  useEffect(() => {
    if (selectedProject) {
      loadProjectTasks();
    }
  }, [selectedProject]);

  const loadData = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("id, name, status, start_date, end_date")
        .eq("company_id", userProfile.company_id)
        .eq("status", "active")
        .order("name");

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      if (projectsData && projectsData.length > 0) {
        setSelectedProject(projectsData[0].id);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load construction timeline data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProjectTasks = async () => {
    if (!selectedProject) return;

    try {
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("id, name, construction_phase, start_date, end_date, status, inspection_required")
        .eq("project_id", selectedProject)
        .order("start_date");

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);
    } catch (error) {
      console.error("Error loading tasks:", error);
      toast({
        title: "Error",
        description: "Failed to load project tasks",
        variant: "destructive",
      });
    }
  };

  const analyzeTimeline = async () => {
    if (!selectedProject || tasks.length === 0) return;

    setAnalyzing(true);
    try {
      // Validate task sequence
      const validation = await constructionFlowEngine.validateTaskSequence(tasks);
      setValidationResults(validation);

      // Detect schedule conflicts
      const conflicts = await constructionFlowEngine.detectScheduleConflicts(selectedProject);
      setScheduleConflicts(conflicts);

      // Auto-schedule inspections
      const inspections = await constructionFlowEngine.autoScheduleInspections(selectedProject);
      setInspectionSchedules(inspections);

      const validTasks = validation.filter(v => v.is_valid).length;
      const totalTasks = validation.length;

      toast({
        title: "Timeline Analysis Complete",
        description: `${validTasks}/${totalTasks} tasks validated, ${conflicts.length} conflicts found`,
      });
    } catch (error) {
      console.error("Error analyzing timeline:", error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze construction timeline",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const optimizeSchedule = async () => {
    if (!selectedProject) return;

    setOptimizing(true);
    try {
      const optimization = await constructionFlowEngine.optimizeTradeSequencing(selectedProject);
      setOptimizedSchedule(optimization);

      toast({
        title: "Schedule Optimization Complete",
        description: `${optimization.estimated_time_saved} days saved with ${optimization.optimizations_applied.length} optimizations`,
      });
    } catch (error) {
      console.error("Error optimizing schedule:", error);
      toast({
        title: "Optimization Failed",
        description: "Could not optimize construction schedule",
        variant: "destructive",
      });
    } finally {
      setOptimizing(false);
    }
  };

  const resolveConflict = async (conflictId: string) => {
    try {
      const { error } = await supabase
        .from("schedule_conflicts")
        .update({ 
          resolution_status: "resolved",
          resolved_by: userProfile?.id,
          resolved_at: new Date().toISOString()
        })
        .eq("id", conflictId);

      if (error) throw error;

      // Refresh conflicts
      const updatedConflicts = scheduleConflicts.map(conflict =>
        conflict.conflict_id === conflictId
          ? { ...conflict, resolution_status: "resolved" as const }
          : conflict
      );
      setScheduleConflicts(updatedConflicts);

      toast({
        title: "Conflict Resolved",
        description: "Schedule conflict has been marked as resolved",
      });
    } catch (error) {
      console.error("Error resolving conflict:", error);
      toast({
        title: "Error",
        description: "Failed to resolve conflict",
        variant: "destructive",
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "high": return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "medium": return <Clock className="h-4 w-4 text-yellow-500" />;
      case "low": return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading construction timeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Construction Timeline Intelligence</h2>
          <p className="text-muted-foreground">
            Optimize construction workflows with intelligent dependency management
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={analyzeTimeline}
            disabled={!selectedProject || analyzing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${analyzing ? "animate-spin" : ""}`} />
            {analyzing ? "Analyzing..." : "Analyze Timeline"}
          </Button>
          <Button
            onClick={optimizeSchedule}
            disabled={!selectedProject || optimizing}
          >
            <TrendingUp className={`h-4 w-4 mr-2 ${optimizing ? "animate-spin" : ""}`} />
            {optimizing ? "Optimizing..." : "Optimize Schedule"}
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="project-select" className="block text-sm font-medium mb-2">
          Select Project
        </label>
        <select
          id="project-select"
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="w-full max-w-md p-2 border rounded-md"
        >
          <option value="">Select a project...</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="validation">Task Validation</TabsTrigger>
          <TabsTrigger value="conflicts">Schedule Conflicts</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tasks.length}</div>
                <p className="text-xs text-muted-foreground">
                  {tasks.filter(t => t.status === "completed").length} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Validation Score</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {validationResults.length > 0
                    ? Math.round((validationResults.filter(v => v.is_valid).length / validationResults.length) * 100)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {validationResults.filter(v => v.is_valid).length} of {validationResults.length} tasks valid
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Conflicts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{scheduleConflicts.length}</div>
                <p className="text-xs text-muted-foreground">
                  {scheduleConflicts.filter(c => c.severity === "critical" || c.severity === "high").length} high priority
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Time Savings</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {optimizedSchedule?.estimated_time_saved || 0} days
                </div>
                <p className="text-xs text-muted-foreground">
                  Potential optimization savings
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Construction Timeline Overview</CardTitle>
              <CardDescription>
                Current project status and intelligent insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Tasks Found</h3>
                  <p className="text-muted-foreground">
                    Select a project with tasks to analyze the construction timeline
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-2">
                    {tasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            task.status === "completed" ? "bg-green-500" :
                            task.status === "in_progress" ? "bg-blue-500" :
                            "bg-gray-300"
                          }`} />
                          <div>
                            <p className="font-medium">{task.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {task.construction_phase && task.construction_phase.replace(/_/g, ' ')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <p>{format(new Date(task.start_date), "MMM d")} - {format(new Date(task.end_date), "MMM d")}</p>
                          <Badge variant="outline" className="text-xs">
                            {task.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  {tasks.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      And {tasks.length - 5} more tasks...
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Validation Results</CardTitle>
              <CardDescription>
                Construction sequence validation and recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {validationResults.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Validation Results</h3>
                  <p className="text-muted-foreground mb-4">
                    Click "Analyze Timeline" to validate the construction sequence
                  </p>
                  <Button onClick={analyzeTimeline} disabled={!selectedProject}>
                    <Play className="h-4 w-4 mr-2" />
                    Start Analysis
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Issues</TableHead>
                      <TableHead>Recommendations</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validationResults.map((result) => (
                      <TableRow key={result.task_id}>
                        <TableCell className="font-medium">{result.task_name}</TableCell>
                        <TableCell>
                          <Badge className={result.is_valid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {result.is_valid ? "Valid" : "Invalid"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {result.issues.map((issue, idx) => (
                              <Badge key={idx} className={getSeverityColor(issue.severity)} variant="outline">
                                {issue.description}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {result.recommendations.map((rec, idx) => (
                              <p key={idx}>• {rec}</p>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conflicts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Conflicts</CardTitle>
              <CardDescription>
                Detected scheduling conflicts and suggested resolutions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scheduleConflicts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Conflicts Detected</h3>
                  <p className="text-muted-foreground">
                    Your construction timeline appears to be conflict-free
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Resolution</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduleConflicts.map((conflict) => (
                      <TableRow key={conflict.conflict_id}>
                        <TableCell>
                          <Badge variant="outline">
                            {conflict.conflict_type.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getSeverityIcon(conflict.severity)}
                            <Badge className={getSeverityColor(conflict.severity)}>
                              {conflict.severity}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="text-sm">{conflict.suggested_resolution}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={conflict.auto_resolvable ? "default" : "secondary"}>
                            {conflict.auto_resolvable ? "Auto-resolvable" : "Manual"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedConflict(conflict);
                                setDetailsDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => resolveConflict(conflict.conflict_id)}
                            >
                              Resolve
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Optimization</CardTitle>
              <CardDescription>
                Intelligent recommendations to improve construction efficiency
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!optimizedSchedule ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Optimization Analysis</h3>
                  <p className="text-muted-foreground mb-4">
                    Run schedule optimization to find efficiency improvements
                  </p>
                  <Button onClick={optimizeSchedule} disabled={!selectedProject}>
                    <Zap className="h-4 w-4 mr-2" />
                    Optimize Schedule
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {optimizedSchedule.estimated_time_saved}
                      </div>
                      <p className="text-sm text-muted-foreground">Days Saved</p>
                    </div>
                    <div className="p-4 border rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {optimizedSchedule.optimizations_applied.length}
                      </div>
                      <p className="text-sm text-muted-foreground">Optimizations</p>
                    </div>
                    <div className="p-4 border rounded-lg text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {format(optimizedSchedule.new_completion_date, "MMM d")}
                      </div>
                      <p className="text-sm text-muted-foreground">New Completion</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold">Optimization Details</h4>
                    {optimizedSchedule.optimizations_applied.map((opt, idx) => (
                      <div key={idx} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">
                            {opt.type.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-sm font-medium text-green-600">
                            +{opt.time_impact} days
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{opt.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Affects {opt.tasks_affected.length} tasks
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inspections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inspection Schedule</CardTitle>
              <CardDescription>
                Automatically scheduled inspections based on construction phases
              </CardDescription>
            </CardHeader>
            <CardContent>
              {inspectionSchedules.length === 0 ? (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Inspections Scheduled</h3>
                  <p className="text-muted-foreground">
                    Inspections will be automatically scheduled when you analyze the timeline
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Inspection Type</TableHead>
                      <TableHead>Required For</TableHead>
                      <TableHead>Optimal Date</TableHead>
                      <TableHead>Prerequisites</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inspectionSchedules.map((inspection) => (
                      <TableRow key={inspection.inspection_id}>
                        <TableCell className="font-medium">
                          {inspection.inspection_type.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell>
                          {inspection.required_for_phase.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell>
                          {format(inspection.optimal_date, "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge className={inspection.prerequisites_met ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                            {inspection.prerequisites_met ? "Met" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={inspection.auto_scheduled ? "default" : "outline"}>
                            {inspection.auto_scheduled ? "Auto-scheduled" : "Manual"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Conflict Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule Conflict Details</DialogTitle>
            <DialogDescription>
              Detailed information about the schedule conflict and resolution options
            </DialogDescription>
          </DialogHeader>
          {selectedConflict && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Conflict Type</label>
                  <p className="capitalize">{selectedConflict.conflict_type.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Severity</label>
                  <div className="flex items-center gap-2">
                    {getSeverityIcon(selectedConflict.severity)}
                    <span className="capitalize">{selectedConflict.severity}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Suggested Resolution</label>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedConflict.suggested_resolution}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Affected Tasks</label>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedConflict.affected_tasks.length} tasks affected
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  resolveConflict(selectedConflict.conflict_id);
                  setDetailsDialogOpen(false);
                }}>
                  Mark as Resolved
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConstructionTimelineManager;
