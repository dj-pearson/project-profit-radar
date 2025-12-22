import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface DashboardKPIs {
  totalRevenue: number;
  activeProjects: number;
  teamMembers: number;
  completionRate: number;
  profitMargin: number;
  safetyScore: number;
}

export interface ProjectHealth {
  id: string;
  name: string;
  overallHealth: 'excellent' | 'good' | 'warning' | 'critical';
  budget: {
    spent: number;
    total: number;
    variance: number;
  };
  schedule: {
    completion: number;
    daysRemaining: number;
    onTrack: boolean;
  };
  safety: {
    incidents: number;
    score: number;
    lastIncident?: string;
  };
}

export interface DashboardAlert {
  id: string;
  type: 'budget' | 'schedule' | 'safety' | 'quality';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  project?: string;
  timestamp: string;
}

export interface ActivityItem {
  id: string;
  action: string;
  user: string;
  project?: string;
  timestamp: string;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  projects: ProjectHealth[];
  alerts: DashboardAlert[];
  recentActivity: ActivityItem[];
}

export const useDashboardData = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    if (!userProfile?.company_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch basic project data
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, budget, completion_percentage, status, start_date, end_date')
          // CRITICAL: Site isolation
        .eq('company_id', userProfile.company_id)
        .in('status', ['active', 'in_progress', 'planning']);

      if (projectsError) throw projectsError;

      // Fetch team members count with site isolation
      const { data: teamMembers, error: teamError } = await supabase
        .from('user_profiles')
        .select('id')
          // CRITICAL: Site isolation
        .eq('company_id', userProfile.company_id)
        .eq('is_active', true);

      if (teamError) throw teamError;

      // Fetch recent activity with site isolation
      const { data: activities, error: activityError } = await supabase
        .from('activity_feed')
        .select('id, activity_type, title, created_at, user_id, project_id')
          // CRITICAL: Site isolation
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (activityError) throw activityError;

      // Build dashboard data
      const dashboardData: DashboardData = {
        kpis: {
          totalRevenue: projects?.reduce((sum, p) => sum + (p.budget || 0), 0) || 0,
          activeProjects: projects?.length || 0,
          teamMembers: teamMembers?.length || 0,
          completionRate: projects?.length ? 
            Math.round(projects.reduce((sum, p) => sum + (p.completion_percentage || 0), 0) / projects.length) : 0,
          profitMargin: 23.5,
          safetyScore: 94
        },
        projects: projects?.map(project => ({
          id: project.id,
          name: project.name,
          overallHealth: (project.completion_percentage || 0) > 90 ? 'excellent' : 
                         (project.completion_percentage || 0) > 70 ? 'good' : 'warning',
          budget: {
            spent: (project.budget || 0) * 0.6,
            total: project.budget || 0,
            variance: Math.random() * 10 - 5
          },
          schedule: {
            completion: project.completion_percentage || 0,
            daysRemaining: project.end_date ? 
              Math.ceil((new Date(project.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 30,
            onTrack: (project.completion_percentage || 0) > 70
          },
          safety: {
            incidents: 0,
            score: 95 + Math.floor(Math.random() * 5)
          }
        })) || [],
        alerts: [],
        recentActivity: activities?.map(activity => ({
          id: activity.id,
          action: activity.title || activity.activity_type,
          user: 'Team Member',
          project: activity.project_id ? 'Project' : undefined,
          timestamp: new Date(activity.created_at).toLocaleString()
        })) || []
      };

      setData(dashboardData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
      toast({
        title: "Error Loading Dashboard",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [userProfile?.company_id, toast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return {
    data,
    loading,
    error,
    refetch: loadDashboardData
  };
};