/**
 * Dashboard Data Hook
 * Updated with multi-tenant site_id isolation
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface KPIs {
  activeProjects: number;
  completionRate: number;
  totalBudget: number;
  teamMembers: number;
  totalRevenue?: number;
  profitMargin?: number;
  safetyScore?: number;
}

interface ProjectHealth {
  id: string;
  name: string;
  status?: string;
  completion?: number;
  overallHealth: 'excellent' | 'good' | 'warning' | 'critical';
  budget: {
    spent: number;
    total: number;
    variance: number;
  };
  schedule: {
    completion: number;
    daysRemaining: number;
    daysToDeadline: number;
    onTrack: boolean;
  };
  safety: {
    incidents: number;
    score: number;
    lastIncident?: string;
  };
}

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  action?: string;
  user?: string;
  project?: string;
}

interface Alert {
  id: string;
  type: string;
  message: string;
  severity: string;
  timestamp: string;
  project?: string;
}

interface DashboardData {
  kpis: KPIs;
  projects: ProjectHealth[];
  recentActivity: Activity[];
  alerts?: Alert[];
}

export function useDashboardData() {
  const { userProfile, siteId } = useAuth();
  const [data, setData] = useState<DashboardData>({
    kpis: {
      activeProjects: 0,
      completionRate: 0,
      totalBudget: 0,
      teamMembers: 0,
      totalRevenue: 0,
      profitMargin: 0,
      safetyScore: 100
    },
    projects: [],
    recentActivity: [],
    alerts: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userProfile?.company_id || !siteId) {
      setLoading(false);
      return;
    }

    const loadDashboardData = async () => {
      try {
        setLoading(true);

        // Load projects with site isolation
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('id, name, status, completion_percentage')
          .eq('site_id', siteId)  // CRITICAL: Site isolation
          .eq('company_id', userProfile.company_id)
          .in('status', ['active', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(10);

        if (projectsError) throw projectsError;

        // Load team members count with site isolation
        const { count: teamCount, error: teamError } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('site_id', siteId)  // CRITICAL: Site isolation
          .eq('company_id', userProfile.company_id)
          .eq('is_active', true);

        if (teamError) throw teamError;

        // Calculate KPIs
        const activeProjects = projects?.length || 0;
        const totalCompletion = projects?.reduce((sum, p) => sum + (p.completion_percentage || 0), 0) || 0;
        const completionRate = activeProjects > 0 ? Math.round(totalCompletion / activeProjects) : 0;

        setData({
          kpis: {
            activeProjects,
            completionRate,
            totalBudget: 0,
            teamMembers: teamCount || 0,
            totalRevenue: 0,
            profitMargin: 0,
            safetyScore: 100
          },
          projects: projects?.map(p => ({
            id: p.id,
            name: p.name,
            status: p.status || 'active',
            completion: p.completion_percentage || 0,
            overallHealth: 'good' as const,
            budget: {
              spent: 0,
              total: 100000,
              variance: 0
            },
            schedule: {
              completion: p.completion_percentage || 0,
              daysRemaining: 30,
              daysToDeadline: 30,
              onTrack: true
            },
            safety: {
              incidents: 0,
              score: 100
            }
          })) || [],
          recentActivity: [],
          alerts: []
        });
        setError(null);

      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError(err instanceof Error ? err : new Error('Failed to load dashboard data'));
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [userProfile?.company_id, siteId]);

  const refetch = () => {
    if (userProfile?.company_id && siteId) {
      setLoading(true);
      setError(null);
    }
  };

  return { data, loading, error, refetch };
}
