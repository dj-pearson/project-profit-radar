import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoadingState } from '@/components/ui/loading-spinner';
import { toast } from '@/hooks/use-toast';
import { projectService, ProjectWithRelations } from '@/services/projectService';
import { ContextualActions } from '@/components/navigation/ContextualActions';
import { usePlatform } from '@/contexts/PlatformContext';
import { AIProjectInsights } from '@/components/ai/AIProjectInsights';
import { ProjectSubSidebar } from '@/components/project/ProjectSubSidebar';
import { ProjectContent } from '@/components/project/ProjectContent';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobilePageWrapper } from '@/utils/mobileHelpers';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  ArrowLeft,
  User,
  Edit,
  Menu
} from 'lucide-react';

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { setNavigationContext } = usePlatform();
  const isMobile = useIsMobile();
  
  const [project, setProject] = useState<ProjectWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Check role-based access - only allow roles that can view projects
    const allowedRoles = ['root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff', 'accounting'];
    if (userProfile && !allowedRoles.includes(userProfile.role)) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to view project details.",
      });
      navigate('/dashboard');
      return;
    }

    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId, userProfile]);

  const loadProject = async (projectId: string) => {
    try {
      setLoading(true);
      // Pass company_id to enforce access control (null for root_admin)
      const companyId = userProfile?.role !== 'root_admin' ? userProfile?.company_id : undefined;
      const data = await projectService.getProject(projectId, companyId);

      if (!data) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "Project not found or you don't have permission to access it.",
        });
        navigate('/projects');
        return;
      }

      setProject(data);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading project",
        description: error.message,
      });
      navigate('/projects');
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

  if (isMobile) {
    return (
      <DashboardLayout title={project.name}>
        <MobilePageWrapper>
          {/* Mobile Header with Menu */}
          <div className="sticky top-0 z-40 bg-background border-b mb-4 -mx-4 px-4 py-3">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/projects')}
                className="h-9 w-9 p-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              
              <div className="flex-1 mx-3">
                <h1 className="text-base font-bold line-clamp-1">{project.name}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground line-clamp-1">{project.client_name}</span>
                  <Badge variant={getStatusColor(project.status)} className="text-xs h-5">
                    {project.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-9 w-9 p-0"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-full p-0">
                  {/* Sheet Header with Back Button */}
                  <div className="flex items-center gap-3 p-4 border-b">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSidebarOpen(false)}
                      className="h-9 w-9 p-0"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                      <h2 className="font-semibold">Project Sections</h2>
                      <p className="text-xs text-muted-foreground">{project.name}</p>
                    </div>
                  </div>
                  
                  {/* Sub-Sidebar Navigation */}
                  <ProjectSubSidebar 
                    activeTab={activeTab} 
                    onTabChange={(tab) => {
                      setActiveTab(tab);
                      setSidebarOpen(false); // Close after selection
                    }}
                  />
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <div className="space-y-4">
            {/* Contextual Actions - Mobile */}
            <ContextualActions
              context={{
                module: 'projects',
                entityType: 'project',
                entityId: project.id,
                entityData: project
              }}
              className="mb-4"
            />

            {/* AI Insights - Mobile */}
            {activeTab === 'overview' && (
              <div className="mb-4">
                <AIProjectInsights projectId={project.id} />
              </div>
            )}

            {/* Dynamic Content - Mobile */}
            <ProjectContent 
              project={project}
              activeTab={activeTab}
              onNavigate={navigate}
            />
          </div>
        </MobilePageWrapper>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={project.name}>
      <div className="flex h-full">
        <ProjectSubSidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />
        
        <div className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
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
              <div className="flex gap-4">
                <div className="w-64">
                  <ContextualActions
                    context={{
                      module: 'projects',
                      entityType: 'project',
                      entityId: project.id,
                      entityData: project
                    }}
                    className="mb-4"
                  />
                </div>
                <Button onClick={() => navigate(`/projects/${project.id}/edit`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Project
                </Button>
              </div>
            </div>

            {/* AI Insights - Show on overview tab */}
            {activeTab === 'overview' && (
              <div className="mb-6">
                <AIProjectInsights projectId={project.id} />
              </div>
            )}

            {/* Dynamic Content */}
            <ProjectContent 
              project={project}
              activeTab={activeTab}
              onNavigate={navigate}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProjectDetail;