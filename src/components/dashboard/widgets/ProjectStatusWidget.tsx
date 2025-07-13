import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Building2, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  completion_percentage: number;
  budget: number;
  client_name: string;
}

export const ProjectStatusWidget = () => {
  const { userProfile } = useAuth();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, [userProfile]);

  const loadProjects = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { data } = await supabase
        .from('projects')
        .select('id, name, status, completion_percentage, budget, client_name')
        .eq('company_id', userProfile.company_id)
        .in('status', ['active', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(3);

      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'in_progress': return 'secondary';
      case 'completed': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading projects...</div>;
  }

  if (projects.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-4">
        No active projects
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <div key={project.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{project.name}</p>
                <p className="text-xs text-muted-foreground truncate">{project.client_name}</p>
              </div>
            </div>
            <Badge variant={getStatusColor(project.status)} className="text-xs">
              {project.status.replace('_', ' ')}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Progress</span>
              <span className="text-xs font-medium">{project.completion_percentage || 0}%</span>
            </div>
            <Progress value={project.completion_percentage || 0} className="h-1" />
          </div>
          
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            <span>${(project.budget || 0).toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
};