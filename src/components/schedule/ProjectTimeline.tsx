import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { Calendar, DollarSign, User } from 'lucide-react';

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
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface ProjectTimelineProps {
  projects: Project[];
  onDateRangeChange: (startDate: Date, endDate: Date, projectId: string) => void;
  selectedYear: number;
}

export const ProjectTimeline: React.FC<ProjectTimelineProps> = ({
  projects,
  onDateRangeChange,
  selectedYear
}) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  
  const currentDate = new Date(selectedYear, selectedMonth, 1);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(selectedYear, i, 1), 'MMMM')
  }));

  // Filter projects that overlap with the selected month
  const monthProjects = projects.filter(project => {
    const projectStart = new Date(project.start_date);
    const projectEnd = new Date(project.end_date);
    return projectStart <= monthEnd && projectEnd >= monthStart;
  });

  const getProjectsForDay = (day: Date) => {
    return monthProjects.filter(project => {
      const projectStart = new Date(project.start_date);
      const projectEnd = new Date(project.end_date);
      return day >= projectStart && day <= projectEnd;
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBorder = (status: string) => {
    switch (status) {
      case 'active': return 'border-blue-500';
      case 'completed': return 'border-green-500';
      case 'on_hold': return 'border-yellow-500';
      case 'cancelled': return 'border-red-500';
      default: return 'border-gray-300';
    }
  };

  return (
    <div className="space-y-4">
      {/* Month Selector */}
      <div className="flex items-center gap-4">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="px-3 py-2 border border-input rounded-md bg-background"
        >
          {months.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label} {selectedYear}
            </option>
          ))}
        </select>
        
        <Badge variant="outline">
          {monthProjects.length} Projects this month
        </Badge>
      </div>

      {/* Timeline View */}
      <div className="border rounded-lg overflow-hidden">
        {/* Calendar Header */}
        <div className="bg-muted/50 border-b">
          <div className="grid grid-cols-7 gap-0">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-3 text-center text-sm font-medium border-r border-border/50 last:border-r-0">
                {day}
              </div>
            ))}
          </div>
        </div>

        {/* Calendar Body */}
        <div className="grid grid-cols-7 gap-0">
          {days.map((day, index) => {
            const dayProjects = getProjectsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toString()}
                className={`min-h-24 border-r border-b border-border/50 p-1 ${
                  !isCurrentMonth ? 'bg-muted/20' : ''
                } ${isCurrentDay ? 'bg-blue-50 border-blue-200' : ''}`}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${
                    !isCurrentMonth ? 'text-muted-foreground' : ''
                  } ${isCurrentDay ? 'text-blue-600' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  {dayProjects.length > 0 && (
                    <Badge variant="outline" className="h-4 text-xs px-1">
                      {dayProjects.length}
                    </Badge>
                  )}
                </div>

                {/* Projects for this day */}
                <div className="space-y-1">
                  {dayProjects.slice(0, 3).map((project) => (
                    <TooltipProvider key={project.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`text-xs p-1 rounded border-l-2 cursor-pointer hover:bg-muted/50 transition-colors
                              ${getStatusBorder(project.status)}
                            `}
                          >
                            <div className="flex items-center gap-1">
                              <div className={`w-1.5 h-1.5 rounded-full ${getPriorityColor(project.priority)}`} />
                              <span className="truncate font-medium">
                                {project.name}
                              </span>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1 text-xs">
                            <p><strong>{project.name}</strong></p>
                            <p><strong>Client:</strong> {project.client_name}</p>
                            <p><strong>PM:</strong> {project.project_manager}</p>
                            <p><strong>Status:</strong> {project.status}</p>
                            <p><strong>Priority:</strong> {project.priority}</p>
                            <p><strong>Progress:</strong> {project.completion_percentage}%</p>
                            <p><strong>Budget:</strong> ${project.budget.toLocaleString()}</p>
                            <p><strong>Duration:</strong> {format(new Date(project.start_date), 'MMM dd')} - {format(new Date(project.end_date), 'MMM dd')}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                  
                  {dayProjects.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{dayProjects.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Project Summary for Selected Month */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">
          {format(currentDate, 'MMMM yyyy')} Summary
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold">
              {monthProjects.filter(p => p.status === 'active').length}
            </p>
            <p className="text-sm text-muted-foreground">Active Projects</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">
              ${(monthProjects.reduce((sum, p) => sum + p.budget, 0) / 1000000).toFixed(1)}M
            </p>
            <p className="text-sm text-muted-foreground">Total Budget</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">
              {monthProjects.length > 0 
                ? Math.round(monthProjects.reduce((sum, p) => sum + p.completion_percentage, 0) / monthProjects.length)
                : 0}%
            </p>
            <p className="text-sm text-muted-foreground">Avg Progress</p>
          </div>
        </div>

        {/* Critical Projects */}
        {monthProjects.filter(p => p.priority === 'critical').length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2 text-red-600">Critical Projects</h4>
            <div className="space-y-1">
              {monthProjects
                .filter(p => p.priority === 'critical')
                .map(project => (
                  <div key={project.id} className="text-xs text-muted-foreground">
                    • {project.name} ({project.completion_percentage}% complete)
                  </div>
                ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};