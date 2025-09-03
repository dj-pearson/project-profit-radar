import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Metric {
  label: string;
  value: string;
  change: number;
  changeType: 'positive' | 'negative' | 'neutral';
}

export const MetricsWidget = () => {
  const { userProfile } = useAuth();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, [userProfile]);

  const loadMetrics = async () => {
    if (!userProfile?.company_id) return;

    try {
      // Calculate basic metrics
      const { data: projects } = await supabase
        .from('projects')
        .select('status, budget, completion_percentage')
        .eq('company_id', userProfile.company_id);

      const { data: changeOrders } = await supabase
        .from('change_orders')
        .select('amount, project:projects!inner(company_id)')
        .eq('project.company_id', userProfile.company_id);

      const activeProjects = projects?.filter(p => ['active', 'in_progress'].includes(p.status)) || [];
      const completedProjects = projects?.filter(p => p.status === 'completed') || [];
      const totalBudget = projects?.reduce((sum, p) => sum + (p.budget || 0), 0) || 0;
      const avgCompletion = projects?.length 
        ? projects.reduce((sum, p) => sum + (p.completion_percentage || 0), 0) / projects.length 
        : 0;
      const totalChangeOrders = changeOrders?.reduce((sum, co) => sum + (co.amount || 0), 0) || 0;

      const calculatedMetrics: Metric[] = [
        {
          label: 'Active Projects',
          value: activeProjects.length.toString(),
          change: 0, // TODO: Calculate vs last period
          changeType: 'neutral'
        },
        {
          label: 'Avg Completion',
          value: `${Math.round(avgCompletion)}%`,
          change: 0,
          changeType: 'neutral'
        },
        {
          label: 'Total Budget',
          value: `$${(totalBudget / 1000).toFixed(0)}K`,
          change: 0,
          changeType: 'neutral'
        },
        {
          label: 'Change Orders',
          value: `$${(totalChangeOrders / 1000).toFixed(0)}K`,
          change: 0,
          changeType: 'neutral'
        }
      ];

      setMetrics(calculatedMetrics);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'positive': return TrendingUp;
      case 'negative': return TrendingDown;
      default: return Minus;
    }
  };

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading metrics...</div>;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {metrics.map((metric, index) => {
        const ChangeIcon = getChangeIcon(metric.changeType);
        return (
          <div key={index} className="text-center space-y-1">
            <p className="text-lg font-bold">{metric.value}</p>
            <p className="text-xs text-muted-foreground">{metric.label}</p>
            {metric.change !== 0 && (
              <div className={`flex items-center justify-center gap-1 text-xs ${getChangeColor(metric.changeType)}`}>
                <ChangeIcon className="h-3 w-3" />
                <span>{Math.abs(metric.change)}%</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};