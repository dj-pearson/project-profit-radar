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
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  ArrowLeft,
  User,
  Edit,
  Menu,
  Home,
  Building2,
  DollarSign,
  Users,
  Settings
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
        <main className="text-center py-8" role="main" aria-label="Project not found">
          <p className="text-muted-foreground">Project not found</p>
          <Button onClick={() => navigate('/projects')} className="mt-4">
            Back to Projects
          </Button>
        </main>
      </DashboardLayout>
    );
  }

  if (isMobile && project) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Mobile Header with Menu - Fixed at top */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center justify-between px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/projects-hub')}
              className="h-10 w-10 p-0"
              aria-label="Back to projects"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Button>

            <div className="flex-1 mx-3 min-w-0">
              <h1 className="text-base font-bold truncate">{project.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground truncate flex-shrink">{project.client_name}</span>
                <Badge variant={getStatusColor(project.status)} className="text-xs h-5 flex-shrink-0" aria-label={`Status: ${project.status.replace('_', ' ')}`}>
                  {project.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 w-10 p-0"
                  aria-label="Open project sections menu"
                  aria-expanded={sidebarOpen}
                >
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full p-0 bg-background" aria-label="Project sections navigation">
                {/* Sheet Header with Back Button */}
                <div className="flex items-center gap-3 p-4 border-b bg-muted/20">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarOpen(false)}
                    className="h-10 w-10 p-0"
                    aria-label="Close navigation menu"
                  >
                    <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-base">Project Sections</h2>
                    <p className="text-xs text-muted-foreground truncate">{project.name}</p>
                  </div>
                </div>

                {/* Sub-Sidebar Navigation */}
                <ProjectSubSidebar
                  activeTab={activeTab}
                  onTabChange={(tab) => {
                    setActiveTab(tab);
                    setSidebarOpen(false);
                  }}
                />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="flex-1 px-4 py-4 space-y-4 pb-20" role="main" aria-label={`${project.name} details`}>
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
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav items={[
          { icon: Home, label: 'Home', href: '/dashboard' },
          { icon: Building2, label: 'Projects', href: '/projects-hub' },
          { icon: DollarSign, label: 'Financial', href: '/financial-hub' },
          { icon: Users, label: 'People', href: '/people-hub' },
          { icon: Settings, label: 'Admin', href: '/admin-hub' },
        ]} />
      </div>
    );
  }

  return (
    <DashboardLayout title={project.name}>
      <div className="flex h-full">
        <ProjectSubSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <main className="flex-1 overflow-auto" role="main" aria-label={`${project.name} project details`}>
          <div className="p-6 space-y-6">
            {/* Header */}
            <header className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} aria-label="Back to projects">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <h1 className="text-2xl font-bold">{project.name}</h1>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1" aria-hidden="true" />
                    <span className="sr-only">Client: </span>{project.client_name}
                  </div>
                  <Badge variant={getStatusColor(project.status)} aria-label={`Status: ${project.status.replace('_', ' ')}`}>
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
                <Button onClick={() => navigate(`/projects/${project.id}/edit`)} aria-label={`Edit ${project.name}`}>
                  <Edit className="h-4 w-4 mr-2" aria-hidden="true" />
                  Edit Project
                </Button>
              </div>
            </header>

            {/* AI Insights - Show on overview tab */}
            {activeTab === 'overview' && (
              <section className="mb-6" aria-label="AI-powered project insights">
                <AIProjectInsights projectId={project.id} />
              </section>
            )}

            {/* Dynamic Content */}
            <section aria-label={`Project ${activeTab} content`}>
              <ProjectContent
                project={project}
                activeTab={activeTab}
                onNavigate={navigate}
              />
            </section>
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
};

export default ProjectDetail;