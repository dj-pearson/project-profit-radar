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
  Plus,
  HelpCircle,
  Upload,
  Shield,
  Wrench,
  ClipboardList,
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

interface DeadlineItem {
  id: string;
  title: string;
  type: 'task' | 'rfi' | 'submittal' | 'warranty' | 'permit' | 'bond' | 'crm_task';
  date: string;
  priority: string;
  status: string;
  project_name?: string;
  project_id?: string;
}

interface ClientResponseItem {
  id: string;
  project_id: string;
  project_name: string;
  client_name: string;
  last_client_message_date: string;
  days_without_response: number;
  unread_count: number;
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
  const [deadlineItems, setDeadlineItems] = useState<DeadlineItem[]>([]);
  const [clientResponses, setClientResponses] = useState<ClientResponseItem[]>([]);
  const [responseSort, setResponseSort] = useState<'days' | 'project' | 'client'>('days');
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

      const today = new Date();
      const twoWeeksFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      // Load all upcoming deadlines from various sources
      const deadlines: DeadlineItem[] = [];

      // 1. Tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*, projects(name)')
        .eq('company_id', userProfile?.company_id)
        .gte('due_date', today.toISOString().split('T')[0])
        .lte('due_date', twoWeeksFromNow.toISOString().split('T')[0])
        .neq('status', 'completed');

      tasksData?.forEach(task => {
        deadlines.push({
          id: task.id,
          title: task.name,
          type: 'task',
          date: task.due_date,
          priority: task.priority || 'medium',
          status: task.status,
          project_name: task.projects?.name,
          project_id: task.project_id
        });
      });

      // 2. RFIs
      const { data: rfisData } = await supabase
        .from('rfis')
        .select('*, projects(name)')
        .eq('company_id', userProfile?.company_id)
        .gte('due_date', today.toISOString().split('T')[0])
        .lte('due_date', twoWeeksFromNow.toISOString().split('T')[0])
        .neq('status', 'closed');

      rfisData?.forEach(rfi => {
        deadlines.push({
          id: rfi.id,
          title: `RFI: ${rfi.subject}`,
          type: 'rfi',
          date: rfi.due_date,
          priority: rfi.priority || 'medium',
          status: rfi.status,
          project_name: rfi.projects?.name,
          project_id: rfi.project_id
        });
      });

      // 3. Submittals
      const { data: submittalsData } = await supabase
        .from('submittals')
        .select('*, projects(name)')
        .eq('company_id', userProfile?.company_id)
        .gte('due_date', today.toISOString().split('T')[0])
        .lte('due_date', twoWeeksFromNow.toISOString().split('T')[0])
        .neq('status', 'approved');

      submittalsData?.forEach(submittal => {
        deadlines.push({
          id: submittal.id,
          title: `Submittal: ${submittal.title}`,
          type: 'submittal',
          date: submittal.due_date,
          priority: submittal.priority || 'medium',
          status: submittal.status,
          project_name: submittal.projects?.name,
          project_id: submittal.project_id
        });
      });

      // 4. Warranties expiring
      const { data: warrantiesData } = await supabase
        .from('warranties')
        .select('*, projects(name)')
        .eq('company_id', userProfile?.company_id)
        .gte('warranty_end_date', today.toISOString().split('T')[0])
        .lte('warranty_end_date', twoWeeksFromNow.toISOString().split('T')[0])
        .eq('status', 'active');

      warrantiesData?.forEach(warranty => {
        deadlines.push({
          id: warranty.id,
          title: `Warranty Expiry: ${warranty.item_description}`,
          type: 'warranty',
          date: warranty.warranty_end_date,
          priority: 'medium',
          status: warranty.status,
          project_name: warranty.projects?.name,
          project_id: warranty.project_id
        });
      });

      // 5. Bonds expiring  
      const { data: bondsData } = await supabase
        .from('bonds')
        .select('*, projects(name)')
        .eq('company_id', userProfile?.company_id)
        .gte('expiry_date', today.toISOString().split('T')[0])
        .lte('expiry_date', twoWeeksFromNow.toISOString().split('T')[0])
        .eq('status', 'active');

      bondsData?.forEach(bond => {
        deadlines.push({
          id: bond.id,
          title: `Bond Expiry: ${bond.bond_name}`,
          type: 'bond',
          date: bond.expiry_date,
          priority: 'high',
          status: bond.status,
          project_name: bond.projects?.name,
          project_id: bond.project_id
        });
      });

      // Sort deadlines by date
      deadlines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate metrics
      const activeProjects = projectsData?.filter(p => ['active', 'in_progress'].includes(p.status)) || [];
      const overdueTasks = tasksData?.filter(t => new Date(t.due_date) < new Date() && t.status !== 'completed') || [];
      const upcomingDeadlines = deadlines.filter(d => {
        const dueDate = new Date(d.date);
        const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        return dueDate <= threeDaysFromNow;
      });
      
      const totalRevenue = projectsData?.reduce((sum, p) => sum + (p.budget || 0), 0) || 0;
      const avgCompletion = projectsData?.length > 0 
        ? projectsData.reduce((sum, p) => sum + (p.completion_percentage || 0), 0) / projectsData.length 
        : 0;

      setProjects(projectsData || []);
      setDeadlineItems(deadlines.slice(0, 10));
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

  const getDeadlineTypeIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <ClipboardList className="h-4 w-4" />;
      case 'rfi':
        return <HelpCircle className="h-4 w-4" />;
      case 'submittal':
        return <Upload className="h-4 w-4" />;
      case 'warranty':
        return <Wrench className="h-4 w-4" />;
      case 'permit':
        return <FileText className="h-4 w-4" />;
      case 'bond':
        return <Shield className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getDeadlineTypeColor = (type: string) => {
    switch (type) {
      case 'task':
        return 'text-blue-600';
      case 'rfi':
        return 'text-orange-600';
      case 'submittal':
        return 'text-purple-600';
      case 'warranty':
        return 'text-green-600';
      case 'permit':
        return 'text-red-600';
      case 'bond':
        return 'text-indigo-600';
      default:
        return 'text-gray-600';
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

  const sortedClientResponses = [...clientResponses].sort((a, b) => {
    switch (responseSort) {
      case 'days':
        return b.days_without_response - a.days_without_response;
      case 'project':
        return a.project_name.localeCompare(b.project_name);
      case 'client':
        return a.client_name.localeCompare(b.client_name);
      default:
        return b.days_without_response - a.days_without_response;
    }
  });

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

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/my-tasks')}>
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

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/my-tasks')}>
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
          <TabsTrigger value="deadlines">Upcoming Deadlines</TabsTrigger>
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

        <TabsContent value="deadlines" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Upcoming Deadlines</h3>
            <Button onClick={() => navigate('/my-tasks')} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
          <div className="space-y-3">
            {deadlineItems.map((item) => (
              <Card key={`${item.type}-${item.id}`} className="hover:shadow-sm transition-shadow cursor-pointer"
                    onClick={() => {
                      switch (item.type) {
                        case 'task':
                          navigate('/my-tasks');
                          break;
                        case 'rfi':
                          navigate('/rfis');
                          break;
                        case 'submittal':
                          navigate('/submittals');
                          break;
                        case 'warranty':
                          navigate('/warranty-management');
                          break;
                        case 'bond':
                          navigate('/bond-insurance');
                          break;
                        default:
                          break;
                      }
                    }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`flex items-center space-x-2 ${getDeadlineTypeColor(item.type)}`}>
                        {getDeadlineTypeIcon(item.type)}
                        <div>
                          <h4 className="font-medium">{item.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {item.project_name || 'No project'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getPriorityColor(item.priority)} variant="outline">
                        {item.priority}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(item.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {deadlineItems.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Upcoming Deadlines</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    All caught up! No deadlines in the next two weeks.
                  </p>
                  <Button onClick={() => navigate('/my-tasks')}>
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
                  <Button variant="outline" onClick={() => navigate('/my-tasks')} className="h-16 flex-col">
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