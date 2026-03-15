import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
import { ProjectHealthBadge } from '@/components/projects/ProjectHealthBadge';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  User,
  Edit,
  Menu,
  Home,
  Building2,
  DollarSign,
  Users,
  Settings,
  BarChart3,
  FileText,
  Calendar,
  FolderOpen,
  Clock,
  ListTodo,
  Receipt,
  MapPin,
  Hash
} from 'lucide-react';
import { AccessiblePageWrapper } from "@/components/accessibility/AccessiblePageWrapper";
import { cn } from '@/lib/utils';

// Tab definitions for the horizontal tab bar
const projectTabs = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'estimates', label: 'Financials', icon: DollarSign },
  { id: 'progress', label: 'Schedule', icon: Calendar },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
  { id: 'tasks', label: 'Team', icon: Users },
  { id: 'dailyreports', label: 'Daily Reports', icon: FileText },
  { id: 'changeorders', label: 'Change Orders', icon: Receipt },
  { id: 'costcodes', label: 'Cost Codes', icon: Hash },
];

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { setNavigationContext } = usePlatform();
  const isMobile = useIsMobile();

  const [project, setProject] = useState<ProjectWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Read active tab from URL hash, default to 'overview'
  const activeTab = location.hash ? location.hash.slice(1) : 'overview';
  const setActiveTab = useCallback((tab: string) => {
    navigate(`${location.pathname}#${tab}`, { replace: true });
  }, [navigate, location.pathname]);

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
    return (
      <AccessiblePageWrapper pageTitle="Loading Project">
        <DashboardLayout title="" hasAccessibleWrapper>
          <div className="space-y-6" role="status" aria-live="polite">
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-20" /></CardContent></Card>)}
            </div>
            <Card><CardContent className="pt-6"><Skeleton className="h-[300px]" /></CardContent></Card>
          </div>
        </DashboardLayout>
      </AccessiblePageWrapper>
    );
  }

  if (!project) {
    return (
      <AccessiblePageWrapper pageTitle="Project Details">
        <DashboardLayout title="Project Not Found" hasAccessibleWrapper>
          <main className="text-center py-8" role="main" aria-label="Project not found">
            <p className="text-muted-foreground">Project not found</p>
            <Button onClick={() => navigate('/projects')} className="mt-4">
              Back to Projects
            </Button>
          </main>
        </DashboardLayout>
      </AccessiblePageWrapper>
    );
  }

  if (isMobile && project) {
    return (
      <AccessiblePageWrapper pageTitle="Project Details">
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
      </AccessiblePageWrapper>
    );
  }

  return (
    <AccessiblePageWrapper pageTitle="Project Details">
    <DashboardLayout title={project.name} hasAccessibleWrapper>
      <main className="flex-1 overflow-auto" role="main" aria-label={`${project.name} project details`}>
        <div className="p-6 space-y-6">
          {/* Header with project summary */}
          <header className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} aria-label="Back to projects">
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
                <h1 className="text-2xl font-bold">{project.name}</h1>
                <ProjectHealthBadge project={project} />
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-1" aria-hidden="true" />
                  <span className="sr-only">Client: </span>{project.client_name}
                </div>
                {project.site_address && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" aria-hidden="true" />
                    <span className="sr-only">Location: </span>{project.site_address}
                  </div>
                )}
                <Badge variant={getStatusColor(project.status)} aria-label={`Status: ${project.status.replace('_', ' ')}`}>
                  {project.status.replace('_', ' ')}
                </Badge>
                {project.start_date && (
                  <div className="flex items-center text-xs">
                    <Calendar className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                    <span className="sr-only">Dates: </span>
                    {new Date(project.start_date).toLocaleDateString()} - {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'TBD'}
                  </div>
                )}
                {project.budget > 0 && (
                  <div className="flex items-center text-xs font-medium">
                    <DollarSign className="h-3.5 w-3.5 mr-0.5" aria-hidden="true" />
                    <span className="sr-only">Budget: </span>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(project.budget)}
                  </div>
                )}
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
              <Button onClick={() => navigate('/projects')} aria-label={`Edit ${project.name}`}>
                <Edit className="h-4 w-4 mr-2" aria-hidden="true" />
                Edit Project
              </Button>
            </div>
          </header>

          {/* Horizontal Tab Navigation */}
          <nav aria-label="Project sections" className="border-b">
            <ScrollArea className="w-full">
              <div className="flex" role="tablist">
                {projectTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`panel-${tab.id}`}
                      onClick={() => setActiveTab(tab.id)}
                      onKeyDown={(e) => {
                        const currentIndex = projectTabs.findIndex(t => t.id === activeTab);
                        if (e.key === 'ArrowRight') {
                          const next = projectTabs[(currentIndex + 1) % projectTabs.length];
                          setActiveTab(next.id);
                        } else if (e.key === 'ArrowLeft') {
                          const prev = projectTabs[(currentIndex - 1 + projectTabs.length) % projectTabs.length];
                          setActiveTab(prev.id);
                        }
                      }}
                      className={cn(
                        "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                        "hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:border-muted-foreground/30"
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {tab.label}
                    </button>
                  );
                })}
                {/* "More" button for sidebar access to all sections */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 transition-colors"
                  aria-label="More project sections"
                >
                  <Menu className="h-4 w-4" aria-hidden="true" />
                  More
                </button>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </nav>

          {/* Full sidebar in a Sheet for accessing all 18 sections */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="right" className="w-80 p-0" aria-label="All project sections">
              <div className="p-4 border-b">
                <h2 className="font-semibold">All Sections</h2>
                <p className="text-xs text-muted-foreground">{project.name}</p>
              </div>
              <ProjectSubSidebar
                activeTab={activeTab}
                onTabChange={(tab) => {
                  setActiveTab(tab);
                  setSidebarOpen(false);
                }}
              />
            </SheetContent>
          </Sheet>

          {/* AI Insights - Show on overview tab */}
          {activeTab === 'overview' && (
            <section className="mb-6" aria-label="AI-powered project insights">
              <AIProjectInsights projectId={project.id} />
            </section>
          )}

          {/* Tab Content Panel */}
          <section
            id={`panel-${activeTab}`}
            role="tabpanel"
            aria-label={`Project ${activeTab} content`}
          >
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <ProjectContent
                project={project}
                activeTab={activeTab}
                onNavigate={navigate}
              />
            </Suspense>
          </section>
        </div>
      </main>
    </DashboardLayout>
    </AccessiblePageWrapper>
  );
};

export default ProjectDetail;