import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoadingState } from '@/components/ui/loading-spinner';
import { toast } from '@/hooks/use-toast';
import { projectService, ProjectWithRelations } from '@/services/projectService';
import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  MapPin,
  User,
  Edit,
  Package,
  FileText,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<ProjectWithRelations | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId]);

  const loadProject = async (projectId: string) => {
    try {
      setLoading(true);
      const data = await projectService.getProject(projectId);
      setProject(data);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading project",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

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

  const formatCurrency = (amount: number | null | undefined) => {
    return amount ? `$${amount.toLocaleString()}` : 'N/A';
  };

  if (loading) {
    return <LoadingState message="Loading project details..." />;
  }

  if (!project) {
    return (
      <DashboardLayout title="Project Not Found">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Project not found</p>
          <Button onClick={() => navigate('/projects')} className="mt-4">
            Back to Projects
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={project.name}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold">{project.name}</h1>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                {project.client_name}
              </div>
              <Badge variant={getStatusColor(project.status)}>
                {project.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
          <Button onClick={() => navigate(`/projects/${project.id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Project
          </Button>
        </div>

        {/* Project Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Progress</p>
                  <p className="text-2xl font-bold">{project.completion_percentage}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
              <Progress value={project.completion_percentage} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Budget</p>
                  <p className="text-xl font-bold">{formatCurrency(project.budget)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tasks</p>
                  <p className="text-2xl font-bold">{project.tasks?.length || 0}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Duration</p>
                  <p className="text-lg font-bold">
                    {project.start_date && project.end_date
                      ? `${Math.ceil(
                          (new Date(project.end_date).getTime() - new Date(project.start_date).getTime()) /
                          (1000 * 60 * 60 * 24)
                        )} days`
                      : 'N/A'}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Project Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Client</p>
                <p className="text-sm">{project.client_name}</p>
                {project.client_email && (
                  <p className="text-sm text-muted-foreground">{project.client_email}</p>
                )}
              </div>
              
              {project.site_address && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Location</p>
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 mr-1 mt-0.5 text-muted-foreground" />
                    <p className="text-sm">{project.site_address}</p>
                  </div>
                </div>
              )}

              {project.project_type && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Project Type</p>
                  <p className="text-sm capitalize">{project.project_type.replace('_', ' ')}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-muted-foreground">Timeline</p>
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                  {project.start_date && project.end_date ? (
                    <>
                      {new Date(project.start_date).toLocaleDateString()} - {new Date(project.end_date).toLocaleDateString()}
                    </>
                  ) : (
                    'Not specified'
                  )}
                </div>
              </div>
            </div>

            {project.description && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                <p className="text-sm text-muted-foreground">{project.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabbed Content */}
        <Tabs defaultValue="tasks" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tasks">Tasks ({project.tasks?.length || 0})</TabsTrigger>
            <TabsTrigger value="materials">Materials ({project.materials?.length || 0})</TabsTrigger>
            <TabsTrigger value="documents">Documents ({project.documents?.length || 0})</TabsTrigger>
            <TabsTrigger value="phases">Phases ({project.project_phases?.length || 0})</TabsTrigger>
            <TabsTrigger value="financials">Financials</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Project Tasks</span>
                  <Button size="sm" onClick={() => navigate(`/projects/${project.id}/tasks/new`)}>
                    Add Task
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {project.tasks && project.tasks.length > 0 ? (
                  <div className="space-y-2">
                    {project.tasks.map((task: any) => (
                      <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{task.name}</p>
                          {task.description && (
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                          )}
                        </div>
                        <Badge variant={task.status === 'completed' ? 'secondary' : 'outline'}>
                          {task.status || 'pending'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No tasks created yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="materials" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Materials & Inventory</span>
                  <Button size="sm" onClick={() => navigate(`/projects/${project.id}/materials/new`)}>
                    Add Material
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {project.materials && project.materials.length > 0 ? (
                  <div className="space-y-2">
                    {project.materials.map((material: any) => (
                      <div key={material.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{material.name}</p>
                          {material.description && (
                            <p className="text-sm text-muted-foreground">{material.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No materials added yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Project Documents</span>
                  <Button size="sm" onClick={() => navigate(`/projects/${project.id}/documents/upload`)}>
                    Upload Document
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {project.documents && project.documents.length > 0 ? (
                  <div className="space-y-2">
                    {project.documents.map((document: any) => (
                      <div key={document.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 mr-2 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{document.name}</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">View</Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No documents uploaded yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="phases" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Project Phases</span>
                  <Button size="sm" onClick={() => navigate(`/projects/${project.id}/phases/new`)}>
                    Add Phase
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {project.project_phases && project.project_phases.length > 0 ? (
                  <div className="space-y-2">
                    {project.project_phases.map((phase: any) => (
                      <div key={phase.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{phase.name}</p>
                          {phase.start_date && phase.end_date && (
                            <p className="text-sm text-muted-foreground">
                              {new Date(phase.start_date).toLocaleDateString()} - {new Date(phase.end_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Badge variant={phase.status === 'completed' ? 'secondary' : 'outline'}>
                          {phase.status || 'pending'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No phases defined yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financials" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Job Costs</CardTitle>
                </CardHeader>
                <CardContent>
                  {project.job_costs && project.job_costs.length > 0 ? (
                    <div className="space-y-2">
                      {project.job_costs.map((cost: any) => (
                        <div key={cost.id} className="flex items-center justify-between p-2 border rounded">
                          <span>Job Cost</span>
                          <div className="text-right">
                            <p className="text-sm">Total: {formatCurrency(cost.total_cost)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No cost data available</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Change Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  {project.change_orders && project.change_orders.length > 0 ? (
                    <div className="space-y-2">
                      {project.change_orders.map((order: any) => (
                        <div key={order.id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <p className="font-medium">{order.title}</p>
                            <p className="text-sm text-muted-foreground">{order.status}</p>
                          </div>
                          <p className="font-medium">{formatCurrency(order.amount)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No change orders</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ProjectDetail;