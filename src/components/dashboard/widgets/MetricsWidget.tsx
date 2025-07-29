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
      // Calculate basic metrics from CRM data
      const { data: leads } = await supabase
        .from('leads')
        .select('status, estimated_budget, created_at')
        .eq('company_id', userProfile.company_id);

      const { data: activities } = await supabase
        .from('lead_activities')
        .select('id, created_at')
        .eq('company_id', userProfile.company_id);

      // Calculate current month vs previous month for trends
      const currentDate = new Date();
      const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const previousMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const previousMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

      const currentMonthLeads = leads?.filter(l => new Date(l.created_at) >= currentMonthStart) || [];
      const previousMonthLeads = leads?.filter(l => {
        const date = new Date(l.created_at);
        return date >= previousMonthStart && date <= previousMonthEnd;
      }) || [];

      const currentMonthActivities = activities?.filter(a => new Date(a.created_at) >= currentMonthStart) || [];
      const previousMonthActivities = activities?.filter(a => {
        const date = new Date(a.created_at);
        return date >= previousMonthStart && date <= previousMonthEnd;
      }) || [];

      // Calculate metrics
      const activeLeads = leads?.filter(l => ['new', 'qualified', 'proposal', 'negotiation'].includes(l.status)).length || 0;
      const previousActiveLeads = previousMonthLeads.filter(l => ['new', 'qualified', 'proposal', 'negotiation'].includes(l.status)).length || 0;

      const conversionRate = leads?.length > 0 
        ? (leads.filter(l => l.status === 'closed_won').length / leads.length) * 100 
        : 0;
      const previousConversionRate = previousMonthLeads?.length > 0 
        ? (previousMonthLeads.filter(l => l.status === 'closed_won').length / previousMonthLeads.length) * 100 
        : 0;

      const totalPipeline = leads?.filter(l => ['qualified', 'proposal', 'negotiation'].includes(l.status))
        .reduce((sum, l) => sum + (l.estimated_budget || 0), 0) || 0;
      const previousPipeline = previousMonthLeads?.filter(l => ['qualified', 'proposal', 'negotiation'].includes(l.status))
        .reduce((sum, l) => sum + (l.estimated_budget || 0), 0) || 0;

      const totalActivities = currentMonthActivities.length;
      const previousActivities = previousMonthActivities.length;

      // Calculate percentage changes
      const leadsChange = previousActiveLeads > 0 ? ((activeLeads - previousActiveLeads) / previousActiveLeads) * 100 : 0;
      const conversionChange = previousConversionRate > 0 ? conversionRate - previousConversionRate : 0;
      const pipelineChange = previousPipeline > 0 ? ((totalPipeline - previousPipeline) / previousPipeline) * 100 : 0;
      const activitiesChange = previousActivities > 0 ? ((totalActivities - previousActivities) / previousActivities) * 100 : 0;

      const calculatedMetrics: Metric[] = [
        {
          label: 'Active Leads',
          value: activeLeads.toString(),
          change: Math.abs(leadsChange),
          changeType: leadsChange > 0 ? 'positive' : leadsChange < 0 ? 'negative' : 'neutral'
        },
        {
          label: 'Conversion Rate',
          value: `${conversionRate.toFixed(1)}%`,
          change: Math.abs(conversionChange),
          changeType: conversionChange > 0 ? 'positive' : conversionChange < 0 ? 'negative' : 'neutral'
        },
        {
          label: 'Pipeline Value',
          value: `$${(totalPipeline / 1000).toFixed(0)}K`,
          change: Math.abs(pipelineChange),
          changeType: pipelineChange > 0 ? 'positive' : pipelineChange < 0 ? 'negative' : 'neutral'
        },
        {
          label: 'Activities',
          value: totalActivities.toString(),
          change: Math.abs(activitiesChange),
          changeType: activitiesChange > 0 ? 'positive' : activitiesChange < 0 ? 'negative' : 'neutral'
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