/**
 * The single system_admin_settings row for /system-admin-settings (US-266).
 *
 * The page kept empty defaults when the read failed and still offered Save,
 * which wrote those empties over every email, form and report template. Save
 * also looked the row id up with a second unchecked query, and reported
 * success on an update that matched no row. The row (with its id) is read once
 * and throws; the page offers Save only once the row has loaded; the update
 * selects its row back.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';

export interface SystemSettingsRow {
  email_templates: Record<string, unknown>;
  form_templates: Record<string, unknown>;
  report_templates: Record<string, unknown>;
  document_management: Record<string, unknown>;
  system_preferences: Record<string, unknown>;
}

export const systemAdminSettingsKey = (companyId: string | undefined, userId: string | undefined) =>
  ['system-admin-settings', companyId, userId] as const;

const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

export async function fetchSystemAdminSettings(): Promise<{ id: string; settings: SystemSettingsRow } | null> {
  const { data, error } = await supabase.from('system_admin_settings').select('*').limit(1).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    settings: {
      email_templates: obj(data.email_templates),
      form_templates: obj(data.form_templates),
      report_templates: obj(data.report_templates),
      document_management: obj(data.document_management),
      system_preferences: obj(data.system_preferences),
    },
  };
}

export async function saveSystemAdminSettings(id: string, settings: SystemSettingsRow, userId: string | undefined): Promise<void> {
  const { data, error } = await supabase
    .from('system_admin_settings')
    .update({
      email_templates: settings.email_templates as Json,
      form_templates: settings.form_templates as Json,
      report_templates: settings.report_templates as Json,
      document_management: settings.document_management as Json,
      system_preferences: settings.system_preferences as Json,
      updated_by: userId,
    })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The settings were not saved. You may not have permission to edit system settings.');
  }
}

export function useSystemAdminSettings({ enabled }: { enabled: boolean }) {
  const { user, userProfile } = useAuth();
  const userId = user?.id;
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = systemAdminSettingsKey(companyId, userId);

  const query = useQuery({ queryKey: key, queryFn: fetchSystemAdminSettings, enabled: enabled && !!userId });
  const save = useMutation({
    mutationFn: (settings: SystemSettingsRow) => {
      if (!query.data) throw new Error('The settings have not loaded, so there is nothing to save over.');
      return saveSystemAdminSettings(query.data.id, settings, userId);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return {
    row: query.data,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    save: (settings: SystemSettingsRow) => save.mutateAsync(settings),
    saving: save.isPending,
  };
}
