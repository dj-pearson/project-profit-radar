import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Clock, 
  Users, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Project {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  budget: number;
  completion_percentage: number;
  project_manager?: string;
  client_name?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface ScheduleOverviewProps {
  projects: Project[];
  onProjectUpdate: () => void;
  selectedYear: number;
}

interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  overdueProjects: number;
  upcomingDeadlines: number;
  averageCompletion: number;
}

const ScheduleOverview: React.FC<ScheduleOverviewProps> = ({
  projects,
  onProjectUpdate,
  selectedYear
}) => {
  const { userProfile } = useAuth();
  const [projectStats, setProjectStats] = useState<ProjectStats>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    overdueProjects: 0,
    upcomingDeadlines: 0,
    averageCompletion: 0,
  });

  const calculateStats = () => {
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(now.getDate() + 7);

    const stats: ProjectStats = {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'active' || p.status === 'in_progress').length,
      completedProjects: projects.filter(p => p.status === 'completed').length,
      overdueProjects: projects.filter(p => {
        const endDate = new Date(p.end_date);
        return endDate < now && p.status !== 'completed';
      }).length,
      upcomingDeadlines: projects.filter(p => {
        const endDate = new Date(p.end_date);
        return endDate >= now && endDate <= weekFromNow && p.status !== 'completed';
      }).length,
      averageCompletion: projects.length > 0 
        ? Math.round(projects.reduce((sum, p) => sum + p.completion_percentage, 0) / projects.length)
        : 0,
    };

    setProjectStats(stats);
  };

  useEffect(() => {
    calculateStats();
  }, [projects]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'active': 
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const getDaysUntilDeadline = (endDate: string) => {
    const now = new Date();
    const deadline = new Date(endDate);
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold">{projectStats.totalProjects}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-blue-600">{projectStats.activeProjects}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-green-600">{projectStats.completedProjects}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-red-600">{projectStats.overdueProjects}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Project Schedule Overview</CardTitle>
            <Button variant="outline" size="sm" onClick={onProjectUpdate}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No projects found for {selectedYear}
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => {
                const daysUntilDeadline = getDaysUntilDeadline(project.end_date);
                const isOverdue = daysUntilDeadline < 0 && project.status !== 'completed';
                const isUpcoming = daysUntilDeadline >= 0 && daysUntilDeadline <= 7 && project.status !== 'completed';

                return (
                  <div
                    key={project.id}
                    className={`p-4 rounded-lg border ${
                      isOverdue ? 'border-red-200 bg-red-50' : 
                      isUpcoming ? 'border-yellow-200 bg-yellow-50' : 
                      'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{project.name}</h3>
                          <div className={`w-2 h-2 rounded-full ${getPriorityColor(project.priority)}`} />
                          <Badge 
                            variant="outline" 
                            className={getStatusColor(project.status)}
                          >
                            {project.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        {project.client_name && (
                          <p className="text-sm text-muted-foreground">
                            Client: {project.client_name}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {formatCurrency(project.budget)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Budget
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">Progress</span>
                        <span className="text-sm text-muted-foreground">
                          {project.completion_percentage}%
                        </span>
                      </div>
                      <Progress value={project.completion_percentage} className="h-2" />
                    </div>

                    {/* Timeline Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">Start Date</div>
                          <div className="text-muted-foreground">
                            {new Date(project.start_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">End Date</div>
                          <div className={`${isOverdue ? 'text-red-600' : isUpcoming ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                            {new Date(project.end_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`h-4 w-4 ${isOverdue ? 'text-red-500' : isUpcoming ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                        <div>
                          <div className="font-medium">Days to Deadline</div>
                          <div className={`${isOverdue ? 'text-red-600' : isUpcoming ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                            {isOverdue ? `${Math.abs(daysUntilDeadline)} days overdue` : 
                             daysUntilDeadline === 0 ? 'Due today' :
                             `${daysUntilDeadline} days remaining`}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Schedule Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Average Completion</span>
              <span className="text-lg font-semibold">{projectStats.averageCompletion}%</span>
            </div>
            <Progress value={projectStats.averageCompletion} />
            
            <div className="pt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">On Track</span>
                <span className="font-medium text-green-600">
                  {projectStats.activeProjects - projectStats.overdueProjects}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">At Risk</span>
                <span className="font-medium text-yellow-600">
                  {projectStats.upcomingDeadlines}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overdue</span>
                <span className="font-medium text-red-600">
                  {projectStats.overdueProjects}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            {projectStats.upcomingDeadlines === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming deadlines in the next 7 days</p>
            ) : (
              <div className="space-y-3">
                {projects
                  .filter(p => {
                    const daysUntil = getDaysUntilDeadline(p.end_date);
                    return daysUntil >= 0 && daysUntil <= 7 && p.status !== 'completed';
                  })
                  .sort((a, b) => getDaysUntilDeadline(a.end_date) - getDaysUntilDeadline(b.end_date))
                  .slice(0, 5)
                  .map(project => {
                    const daysUntil = getDaysUntilDeadline(project.end_date);
                    return (
                      <div key={project.id} className="flex items-center justify-between p-2 bg-yellow-50 rounded border border-yellow-200">
                        <div>
                          <div className="font-medium text-sm">{project.name}</div>
                          <div className="text-xs text-muted-foreground">{project.client_name}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-yellow-700">
                            {daysUntil === 0 ? 'Due Today' : `${daysUntil} days`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {project.completion_percentage}% complete
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ScheduleOverview;