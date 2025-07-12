import React, { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, User, DollarSign } from 'lucide-react';

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

interface ProjectGanttChartProps {
  projects: Project[];
  onDateRangeChange: (startDate: Date, endDate: Date, projectId: string) => void;
  selectedYear: number;
}

export const ProjectGanttChart: React.FC<ProjectGanttChartProps> = ({
  projects,
  onDateRangeChange,
  selectedYear
}) => {
  const [viewStart, setViewStart] = useState(new Date(selectedYear, 0, 1));
  const [viewEnd, setViewEnd] = useState(new Date(selectedYear, 11, 31));
  const [draggedProject, setDraggedProject] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setViewStart(new Date(selectedYear, 0, 1));
    setViewEnd(new Date(selectedYear, 11, 31));
  }, [selectedYear]);

  const months = eachMonthOfInterval({ start: viewStart, end: viewEnd });
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'on_hold': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const calculatePosition = (date: string) => {
    const projectDate = new Date(date);
    const totalDays = Math.ceil((viewEnd.getTime() - viewStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysSinceStart = Math.ceil((projectDate.getTime() - viewStart.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.min(100, (daysSinceStart / totalDays) * 100));
  };

  const calculateWidth = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((viewEnd.getTime() - viewStart.getTime()) / (1000 * 60 * 60 * 24));
    const projectDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(2, (projectDays / totalDays) * 100);
  };

  const handleProjectDrag = (projectId: string, event: React.DragEvent) => {
    setDraggedProject(projectId);
    setIsDragging(true);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    if (!draggedProject || !chartRef.current) return;

    const rect = chartRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    
    const totalDays = Math.ceil((viewEnd.getTime() - viewStart.getTime()) / (1000 * 60 * 60 * 24));
    const dayOffset = Math.floor((percentage / 100) * totalDays);
    const newStartDate = new Date(viewStart.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    
    const project = projects.find(p => p.id === draggedProject);
    if (project) {
      const originalDuration = Math.ceil((new Date(project.end_date).getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24));
      const newEndDate = new Date(newStartDate.getTime() + originalDuration * 24 * 60 * 60 * 1000);
      
      onDateRangeChange(newStartDate, newEndDate, draggedProject);
    }

    setDraggedProject(null);
    setIsDragging(false);
  };

  const navigateView = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setViewStart(subMonths(viewStart, 6));
      setViewEnd(subMonths(viewEnd, 6));
    } else {
      setViewStart(addMonths(viewStart, 6));
      setViewEnd(addMonths(viewEnd, 6));
    }
  };

  return (
    <div className="space-y-4">
      {/* Navigation and Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateView('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {format(viewStart, 'MMM yyyy')} - {format(viewEnd, 'MMM yyyy')}
          </span>
          <Button variant="outline" size="sm" onClick={() => navigateView('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {projects.length} Projects
          </Badge>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="border rounded-lg overflow-hidden">
        {/* Header with months */}
        <div className="bg-muted/50 border-b">
          <div className="flex h-12">
            <div className="w-80 border-r bg-background flex items-center px-4">
              <span className="font-medium text-sm">Project</span>
            </div>
            <div className="flex-1 flex">
              {months.map((month, index) => (
                <div
                  key={index}
                  className="flex-1 border-r border-border/50 flex items-center justify-center"
                >
                  <span className="text-xs font-medium">
                    {format(month, 'MMM yyyy')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Project Rows */}
        <ScrollArea className="h-96">
          <div
            ref={chartRef}
            className="relative"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {projects.map((project, index) => (
              <div key={project.id} className="flex h-16 border-b border-border/50 hover:bg-muted/30">
                {/* Project Info */}
                <div className="w-80 border-r bg-background p-3 flex items-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${getPriorityColor(project.priority)}`} />
                            <h4 className="font-medium text-sm truncate">
                              {project.name}
                            </h4>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span className="truncate">{project.project_manager}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              <span>${(project.budget / 1000).toFixed(0)}k</span>
                            </div>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1 text-xs">
                          <p><strong>Client:</strong> {project.client_name}</p>
                          <p><strong>Status:</strong> {project.status}</p>
                          <p><strong>Progress:</strong> {project.completion_percentage}%</p>
                          <p><strong>Budget:</strong> ${project.budget.toLocaleString()}</p>
                          <p><strong>Start:</strong> {format(new Date(project.start_date), 'MMM dd, yyyy')}</p>
                          <p><strong>End:</strong> {format(new Date(project.end_date), 'MMM dd, yyyy')}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Timeline Bar */}
                <div className="flex-1 relative p-2">
                  <div
                    className={`absolute top-1/2 transform -translate-y-1/2 h-6 rounded-md cursor-move
                      ${getStatusColor(project.status)} opacity-80 hover:opacity-100 transition-opacity
                      ${isDragging && draggedProject === project.id ? 'opacity-50' : ''}
                    `}
                    style={{
                      left: `${calculatePosition(project.start_date)}%`,
                      width: `${calculateWidth(project.start_date, project.end_date)}%`,
                      minWidth: '20px'
                    }}
                    draggable
                    onDragStart={(e) => handleProjectDrag(project.id, e)}
                  >
                    {/* Progress Indicator */}
                    <div
                      className="h-full bg-white/30 rounded-md"
                      style={{ width: `${project.completion_percentage}%` }}
                    />
                    
                    {/* Project Name on Bar */}
                    <div className="absolute inset-0 flex items-center px-2">
                      <span className="text-white text-xs font-medium truncate">
                        {project.name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs">
        <div className="flex items-center gap-4">
          <span className="font-medium">Priority:</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>Low</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="font-medium">Status:</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded bg-blue-500" />
            <span>Active</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded bg-green-500" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded bg-yellow-500" />
            <span>On Hold</span>
          </div>
        </div>
      </div>
    </div>
  );
};