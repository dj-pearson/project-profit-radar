import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, Users, Flag, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Project {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  completion_percentage: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  client_name?: string;
  budget?: number;
}

interface TimelineProject extends Project {
  tasks: any[];
  milestones: any[];
  totalDuration: number;
  position: {
    x: number;
    width: number;
  };
}

interface ProjectTimelineProps {
  projects: Project[];
  onDateRangeChange: (startDate: Date, endDate: Date, projectId: string) => void;
  selectedYear: number;
}

const ProjectTimeline: React.FC<ProjectTimelineProps> = ({
  projects,
  onDateRangeChange,
  selectedYear
}) => {
  const { userProfile } = useAuth();
  const [timelineProjects, setTimelineProjects] = useState<TimelineProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [timelineWidth, setTimelineWidth] = useState(1000);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Timeline calculation constants
  const TIMELINE_START = new Date(selectedYear, 0, 1);
  const TIMELINE_END = new Date(selectedYear, 11, 31);
  const TOTAL_DAYS = Math.ceil((TIMELINE_END.getTime() - TIMELINE_START.getTime()) / (1000 * 60 * 60 * 24));

  const calculateProjectPosition = (project: Project) => {
    const startDate = new Date(project.start_date);
    const endDate = new Date(project.end_date);
    
    // Calculate days from timeline start
    const startDays = Math.ceil((startDate.getTime() - TIMELINE_START.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Calculate position and width as percentages
    const x = Math.max(0, (startDays / TOTAL_DAYS) * 100);
    const width = Math.min((duration / TOTAL_DAYS) * 100, 100 - x);
    
    return { x, width };
  };

  const fetchProjectDetails = async () => {
    if (!userProfile?.company_id || projects.length === 0) return;

    try {
      setLoading(true);
      const projectsWithDetails: TimelineProject[] = [];

      for (const project of projects) {
        // Fetch project tasks
        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', project.id)
          .eq('company_id', userProfile.company_id);

        // Fetch project milestones
        const { data: milestones, error: milestonesError } = await supabase
          .from('project_milestones')
          .select('*')
          .eq('project_id', project.id)
          .eq('company_id', userProfile.company_id);

        if (tasksError) console.error('Tasks error:', tasksError);
        if (milestonesError) console.error('Milestones error:', milestonesError);

        const startDate = new Date(project.start_date);
        const endDate = new Date(project.end_date);
        const totalDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        const position = calculateProjectPosition(project);

        projectsWithDetails.push({
          ...project,
          tasks: tasks || [],
          milestones: milestones || [],
          totalDuration,
          position,
        });
      }

      // Sort projects by start date
      projectsWithDetails.sort((a, b) => 
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      );

      setTimelineProjects(projectsWithDetails);
    } catch (error) {
      console.error('Error fetching project details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'active': 
      case 'in_progress': return 'bg-blue-500';
      case 'on_hold': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const generateMonthHeaders = () => {
    const months = [];
    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(selectedYear, month, 1);
      const daysInMonth = new Date(selectedYear, month + 1, 0).getDate();
      const widthPercent = (daysInMonth / TOTAL_DAYS) * 100;
      
      months.push({
        name: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        width: widthPercent,
        days: daysInMonth
      });
    }
    return months;
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [projects, userProfile?.company_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const monthHeaders = generateMonthHeaders();

  return (
    <div className="space-y-4">
      {/* Timeline Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Project Timeline - {selectedYear}</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span>Critical</span>
            <div className="w-3 h-3 rounded bg-orange-500"></div>
            <span>High</span>
            <div className="w-3 h-3 rounded bg-yellow-500"></div>
            <span>Medium</span>
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span>Low</span>
          </div>
        </div>
      </div>

      {/* Timeline Container */}
      <Card>
        <CardContent className="p-6">
          {timelineProjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No projects found for {selectedYear}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Month Headers */}
              <div className="flex border-b pb-2">
                {monthHeaders.map((month, index) => (
                  <div
                    key={index}
                    className="text-center text-sm font-medium text-muted-foreground border-r last:border-r-0"
                    style={{ width: `${month.width}%` }}
                  >
                    {month.name}
                  </div>
                ))}
              </div>

              {/* Timeline Grid */}
              <div className="space-y-3">
                {timelineProjects.map((project) => (
                  <div
                    key={project.id}
                    className={`relative p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedProjectId === project.id ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                    onClick={() => setSelectedProjectId(selectedProjectId === project.id ? '' : project.id)}
                  >
                    {/* Project Info */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getPriorityColor(project.priority)}`} />
                        <div>
                          <h4 className="font-semibold">{project.name}</h4>
                          {project.client_name && (
                            <p className="text-sm text-muted-foreground">{project.client_name}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-white ${getStatusColor(project.status)}`}>
                          {project.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {project.completion_percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Timeline Bar */}
                    <div className="relative h-8 bg-muted rounded mb-3">
                      <div
                        className={`absolute h-full rounded transition-all ${getStatusColor(project.status)}`}
                        style={{
                          left: `${project.position.x}%`,
                          width: `${project.position.width}%`,
                          opacity: 0.8,
                        }}
                      >
                        {/* Progress overlay */}
                        <div
                          className="absolute top-0 left-0 h-full bg-white/30 rounded"
                          style={{ width: `${project.completion_percentage}%` }}
                        />
                      </div>
                      
                      {/* Milestones */}
                      {project.milestones.map((milestone) => {
                        const milestonePosition = calculateProjectPosition({
                          ...project,
                          start_date: milestone.target_date,
                          end_date: milestone.target_date,
                        });
                        
                        return (
                          <div
                            key={milestone.id}
                            className="absolute top-0 h-full w-1 bg-yellow-400 z-10"
                            style={{ left: `${milestonePosition.x}%` }}
                            title={milestone.name}
                          >
                            <Flag className="h-3 w-3 text-yellow-600 -mt-1 -ml-1" />
                          </div>
                        );
                      })}
                    </div>

                    {/* Date Range */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(project.start_date)} - {formatDate(project.end_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {project.totalDuration} days
                      </span>
                    </div>

                    {/* Expanded Details */}
                    {selectedProjectId === project.id && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        {/* Progress Bar */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Overall Progress</span>
                            <span className="text-sm">{project.completion_percentage}%</span>
                          </div>
                          <Progress value={project.completion_percentage} className="h-2" />
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="font-medium">Tasks</div>
                            <div className="text-muted-foreground">{project.tasks.length}</div>
                          </div>
                          <div>
                            <div className="font-medium">Milestones</div>
                            <div className="text-muted-foreground">{project.milestones.length}</div>
                          </div>
                          <div>
                            <div className="font-medium">Duration</div>
                            <div className="text-muted-foreground">{project.totalDuration} days</div>
                          </div>
                          <div>
                            <div className="font-medium">Status</div>
                            <div className="text-muted-foreground capitalize">
                              {project.status.replace('_', ' ')}
                            </div>
                          </div>
                        </div>

                        {/* Recent Tasks */}
                        {project.tasks.length > 0 && (
                          <div>
                            <h5 className="font-medium mb-2">Recent Tasks</h5>
                            <div className="space-y-2">
                              {project.tasks.slice(0, 3).map((task) => (
                                <div
                                  key={task.id}
                                  className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                                >
                                  <span className="truncate">{task.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {task.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Upcoming Milestones */}
                        {project.milestones.length > 0 && (
                          <div>
                            <h5 className="font-medium mb-2">Milestones</h5>
                            <div className="space-y-2">
                              {project.milestones
                                .filter(m => m.status === 'pending')
                                .slice(0, 3)
                                .map((milestone) => (
                                  <div
                                    key={milestone.id}
                                    className="flex items-center justify-between p-2 bg-yellow-50 border border-yellow-200 rounded text-sm"
                                  >
                                    <span className="truncate">{milestone.name}</span>
                                    <span className="text-muted-foreground">
                                      {formatDate(milestone.target_date)}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Timeline Legend */}
              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  <p className="mb-2">Timeline Tips:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Click on projects to expand details</li>
                    <li>• Timeline bars show project duration and completion progress</li>
                    <li>• Yellow flags indicate project milestones</li>
                    <li>• Colors represent project priority levels</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectTimeline;