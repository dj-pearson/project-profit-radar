import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  ArrowRight,
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Project {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  budget: number;
  completion_percentage: number;
  project_manager: string;
  client_name: string;
  priority: "low" | "medium" | "high" | "critical";
}

interface ScheduleOverviewProps {
  projects: Project[];
  onProjectUpdate: () => void;
  selectedYear: number;
}

export const ScheduleOverview: React.FC<ScheduleOverviewProps> = ({
  projects,
  onProjectUpdate,
  selectedYear,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const navigate = useNavigate();

  // Filter projects
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.project_manager.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || project.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || project.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Calculate metrics
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const completedProjects = projects.filter(
    (p) => p.status === "completed"
  ).length;
  const overDueProjects = projects.filter((p) => {
    const endDate = parseISO(p.end_date);
    return endDate < new Date() && p.status !== "completed";
  }).length;

  const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
  const averageProgress =
    projects.length > 0
      ? projects.reduce((sum, p) => sum + p.completion_percentage, 0) /
        projects.length
      : 0;

  const upcomingDeadlines = projects
    .filter((p) => p.status === "active")
    .map((p) => ({
      ...p,
      daysUntilEnd: differenceInDays(parseISO(p.end_date), new Date()),
    }))
    .filter((p) => p.daysUntilEnd >= 0 && p.daysUntilEnd <= 30)
    .sort((a, b) => a.daysUntilEnd - b.daysUntilEnd);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "destructive";
      case "high":
        return "secondary";
      case "medium":
        return "outline";
      case "low":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "completed":
        return "secondary";
      case "on_hold":
        return "outline";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Projects
                </p>
                <p className="text-3xl font-bold">{totalProjects}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeProjects} active, {completedProjects} completed
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Budget
                </p>
                <p className="text-3xl font-bold">
                  ${(totalBudget / 1000000).toFixed(1)}M
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all projects
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Average Progress
                </p>
                <p className="text-3xl font-bold">
                  {averageProgress.toFixed(0)}%
                </p>
                <Progress value={averageProgress} className="mt-2" />
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Overdue Projects
                </p>
                <p className="text-3xl font-bold text-red-600">
                  {overDueProjects}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Require attention
                </p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Project Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search projects, clients, or managers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Projects ({filteredProjects.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{project.name}</h4>
                          <Badge variant={getPriorityColor(project.priority)}>
                            {project.priority}
                          </Badge>
                          <Badge variant={getStatusColor(project.status)}>
                            {project.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Client: {project.client_name} • PM:{" "}
                          {project.project_manager}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Start Date
                        </p>
                        <p className="text-sm font-medium">
                          {format(parseISO(project.start_date), "MMM dd, yyyy")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          End Date
                        </p>
                        <p className="text-sm font-medium">
                          {format(parseISO(project.end_date), "MMM dd, yyyy")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Budget</p>
                        <p className="text-sm font-medium">
                          ${project.budget.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Progress
                        </p>
                        <p className="text-sm font-medium">
                          {project.completion_percentage}%
                        </p>
                      </div>
                    </div>

                    <Progress
                      value={project.completion_percentage}
                      className="h-2"
                    />
                  </div>
                ))}

                {filteredProjects.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No projects found matching your criteria.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Deadlines */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingDeadlines.slice(0, 5).map((project) => (
                  <div
                    key={project.id}
                    className="border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-sm truncate">
                        {project.name}
                      </h5>
                      <Badge
                        variant={
                          project.daysUntilEnd <= 7 ? "destructive" : "outline"
                        }
                      >
                        {project.daysUntilEnd}d
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Due: {format(parseISO(project.end_date), "MMM dd, yyyy")}
                    </p>
                    <Progress
                      value={project.completion_percentage}
                      className="h-1"
                    />
                  </div>
                ))}

                {upcomingDeadlines.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No upcoming deadlines in the next 30 days.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
