/**
 * Daily Report Templates Hook
 * Manages templates and auto-population for daily reports
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface DailyReportTemplate {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  default_crew_count: number | null;
  default_weather_conditions: string | null;
  default_safety_notes: string | null;
  include_crew_section: boolean;
  include_tasks_section: boolean;
  include_materials_section: boolean;
  include_equipment_section: boolean;
  include_safety_section: boolean;
  include_photos_section: boolean;
  auto_populate_crew: boolean;
  auto_populate_tasks: boolean;
  auto_populate_weather: boolean;
  auto_populate_materials: boolean;
  auto_populate_equipment: boolean;
  project_type: string | null;
  is_active: boolean;
  use_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateTaskPreset {
  id: string;
  template_id: string;
  task_name: string;
  task_description: string | null;
  display_order: number | null;
}

export interface AutoPopulationResult {
  success: boolean;
  crew_populated: number;
  tasks_populated: number;
  template_name: string;
  error?: string;
}

export const useDailyReportTemplates = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query templates for company
  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ['daily-report-templates', userProfile?.company_id],
    queryFn: async () => {
      if (!userProfile?.company_id) return [];

      const { data, error } = await supabase
        .from('daily_report_templates')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as DailyReportTemplate[];
    },
    enabled: !!userProfile?.company_id,
  });

  // Query template task presets
  const getTemplatePresets = async (templateId: string) => {
    const { data, error } = await supabase
      .from('template_task_presets')
      .select('*')
      .eq('template_id', templateId)
      .order('display_order');

    if (error) throw error;
    return data as TemplateTaskPreset[];
  };

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (template: Partial<DailyReportTemplate>) => {
      if (!userProfile?.company_id) {
        throw new Error('Company ID not found');
      }

      const { data, error } = await supabase
        .from('daily_report_templates')
        .insert({
          ...template,
          company_id: userProfile.company_id,
          created_by: userProfile.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as DailyReportTemplate;
    },
    onSuccess: () => {
      toast({
        title: 'Template Created',
        description: 'Daily report template has been created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['daily-report-templates'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Create Template',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DailyReportTemplate> }) => {
      const { data, error } = await supabase
        .from('daily_report_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Template Updated',
        description: 'Template has been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['daily-report-templates'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('daily_report_templates')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Template Deleted',
        description: 'Template has been deactivated.',
      });
      queryClient.invalidateQueries({ queryKey: ['daily-report-templates'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Auto-populate daily report mutation
  const autoPopulateMutation = useMutation({
    mutationFn: async ({
      dailyReportId,
      templateId,
      projectId,
      date,
    }: {
      dailyReportId: string;
      templateId: string;
      projectId: string;
      date: string;
    }) => {
      const { data, error } = await supabase.rpc('auto_populate_daily_report', {
        p_daily_report_id: dailyReportId,
        p_template_id: templateId,
        p_project_id: projectId,
        p_date: date,
      });

      if (error) throw error;
      return data as AutoPopulationResult;
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: 'Report Auto-populated',
          description: `Added ${result.crew_populated} crew members and ${result.tasks_populated} tasks.`,
        });
      } else {
        toast({
          title: 'Auto-population Failed',
          description: result.error || 'Failed to auto-populate report',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Auto-population Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Add task presets to template
  const addTemplateTaskPreset = async (
    templateId: string,
    taskName: string,
    taskDescription: string | null,
    displayOrder: number
  ) => {
    const { data, error} = await supabase
      .from('template_task_presets')
      .insert({
        template_id: templateId,
        task_name: taskName,
        task_description: taskDescription,
        display_order: displayOrder,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  // Delete task preset
  const deleteTemplateTaskPreset = async (presetId: string) => {
    const { error } = await supabase
      .from('template_task_presets')
      .delete()
      .eq('id', presetId);

    if (error) throw error;
  };

  return {
    // Data
    templates: templates || [],

    // Loading states
    loadingTemplates,
    creatingTemplate: createTemplateMutation.isPending,
    updatingTemplate: updateTemplateMutation.isPending,
    deletingTemplate: deleteTemplateMutation.isPending,
    autoPopulating: autoPopulateMutation.isPending,

    // Actions
    createTemplate: createTemplateMutation.mutate,
    updateTemplate: updateTemplateMutation.mutate,
    deleteTemplate: deleteTemplateMutation.mutate,
    autoPopulateReport: autoPopulateMutation.mutate,
    getTemplatePresets,
    addTemplateTaskPreset,
    deleteTemplateTaskPreset,
  };
};
