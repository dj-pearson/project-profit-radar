import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ProjectCommunication } from '@/components/communication/ProjectCommunication';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Camera,
  CheckCircle2,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  completion_percentage: number;
  budget: number;
  start_date: string;
  end_date: string;
  site_address: string;
}

interface ChangeOrder {
  id: string;
  change_order_number: string;
  title: string;
  description: string;
  amount: number;
  status: string;
  client_approved: boolean;
  created_at: string;
}

interface DailyReport {
  id: string;
  date: string;
  work_performed: string;
  crew_count: number;
  weather_conditions: string;
  photos: string[];
}

const ClientPortal = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    if (!loading && user && userProfile && !userProfile.company_id) {
      navigate('/setup');
    }
    
    // Check role permissions - only client_portal role should access this
    if (!loading && userProfile && userProfile.role !== 'client_portal') {
      navigate('/dashboard');
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "This portal is only accessible to clients."
      });
      return;
    }
    
    if (userProfile?.company_id) {
      loadClientData();
    }
  }, [user, userProfile, loading, navigate]);

  const loadClientData = async () => {
    try {
      setLoadingData(true);
      
      // Load projects where user might be the client
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('client_email', user?.email) // Assuming client email matches user email
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);
      
      if (projectsData && projectsData.length > 0) {
        setSelectedProject(projectsData[0]);
        await loadProjectDetails(projectsData[0].id);
      }

    } catch (error: any) {
      console.error('Error loading client data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load project data"
      });
    } finally {
      setLoadingData(false);
    }
  };

  const loadProjectDetails = async (projectId: string) => {
    try {
      // Load change orders for the project
      const { data: changeOrdersData, error: changeOrdersError } = await supabase.functions.invoke('change-orders', {
        method: 'GET',
        body: { path: 'list', project_id: projectId }
      });

      if (!changeOrdersError) {
        setChangeOrders(changeOrdersData.changeOrders || []);
      }

      // Load daily reports for the project
      const { data: reportsData, error: reportsError } = await supabase.functions.invoke('daily-reports', {
        method: 'GET',
        body: { path: 'list', project_id: projectId }
      });

      if (!reportsError) {
        setDailyReports(reportsData.dailyReports || []);
      }

    } catch (error: any) {
      console.error('Error loading project details:', error);
    }
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    loadProjectDetails(project.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'active':
      case 'in_progress':
        return 'bg-blue-500';
      case 'on_hold':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your projects...</p>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <DashboardLayout title="Client Portal">
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Projects Found</h3>
            <p className="text-muted-foreground">
              No projects are associated with your account. Please contact your contractor for access.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Client Portal">
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Project Selector */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Your Projects</CardTitle>
                <CardDescription>Select a project to view details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {projects.map((project) => (
                  <Button
                    key={project.id}
                    variant={selectedProject?.id === project.id ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => handleProjectSelect(project)}
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    {project.name}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Project Details */}
          <div className="lg:col-span-3">
            {selectedProject && (
              <div className="space-y-6">
                {/* Project Overview */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{selectedProject.name}</CardTitle>
                        <CardDescription>{selectedProject.description}</CardDescription>
                      </div>
                      <Badge className={getStatusColor(selectedProject.status)}>
                        {selectedProject.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Project Budget</p>
                        <p className="text-lg font-semibold">{formatCurrency(selectedProject.budget || 0)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Site Address</p>
                        <p className="text-sm">{selectedProject.site_address || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                        <p className="text-sm">
                          {selectedProject.start_date 
                            ? new Date(selectedProject.start_date).toLocaleDateString()
                            : 'Not scheduled'
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Target Completion</p>
                        <p className="text-sm">
                          {selectedProject.end_date 
                            ? new Date(selectedProject.end_date).toLocaleDateString()
                            : 'TBD'
                          }
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-muted-foreground">Progress</p>
                        <p className="text-sm font-medium">{selectedProject.completion_percentage || 0}%</p>
                      </div>
                      <Progress value={selectedProject.completion_percentage || 0} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                {/* Tabs for different sections */}
                <Tabs defaultValue="progress" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="progress">Progress Updates</TabsTrigger>
                    <TabsTrigger value="change-orders">Change Orders</TabsTrigger>
                    <TabsTrigger value="communication">Communication</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                  </TabsList>

                  <TabsContent value="progress" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Daily Progress Reports</CardTitle>
                        <CardDescription>Recent work performed on your project</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {dailyReports.length === 0 ? (
                          <div className="text-center py-8">
                            <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-muted-foreground">No progress reports available</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {dailyReports.slice(0, 5).map((report) => (
                              <div key={report.id} className="border-l-4 border-construction-blue pl-4">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="font-medium">{new Date(report.date).toLocaleDateString()}</p>
                                  <Badge variant="outline">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {report.crew_count} crew
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {report.work_performed}
                                </p>
                                {report.weather_conditions && (
                                  <p className="text-xs text-muted-foreground">
                                    Weather: {report.weather_conditions}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="change-orders" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Change Orders</CardTitle>
                        <CardDescription>Project modifications requiring your approval</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {changeOrders.length === 0 ? (
                          <div className="text-center py-8">
                            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                            <p className="text-muted-foreground">No change orders at this time</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {changeOrders.map((order) => (
                              <div key={order.id} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <h4 className="font-medium">{order.title}</h4>
                                    <Badge variant="outline">#{order.change_order_number}</Badge>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {order.client_approved ? (
                                      <Badge className="bg-green-500">Approved</Badge>
                                    ) : (
                                      <Badge variant="secondary">
                                        <Clock className="h-3 w-3 mr-1" />
                                        Pending Approval
                                      </Badge>
                                    )}
                                    <Badge variant="outline">{formatCurrency(order.amount)}</Badge>
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">
                                  {order.description}
                                </p>
                                {!order.client_approved && (
                                  <div className="flex space-x-2">
                                    <Button size="sm" className="bg-green-500 hover:bg-green-600">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Approve
                                    </Button>
                                    <Button size="sm" variant="outline">
                                      Request Changes
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="communication" className="space-y-4">
                    <ProjectCommunication 
                      projectId={selectedProject.id}
                      userType="client"
                    />
                  </TabsContent>

                  <TabsContent value="documents" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Project Documents</CardTitle>
                        <CardDescription>Plans, permits, and project files</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8">
                          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground">Document access coming soon</p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ClientPortal;