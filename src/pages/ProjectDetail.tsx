import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import InvoiceGenerator from '@/components/InvoiceGenerator';
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  MapPin, 
  User, 
  Building2,
  Clock,
  Plus,
  Edit,
  BarChart3,
  FileText,
  Users,
  AlertTriangle,
  Package,
  Wrench
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  client_name: string;
  client_email: string;
  site_address: string;
  status: string;
  completion_percentage: number;
  budget: number;
  actual_hours: number;
  estimated_hours: number;
  start_date: string;
  end_date: string;
  project_type: string;
  permit_numbers: string[];
  created_at: string;
}

interface Phase {
  id: string;
  name: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string;
  estimated_budget: number;
  actual_cost: number;
  order_index: number;
}

interface Task {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  completion_percentage: number;
  estimated_hours: number;
  actual_hours: number;
  due_date: string;
  assigned_to: string;
  phase_id: string;
}

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingProject, setLoadingProject] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Dialog states
  const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false);
  const [createMaterialDialogOpen, setCreateMaterialDialogOpen] = useState(false);
  const [createReportDialogOpen, setCreateReportDialogOpen] = useState(false);
  const [editClientDialogOpen, setEditClientDialogOpen] = useState(false);
  const [createInvoiceDialogOpen, setCreateInvoiceDialogOpen] = useState(false);
  
  // Form states
  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    estimated_hours: 0,
    due_date: '',
    completion_percentage: 0
  });
  
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    description: '',
    category: '',
    unit: '',
    unit_cost: 0,
    quantity_needed: 0,
    supplier_name: ''
  });
  
  const [newReport, setNewReport] = useState({
    work_performed: '',
    crew_count: 0,
    weather_conditions: '',
    materials_delivered: '',
    equipment_used: '',
    delays_issues: '',
    safety_incidents: ''
  });
  
  const [editedClient, setEditedClient] = useState({
    client_name: '',
    client_email: ''
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    if (!loading && user && userProfile && !userProfile.company_id) {
      navigate('/setup');
    }
    
    if (projectId && userProfile?.company_id) {
      loadProjectData();
      setEditedClient({
        client_name: project?.client_name || '',
        client_email: project?.client_email || ''
      });
    }
  }, [projectId, user, userProfile, loading, navigate]);

  // CRUD handlers
  const handleCreateTask = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...newTask,
          project_id: projectId,
          company_id: userProfile?.company_id,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      setTasks(prev => [data, ...prev]);
      setCreateTaskDialogOpen(false);
      setNewTask({
        name: '',
        description: '',
        priority: 'medium',
        status: 'todo',
        estimated_hours: 0,
        due_date: '',
        completion_percentage: 0
      });

      toast({
        title: "Task created",
        description: "New task has been added to the project."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error creating task",
        description: error.message
      });
    }
  };

  const handleCreateDailyReport = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_reports')
        .insert({
          ...newReport,
          project_id: projectId,
          company_id: userProfile?.company_id,
          created_by: user?.id,
          date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) throw error;

      setCreateReportDialogOpen(false);
      setNewReport({
        work_performed: '',
        crew_count: 0,
        weather_conditions: '',
        materials_delivered: '',
        equipment_used: '',
        delays_issues: '',
        safety_incidents: ''
      });

      toast({
        title: "Daily report created",
        description: "Daily report has been submitted successfully."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error creating daily report",
        description: error.message
      });
    }
  };

  const handleUpdateClientInfo = async () => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          client_name: editedClient.client_name,
          client_email: editedClient.client_email
        })
        .eq('id', projectId);

      if (error) throw error;

      setProject(prev => prev ? {
        ...prev,
        client_name: editedClient.client_name,
        client_email: editedClient.client_email
      } : null);

      setEditClientDialogOpen(false);

      toast({
        title: "Client information updated",
        description: "Client details have been updated successfully."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating client info",
        description: error.message
      });
    }
  };

  const navigateToMaterials = () => {
    navigate('/materials', { state: { projectFilter: projectId } });
  };

  const navigateToDailyReports = () => {
    navigate('/daily-reports', { state: { projectFilter: projectId } });
  };

  const navigateToTeamManagement = () => {
    navigate('/team');
  };

  const loadProjectData = async () => {
    try {
      setLoadingProject(true);
      
      // Load project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Load project phases
      const { data: phasesData, error: phasesError } = await supabase
        .from('project_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index', { ascending: true });

      if (phasesError) throw phasesError;
      setPhases(phasesData || []);

      // Load project tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

    } catch (error: any) {
      console.error('Error loading project:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load project details"
      });
    } finally {
      setLoadingProject(false);
    }
  };

  if (loading || loadingProject) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Project not found</p>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'in_progress':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'on_hold':
        return 'outline';
      case 'planning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-xl font-semibold">{project.name}</h1>
                <p className="text-sm text-muted-foreground">{project.client_name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={getStatusColor(project.status)}>
                {project.status.replace('_', ' ')}
              </Badge>
              <Button size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit Project
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8 h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="dailyreports">Daily Reports</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="invoicing">Invoicing</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Project Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Progress</p>
                      <p className="text-2xl font-bold">{project.completion_percentage}%</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-construction-blue" />
                  </div>
                  <Progress value={project.completion_percentage} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Budget</p>
                      <p className="text-2xl font-bold">${project.budget?.toLocaleString() || 'N/A'}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-construction-blue" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Hours</p>
                      <p className="text-2xl font-bold">{project.actual_hours || 0}</p>
                      <p className="text-xs text-muted-foreground">of {project.estimated_hours || 0} est.</p>
                    </div>
                    <Clock className="h-8 w-8 text-construction-blue" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Tasks</p>
                      <p className="text-2xl font-bold">{tasks.length}</p>
                      <p className="text-xs text-muted-foreground">
                        {tasks.filter(t => t.status === 'completed').length} completed
                      </p>
                    </div>
                    <FileText className="h-8 w-8 text-construction-blue" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Project Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Project Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                      <p className="text-sm">{project.project_type?.replace('_', ' ') || 'Custom'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                      <p className="text-sm">{project.status.replace('_', ' ')}</p>
                    </div>
                  </div>
                  
                  {project.site_address && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Site Address</Label>
                      <p className="text-sm flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {project.site_address}
                      </p>
                    </div>
                  )}
                  
                  {project.description && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                      <p className="text-sm">{project.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Timeline & Contacts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Start Date</Label>
                      <p className="text-sm flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">End Date</Label>
                      <p className="text-sm flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Not set'}
                      </p>
                    </div>
                  </div>
                  
                  {project.client_email && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Client Email</Label>
                      <p className="text-sm">{project.client_email}</p>
                    </div>
                  )}
                  
                  {project.permit_numbers && project.permit_numbers.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Permits</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {project.permit_numbers.map((permit) => (
                          <Badge key={permit} variant="outline" className="text-xs">
                            {permit}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="phases" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Project Phases</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Phase
              </Button>
            </div>
            
            {phases.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No phases created yet</p>
                  <Button variant="outline" className="mt-4">
                    Create First Phase
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {phases.map((phase, index) => (
                  <Card key={phase.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center">
                            <span className="bg-construction-blue text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">
                              {index + 1}
                            </span>
                            {phase.name}
                          </CardTitle>
                          {phase.description && (
                            <CardDescription>{phase.description}</CardDescription>
                          )}
                        </div>
                        <Badge variant={getStatusColor(phase.status)}>
                          {phase.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Start Date</Label>
                          <p className="text-sm">
                            {phase.start_date ? new Date(phase.start_date).toLocaleDateString() : 'Not set'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">End Date</Label>
                          <p className="text-sm">
                            {phase.end_date ? new Date(phase.end_date).toLocaleDateString() : 'Not set'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Budget</Label>
                          <p className="text-sm">${phase.estimated_budget?.toLocaleString() || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Actual Cost</Label>
                          <p className="text-sm">${phase.actual_cost?.toLocaleString() || '0'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Tasks</h2>
              <Dialog open={createTaskDialogOpen} onOpenChange={setCreateTaskDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
            
            {tasks.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No tasks created yet</p>
                  <Button variant="outline" className="mt-4">
                    Create First Task
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-medium">{task.name}</h3>
                            <Badge variant={getStatusColor(task.status)}>
                              {task.status.replace('_', ' ')}
                            </Badge>
                            <Badge variant={getPriorityColor(task.priority)}>
                              {task.priority} priority
                            </Badge>
                          </div>
                          
                          {task.description && (
                            <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                          )}
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <Label className="text-muted-foreground">Due Date</Label>
                              <p>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}</p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground">Estimated Hours</Label>
                              <p>{task.estimated_hours || 'N/A'}</p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground">Actual Hours</Label>
                              <p>{task.actual_hours || 0}</p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground">Progress</Label>
                              <div className="flex items-center space-x-2">
                                <Progress value={task.completion_percentage} className="flex-1" />
                                <span className="text-xs">{task.completion_percentage}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="materials" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Project Materials</h2>
              <Button onClick={navigateToMaterials}>
                <Package className="h-4 w-4 mr-2" />
                Manage Materials
              </Button>
            </div>
            
            <Card>
              <CardContent className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Track materials specific to this project</p>
                <Button variant="outline" onClick={navigateToMaterials} className="mt-4">
                  Go to Materials Page
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Progress Tracking</h2>
              <div className="text-sm text-muted-foreground">
                Auto-calculated from task completion
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Overall Progress</CardTitle>
                  <CardDescription>
                    Automatically calculated from {tasks.length} tasks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Project Completion</span>
                        <span className="font-medium">{project.completion_percentage}%</span>
                      </div>
                      <Progress value={project.completion_percentage} />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>
                          {tasks.filter(t => t.status === 'completed').length} of {tasks.length} tasks completed
                        </span>
                        <span>
                          Avg: {tasks.length > 0 ? Math.round(tasks.reduce((sum, t) => sum + t.completion_percentage, 0) / tasks.length) : 0}%
                        </span>
                      </div>
                    </div>
                    
                    {/* Task Breakdown */}
                    <div className="border-t pt-4">
                      <div className="text-sm font-medium mb-2">Task Progress Breakdown</div>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {tasks.slice(0, 5).map((task) => (
                          <div key={task.id} className="flex items-center justify-between text-xs">
                            <span className="truncate flex-1 mr-2">{task.name}</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-16 h-1 bg-secondary rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary transition-all"
                                  style={{ width: `${task.completion_percentage}%` }}
                                />
                              </div>
                              <span className="w-8 text-right">{task.completion_percentage}%</span>
                            </div>
                          </div>
                        ))}
                        {tasks.length > 5 && (
                          <div className="text-xs text-muted-foreground text-center pt-1">
                            +{tasks.length - 5} more tasks
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Progress Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Completed Tasks</span>
                        <span className="text-green-600 font-medium">
                          {tasks.filter(t => t.status === 'completed').length}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>In Progress</span>
                        <span className="text-blue-600 font-medium">
                          {tasks.filter(t => t.status === 'in_progress').length}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Pending</span>
                        <span className="text-orange-600 font-medium">
                          {tasks.filter(t => t.status === 'pending' || t.status === 'todo').length}
                        </span>
                      </div>
                    </div>
                    
                    {tasks.length > 0 && (
                      <div className="border-t pt-4">
                        <div className="text-sm font-medium mb-2">Next Actions</div>
                        {tasks.filter(t => t.status !== 'completed').slice(0, 3).map((task) => (
                          <div key={task.id} className="text-xs text-muted-foreground mb-1">
                            • {task.name} ({task.completion_percentage}%)
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="dailyreports" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Daily Reports</h2>
              <Button onClick={navigateToDailyReports}>
                <FileText className="h-4 w-4 mr-2" />
                Manage Reports
              </Button>
            </div>
            
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Daily progress reports for this project</p>
                <Dialog open={createReportDialogOpen} onOpenChange={setCreateReportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="mt-4">
                      Create Today's Report
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contacts" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Project Contacts</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Client Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Primary Contact</Label>
                    <p className="text-sm">{project.client_name}</p>
                  </div>
                  {project.client_email && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      <p className="text-sm">{project.client_email}</p>
                    </div>
                  )}
                  <Dialog open={editClientDialogOpen} onOpenChange={setEditClientDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Edit className="h-3 w-3 mr-1" />
                        Edit Client Info
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Project Team</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-construction-blue flex items-center justify-center text-white text-xs">
                        PM
                      </div>
                      <div>
                        <p className="text-sm font-medium">Project Manager</p>
                        <p className="text-xs text-muted-foreground">Not assigned</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={navigateToTeamManagement}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Team Member
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="invoicing" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Project Invoicing</h2>
              <Dialog open={createInvoiceDialogOpen} onOpenChange={setCreateInvoiceDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">$0</p>
                    <p className="text-sm text-muted-foreground">Total Invoiced</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">$0</p>
                    <p className="text-sm text-muted-foreground">Outstanding</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">${project.budget?.toLocaleString() || '0'}</p>
                    <p className="text-sm text-muted-foreground">Total Budget</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="text-center py-8">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No invoices created for this project yet</p>
                <Dialog open={createInvoiceDialogOpen} onOpenChange={setCreateInvoiceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="mt-4">
                      Create First Invoice
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Documents</h2>
              <Button onClick={() => navigate(`/project/${projectId}/documents`)}>
                <Plus className="h-4 w-4 mr-2" />
                Manage Documents
              </Button>
            </div>
            
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Click "Manage Documents" to view and upload project files</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Task Dialog */}
      <Dialog open={createTaskDialogOpen} onOpenChange={setCreateTaskDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="task-name">Task Name</Label>
              <Input
                id="task-name"
                value={newTask.name}
                onChange={(e) => setNewTask(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter task name"
              />
            </div>
            <div>
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                value={newTask.description}
                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Task description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="task-priority">Priority</Label>
                <Select value={newTask.priority} onValueChange={(value) => setNewTask(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="task-estimated-hours">Estimated Hours</Label>
                <Input
                  id="task-estimated-hours"
                  type="number"
                  value={newTask.estimated_hours}
                  onChange={(e) => setNewTask(prev => ({ ...prev, estimated_hours: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="task-due-date">Due Date</Label>
              <Input
                id="task-due-date"
                type="date"
                value={newTask.due_date}
                onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setCreateTaskDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTask}>
                Create Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Daily Report Dialog */}
      <Dialog open={createReportDialogOpen} onOpenChange={setCreateReportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Daily Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="work-performed">Work Performed</Label>
              <Textarea
                id="work-performed"
                value={newReport.work_performed}
                onChange={(e) => setNewReport(prev => ({ ...prev, work_performed: e.target.value }))}
                placeholder="Describe the work performed today"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="crew-count">Crew Count</Label>
                <Input
                  id="crew-count"
                  type="number"
                  value={newReport.crew_count}
                  onChange={(e) => setNewReport(prev => ({ ...prev, crew_count: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="weather">Weather Conditions</Label>
                <Input
                  id="weather"
                  value={newReport.weather_conditions}
                  onChange={(e) => setNewReport(prev => ({ ...prev, weather_conditions: e.target.value }))}
                  placeholder="Weather conditions"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="materials-delivered">Materials Delivered</Label>
              <Textarea
                id="materials-delivered"
                value={newReport.materials_delivered}
                onChange={(e) => setNewReport(prev => ({ ...prev, materials_delivered: e.target.value }))}
                placeholder="Materials delivered to site"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="equipment-used">Equipment Used</Label>
              <Textarea
                id="equipment-used"
                value={newReport.equipment_used}
                onChange={(e) => setNewReport(prev => ({ ...prev, equipment_used: e.target.value }))}
                placeholder="Equipment and tools used"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="delays-issues">Delays/Issues</Label>
              <Textarea
                id="delays-issues"
                value={newReport.delays_issues}
                onChange={(e) => setNewReport(prev => ({ ...prev, delays_issues: e.target.value }))}
                placeholder="Any delays or issues encountered"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="safety-incidents">Safety Incidents</Label>
              <Textarea
                id="safety-incidents"
                value={newReport.safety_incidents}
                onChange={(e) => setNewReport(prev => ({ ...prev, safety_incidents: e.target.value }))}
                placeholder="Any safety incidents or observations"
                rows={2}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setCreateReportDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateDailyReport}>
                Submit Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={editClientDialogOpen} onOpenChange={setEditClientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="client-name">Client Name</Label>
              <Input
                id="client-name"
                value={editedClient.client_name}
                onChange={(e) => setEditedClient(prev => ({ ...prev, client_name: e.target.value }))}
                placeholder="Client name"
              />
            </div>
            <div>
              <Label htmlFor="client-email">Client Email</Label>
              <Input
                id="client-email"
                type="email"
                value={editedClient.client_email}
                onChange={(e) => setEditedClient(prev => ({ ...prev, client_email: e.target.value }))}
                placeholder="Client email"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setEditClientDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateClientInfo}>
                Update Client Info
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Invoice Dialog */}
      <Dialog open={createInvoiceDialogOpen} onOpenChange={setCreateInvoiceDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
          </DialogHeader>
          <InvoiceGenerator 
            projectId={projectId} 
            onInvoiceCreated={() => {
              setCreateInvoiceDialogOpen(false);
              toast({
                title: "Invoice created",
                description: "Invoice has been generated successfully."
              });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectDetail;