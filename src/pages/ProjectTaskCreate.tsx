import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { LoadingState } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { projectService, ProjectWithRelations } from '@/services/projectService';
import { toast } from '@/hooks/use-toast';

const ProjectTaskCreate = () => {
  const { projectId } = useParams<{ projectId: string }>();
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
    return <LoadingState message="Loading project..." />;
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
    <DashboardLayout title={`Create Task - ${project.name}`}>
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create New Task</h1>
            <p className="text-muted-foreground">Add a task to {project.name}</p>
          </div>
        </div>

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