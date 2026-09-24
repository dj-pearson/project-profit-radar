/**
 * Automation rules and communication templates for SmartClientUpdates (US-266).
 *
 * The component labelled every rule's template "Template Name" (it never
 * looked the template up), reloaded by hand after each write, and reported a
 * rule toggle as done when RLS filtered the update to zero rows. A rule for
 * "all projects" sent project_id '' and failed the uuid cast.
 *
 * Rules now carry the real template from the company's template list (null
 * when it is gone), reads throw, and writes select the row back.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CommunicationTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  trigger_type: string;
  variables: string[];
}

export interface AutomationRule {
  id: string;
  company_id: string;
  project_id?: string | null;
  trigger_type: string;
  trigger_conditions: unknown;
  template_id: string | null;
  is_active: boolean;
  created_at: string;
  /** The rule's template from the company's list; null when it no longer exists. */
  template: CommunicationTemplate | null;
}

export interface RuleForm {
  trigger_type: string;
  project_id: string;
  template_id: string;
  is_active: boolean;
  trigger_conditions: Record<string, unknown>;
}

export interface TemplateForm {
  name: string;
  subject: string;
  content: string;
}

export const smartClientUpdatesKey = (companyId: string | undefined) => ['smart-client-updates', companyId] as const;

function requireRows(data: unknown[] | null, message: string) {
  if (!data || data.length === 0) throw new Error(message);
}

export async function fetchSmartClientUpdates(companyId: string): Promise<{
  rules: AutomationRule[];
  templates: CommunicationTemplate[];
  projects: { id: string; name: string }[];
}> {
  const [rules, templates, projects] = await Promise.all([
    supabase.from('automation_rules').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
    supabase.from('communication_templates').select('*').eq('company_id', companyId).order('name'),
    supabase.from('projects').select('id, name').eq('company_id', companyId).eq('status', 'active').order('name'),
  ]);
  const failed = [rules, templates, projects].find((r) => r.error)?.error;
  if (failed) throw failed;

  const templateList: CommunicationTemplate[] = ((templates.data ?? []) as Record<string, unknown>[]).map((t) => ({
    id: String(t.id),
    name: String(t.name ?? ''),
    subject: String(t.subject_template ?? ''),
    content: String(t.content_template ?? ''),
    trigger_type: 'manual',
    variables: Array.isArray(t.variables) ? t.variables.map((v) => String(v)) : [],
  }));
  const byId = new Map(templateList.map((t) => [t.id, t]));

  return {
    rules: ((rules.data ?? []) as unknown as Omit<AutomationRule, 'template'>[]).map((r) => ({
      ...r,
      template: r.template_id ? byId.get(r.template_id) ?? null : null,
    })),
    templates: templateList,
    projects: (projects.data ?? []) as { id: string; name: string }[],
  };
}

export async function createAutomationRule(companyId: string, userId: string | undefined, form: RuleForm): Promise<void> {
  const { data, error } = await supabase
    .from('automation_rules')
    .insert({
      ...form,
      project_id: form.project_id || null,
      template_id: form.template_id || null,
      trigger_conditions: form.trigger_conditions as never,
      company_id: companyId,
      created_by: userId,
    })
    .select('id');
  if (error) throw error;
  requireRows(data, 'The rule was not created. You may not have permission to add automation rules.');
}

export async function createCommunicationTemplate(companyId: string, userId: string | undefined, form: TemplateForm): Promise<void> {
  const { data, error } = await supabase
    .from('communication_templates')
    .insert({
      name: form.name,
      subject_template: form.subject,
      content_template: form.content,
      category: 'general',
      communication_type: 'email',
      company_id: companyId,
      created_by: userId,
    })
    .select('id');
  if (error) throw error;
  requireRows(data, 'The template was not created. You may not have permission to add templates.');
}

export async function setAutomationRuleActive(id: string, isActive: boolean): Promise<void> {
  const { data, error } = await supabase.from('automation_rules').update({ is_active: isActive }).eq('id', id).select('id');
  if (error) throw error;
  requireRows(data, 'The rule was not changed. You may not have permission to edit automation rules.');
}

export function useSmartClientUpdates() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const userId = userProfile?.id;
  const queryClient = useQueryClient();
  const key = smartClientUpdatesKey(companyId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchSmartClientUpdates(companyId as string),
    enabled: !!companyId,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const requireCompany = () => {
    if (!companyId) throw new Error('Your account is not linked to a company.');
    return companyId;
  };

  const addRule = useMutation({
    mutationFn: (form: RuleForm) => createAutomationRule(requireCompany(), userId, form),
    onSettled: invalidate,
  });
  const addTemplate = useMutation({
    mutationFn: (form: TemplateForm) => createCommunicationTemplate(requireCompany(), userId, form),
    onSettled: invalidate,
  });
  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setAutomationRuleActive(id, isActive),
    onSettled: invalidate,
  });

  return {
    rules: query.data?.rules ?? [],
    templates: query.data?.templates ?? [],
    projects: query.data?.projects ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    addRule: (form: RuleForm) => addRule.mutateAsync(form),
    addTemplate: (form: TemplateForm) => addTemplate.mutateAsync(form),
    setActive: (id: string, isActive: boolean) => toggle.mutateAsync({ id, isActive }),
  };
}
