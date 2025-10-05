import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { FinancialSettings, DEFAULT_FINANCIAL_SETTINGS } from '@/utils/financialCalculations';

/**
 * Hook to manage company financial settings
 */
export function useFinancialSettings() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['financial-settings', userProfile?.company_id],
    queryFn: async () => {
      if (!userProfile?.company_id) return DEFAULT_FINANCIAL_SETTINGS;

      const { data, error } = await supabase
        .from('company_settings')
        .select('additional_settings, default_markup')
        .eq('company_id', userProfile.company_id)
        .maybeSingle();

      if (error) throw error;

      if (!data) return DEFAULT_FINANCIAL_SETTINGS;

      // Extract financial settings from additional_settings JSONB field
      const additionalSettings = data.additional_settings as any;
      const financialSettings = additionalSettings?.financial_settings as Partial<FinancialSettings>;

      return {
        ...DEFAULT_FINANCIAL_SETTINGS,
        defaultProfitMargin: data.default_markup || DEFAULT_FINANCIAL_SETTINGS.defaultProfitMargin,
        ...financialSettings,
      } as FinancialSettings;
    },
    enabled: !!userProfile?.company_id,
    staleTime: 60000, // 1 minute
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<FinancialSettings>) => {
      if (!userProfile?.company_id) throw new Error('No company ID');

      // Get current additional_settings
      const { data: currentData } = await supabase
        .from('company_settings')
        .select('additional_settings')
        .eq('company_id', userProfile.company_id)
        .maybeSingle();

      const currentAdditional = (currentData?.additional_settings || {}) as any;

      // Merge new financial settings
      const updatedAdditional = {
        ...currentAdditional,
        financial_settings: {
          ...(currentAdditional.financial_settings || {}),
          ...newSettings,
        },
      };

      const { data, error } = await supabase
        .from('company_settings')
        .update({
          additional_settings: updatedAdditional,
          default_markup: newSettings.defaultProfitMargin || currentAdditional.financial_settings?.defaultProfitMargin,
        })
        .eq('company_id', userProfile.company_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-settings', userProfile?.company_id] });
      toast({
        title: 'Settings Updated',
        description: 'Financial settings have been saved successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    settings: settings || DEFAULT_FINANCIAL_SETTINGS,
    isLoading,
    error,
    updateSettings: updateSettings.mutate,
    isUpdating: updateSettings.isPending,
  };
}

/**
 * Hook to calculate project costs using company settings
 */
export function useProjectCostCalculation(projectId: string) {
  const { settings } = useFinancialSettings();
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: ['project-costs', projectId, settings],
    queryFn: async () => {
      if (!userProfile?.company_id || !projectId) return null;

      // Fetch project cost data
      const { data: costs, error } = await (supabase as any)
        .from('job_costs')
        .select('labor_cost, material_cost, equipment_cost, other_cost')
        .eq('project_id', projectId)
        .eq('company_id', userProfile.company_id);

      if (error) throw error;

      // Sum up all costs
      const totalLaborCost = costs?.reduce((sum, c) => sum + (c.labor_cost || 0), 0) || 0;
      const totalMaterialCost = costs?.reduce((sum, c) => sum + (c.material_cost || 0), 0) || 0;
      const totalEquipmentCost = costs?.reduce((sum, c) => sum + (c.equipment_cost || 0), 0) || 0;
      const totalOtherCost = costs?.reduce((sum, c) => sum + (c.other_cost || 0), 0) || 0;

      return {
        laborCost: totalLaborCost,
        materialCost: totalMaterialCost,
        equipmentCost: totalEquipmentCost,
        subcontractorCost: 0, // TODO: Add subcontractor tracking
        otherDirectCosts: totalOtherCost,
      };
    },
    enabled: !!projectId && !!userProfile?.company_id,
  });
}
