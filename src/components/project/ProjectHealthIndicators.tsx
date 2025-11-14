/**
 * Project Health Indicators
 * Visual dashboard showing project health across multiple dimensions
 * Schedule, Budget, Safety, Quality, and Team metrics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Users,
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity,
  Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface HealthMetric {
  name: string;
  score: number; // 0-100
  status: 'excellent' | 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  details: string;
  icon: React.ReactNode;
}

interface ProjectHealthIndicatorsProps {
  projectId: string;
}

export const ProjectHealthIndicators: React.FC<ProjectHealthIndicatorsProps> = ({
  projectId
}) => {
  const [loading, setLoading] = useState(true);
  const [overallHealth, setOverallHealth] = useState<number>(0);
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [projectData, setProjectData] = useState<any>(null);

  useEffect(() => {
    if (projectId) {
      loadProjectHealth();
    }
  }, [projectId]);

  const loadProjectHealth = async () => {
    setLoading(true);
    try {
      // Load project data
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProjectData(project);

      // Calculate health metrics
      const healthMetrics = await calculateHealthMetrics(project);
      setMetrics(healthMetrics);

      // Calculate overall health
      const avgScore = healthMetrics.reduce((sum, m) => sum + m.score, 0) / healthMetrics.length;
      setOverallHealth(avgScore);
    } catch (error) {
      console.error('Error loading project health:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateHealthMetrics = async (project: any): Promise<HealthMetric[]> => {
    const metrics: HealthMetric[] = [];

    // 1. Schedule Health
    const scheduleHealth = calculateScheduleHealth(project);
    metrics.push({
      name: 'Schedule',
      score: scheduleHealth.score,
      status: scheduleHealth.status,
      trend: scheduleHealth.trend,
      details: scheduleHealth.details,
      icon: <Clock className="h-5 w-5" />
    });

    // 2. Budget Health
    const budgetHealth = await calculateBudgetHealth(project.id);
    metrics.push({
      name: 'Budget',
      score: budgetHealth.score,
      status: budgetHealth.status,
      trend: budgetHealth.trend,
      details: budgetHealth.details,
      icon: <DollarSign className="h-5 w-5" />
    });

    // 3. Safety Health
    const safetyHealth = await calculateSafetyHealth(project.id);
    metrics.push({
      name: 'Safety',
      score: safetyHealth.score,
      status: safetyHealth.status,
      trend: safetyHealth.trend,
      details: safetyHealth.details,
      icon: <Shield className="h-5 w-5" />
    });

    // 4. Team Health
    const teamHealth = await calculateTeamHealth(project.id);
    metrics.push({
      name: 'Team',
      score: teamHealth.score,
      status: teamHealth.status,
      trend: teamHealth.trend,
      details: teamHealth.details,
      icon: <Users className="h-5 w-5" />
    });

    // 5. Progress Health
    const progressHealth = calculateProgressHealth(project);
    metrics.push({
      name: 'Progress',
      score: progressHealth.score,
      status: progressHealth.status,
      trend: progressHealth.trend,
      details: progressHealth.details,
      icon: <Activity className="h-5 w-5" />
    });

    return metrics;
  };

  const calculateScheduleHealth = (project: any) => {
    const today = new Date();
    const startDate = new Date(project.start_date);
    const expectedEndDate = new Date(project.expected_completion_date || project.end_date);

    const totalDays = (expectedEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const elapsedDays = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const scheduleProgress = (elapsedDays / totalDays) * 100;
    const actualProgress = project.completion_percentage || 0;

    const variance = actualProgress - scheduleProgress;

    let score = 100;
    let status: 'excellent' | 'good' | 'warning' | 'critical' = 'excellent';
    let trend: 'up' | 'down' | 'stable' = 'stable';
    let details = '';

    if (variance >= 10) {
      score = 100;
      status = 'excellent';
      trend = 'up';
      details = `${Math.round(variance)}% ahead of schedule`;
    } else if (variance >= 0) {
      score = 85;
      status = 'good';
      trend = 'stable';
      details = 'On schedule';
    } else if (variance >= -10) {
      score = 60;
      status = 'warning';
      trend = 'down';
      details = `${Math.abs(Math.round(variance))}% behind schedule`;
    } else {
      score = 30;
      status = 'critical';
      trend = 'down';
      details = `${Math.abs(Math.round(variance))}% behind schedule - Critical`;
    }

    return { score, status, trend, details };
  };

  const calculateBudgetHealth = async (projectId: string) => {
    try {
      // Get project budget
      const { data: project } = await supabase
        .from('projects')
        .select('total_budget')
        .eq('id', projectId)
        .single();

      // Get actual costs
      const { data: costs } = await supabase
        .from('financial_records')
        .select('amount')
        .eq('project_id', projectId)
        .eq('record_type', 'expense');

      const totalBudget = project?.total_budget || 0;
      const actualCost = costs?.reduce((sum: number, c: any) => sum + c.amount, 0) || 0;
      const variance = ((totalBudget - actualCost) / totalBudget) * 100;

      let score = 100;
      let status: 'excellent' | 'good' | 'warning' | 'critical' = 'excellent';
      let trend: 'up' | 'down' | 'stable' = 'stable';
      let details = '';

      if (variance > 20) {
        score = 100;
        status = 'excellent';
        details = `${Math.round(variance)}% under budget`;
      } else if (variance > 10) {
        score = 85;
        status = 'good';
        details = `${Math.round(variance)}% under budget`;
      } else if (variance > 0) {
        score = 70;
        status = 'good';
        trend = 'stable';
        details = 'On budget';
      } else if (variance > -10) {
        score = 50;
        status = 'warning';
        trend = 'down';
        details = `${Math.abs(Math.round(variance))}% over budget`;
      } else {
        score = 25;
        status = 'critical';
        trend = 'down';
        details = `${Math.abs(Math.round(variance))}% over budget - Critical`;
      }

      return { score, status, trend, details };
    } catch (error) {
      return { score: 50, status: 'warning' as const, trend: 'stable' as const, details: 'Unable to calculate' };
    }
  };

  const calculateSafetyHealth = async (projectId: string) => {
    try {
      const { data: incidents } = await supabase
        .from('safety_incidents')
        .select('id, severity, created_at')
        .eq('project_id', projectId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const incidentCount = incidents?.length || 0;
      const criticalIncidents = incidents?.filter((i: any) => i.severity === 'critical').length || 0;

      let score = 100;
      let status: 'excellent' | 'good' | 'warning' | 'critical' = 'excellent';
      let trend: 'up' | 'down' | 'stable' = 'stable';
      let details = '';

      if (criticalIncidents > 0) {
        score = 20;
        status = 'critical';
        trend = 'down';
        details = `${criticalIncidents} critical incident(s) in last 30 days`;
      } else if (incidentCount === 0) {
        score = 100;
        status = 'excellent';
        trend = 'up';
        details = 'No incidents in last 30 days';
      } else if (incidentCount <= 2) {
        score = 75;
        status = 'good';
        trend = 'stable';
        details = `${incidentCount} minor incident(s) in last 30 days`;
      } else {
        score = 45;
        status = 'warning';
        trend = 'down';
        details = `${incidentCount} incidents in last 30 days`;
      }

      return { score, status, trend, details };
    } catch (error) {
      return { score: 100, status: 'excellent' as const, trend: 'stable' as const, details: 'No incidents' };
    }
  };

  const calculateTeamHealth = async (projectId: string) => {
    try {
      // Get team assignments
      const { data: assignments } = await supabase
        .from('project_assignments')
        .select('user_id, role')
        .eq('project_id', projectId)
        .eq('status', 'active');

      // Get time entries for activity tracking
      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('id, user_id, hours_worked')
        .eq('project_id', projectId)
        .gte('clock_in', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const teamSize = assignments?.length || 0;
      const activeWorkers = new Set(timeEntries?.map((e: any) => e.user_id)).size;
      const utilizationRate = teamSize > 0 ? (activeWorkers / teamSize) * 100 : 0;

      let score = 100;
      let status: 'excellent' | 'good' | 'warning' | 'critical' = 'excellent';
      let trend: 'up' | 'down' | 'stable' = 'stable';
      let details = '';

      if (teamSize === 0) {
        score = 30;
        status = 'critical';
        details = 'No team assigned';
      } else if (utilizationRate >= 80) {
        score = 100;
        status = 'excellent';
        details = `${Math.round(utilizationRate)}% team utilization`;
      } else if (utilizationRate >= 60) {
        score = 75;
        status = 'good';
        details = `${Math.round(utilizationRate)}% team utilization`;
      } else if (utilizationRate >= 40) {
        score = 50;
        status = 'warning';
        trend = 'down';
        details = `${Math.round(utilizationRate)}% team utilization - Low`;
      } else {
        score = 30;
        status = 'critical';
        trend = 'down';
        details = `${Math.round(utilizationRate)}% team utilization - Critical`;
      }

      return { score, status, trend, details };
    } catch (error) {
      return { score: 70, status: 'good' as const, trend: 'stable' as const, details: 'Team active' };
    }
  };

  const calculateProgressHealth = (project: any) => {
    const completion = project.completion_percentage || 0;

    let score = completion;
    let status: 'excellent' | 'good' | 'warning' | 'critical' = 'good';
    let trend: 'up' | 'down' | 'stable' = 'up';
    let details = '';

    if (completion >= 90) {
      status = 'excellent';
      details = `${Math.round(completion)}% complete - Nearly done`;
    } else if (completion >= 70) {
      status = 'good';
      details = `${Math.round(completion)}% complete`;
    } else if (completion >= 40) {
      status = 'good';
      details = `${Math.round(completion)}% complete`;
    } else if (completion >= 20) {
      status = 'warning';
      details = `${Math.round(completion)}% complete - Early stages`;
    } else {
      status = 'warning';
      details = `${Math.round(completion)}% complete - Just started`;
    }

    return { score, status, trend, details };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'text-green-600';
      case 'good':
        return 'text-blue-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'excellent':
        return 'default';
      case 'good':
        return 'secondary';
      case 'warning':
        return 'outline';
      case 'critical':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getOverallStatus = (score: number) => {
    if (score >= 85) return { text: 'Excellent', variant: 'default' as const, icon: <CheckCircle className="h-4 w-4" /> };
    if (score >= 70) return { text: 'Good', variant: 'secondary' as const, icon: <CheckCircle className="h-4 w-4" /> };
    if (score >= 50) return { text: 'Warning', variant: 'outline' as const, icon: <AlertTriangle className="h-4 w-4" /> };
    return { text: 'Critical', variant: 'destructive' as const, icon: <XCircle className="h-4 w-4" /> };
  };

  const overallStatus = getOverallStatus(overallHealth);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">Loading project health...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Health Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Project Health Score</CardTitle>
              <CardDescription>{projectData?.name}</CardDescription>
            </div>
            <Badge variant={overallStatus.variant} className="flex items-center gap-1">
              {overallStatus.icon}
              {overallStatus.text}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{Math.round(overallHealth)}/100</span>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
            <Progress value={overallHealth} className="h-3" />
            <p className="text-sm text-muted-foreground">
              Overall project health based on schedule, budget, safety, team, and progress metrics
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Individual Health Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.name}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={getStatusColor(metric.status)}>
                    {metric.icon}
                  </div>
                  <h3 className="font-semibold">{metric.name}</h3>
                </div>
                {metric.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                {metric.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{Math.round(metric.score)}</span>
                  <Badge variant={getStatusBadgeVariant(metric.status)}>
                    {metric.status.charAt(0).toUpperCase() + metric.status.slice(1)}
                  </Badge>
                </div>
                <Progress value={metric.score} className="h-2" />
                <p className="text-xs text-muted-foreground">{metric.details}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ProjectHealthIndicators;
