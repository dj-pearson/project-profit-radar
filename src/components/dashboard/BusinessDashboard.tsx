import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Users, 
  AlertTriangle,
  ChevronRight,
  BarChart3,
  Target,
  FileText,
  Plus
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  status: string;
  budget: number;
  completion_percentage: number;
  start_date: string;
  end_date: string;
  client_name?: string;
}

interface Task {
  id: string;
  name: string;
  description?: string;
  due_date: string;
  priority: string;
  status: string;
  project_id: string;
  company_id: string;
  assigned_to?: string;
  category?: string;
  estimated_hours?: number;
  actual_hours?: number;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  projects?: { name: string };
}

interface DashboardMetrics {
  activeProjects: number;
  overdueTasks: number;
  upcomingDeadlines: number;
  totalRevenue: number;
  completionRate: number;
}

export const BusinessDashboard = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    activeProjects: 0,
    overdueTasks: 0,
    upcomingDeadlines: 0,
    totalRevenue: 0,
    completionRate: 0
  });

  useEffect(() => {
    if (userProfile?.company_id) {
      loadDashboardData();
    }
  }, [userProfile?.company_id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .in('status', ['active', 'in_progress', 'planning'])
        .order('created_at', { ascending: false })
        .limit(8);

      if (projectsError) throw projectsError;

      // Load upcoming tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          projects (name)
        `)
        .eq('company_id', userProfile?.company_id)
        .gte('due_date', new Date().toISOString().split('T')[0])
        .lte('due_date', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .neq('status', 'completed')
        .order('due_date', { ascending: true })
        .limit(10);

      if (tasksError) throw tasksError;

      // Calculate metrics
      const activeProjects = projectsData?.filter(p => ['active', 'in_progress'].includes(p.status)) || [];
      const overdueTasks = tasksData?.filter(t => new Date(t.due_date) < new Date() && t.status !== 'completed') || [];
      const upcomingDeadlines = tasksData?.filter(t => {
        const dueDate = new Date(t.due_date);
        const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        return dueDate <= threeDaysFromNow && t.status !== 'completed';
      }) || [];
      
      const totalRevenue = projectsData?.reduce((sum, p) => sum + (p.budget || 0), 0) || 0;
      const avgCompletion = projectsData?.length > 0 
        ? projectsData.reduce((sum, p) => sum + (p.completion_percentage || 0), 0) / projectsData.length 
        : 0;

      setProjects(projectsData || []);
      setTasks(tasksData || []);
      setMetrics({
        activeProjects: activeProjects.length,
        overdueTasks: overdueTasks.length,
        upcomingDeadlines: upcomingDeadlines.length,
        totalRevenue,
        completionRate: Math.round(avgCompletion)
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'in_progress':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'on_hold':
        return 'bg-yellow-500';
      case 'planning':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/projects')}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Projects</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.activeProjects}</p>
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>View all projects</span>
              <ChevronRight className="h-3 w-3 ml-auto" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/tasks')}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overdue Tasks</p>
                <p className="text-2xl font-bold text-red-600">{metrics.overdueTasks}</p>
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              <span>Needs attention</span>
              <ChevronRight className="h-3 w-3 ml-auto" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/tasks')}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Calendar className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due This Week</p>
                <p className="text-2xl font-bold text-yellow-600">{metrics.upcomingDeadlines}</p>
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm text-muted-foreground">
              <Target className="h-3 w-3 mr-1" />
              <span>Plan ahead</span>
              <ChevronRight className="h-3 w-3 ml-auto" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/financial')}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Project Value</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.totalRevenue)}</p>
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm text-muted-foreground">
              <BarChart3 className="h-3 w-3 mr-1" />
              <span>View financials</span>
              <ChevronRight className="h-3 w-3 ml-auto" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="projects">Active Projects</TabsTrigger>
          <TabsTrigger value="tasks">Upcoming Tasks</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Active Projects</h3>
            <Button onClick={() => navigate('/projects/new')} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
          <div className="grid gap-4">
            {projects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/project/${project.id}`)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(project.status)}`}></div>
                      <div>
                        <h4 className="font-medium">{project.name}</h4>
                        {project.client_name && (
                          <p className="text-sm text-muted-foreground">{project.client_name}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {project.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{project.completion_percentage || 0}%</span>
                    </div>
                    <Progress value={project.completion_percentage || 0} className="h-2" />
                    
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Budget: {formatCurrency(project.budget || 0)}</span>
                      <span>Due: {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'TBD'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {projects.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Active Projects</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start by creating your first project
                  </p>
                  <Button onClick={() => navigate('/projects/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Upcoming Tasks</h3>
            <Button onClick={() => navigate('/tasks/new')} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
          <div className="space-y-3">
            {tasks.map((task) => (
              <Card key={task.id} className="hover:shadow-sm transition-shadow cursor-pointer"
                    onClick={() => navigate(`/tasks/${task.id}`)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {task.status === 'completed' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <h4 className="font-medium">{task.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {task.projects?.name || 'No project'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getPriorityColor(task.priority)} variant="outline">
                        {task.priority}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {tasks.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Upcoming Tasks</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    All caught up! Create a new task or check completed ones.
                  </p>
                  <Button onClick={() => navigate('/tasks/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Task
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Project Completion</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Average Completion</span>
                    <span className="font-medium">{metrics.completionRate}%</span>
                  </div>
                  <Progress value={metrics.completionRate} className="h-3" />
                  <div className="text-sm text-muted-foreground">
                    Across {metrics.activeProjects} active projects
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Quick Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => navigate('/projects/new')} className="h-16 flex-col">
                    <Building2 className="h-5 w-5 mb-1" />
                    <span className="text-xs">New Project</span>
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/tasks/new')} className="h-16 flex-col">
                    <FileText className="h-5 w-5 mb-1" />
                    <span className="text-xs">New Task</span>
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/daily-reports')} className="h-16 flex-col">
                    <Calendar className="h-5 w-5 mb-1" />
                    <span className="text-xs">Daily Report</span>
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/financial')} className="h-16 flex-col">
                    <DollarSign className="h-5 w-5 mb-1" />
                    <span className="text-xs">Financials</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};