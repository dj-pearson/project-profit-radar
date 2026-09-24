/**
 * Reads and writes behind the lead nurturing campaigns screen (US-266).
 *
 * The component read campaigns with no company filter (RLS alone scoped it),
 * reloaded by hand after each write, and kept the open campaign as a snapshot,
 * so pausing it left the dialog showing the old state. A failed step or
 * enrollment read toasted over an empty dialog that looked like a campaign with
 * no steps.
 *
 * Campaigns are read by company_id now. Step and enrollment reads are their own
 * query per campaign and throw. Every write selects the row back so an update
 * RLS filtered to zero rows fails instead of toasting success.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface NurturingCampaign {
  id: string;
  campaign_name: string;
  description?: string | null;
  campaign_type: string;
  total_steps: number;
  is_active: boolean;
  auto_enrollment: boolean;
  enrollment_count: number;
  completion_count: number;
  conversion_count: number;
  created_at: string;
}

export interface CampaignStep {
  id: string;
  step_number: number;
  step_name: string;
  step_type: string;
  subject_line?: string | null;
  content?: string | null;
  delay_value: number;
  delay_unit: string;
  is_active: boolean;
}

export interface CampaignEnrollment {
  id: string;
  status: string;
  current_step: number;
  steps_completed: number;
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  converted: boolean;
  enrolled_at: string;
  lead: {
    first_name: string;
    last_name: string;
    company_name?: string | null;
  } | null;
}

export interface NewCampaign {
  campaign_name: string;
  description: string;
  campaign_type: string;
  auto_enrollment: boolean;
  score_threshold: number;
}

export interface NewCampaignStep {
  step_name: string;
  step_type: string;
  subject_line: string;
  content: string;
  delay_value: number;
  delay_unit: string;
}

export const nurturingCampaignsKey = (companyId: string | undefined) => ['nurturing-campaigns', companyId] as const;

function requireRows(data: unknown[] | null, message: string) {
  if (!data || data.length === 0) throw new Error(message);
}

export async function fetchNurturingCampaigns(companyId: string): Promise<NurturingCampaign[]> {
  const { data, error } = await supabase
    .from('lead_nurturing_campaigns')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as NurturingCampaign[];
}

export async function fetchCampaignDetails(
  campaignId: string
): Promise<{ steps: CampaignStep[]; enrollments: CampaignEnrollment[] }> {
  const [steps, enrollments] = await Promise.all([
    supabase.from('nurturing_campaign_steps').select('*').eq('campaign_id', campaignId).order('step_number'),
    supabase
      .from('lead_nurturing_enrollments')
      .select('*, lead:leads(first_name, last_name, company_name)')
      .eq('campaign_id', campaignId)
      .order('enrolled_at', { ascending: false })
      .limit(50),
  ]);
  if (steps.error) throw steps.error;
  if (enrollments.error) throw enrollments.error;
  return {
    steps: (steps.data ?? []) as unknown as CampaignStep[],
    enrollments: (enrollments.data ?? []) as unknown as CampaignEnrollment[],
  };
}

export async function createNurturingCampaign(companyId: string, campaign: NewCampaign): Promise<void> {
  const { data, error } = await supabase
    .from('lead_nurturing_campaigns')
    .insert([{ ...campaign, company_id: companyId }])
    .select('id');
  if (error) throw error;
  requireRows(data, 'The campaign was not created. You may not have permission to add campaigns.');
}

/**
 * Adds the step after the existing ones and moves the campaign's total_steps
 * to match. A step saved with the count left behind would make the campaign
 * stop one step early, so a failed count update is an error.
 */
export async function addCampaignStep(campaignId: string, stepNumber: number, step: NewCampaignStep): Promise<void> {
  const { data, error } = await supabase
    .from('nurturing_campaign_steps')
    .insert([{ campaign_id: campaignId, step_number: stepNumber, ...step }])
    .select('id');
  if (error) throw error;
  requireRows(data, 'The step was not added. You may not have permission to edit this campaign.');

  const { data: updated, error: updateError } = await supabase
    .from('lead_nurturing_campaigns')
    .update({ total_steps: stepNumber })
    .eq('id', campaignId)
    .select('id');
  if (updateError) throw new Error(`The step was added but the campaign's step count was not: ${updateError.message}`);
  requireRows(updated, "The step was added but the campaign's step count was not updated.");
}

export async function setCampaignActive(campaignId: string, isActive: boolean): Promise<void> {
  const { data, error } = await supabase
    .from('lead_nurturing_campaigns')
    .update({ is_active: isActive })
    .eq('id', campaignId)
    .select('id');
  if (error) throw error;
  requireRows(data, 'The campaign was not changed. You may not have permission to edit it.');
}

export function useLeadNurturingCampaigns(selectedCampaignId: string | null) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = nurturingCampaignsKey(companyId);

  const campaigns = useQuery({
    queryKey: key,
    queryFn: () => fetchNurturingCampaigns(companyId as string),
    enabled: !!companyId,
  });
  const details = useQuery({
    queryKey: [...key, 'campaign', selectedCampaignId] as const,
    queryFn: () => fetchCampaignDetails(selectedCampaignId as string),
    enabled: !!companyId && !!selectedCampaignId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const create = useMutation({
    mutationFn: (campaign: NewCampaign) => {
      if (!companyId) throw new Error('No company on your profile.');
      return createNurturingCampaign(companyId, campaign);
    },
    onSettled: invalidate,
  });
  const addStep = useMutation({
    mutationFn: ({ campaignId, stepNumber, step }: { campaignId: string; stepNumber: number; step: NewCampaignStep }) =>
      addCampaignStep(campaignId, stepNumber, step),
    onSettled: invalidate,
  });
  const setActive = useMutation({
    mutationFn: ({ campaignId, isActive }: { campaignId: string; isActive: boolean }) =>
      setCampaignActive(campaignId, isActive),
    onSettled: invalidate,
  });

  return {
    campaigns: campaigns.data ?? [],
    isLoading: campaigns.isLoading,
    error: campaigns.error as Error | null,
    refetch: campaigns.refetch,
    steps: details.data?.steps ?? [],
    enrollments: details.data?.enrollments ?? [],
    detailsLoading: details.isLoading,
    detailsError: details.error as Error | null,
    refetchDetails: details.refetch,
    create: (campaign: NewCampaign) => create.mutateAsync(campaign),
    addStep: (campaignId: string, stepNumber: number, step: NewCampaignStep) =>
      addStep.mutateAsync({ campaignId, stepNumber, step }),
    setActive: (campaignId: string, isActive: boolean) => setActive.mutateAsync({ campaignId, isActive }),
  };
}
