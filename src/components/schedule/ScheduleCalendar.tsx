import React, { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import {
  CalendarDays,
  Clock,
  Users,
  DollarSign,
  ArrowRight,
} from "lucide-react";
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

interface ScheduleCalendarProps {
  projects: Project[];
  onDateRangeChange: (
    startDate: Date,
    endDate: Date,
    projectId: string
  ) => void;
  selectedYear: number;
}

export const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({
  projects,
  onDateRangeChange,
  selectedYear,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(
    new Date(selectedYear, new Date().getMonth())
  );
  const navigate = useNavigate();

  // Get projects for selected date
  const getProjectsForDate = (date: Date) => {
    return projects.filter((project) => {
      const projectStart = parseISO(project.start_date);
      const projectEnd = parseISO(project.end_date);
      return date >= projectStart && date <= projectEnd;
    });
  };

  // Get project events for calendar highlighting
  const getProjectDates = () => {
    const dates: Date[] = [];
    projects.forEach((project) => {
      const start = parseISO(project.start_date);
      const end = parseISO(project.end_date);

      // Add start and end dates
      dates.push(start);
      dates.push(end);
    });
    return dates;
  };

  const selectedDateProjects = getProjectsForDate(selectedDate);
  const projectDates = getProjectDates();

  // Get month stats
  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);

  const monthProjects = projects.filter((project) => {
    const projectStart = parseISO(project.start_date);
    const projectEnd = parseISO(project.end_date);
    return projectStart <= monthEnd && projectEnd >= monthStart;
  });

  const startingProjects = projects.filter((project) => {
    const start = parseISO(project.start_date);
    return start >= monthStart && start <= monthEnd;
  });

  const endingProjects = projects.filter((project) => {
    const end = parseISO(project.end_date);
    return end >= monthStart && end <= monthEnd;
  });

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

  const modifiers = {
    projectDate: projectDates,
  };

  const modifiersClassNames = {
    projectDate: "bg-blue-100 text-blue-900 font-semibold",
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Project Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              modifiers={modifiers}
              modifiersClassNames={modifiersClassNames}
              className="rounded-md border"
            />

            <div className="mt-4 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                <span>Project Activity</span>
              </div>
              <div className="text-muted-foreground">
                {monthProjects.length} projects in{" "}
                {format(calendarMonth, "MMMM yyyy")}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Month Summary */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>{format(calendarMonth, "MMMM yyyy")} Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{monthProjects.length}</p>
                <p className="text-sm text-muted-foreground">Active Projects</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{startingProjects.length}</p>
                <p className="text-sm text-muted-foreground">Starting</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{endingProjects.length}</p>
                <p className="text-sm text-muted-foreground">Ending</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  $
                  {(
                    monthProjects.reduce((sum, p) => sum + p.budget, 0) /
                    1000000
                  ).toFixed(1)}
                  M
                </p>
                <p className="text-sm text-muted-foreground">Total Budget</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Date Details */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {format(selectedDate, "EEEE, MMMM dd, yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateProjects.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {selectedDateProjects.length} Project
                    {selectedDateProjects.length !== 1 ? "s" : ""}
                  </span>
                  <Badge variant="outline">
                    $
                    {(
                      selectedDateProjects.reduce(
                        (sum, p) => sum + p.budget,
                        0
                      ) / 1000
                    ).toFixed(0)}
                    k
                  </Badge>
                </div>

                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {selectedDateProjects.map((project) => (
                      <div
                        key={project.id}
                        className="border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm">
                            {project.name}
                          </h4>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant={getPriorityColor(project.priority)}
                            className="text-xs"
                          >
                            {project.priority}
                          </Badge>
                          <Badge
                            variant={getStatusColor(project.status)}
                            className="text-xs"
                          >
                            {project.status}
                          </Badge>
                        </div>

                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p>
                            <strong>Client:</strong> {project.client_name}
                          </p>
                          <p>
                            <strong>PM:</strong> {project.project_manager}
                          </p>
                          <p>
                            <strong>Progress:</strong>{" "}
                            {project.completion_percentage}%
                          </p>
                          <p>
                            <strong>Duration:</strong>{" "}
                            {format(parseISO(project.start_date), "MMM dd")} -{" "}
                            {format(parseISO(project.end_date), "MMM dd")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No projects scheduled for this date</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => navigate("/create-project")}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Create New Project
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => navigate("/projects")}
            >
              <Users className="h-4 w-4 mr-2" />
              View All Projects
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => navigate("/crew-scheduling")}
            >
              <Clock className="h-4 w-4 mr-2" />
              Crew Scheduling
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
