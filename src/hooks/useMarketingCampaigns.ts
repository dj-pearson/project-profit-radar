/**
 * Marketing Campaign Management Hooks
 * Comprehensive client-side integration for marketing campaign automation
 * Includes A/B testing, audience segmentation, analytics, and scheduling
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface MarketingCampaign {
  id: string;
  site_id: string;
  company_id?: string;
  campaign_name: string;
  campaign_description?: string;
  campaign_type: CampaignType;
  trigger_type: TriggerType;
  trigger_conditions?: Record<string, unknown>;
  trigger_event?: string;
  subject_line: string;
  preview_text?: string;
  from_name: string;
  from_email: string;
  reply_to: string;
  html_content?: string;
  text_content?: string;
  template_id?: string;
  template_variables?: Record<string, unknown>;
  send_delay_minutes: number;
  send_at_time?: string;
  send_on_days?: number[];
  sequence_name?: string;
  sequence_order?: number;
  ab_test_enabled: boolean;
  ab_test_variant?: string;
  ab_test_traffic_percentage: number;
  is_active: boolean;
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_unsubscribed: number;
  total_bounced: number;
  total_complained: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  last_sent_at?: string;
}

export type CampaignType =
  | 'onboarding'
  | 'trial_nurture'
  | 'promotional'
  | 'transactional'
  | 'reengagement'
  | 'newsletter'
  | 'announcement'
  | 'drip_sequence';

export type TriggerType =
  | 'manual'
  | 'scheduled'
  | 'behavioral'
  | 'lifecycle'
  | 'event_based';

export interface CampaignFilters {
  campaign_type?: CampaignType;
  trigger_type?: TriggerType;
  is_active?: boolean;
  sequence_name?: string;
  search?: string;
}

export interface CreateCampaignRequest {
  campaign_name: string;
  campaign_description?: string;
  campaign_type: CampaignType;
  trigger_type: TriggerType;
  trigger_conditions?: Record<string, unknown>;
  trigger_event?: string;
  subject_line: string;
  preview_text?: string;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
  html_content?: string;
  text_content?: string;
  template_id?: string;
  template_variables?: Record<string, unknown>;
  send_delay_minutes?: number;
  send_at_time?: string;
  send_on_days?: number[];
  sequence_name?: string;
  sequence_order?: number;
  is_active?: boolean;
}

export interface CampaignStats {
  total_campaigns: number;
  active_campaigns: number;
  total_emails_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  average_open_rate: number;
  average_click_rate: number;
  total_unsubscribed: number;
  total_bounced: number;
}

export interface CampaignPerformance {
  campaign_id: string;
  campaign_name: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
  bounced: number;
  open_rate: number;
  click_rate: number;
  click_to_open_rate: number;
  unsubscribe_rate: number;
  bounce_rate: number;
}

export interface EmailSend {
  id: string;
  campaign_id?: string;
  user_id?: string;
  recipient_email: string;
  recipient_name?: string;
  subject: string;
  status: EmailStatus;
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  open_count: number;
  click_count: number;
  unsubscribed_at?: string;
  bounced_at?: string;
  bounce_type?: string;
  created_at: string;
}

export type EmailStatus =
  | 'pending'
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'bounced'
  | 'failed'
  | 'dropped';

export interface AudienceSegment {
  id: string;
  name: string;
  description?: string;
  conditions: SegmentCondition[];
  estimated_size: number;
}

export interface SegmentCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: unknown;
}

export interface ABTestVariant {
  id: string;
  campaign_id: string;
  variant_name: string;
  subject_line: string;
  preview_text?: string;
  html_content?: string;
  traffic_percentage: number;
  is_winner: boolean;
  stats: {
    sent: number;
    opened: number;
    clicked: number;
    open_rate: number;
    click_rate: number;
  };
}

/**
 * Hook to fetch marketing campaigns
 */
export function useMarketingCampaigns(
  filters?: CampaignFilters,
  options?: { enabled?: boolean }
) {
    return useQuery({
    queryKey: [ filters],
    queryFn: async (): Promise<MarketingCampaign[]> => {
            let query = supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.campaign_type) {
        query = query.eq('campaign_type', filters.campaign_type);
      }

      if (filters?.trigger_type) {
        query = query.eq('trigger_type', filters.trigger_type);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.sequence_name) {
        query = query.eq('sequence_name', filters.sequence_name);
      }

      if (filters?.search) {
        query = query.or(
          `campaign_name.ilike.%${filters.search}%,campaign_description.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as MarketingCampaign[];
    },
    enabled: (options?.enabled !== false),
  });
}

/**
 * Hook to fetch a single campaign
 */
export function useMarketingCampaign(campaignId: string, options?: { enabled?: boolean }) {
    return useQuery({
    queryKey: [ campaignId],
    queryFn: async (): Promise<MarketingCampaign | null> => {
            const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as MarketingCampaign | null;
    },
    enabled: !!campaignId && (options?.enabled !== false),
  });
}

/**
 * Hook to create a new marketing campaign
 */
export function useCreateMarketingCampaign() {
  const {  user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateCampaignRequest): Promise<MarketingCampaign> => {
            // Get user's company_id
      let companyId: string | null = null;
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();
        companyId = profile?.company_id || null;
      }

      const { data, error } = await supabase
        .from('email_campaigns')
        .insert({
          ...request,
          company_id: companyId,
          from_name: request.from_name || 'BuildDesk Team',
          from_email: request.from_email || 'hello@build-desk.com',
          reply_to: request.reply_to || 'support@build-desk.com',
          send_delay_minutes: request.send_delay_minutes || 0,
          is_active: request.is_active ?? true,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MarketingCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
    },
  });
}

/**
 * Hook to update a marketing campaign
 */
export function useUpdateMarketingCampaign() {
    const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<CreateCampaignRequest>;
    }): Promise<MarketingCampaign> => {
            const { data, error } = await supabase
        .from('email_campaigns')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MarketingCampaign;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      queryClient.invalidateQueries({ queryKey: [ data.id] });
    },
  });
}

/**
 * Hook to delete a marketing campaign
 */
export function useDeleteMarketingCampaign() {
    const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string): Promise<void> => {
            const { error } = await supabase
        .from('email_campaigns')
        .delete()
        .eq('id', campaignId)
        ;

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
    },
  });
}

/**
 * Hook to toggle campaign active status
 */
export function useToggleCampaign() {
    const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      isActive,
    }: {
      campaignId: string;
      isActive: boolean;
    }): Promise<void> => {
            const { error } = await supabase
        .from('email_campaigns')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId)
        ;

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
    },
  });
}

/**
 * Hook to duplicate a campaign
 */
export function useDuplicateCampaign() {
  const {  user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      newName,
    }: {
      campaignId: string;
      newName?: string;
    }): Promise<MarketingCampaign> => {
            // Get the original campaign
      const { data: original, error: fetchError } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (fetchError) throw fetchError;

      // Create a copy
      const { data, error } = await supabase
        .from('email_campaigns')
        .insert({
          company_id: original.company_id,
          campaign_name: newName || `${original.campaign_name} (Copy)`,
          campaign_description: original.campaign_description,
          campaign_type: original.campaign_type,
          trigger_type: original.trigger_type,
          trigger_conditions: original.trigger_conditions,
          trigger_event: original.trigger_event,
          subject_line: original.subject_line,
          preview_text: original.preview_text,
          from_name: original.from_name,
          from_email: original.from_email,
          reply_to: original.reply_to,
          html_content: original.html_content,
          text_content: original.text_content,
          template_id: original.template_id,
          template_variables: original.template_variables,
          send_delay_minutes: original.send_delay_minutes,
          send_at_time: original.send_at_time,
          send_on_days: original.send_on_days,
          sequence_name: original.sequence_name,
          sequence_order: original.sequence_order ? original.sequence_order + 1 : null,
          ab_test_enabled: false,
          is_active: false, // Start as inactive
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MarketingCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
    },
  });
}

/**
 * Hook to get campaign statistics
 */
export function useCampaignStats(options?: { enabled?: boolean }) {
    return useQuery({
    queryKey: ['campaign-stats'],
    queryFn: async (): Promise<CampaignStats> => {
            const { data, error } = await supabase
        .from('email_campaigns')
        .select(
          'is_active, total_sent, total_delivered, total_opened, total_clicked, total_unsubscribed, total_bounced'
        )
        ;

      if (error) throw error;

      const campaigns = data || [];
      const activeCampaigns = campaigns.filter((c) => c.is_active).length;
      const totalSent = campaigns.reduce((sum, c) => sum + (c.total_sent || 0), 0);
      const totalDelivered = campaigns.reduce((sum, c) => sum + (c.total_delivered || 0), 0);
      const totalOpened = campaigns.reduce((sum, c) => sum + (c.total_opened || 0), 0);
      const totalClicked = campaigns.reduce((sum, c) => sum + (c.total_clicked || 0), 0);
      const totalUnsubscribed = campaigns.reduce((sum, c) => sum + (c.total_unsubscribed || 0), 0);
      const totalBounced = campaigns.reduce((sum, c) => sum + (c.total_bounced || 0), 0);

      return {
        total_campaigns: campaigns.length,
        active_campaigns: activeCampaigns,
        total_emails_sent: totalSent,
        total_delivered: totalDelivered,
        total_opened: totalOpened,
        total_clicked: totalClicked,
        average_open_rate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
        average_click_rate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
        total_unsubscribed: totalUnsubscribed,
        total_bounced: totalBounced,
      };
    },
    enabled: (options?.enabled !== false),
  });
}

/**
 * Hook to get campaign performance metrics
 */
export function useCampaignPerformance(campaignId?: string, options?: { enabled?: boolean }) {
    return useQuery({
    queryKey: [ campaignId],
    queryFn: async (): Promise<CampaignPerformance[]> => {
            let query = supabase
        .from('email_campaigns')
        .select(
          'id, campaign_name, total_sent, total_delivered, total_opened, total_clicked, total_unsubscribed, total_bounced'
        )
        ;

      if (campaignId) {
        query = query.eq('id', campaignId);
      }

      const { data, error } = await query.order('total_sent', { ascending: false });

      if (error) throw error;

      return (data || []).map((c) => {
        const delivered = c.total_delivered || 0;
        const opened = c.total_opened || 0;
        const clicked = c.total_clicked || 0;
        const sent = c.total_sent || 0;

        return {
          campaign_id: c.id,
          campaign_name: c.campaign_name,
          sent,
          delivered,
          opened,
          clicked,
          unsubscribed: c.total_unsubscribed || 0,
          bounced: c.total_bounced || 0,
          open_rate: delivered > 0 ? (opened / delivered) * 100 : 0,
          click_rate: opened > 0 ? (clicked / opened) * 100 : 0,
          click_to_open_rate: opened > 0 ? (clicked / opened) * 100 : 0,
          unsubscribe_rate: delivered > 0 ? ((c.total_unsubscribed || 0) / delivered) * 100 : 0,
          bounce_rate: sent > 0 ? ((c.total_bounced || 0) / sent) * 100 : 0,
        };
      });
    },
    enabled: (options?.enabled !== false),
  });
}

/**
 * Hook to get email sends for a campaign
 */
export function useCampaignEmailSends(
  campaignId: string,
  options?: { limit?: number; status?: EmailStatus; enabled?: boolean }
) {
    return useQuery({
    queryKey: [ campaignId, options?.status],
    queryFn: async (): Promise<EmailSend[]> => {
            let query = supabase
        .from('email_sends')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
        .limit(options?.limit || 100);

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as EmailSend[];
    },
    enabled: !!campaignId && (options?.enabled !== false),
  });
}

/**
 * Hook to get email sequences
 */
export function useEmailSequences(options?: { enabled?: boolean }) {
    return useQuery({
    queryKey: ['email-sequences'],
    queryFn: async () => {
            const { data, error } = await supabase
        .from('email_campaigns')
        .select('sequence_name, sequence_order, id, campaign_name, is_active')
        .not('sequence_name', 'is', null)
        .order('sequence_name')
        .order('sequence_order');

      if (error) throw error;

      // Group by sequence name
      const sequences: Record<
        string,
        {
          name: string;
          campaigns: Array<{
            id: string;
            name: string;
            order: number;
            is_active: boolean;
          }>;
        }
      > = {};

      for (const campaign of data || []) {
        const seqName = campaign.sequence_name!;
        if (!sequences[seqName]) {
          sequences[seqName] = { name: seqName, campaigns: [] };
        }
        sequences[seqName].campaigns.push({
          id: campaign.id,
          name: campaign.campaign_name,
          order: campaign.sequence_order || 0,
          is_active: campaign.is_active,
        });
      }

      return Object.values(sequences);
    },
    enabled: (options?.enabled !== false),
  });
}

/**
 * Hook to send a test email
 */
export function useSendTestEmail() {
  const {  user } = useAuth();

  return useMutation({
    mutationFn: async ({
      campaignId,
      testEmail,
    }: {
      campaignId: string;
      testEmail: string;
    }): Promise<{ success: boolean; message: string }> => {
            if (!user) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('send-scheduled-emails', {
        body: {
          action: 'send_test',
          campaign_id: campaignId,
          test_email: testEmail,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send test email');
      }

      return response.data as { success: boolean; message: string };
    },
  });
}

/**
 * Hook to schedule a campaign send
 */
export function useScheduleCampaign() {
    const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      scheduledFor,
      audienceFilter,
    }: {
      campaignId: string;
      scheduledFor: string;
      audienceFilter?: Record<string, unknown>;
    }): Promise<{ queued_count: number }> => {
            const response = await supabase.functions.invoke('send-scheduled-emails', {
        body: {
          action: 'schedule_campaign',
          campaign_id: campaignId,
          scheduled_for: scheduledFor,
          audience_filter: audienceFilter,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to schedule campaign');
      }

      return response.data as { queued_count: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
    },
  });
}

/**
 * Hook to get campaign A/B test variants
 */
export function useCampaignABTests(campaignId: string, options?: { enabled?: boolean }) {
    return useQuery({
    queryKey: [ campaignId],
    queryFn: async (): Promise<ABTestVariant[]> => {
            // Get variants for this campaign (campaigns with same base name but different variants)
      const { data: baseCampaign } = await supabase
        .from('email_campaigns')
        .select('campaign_name')
        .eq('id', campaignId)
        .single();

      if (!baseCampaign) return [];

      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('ab_test_enabled', true)
        .ilike('campaign_name', `${baseCampaign.campaign_name}%`);

      if (error) throw error;

      return (data || []).map((c) => ({
        id: c.id,
        campaign_id: campaignId,
        variant_name: c.ab_test_variant || 'Original',
        subject_line: c.subject_line,
        preview_text: c.preview_text,
        html_content: c.html_content,
        traffic_percentage: c.ab_test_traffic_percentage || 100,
        is_winner: false,
        stats: {
          sent: c.total_sent || 0,
          opened: c.total_opened || 0,
          clicked: c.total_clicked || 0,
          open_rate: c.total_delivered > 0 ? ((c.total_opened || 0) / c.total_delivered) * 100 : 0,
          click_rate: c.total_opened > 0 ? ((c.total_clicked || 0) / c.total_opened) * 100 : 0,
        },
      }));
    },
    enabled: !!campaignId && (options?.enabled !== false),
  });
}

/**
 * Hook to create A/B test variant
 */
export function useCreateABTestVariant() {
  const {  user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      baseCampaignId,
      variantName,
      subjectLine,
      previewText,
      htmlContent,
      trafficPercentage,
    }: {
      baseCampaignId: string;
      variantName: string;
      subjectLine: string;
      previewText?: string;
      htmlContent?: string;
      trafficPercentage: number;
    }): Promise<MarketingCampaign> => {
            // Get the base campaign
      const { data: baseCampaign, error: fetchError } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('id', baseCampaignId)
        .single();

      if (fetchError) throw fetchError;

      // Enable A/B testing on base campaign if not already
      if (!baseCampaign.ab_test_enabled) {
        await supabase
          .from('email_campaigns')
          .update({
            ab_test_enabled: true,
            ab_test_variant: 'A',
            ab_test_traffic_percentage: 100 - trafficPercentage,
          })
          .eq('id', baseCampaignId)
          ;
      }

      // Create variant
      const { data, error } = await supabase
        .from('email_campaigns')
        .insert({
          company_id: baseCampaign.company_id,
          campaign_name: `${baseCampaign.campaign_name} - Variant ${variantName}`,
          campaign_description: baseCampaign.campaign_description,
          campaign_type: baseCampaign.campaign_type,
          trigger_type: baseCampaign.trigger_type,
          trigger_conditions: baseCampaign.trigger_conditions,
          trigger_event: baseCampaign.trigger_event,
          subject_line: subjectLine,
          preview_text: previewText || baseCampaign.preview_text,
          from_name: baseCampaign.from_name,
          from_email: baseCampaign.from_email,
          reply_to: baseCampaign.reply_to,
          html_content: htmlContent || baseCampaign.html_content,
          text_content: baseCampaign.text_content,
          template_id: baseCampaign.template_id,
          template_variables: baseCampaign.template_variables,
          send_delay_minutes: baseCampaign.send_delay_minutes,
          send_at_time: baseCampaign.send_at_time,
          send_on_days: baseCampaign.send_on_days,
          sequence_name: baseCampaign.sequence_name,
          sequence_order: baseCampaign.sequence_order,
          ab_test_enabled: true,
          ab_test_variant: variantName,
          ab_test_traffic_percentage: trafficPercentage,
          is_active: baseCampaign.is_active,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MarketingCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-ab-tests'] });
    },
  });
}

/**
 * Hook to get unsubscribe statistics
 */
export function useUnsubscribeStats(options?: { enabled?: boolean }) {
    return useQuery({
    queryKey: ['unsubscribe-stats'],
    queryFn: async () => {
            const { data, error } = await supabase
        .from('email_unsubscribes')
        .select('reason, unsubscribe_type, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const byReason: Record<string, number> = {};
      const byType: Record<string, number> = {};

      for (const unsub of data || []) {
        const reason = unsub.reason || 'unknown';
        const type = unsub.unsubscribe_type || 'all';
        byReason[reason] = (byReason[reason] || 0) + 1;
        byType[type] = (byType[type] || 0) + 1;
      }

      return {
        total: data?.length || 0,
        by_reason: byReason,
        by_type: byType,
      };
    },
    enabled: (options?.enabled !== false),
  });
}

// Constants
export const CAMPAIGN_TYPES: Array<{ value: CampaignType; label: string; description: string }> = [
  { value: 'onboarding', label: 'Onboarding', description: 'Welcome and setup emails' },
  { value: 'trial_nurture', label: 'Trial Nurture', description: 'Convert trial users' },
  { value: 'promotional', label: 'Promotional', description: 'Sales and promotions' },
  { value: 'transactional', label: 'Transactional', description: 'Order confirmations, receipts' },
  { value: 'reengagement', label: 'Re-engagement', description: 'Win back inactive users' },
  { value: 'newsletter', label: 'Newsletter', description: 'Regular updates and content' },
  { value: 'announcement', label: 'Announcement', description: 'Product updates, news' },
  { value: 'drip_sequence', label: 'Drip Sequence', description: 'Automated email series' },
];

export const TRIGGER_TYPES: Array<{ value: TriggerType; label: string; description: string }> = [
  { value: 'manual', label: 'Manual', description: 'Send on demand' },
  { value: 'scheduled', label: 'Scheduled', description: 'Send at specific time' },
  { value: 'behavioral', label: 'Behavioral', description: 'Triggered by user actions' },
  { value: 'lifecycle', label: 'Lifecycle', description: 'Based on user journey stage' },
  { value: 'event_based', label: 'Event Based', description: 'Triggered by system events' },
];

// Utility functions
export function calculateOpenRate(delivered: number, opened: number): number {
  return delivered > 0 ? (opened / delivered) * 100 : 0;
}

export function calculateClickRate(opened: number, clicked: number): number {
  return opened > 0 ? (clicked / opened) * 100 : 0;
}

export function formatCampaignStatus(campaign: MarketingCampaign): string {
  if (!campaign.is_active) return 'Paused';
  if (campaign.total_sent === 0) return 'Ready';
  return 'Active';
}

export function getCampaignHealth(performance: CampaignPerformance): 'good' | 'warning' | 'poor' {
  if (performance.bounce_rate > 5 || performance.unsubscribe_rate > 2) return 'poor';
  if (performance.open_rate < 10 || performance.click_rate < 1) return 'warning';
  return 'good';
}
