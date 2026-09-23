import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { FormSkeleton, LoadingRegion } from '@/components/ui/skeletons';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { projectService, ProjectWithRelations } from '@/services/projectService';
import { toast } from '@/hooks/use-toast';

const ProjectTaskCreate = () => {
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

  const handleTaskCreated = () => {
    toast({
      title: "Task created successfully",
      description: "The task has been added to the project.",
    });
    navigate(`/projects/${projectId}`);
  };

  const handleClose = () => {
    navigate(`/projects/${projectId}`);
  };

  if (loading) {
    return <LoadingRegion label="Loading project" className="container mx-auto p-6"><FormSkeleton /></LoadingRegion>;
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
    <DashboardLayout
      title={`Create Task - ${project.name}`}
      description={<>Add a task to {project.name}</>}
      headerActions={
        <Button variant="ghost" size="sm" onClick={handleClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
      }
    >
      <div className="max-w-2xl mx-auto p-6">
        <CreateTaskDialog 
          isOpen={true}
          onClose={handleClose}
          onTaskCreated={handleTaskCreated}
          projectId={projectId}
        />
      </div>
    </DashboardLayout>
  );
};

export default ProjectTaskCreate;