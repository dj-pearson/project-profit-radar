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
  const [dragMode, setDragMode] = useState<'move' | 'resize-start' | 'resize-end'>('move');
  const [dragStartX, setDragStartX] = useState(0);
  const [tempProjectDates, setTempProjectDates] = useState<{[key: string]: {start: Date, end: Date}}>({});
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

  const getDateFromPosition = (x: number, timelineWidth: number) => {
    const percentage = Math.max(0, Math.min(1, x / timelineWidth));
    const totalMs = viewEnd.getTime() - viewStart.getTime();
    const offsetMs = percentage * totalMs;
    return new Date(viewStart.getTime() + offsetMs);
  };

  const handleMouseDown = (projectId: string, event: React.MouseEvent, forceMode?: 'move' | 'resize-start' | 'resize-end') => {
    if (!chartRef.current) return;
    
    event.preventDefault();
    
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    const chartRect = chartRef.current.getBoundingClientRect();
    const timelineElement = event.currentTarget.closest('.flex-1') as HTMLElement;
    if (!timelineElement) return;
    
    const timelineRect = timelineElement.getBoundingClientRect();
    const timelineWidth = timelineRect.width;
    
    const barElement = event.currentTarget as HTMLElement;
    const barRect = barElement.getBoundingClientRect();
    const relativeX = event.clientX - barRect.left;
    const barWidth = barRect.width;
    
    // Determine drag mode based on forced mode or position within the bar
    let mode: 'move' | 'resize-start' | 'resize-end' = forceMode || 'move';
    if (!forceMode) {
      if (relativeX < 10) {
        mode = 'resize-start';
      } else if (relativeX > barWidth - 10) {
        mode = 'resize-end';
      }
    }
    
    setDraggedProject(projectId);
    setDragMode(mode);
    setDragStartX(event.clientX);
    setIsDragging(true);
    
    const originalStartDate = new Date(project.start_date);
    const originalEndDate = new Date(project.end_date);
    const originalStartX = event.clientX - timelineRect.left;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineElement) return;
      
      const currentX = e.clientX - timelineRect.left;
      const clampedX = Math.max(0, Math.min(timelineWidth, currentX));
      
      let newStartDate = originalStartDate;
      let newEndDate = originalEndDate;
      
      if (mode === 'move') {
        // Calculate the movement delta in pixels, then convert to time
        const deltaX = currentX - originalStartX;
        const deltaPercentage = deltaX / timelineWidth;
        const totalMs = viewEnd.getTime() - viewStart.getTime();
        const deltaMs = deltaPercentage * totalMs;
        
        newStartDate = new Date(originalStartDate.getTime() + deltaMs);
        newEndDate = new Date(originalEndDate.getTime() + deltaMs);
        
        // Ensure project stays within view bounds
        if (newStartDate.getTime() < viewStart.getTime()) {
          const offset = viewStart.getTime() - newStartDate.getTime();
          newStartDate = new Date(viewStart.getTime());
          newEndDate = new Date(newEndDate.getTime() + offset);
        }
        if (newEndDate.getTime() > viewEnd.getTime()) {
          const offset = newEndDate.getTime() - viewEnd.getTime();
          newEndDate = new Date(viewEnd.getTime());
          newStartDate = new Date(newStartDate.getTime() - offset);
        }
      } else if (mode === 'resize-start') {
        // Resize from start
        newStartDate = getDateFromPosition(clampedX, timelineWidth);
        newEndDate = originalEndDate;
        
        // Ensure minimum 1 day duration
        if (newStartDate.getTime() >= newEndDate.getTime()) {
          newStartDate = new Date(newEndDate.getTime() - 24 * 60 * 60 * 1000);
        }
      } else if (mode === 'resize-end') {
        // Resize from end
        newStartDate = originalStartDate;
        newEndDate = getDateFromPosition(clampedX, timelineWidth);
        
        // Ensure minimum 1 day duration
        if (newEndDate.getTime() <= newStartDate.getTime()) {
          newEndDate = new Date(newStartDate.getTime() + 24 * 60 * 60 * 1000);
        }
      }
      
      // Store temporary dates for visual feedback only
      setTempProjectDates(prev => ({
        ...prev,
        [projectId]: { start: newStartDate, end: newEndDate }
      }));
    };
    
    const handleMouseUp = () => {
      // Apply the final dates
      if (tempProjectDates[projectId]) {
        const { start, end } = tempProjectDates[projectId];
        onDateRangeChange(start, end, projectId);
        
        // Clean up temp dates
        setTempProjectDates(prev => {
          const newTemp = { ...prev };
          delete newTemp[projectId];
          return newTemp;
        });
      }
      
      setDraggedProject(null);
      setIsDragging(false);
      setDragMode('move');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
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
                  {(() => {
                    // Use temp dates if dragging, otherwise use actual project dates
                    const effectiveStartDate = tempProjectDates[project.id]?.start 
                      ? tempProjectDates[project.id].start.toISOString().split('T')[0]
                      : project.start_date;
                    const effectiveEndDate = tempProjectDates[project.id]?.end 
                      ? tempProjectDates[project.id].end.toISOString().split('T')[0]
                      : project.end_date;
                    
                    return (
                      <div
                        className={`absolute top-1/2 transform -translate-y-1/2 h-6 rounded-md select-none
                          ${getStatusColor(project.status)} opacity-80 hover:opacity-100 transition-opacity
                          ${isDragging && draggedProject === project.id ? 'opacity-70 shadow-lg' : ''}
                          group
                        `}
                        style={{
                          left: `${calculatePosition(effectiveStartDate)}%`,
                          width: `${calculateWidth(effectiveStartDate, effectiveEndDate)}%`,
                          minWidth: '20px',
                          cursor: 'move'
                        }}
                        onMouseDown={(e) => handleMouseDown(project.id, e)}
                      >
                        {/* Resize handle - left */}
                        <div 
                          className="absolute left-0 top-0 w-2 h-full cursor-w-resize opacity-0 group-hover:opacity-100 bg-white/20 transition-opacity"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            handleMouseDown(project.id, e, 'resize-start');
                          }}
                        />
                        
                        {/* Resize handle - right */}
                        <div 
                          className="absolute right-0 top-0 w-2 h-full cursor-e-resize opacity-0 group-hover:opacity-100 bg-white/20 transition-opacity"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            handleMouseDown(project.id, e, 'resize-end');
                          }}
                        />
                        
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
                    );
                  })()}
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