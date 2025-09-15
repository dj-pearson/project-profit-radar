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
import { ProjectSubSidebar } from '@/components/project/ProjectSubSidebar';
import { ProjectContent } from '@/components/project/ProjectContent';
import {
  ArrowLeft,
  User,
  Edit
} from 'lucide-react';

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { setNavigationContext } = usePlatform();
  
  const [project, setProject] = useState<ProjectWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

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