import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Briefcase, 
  Play, 
  CheckCircle, 
  Clock,
  DollarSign
} from 'lucide-react';

interface ProjectData {
  active: {
    count: number;
    value: number;
    projects: Array<{ name: string; value: number; progress: number }>;
  };
  upcoming: {
    count: number;
    value: number;
    projects: Array<{ name: string; value: number; startDate: string }>;
  };
  completed: {
    count: number;
    value: number;
    thisMonth: number;
  };
}

const ProjectPipeline = () => {
  const { userProfile } = useAuth();
  const [pipelineData, setPipelineData] = useState<ProjectData>({
    active: { count: 0, value: 0, projects: [] },
    upcoming: { count: 0, value: 0, projects: [] },
    completed: { count: 0, value: 0, thisMonth: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile?.company_id) {
      loadPipelineData();
    }
  }, [userProfile?.company_id]);

  const loadPipelineData = async () => {
    try {
      setLoading(true);
      
      const { data: projects, error } = await supabase
        .from('projects')
        .select('id, name, budget, completion_percentage, status, start_date, created_at')
        .eq('company_id', userProfile?.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate this month's date range
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Categorize projects
      const activeProjects = projects?.filter(p => p.status === 'in_progress') || [];
      const upcomingProjects = projects?.filter(p => p.status === 'planned') || [];
      const completedProjects = projects?.filter(p => p.status === 'completed') || [];
      const completedThisMonth = completedProjects.filter(p => 
        new Date(p.created_at) >= thisMonthStart
      );

      const transformedData: ProjectData = {
        active: {
          count: activeProjects.length,
          value: activeProjects.reduce((sum, p) => sum + (parseFloat(String(p.budget)) || 0), 0),
          projects: activeProjects.slice(0, 4).map(p => ({
            name: p.name,
            value: parseFloat(String(p.budget)) || 0,
            progress: p.completion_percentage || 0
          }))
        },
        upcoming: {
          count: upcomingProjects.length,
          value: upcomingProjects.reduce((sum, p) => sum + (parseFloat(String(p.budget)) || 0), 0),
          projects: upcomingProjects.slice(0, 3).map(p => ({
            name: p.name,
            value: parseFloat(String(p.budget)) || 0,
            startDate: p.start_date || p.created_at
          }))
        },
        completed: {
          count: completedProjects.length,
          value: completedProjects.reduce((sum, p) => sum + (parseFloat(String(p.budget)) || 0), 0),
          thisMonth: completedThisMonth.length
        }
      };

      setPipelineData(transformedData);
    } catch (error) {
      console.error('Error loading pipeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPipelineValue = pipelineData.active.value + pipelineData.upcoming.value + pipelineData.completed.value;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Project Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading pipeline data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Project Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pipeline Summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-blue-50 rounded">
            <div className="text-lg font-bold text-blue-600">{pipelineData.active.count}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div className="p-2 bg-orange-50 rounded">
            <div className="text-lg font-bold text-orange-600">{pipelineData.upcoming.count}</div>
            <div className="text-xs text-muted-foreground">Upcoming</div>
          </div>
          <div className="p-2 bg-green-50 rounded">
            <div className="text-lg font-bold text-green-600">{pipelineData.completed.count}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
        </div>

        {/* Total Pipeline Value */}
        <div className="p-3 border rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Pipeline Value</span>
            <span className="font-bold text-lg">${totalPipelineValue.toLocaleString()}</span>
          </div>
        </div>

        {/* Active Projects */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Play className="h-4 w-4 text-blue-500" />
            Active Projects
          </h4>
          {pipelineData.active.projects.map((project, index) => (
            <div key={index} className="p-2 border rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{project.name}</span>
                <span className="text-sm font-bold">${project.value.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Progress</span>
                <span>{project.progress}%</span>
              </div>
              <Progress value={project.progress} className="h-1" />
            </div>
          ))}
        </div>

        {/* Upcoming Projects */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            Upcoming Projects
          </h4>
          {pipelineData.upcoming.projects.slice(0, 2).map((project, index) => (
            <div key={index} className="p-2 border rounded">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{project.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Starts: {new Date(project.startDate).toLocaleDateString()}
                  </div>
                </div>
                <span className="text-sm font-bold">${project.value.toLocaleString()}</span>
              </div>
            </div>
          ))}
          {pipelineData.upcoming.projects.length > 2 && (
            <div className="text-xs text-muted-foreground text-center">
              +{pipelineData.upcoming.projects.length - 2} more upcoming
            </div>
          )}
        </div>

        {/* Completed This Month */}
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm">
              <strong>{pipelineData.completed.thisMonth}</strong> projects completed this month
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectPipeline;