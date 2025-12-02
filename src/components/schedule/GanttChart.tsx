import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Task, Project, ScheduleAnalytics } from "@/types/schedule";
import { 
  Calendar, 
  Clock, 
  Users, 
  AlertCircle, 
  GripVertical,
  Plus,
  Settings,
  Share,
  Download,
  Link2,
  Copy,
  Check
} from 'lucide-react';

interface GanttChartProps {
  project: Project;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onAddTask?: () => void;
  onShare?: (shareUrl: string) => void;
  onExportPDF?: () => void;
  onSettings?: () => void;
}

interface GanttTask extends Task {
  x: number;
  width: number;
  y: number;
  height: number;
}

export const GanttChart: React.FC<GanttChartProps> = ({
  project,
  onTaskUpdate,
  onAddTask,
  onShare,
  onExportPDF,
  onSettings
}) => {
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState<'days' | 'weeks' | 'months'>('days');
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const ganttRef = useRef<HTMLDivElement>(null);

  // Calculate date range
  const startDate = new Date(project.startDate);
  const endDate = new Date(project.endDate);
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Constants for layout
  const TASK_HEIGHT = 40;
  const TASK_MARGIN = 8;
  const HEADER_HEIGHT = 60;
  const SIDEBAR_WIDTH = 300;
  const DAY_WIDTH = viewMode === 'days' ? 40 : viewMode === 'weeks' ? 80 : 160;

  // Generate extended time scale with buffer
  const generateTimeScale = () => {
    const scale = [];
    
    // Add buffer before and after project dates
    const bufferedStart = new Date(startDate);
    bufferedStart.setDate(bufferedStart.getDate() - 7); // 1 week before
    
    const bufferedEnd = new Date(endDate);
    bufferedEnd.setDate(bufferedEnd.getDate() + 30); // 1 month after
    
    const current = new Date(bufferedStart);
    
    while (current <= bufferedEnd) {
      scale.push(new Date(current));
      if (viewMode === 'days') {
        current.setDate(current.getDate() + 1);
      } else if (viewMode === 'weeks') {
        current.setDate(current.getDate() + 7);
      } else {
        current.setMonth(current.getMonth() + 1);
      }
    }
    return scale;
  };

  const timeScale = generateTimeScale();

  // Calculate task positions relative to buffered start
  const calculateTaskPosition = (task: Task): GanttTask => {
    const bufferedStart = new Date(startDate);
    bufferedStart.setDate(bufferedStart.getDate() - 7);
    
    const taskStartDays = Math.ceil((new Date(task.startDate).getTime() - bufferedStart.getTime()) / (1000 * 60 * 60 * 24));
    const taskIndex = project.tasks.findIndex(t => t.id === task.id);
    
    return {
      ...task,
      x: taskStartDays * DAY_WIDTH,
      width: task.duration * DAY_WIDTH,
      y: taskIndex * (TASK_HEIGHT + TASK_MARGIN),
      height: TASK_HEIGHT
    };
  };

  const ganttTasks = project.tasks.map(calculateTaskPosition);

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent, taskId: string) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setDraggedTask(taskId);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  // Handle drag
  const handleDrag = (e: React.MouseEvent) => {
    if (!draggedTask || !ganttRef.current) return;

    const rect = ganttRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const newDaysFromStart = Math.round(x / DAY_WIDTH);
    
    if (newDaysFromStart >= 0) {
      // Use buffered start date for calculations
      const bufferedStart = new Date(startDate);
      bufferedStart.setDate(bufferedStart.getDate() - 7);
      
      const newStartDate = new Date(bufferedStart);
      newStartDate.setDate(newStartDate.getDate() + newDaysFromStart);
      
      const newEndDate = new Date(newStartDate);
      newEndDate.setDate(newEndDate.getDate() + project.tasks.find(t => t.id === draggedTask)!.duration);
      
      onTaskUpdate(draggedTask, {
        startDate: newStartDate,
        endDate: newEndDate
      });
    }
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOffset({ x: 0, y: 0 });
  };

  // Handle share functionality
  const handleShare = async () => {
    setIsSharing(true);
    try {
      // Generate a shareable URL (in real implementation, this would save to backend)
      const shareUrl = `${window.location.origin}/shared-schedule/${project.id}`;
      setShareUrl(shareUrl);
      
      if (onShare) {
        onShare(shareUrl);
      }
    } catch (error) {
      console.error('Error sharing schedule:', error);
    }
    setIsSharing(false);
  };

  // Handle copy link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Error copying link:', error);
    }
  };

  // Handle PDF export
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      if (onExportPDF) {
        await onExportPDF();
      } else {
        // Default PDF export functionality
        const { SchedulePDFExporter } = await import('@/utils/pdfExportUtils');
        
        const exporter = new SchedulePDFExporter(project, {
          includeGantt: true,
          includeCriticalPath: true,
          includeTaskList: true,
          includeAnalytics: true,
          companyName: 'BuildDesk'
        });
        
        await exporter.generatePDF();
        const fileName = `${project.name.replace(/\s+/g, '_')}_Schedule.pdf`;
        exporter.downloadPDF(fileName);
        
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
    setIsExporting(false);
  };

  // Handle settings
  const handleSettings = () => {
    if (onSettings) {
      onSettings();
    } else {
      // Default settings functionality
      alert('Settings panel coming soon! Configure project details, resources, and preferences.');
    }
  };

  // Calculate analytics
  const analytics: ScheduleAnalytics = {
    totalTasks: project.tasks.length,
    criticalPathTasks: project.tasks.filter(t => t.isOnCriticalPath).length,
    projectDuration: totalDays,
    resourceUtilization: 85, // Mock calculation
    scheduleEfficiency: 85, // Mock calculation
    riskFactors: [],
    recommendations: []
  };

  return (
    <div className="space-y-4">
      {/* Gantt Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold">Project Timeline</h3>
          <div className="flex rounded-md border">
            {(['days', 'weeks', 'months'] as const).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none first:rounded-l-md last:rounded-r-md"
                onClick={() => setViewMode(mode)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {onAddTask && (
            <Button variant="outline" size="sm" onClick={onAddTask}>
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          )}
          
          {/* Share Button with Dropdown */}
          {shareUrl ? (
            <div className="relative">
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                {linkCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {linkCopied ? 'Copied!' : 'Copy Link'}
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={handleShare} disabled={isSharing}>
              {isSharing ? (
                <Clock className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Share className="mr-2 h-4 w-4" />
              )}
              Share
            </Button>
          )}
          
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isExporting}>
            {isExporting ? (
              <Clock className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export PDF
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleSettings}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-construction-dark">{analytics.totalTasks}</div>
            <div className="text-sm text-muted-foreground">Total Tasks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{analytics.criticalPathTasks}</div>
            <div className="text-sm text-muted-foreground">Critical Path Tasks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-construction-orange">{analytics.projectDuration}</div>
            <div className="text-sm text-muted-foreground">Project Days</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{analytics.scheduleEfficiency}%</div>
            <div className="text-sm text-muted-foreground">Schedule Efficiency</div>
          </CardContent>
        </Card>
      </div>

      {/* Gantt Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Project Timeline</span>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
                Critical Path
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                Regular Tasks
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <div className="flex">
              {/* Task List Sidebar */}
              <div className="w-80 border-r bg-muted/30">
                {/* Header */}
                <div 
                  className="h-16 border-b flex items-center px-4 font-semibold bg-background"
                  style={{ height: HEADER_HEIGHT }}
                >
                  Task Name
                </div>
                
                {/* Task List */}
                <div className="space-y-2 p-2">
                  {project.tasks.map((task, index) => (
                    <div
                      key={task.id}
                      className={`p-3 rounded border cursor-pointer transition-colors ${
                        task.isOnCriticalPath 
                          ? 'bg-red-50 border-red-200 hover:bg-red-100' 
                          : 'bg-white hover:bg-muted/50'
                      }`}
                      style={{ height: TASK_HEIGHT }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{task.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {task.duration} days • {task.phase}
                          </div>
                        </div>
                        {task.isOnCriticalPath && (
                          <Badge variant="destructive" className="text-xs">
                            Critical
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline Area */}
              <div className="flex-1 relative">
                {/* Time Scale Header */}
                <div 
                  className="border-b bg-background sticky top-0 z-10"
                  style={{ height: HEADER_HEIGHT }}
                >
                  <div className="flex h-full">
                    {timeScale.map((date, index) => (
                      <div
                        key={index}
                        className="border-r text-center flex flex-col justify-center text-xs"
                        style={{ width: DAY_WIDTH }}
                      >
                        <div className="font-medium">
                          {viewMode === 'days' 
                            ? date.getDate()
                            : viewMode === 'weeks'
                            ? `W${Math.ceil(date.getDate() / 7)}`
                            : date.getMonth() + 1
                          }
                        </div>
                        <div className="text-muted-foreground">
                          {viewMode === 'days'
                            ? date.toLocaleDateString('en-US', { weekday: 'short' })
                            : viewMode === 'weeks'
                            ? date.toLocaleDateString('en-US', { month: 'short' })
                            : date.toLocaleDateString('en-US', { month: 'short' })
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gantt Area */}
                <div
                  ref={ganttRef}
                  className="relative bg-white"
                  style={{ 
                    height: project.tasks.length * (TASK_HEIGHT + TASK_MARGIN) + 20,
                    width: timeScale.length * DAY_WIDTH 
                  }}
                  onMouseMove={handleDrag}
                  onMouseUp={handleDragEnd}
                  onMouseLeave={handleDragEnd}
                >
                  {/* Grid Lines */}
                  {timeScale.map((_, index) => (
                    <div
                      key={index}
                      className="absolute top-0 bottom-0 border-r border-muted/50"
                      style={{ left: index * DAY_WIDTH }}
                    />
                  ))}

                  {/* Task Bars */}
                  {ganttTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`absolute rounded cursor-move flex items-center px-2 text-white text-xs font-medium select-none transition-all ${
                        task.isOnCriticalPath 
                          ? 'bg-red-500 hover:bg-red-600' 
                          : 'bg-blue-500 hover:bg-blue-600'
                      } ${draggedTask === task.id ? 'opacity-75 shadow-lg' : ''}`}
                      style={{
                        left: task.x,
                        top: task.y + 10,
                        width: Math.max(task.width, 60),
                        height: task.height - 4
                      }}
                      onMouseDown={(e) => handleDragStart(e, task.id)}
                    >
                      <GripVertical className="h-3 w-3 mr-1 opacity-60" />
                      <span className="truncate flex-1">{task.name}</span>
                      <span className="ml-1 text-xs opacity-80">{task.duration}d</span>
                    </div>
                  ))}

                  {/* Dependency Lines (simplified) */}
                  {ganttTasks.map((task) => 
                    task.dependencies.map((depId) => {
                      const depTask = ganttTasks.find(t => t.id === depId);
                      if (!depTask) return null;
                      
                      return (
                        <svg
                          key={`${task.id}-${depId}`}
                          className="absolute pointer-events-none"
                          style={{
                            left: Math.min(depTask.x + depTask.width, task.x),
                            top: Math.min(depTask.y, task.y),
                            width: Math.abs(task.x - (depTask.x + depTask.width)) + 20,
                            height: Math.abs(task.y - depTask.y) + TASK_HEIGHT
                          }}
                        >
                          <defs>
                            <marker
                              id="arrowhead"
                              markerWidth="10"
                              markerHeight="7"
                              refX="10"
                              refY="3.5"
                              orient="auto"
                            >
                              <polygon
                                points="0 0, 10 3.5, 0 7"
                                fill="#666"
                              />
                            </marker>
                          </defs>
                          <path
                            d={`M ${depTask.x + depTask.width < task.x ? 0 : Math.abs(task.x - (depTask.x + depTask.width))} ${depTask.y < task.y ? TASK_HEIGHT/2 : Math.abs(task.y - depTask.y) + TASK_HEIGHT/2} 
                                L ${depTask.x + depTask.width < task.x ? Math.abs(task.x - (depTask.x + depTask.width)) : 0} ${depTask.y < task.y ? Math.abs(task.y - depTask.y) + TASK_HEIGHT/2 : TASK_HEIGHT/2}`}
                            stroke="#666"
                            strokeWidth="2"
                            fill="none"
                            markerEnd="url(#arrowhead)"
                          />
                        </svg>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-1">How to use the timeline:</p>
              <ul className="text-blue-800 space-y-1">
                <li>• <strong>Drag task bars</strong> to adjust start dates</li>
                <li>• <strong>Red tasks</strong> are on the critical path - delays will impact project completion</li>
                <li>• <strong>Arrow lines</strong> show task dependencies</li>
                <li>• Switch between <strong>Days/Weeks/Months</strong> view using the buttons above</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GanttChart; 