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
    <div className="space-y-3 sm:space-y-4">
      {projects.map((project) => (
        <div key={project.id} className="p-3 sm:p-4 bg-muted/30 rounded-lg border border-border/50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-base font-medium text-foreground truncate leading-tight">{project.name}</p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">{project.client_name}</p>
              </div>
            </div>
            <Badge variant={getStatusColor(project.status)} className="text-xs sm:text-sm self-start sm:self-center shrink-0">
              {project.status.replace('_', ' ')}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-muted-foreground font-medium">Progress</span>
              <span className="text-xs sm:text-sm font-semibold text-foreground">{project.completion_percentage || 0}%</span>
            </div>
            <Progress value={project.completion_percentage || 0} className="h-2 sm:h-2.5" />
          </div>
          
          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
            <span className="font-medium">${(project.budget || 0).toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
};