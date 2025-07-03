import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UsageMetric {
  metric_type: string;
  metric_value: number;
  company_id?: string;
  user_id?: string;
}

interface UsageData {
  metric_type: string;
  metric_value: number;
  billing_period_start: string;
  billing_period_end: string;
  created_at: string;
}

export const useUsageTracking = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const trackUsage = useCallback(async (metric: UsageMetric) => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('track-usage', {
        body: metric
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error tracking usage:', error);
      toast({
        title: "Error",
        description: "Failed to track usage",
        variant: "destructive"
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getUsageData = useCallback(async (
    metricType?: string,
    startDate?: string,
    endDate?: string
  ): Promise<UsageData[]> => {
    try {
      let query = supabase
        .from('usage_metrics')
        .select('metric_type, metric_value, billing_period_start, billing_period_end, created_at')
        .order('created_at', { ascending: false });

      if (metricType) {
        query = query.eq('metric_type', metricType);
      }

      if (startDate) {
        query = query.gte('billing_period_start', startDate);
      }

      if (endDate) {
        query = query.lte('billing_period_end', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching usage data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch usage data",
        variant: "destructive"
      });
      return [];
    }
  }, [toast]);

  const getCurrentPeriodUsage = useCallback(async (metricType: string) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const usage = await getUsageData(
      metricType,
      startOfMonth.toISOString().split('T')[0],
      endOfMonth.toISOString().split('T')[0]
    );

    const totalUsage = usage.reduce((sum, record) => sum + record.metric_value, 0);
    return { totalUsage, records: usage };
  }, [getUsageData]);

  // Convenience methods for common metrics
  const trackApiCall = useCallback(() => trackUsage({ metric_type: 'api_calls', metric_value: 1 }), [trackUsage]);
  
  const trackStorageUsage = useCallback((sizeInMB: number) => 
    trackUsage({ metric_type: 'storage_gb', metric_value: sizeInMB / 1024 }), [trackUsage]);
  
  const trackProjectCreation = useCallback(() => 
    trackUsage({ metric_type: 'projects', metric_value: 1 }), [trackUsage]);
  
  const trackUserInvite = useCallback(() => 
    trackUsage({ metric_type: 'users', metric_value: 1 }), [trackUsage]);

  return {
    trackUsage,
    getUsageData,
    getCurrentPeriodUsage,
    trackApiCall,
    trackStorageUsage,
    trackProjectCreation,
    trackUserInvite,
    loading
  };
};