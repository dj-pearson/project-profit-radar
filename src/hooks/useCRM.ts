/**
 * CRM Hooks - Data fetching hooks for CRM features
 *
 * These hooks ensure proper company_id filtering for all CRM operations.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

// Type aliases for database tables
type Lead = Database['public']['Tables']['leads']['Row'];
type LeadInsert = Database['public']['Tables']['leads']['Insert'];
type LeadUpdate = Database['public']['Tables']['leads']['Update'];

type Contact = Database['public']['Tables']['contacts']['Row'];
type ContactInsert = Database['public']['Tables']['contacts']['Insert'];
type ContactUpdate = Database['public']['Tables']['contacts']['Update'];

type Opportunity = Database['public']['Tables']['opportunities']['Row'];
type OpportunityInsert = Database['public']['Tables']['opportunities']['Insert'];
type OpportunityUpdate = Database['public']['Tables']['opportunities']['Update'];

type Deal = Database['public']['Tables']['deals']['Row'];
type DealInsert = Database['public']['Tables']['deals']['Insert'];
type DealUpdate = Database['public']['Tables']['deals']['Update'];

type EmailCampaign = Database['public']['Tables']['email_campaigns']['Row'];
type EmailCampaignInsert = Database['public']['Tables']['email_campaigns']['Insert'];
type EmailCampaignUpdate = Database['public']['Tables']['email_campaigns']['Update'];

type EmailTemplate = Database['public']['Tables']['email_templates']['Row'];
type EmailTemplateInsert = Database['public']['Tables']['email_templates']['Insert'];
type EmailTemplateUpdate = Database['public']['Tables']['email_templates']['Update'];

type WorkflowDefinition = Database['public']['Tables']['workflow_definitions']['Row'];
type WorkflowDefinitionInsert = Database['public']['Tables']['workflow_definitions']['Insert'];
type WorkflowDefinitionUpdate = Database['public']['Tables']['workflow_definitions']['Update'];

type CRMActivity = Database['public']['Tables']['crm_activities']['Row'];
type CRMActivityInsert = Database['public']['Tables']['crm_activities']['Insert'];
type CRMActivityUpdate = Database['public']['Tables']['crm_activities']['Update'];

// ============================================================================
// LEADS HOOKS
// ============================================================================

export interface LeadFilters {
  status?: string;
  priority?: string;
  lead_source?: string;
  assigned_to?: string;
  search?: string;
  lead_temperature?: string;
  tags?: string[];
}

export function useLeads(filters?: LeadFilters, options?: Omit<UseQueryOptions<Lead[], Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.lead_source) {
        query = query.eq('lead_source', filters.lead_source);
      }
      if (filters?.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }
      if (filters?.lead_temperature) {
        query = query.eq('lead_temperature', filters.lead_temperature);
      }
      if (filters?.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%`);
      }
      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: (options?.enabled !== false),
    ...options,
  });
}

export function useLead(leadId: string | undefined, options?: Omit<UseQueryOptions<Lead | null, Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      if (!leadId) throw new Error('Missing lead_id');

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!leadId && (options?.enabled !== false),
    ...options,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lead: LeadInsert) => {
      const { data, error } = await supabase
        .from('leads')
        .insert({ ...lead })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create lead: ${error.message}`);
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: LeadUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', data.id] });
      toast.success('Lead updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update lead: ${error.message}`);
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete lead: ${error.message}`);
    },
  });
}

// ============================================================================
// CONTACTS HOOKS
// ============================================================================

export interface ContactFilters {
  contact_type?: string;
  relationship_status?: string;
  assigned_to?: string;
  search?: string;
  tags?: string[];
}

export function useContacts(filters?: ContactFilters, options?: Omit<UseQueryOptions<Contact[], Error>, 'queryKey' | 'queryFn'>) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['contacts', companyId, filters],
    queryFn: async () => {
      if (!companyId) throw new Error('No company_id available');

      let query = supabase
        .from('contacts')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.contact_type) {
        query = query.eq('contact_type', filters.contact_type);
      }
      if (filters?.relationship_status) {
        query = query.eq('relationship_status', filters.relationship_status);
      }
      if (filters?.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }
      if (filters?.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%`);
      }
      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId && (options?.enabled !== false),
    ...options,
  });
}

export function useContact(contactId: string | undefined, options?: Omit<UseQueryOptions<Contact | null, Error>, 'queryKey' | 'queryFn'>) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['contact', contactId, companyId],
    queryFn: async () => {
      if (!companyId || !contactId) throw new Error('Missing required IDs');

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!companyId && !!contactId && (options?.enabled !== false),
    ...options,
  });
}

export function useCreateContact() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contact: Omit<ContactInsert, 'company_id'>) => {
      if (!companyId) throw new Error('No company_id available');

      const { data, error } = await supabase
        .from('contacts')
        .insert({ ...contact, company_id: companyId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create contact: ${error.message}`);
    },
  });
}

export function useUpdateContact() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ContactUpdate & { id: string }) => {
      if (!companyId) throw new Error('No company_id available');

      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', data.id] });
      toast.success('Contact updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update contact: ${error.message}`);
    },
  });
}

export function useDeleteContact() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      if (!companyId) throw new Error('No company_id available');

      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId)
        .eq('company_id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete contact: ${error.message}`);
    },
  });
}

// ============================================================================
// OPPORTUNITIES HOOKS
// ============================================================================

export interface OpportunityFilters {
  stage?: string;
  risk_level?: string;
  account_manager?: string;
  search?: string;
  min_value?: number;
  max_value?: number;
}

export function useOpportunities(filters?: OpportunityFilters, options?: Omit<UseQueryOptions<Opportunity[], Error>, 'queryKey' | 'queryFn'>) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['opportunities', companyId, filters],
    queryFn: async () => {
      if (!companyId) throw new Error('No company_id available');

      let query = supabase
        .from('opportunities')
        .select('*, contact:contacts(*)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.stage) {
        query = query.eq('stage', filters.stage);
      }
      if (filters?.risk_level) {
        query = query.eq('risk_level', filters.risk_level);
      }
      if (filters?.account_manager) {
        query = query.eq('account_manager', filters.account_manager);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      if (filters?.min_value !== undefined) {
        query = query.gte('estimated_value', filters.min_value);
      }
      if (filters?.max_value !== undefined) {
        query = query.lte('estimated_value', filters.max_value);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId && (options?.enabled !== false),
    ...options,
  });
}

export function useOpportunity(opportunityId: string | undefined, options?: Omit<UseQueryOptions<Opportunity | null, Error>, 'queryKey' | 'queryFn'>) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['opportunity', opportunityId, companyId],
    queryFn: async () => {
      if (!companyId || !opportunityId) throw new Error('Missing required IDs');

      const { data, error } = await supabase
        .from('opportunities')
        .select('*, contact:contacts(*)')
        .eq('id', opportunityId)
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!companyId && !!opportunityId && (options?.enabled !== false),
    ...options,
  });
}

export function useCreateOpportunity() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (opportunity: Omit<OpportunityInsert, 'company_id'>) => {
      if (!companyId) throw new Error('No company_id available');

      const { data, error } = await supabase
        .from('opportunities')
        .insert({ ...opportunity, company_id: companyId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success('Opportunity created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create opportunity: ${error.message}`);
    },
  });
}

export function useUpdateOpportunity() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: OpportunityUpdate & { id: string }) => {
      if (!companyId) throw new Error('No company_id available');

      const { data, error } = await supabase
        .from('opportunities')
        .update(updates)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['opportunity', data.id] });
      toast.success('Opportunity updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update opportunity: ${error.message}`);
    },
  });
}

export function useDeleteOpportunity() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (opportunityId: string) => {
      if (!companyId) throw new Error('No company_id available');

      const { error } = await supabase
        .from('opportunities')
        .delete()
        .eq('id', opportunityId)
        .eq('company_id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success('Opportunity deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete opportunity: ${error.message}`);
    },
  });
}

// ============================================================================
// DEALS HOOKS
// ============================================================================

export interface DealFilters {
  status?: string;
  priority?: string;
  deal_type?: string;
  sales_rep_id?: string;
  search?: string;
}

export function useDeals(filters?: DealFilters, options?: Omit<UseQueryOptions<Deal[], Error>, 'queryKey' | 'queryFn'>) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['deals', companyId, filters],
    queryFn: async () => {
      if (!companyId) throw new Error('No company_id available');

      let query = supabase
        .from('deals')
        .select('*, contact:contacts(*), primary_contact:contacts!deals_primary_contact_id_fkey(*)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.deal_type) {
        query = query.eq('deal_type', filters.deal_type);
      }
      if (filters?.sales_rep_id) {
        query = query.eq('sales_rep_id', filters.sales_rep_id);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId && (options?.enabled !== false),
    ...options,
  });
}

export function useDeal(dealId: string | undefined, options?: Omit<UseQueryOptions<Deal | null, Error>, 'queryKey' | 'queryFn'>) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['deal', dealId, companyId],
    queryFn: async () => {
      if (!companyId || !dealId) throw new Error('Missing required IDs');

      const { data, error } = await supabase
        .from('deals')
        .select('*, contact:contacts(*)')
        .eq('id', dealId)
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!companyId && !!dealId && (options?.enabled !== false),
    ...options,
  });
}

export function useCreateDeal() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deal: Omit<DealInsert, 'company_id'>) => {
      if (!companyId) throw new Error('No company_id available');

      const { data, error } = await supabase
        .from('deals')
        .insert({ ...deal, company_id: companyId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast.success('Deal created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create deal: ${error.message}`);
    },
  });
}

export function useUpdateDeal() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: DealUpdate & { id: string }) => {
      if (!companyId) throw new Error('No company_id available');

      const { data, error } = await supabase
        .from('deals')
        .update(updates)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deal', data.id] });
      toast.success('Deal updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update deal: ${error.message}`);
    },
  });
}

export function useDeleteDeal() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dealId: string) => {
      if (!companyId) throw new Error('No company_id available');

      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', dealId)
        .eq('company_id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast.success('Deal deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete deal: ${error.message}`);
    },
  });
}

// ============================================================================
// EMAIL CAMPAIGNS HOOKS
// ============================================================================

export interface CampaignFilters {
  campaign_type?: string;
  is_active?: boolean;
  trigger_type?: string;
  search?: string;
}

export function useEmailCampaigns(filters?: CampaignFilters, options?: Omit<UseQueryOptions<EmailCampaign[], Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: ['email_campaigns', filters],
    queryFn: async () => {
      let query = supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.campaign_type) {
        query = query.eq('campaign_type', filters.campaign_type);
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      if (filters?.trigger_type) {
        query = query.eq('trigger_type', filters.trigger_type);
      }
      if (filters?.search) {
        query = query.or(`campaign_name.ilike.%${filters.search}%,subject_line.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: (options?.enabled !== false),
    ...options,
  });
}

export function useEmailCampaign(campaignId: string | undefined, options?: Omit<UseQueryOptions<EmailCampaign | null, Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: ['email_campaign', campaignId],
    queryFn: async () => {
      if (!campaignId) throw new Error('Missing campaign_id');

      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!campaignId && (options?.enabled !== false),
    ...options,
  });
}

export function useCreateEmailCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaign: EmailCampaignInsert) => {
      const { data, error } = await supabase
        .from('email_campaigns')
        .insert({ ...campaign })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_campaigns'] });
      toast.success('Email campaign created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create email campaign: ${error.message}`);
    },
  });
}

export function useUpdateEmailCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: EmailCampaignUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('email_campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email_campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['email_campaign', data.id] });
      toast.success('Email campaign updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update email campaign: ${error.message}`);
    },
  });
}

export function useDeleteEmailCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from('email_campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_campaigns'] });
      toast.success('Email campaign deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete email campaign: ${error.message}`);
    },
  });
}

// ============================================================================
// EMAIL TEMPLATES HOOKS
// ============================================================================

export interface TemplateFilters {
  template_type?: string;
  category?: string;
  is_system_template?: boolean;
  search?: string;
}

export function useEmailTemplates(filters?: TemplateFilters, options?: Omit<UseQueryOptions<EmailTemplate[], Error>, 'queryKey' | 'queryFn'>) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['email_templates', companyId, filters],
    queryFn: async () => {
      if (!companyId) throw new Error('No company_id available');

      let query = supabase
        .from('email_templates')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.template_type) {
        query = query.eq('template_type', filters.template_type);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.is_system_template !== undefined) {
        query = query.eq('is_system_template', filters.is_system_template);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,subject.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId && (options?.enabled !== false),
    ...options,
  });
}

export function useCreateEmailTemplate() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Omit<EmailTemplateInsert, 'company_id'>) => {
      if (!companyId) throw new Error('No company_id available');

      const { data, error } = await supabase
        .from('email_templates')
        .insert({ ...template, company_id: companyId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_templates'] });
      toast.success('Email template created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create email template: ${error.message}`);
    },
  });
}

export function useUpdateEmailTemplate() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: EmailTemplateUpdate & { id: string }) => {
      if (!companyId) throw new Error('No company_id available');

      const { data, error } = await supabase
        .from('email_templates')
        .update(updates)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_templates'] });
      toast.success('Email template updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update email template: ${error.message}`);
    },
  });
}

export function useDeleteEmailTemplate() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      if (!companyId) throw new Error('No company_id available');

      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId)
        .eq('company_id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_templates'] });
      toast.success('Email template deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete email template: ${error.message}`);
    },
  });
}

// ============================================================================
// WORKFLOW DEFINITIONS HOOKS
// ============================================================================

export interface WorkflowFilters {
  trigger_type?: string;
  is_active?: boolean;
  search?: string;
}

export function useWorkflowDefinitions(filters?: WorkflowFilters, options?: Omit<UseQueryOptions<WorkflowDefinition[], Error>, 'queryKey' | 'queryFn'>) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['workflow_definitions', companyId, filters],
    queryFn: async () => {
      if (!companyId) throw new Error('No company_id available');

      let query = supabase
        .from('workflow_definitions')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.trigger_type) {
        query = query.eq('trigger_type', filters.trigger_type);
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId && (options?.enabled !== false),
    ...options,
  });
}

export function useWorkflowDefinition(workflowId: string | undefined, options?: Omit<UseQueryOptions<WorkflowDefinition | null, Error>, 'queryKey' | 'queryFn'>) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['workflow_definition', workflowId, companyId],
    queryFn: async () => {
      if (!companyId || !workflowId) throw new Error('Missing required IDs');

      const { data, error } = await supabase
        .from('workflow_definitions')
        .select('*')
        .eq('id', workflowId)
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!companyId && !!workflowId && (options?.enabled !== false),
    ...options,
  });
}

export function useCreateWorkflowDefinition() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workflow: Omit<WorkflowDefinitionInsert, 'company_id'>) => {
      if (!companyId) throw new Error('No company_id available');

      const { data, error } = await supabase
        .from('workflow_definitions')
        .insert({ ...workflow, company_id: companyId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow_definitions'] });
      toast.success('Workflow created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create workflow: ${error.message}`);
    },
  });
}

export function useUpdateWorkflowDefinition() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: WorkflowDefinitionUpdate & { id: string }) => {
      if (!companyId) throw new Error('No company_id available');

      const { data, error } = await supabase
        .from('workflow_definitions')
        .update(updates)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflow_definitions'] });
      queryClient.invalidateQueries({ queryKey: ['workflow_definition', data.id] });
      toast.success('Workflow updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update workflow: ${error.message}`);
    },
  });
}

export function useDeleteWorkflowDefinition() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workflowId: string) => {
      if (!companyId) throw new Error('No company_id available');

      const { error } = await supabase
        .from('workflow_definitions')
        .delete()
        .eq('id', workflowId)
        .eq('company_id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow_definitions'] });
      toast.success('Workflow deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete workflow: ${error.message}`);
    },
  });
}

// ============================================================================
// CRM ACTIVITIES HOOKS
// ============================================================================

export interface ActivityFilters {
  activity_type?: string;
  lead_id?: string;
  opportunity_id?: string;
  start_date?: string;
  end_date?: string;
}

export function useCRMActivities(filters?: ActivityFilters, options?: Omit<UseQueryOptions<CRMActivity[], Error>, 'queryKey' | 'queryFn'>) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['crm_activities', companyId, filters],
    queryFn: async () => {
      if (!companyId) throw new Error('No company_id available');

      let query = supabase
        .from('crm_activities')
        .select('*, lead:leads(*)')
        .eq('company_id', companyId)
        .order('activity_date', { ascending: false });

      if (filters?.activity_type) {
        query = query.eq('activity_type', filters.activity_type);
      }
      if (filters?.lead_id) {
        query = query.eq('lead_id', filters.lead_id);
      }
      if (filters?.opportunity_id) {
        query = query.eq('opportunity_id', filters.opportunity_id);
      }
      if (filters?.start_date) {
        query = query.gte('activity_date', filters.start_date);
      }
      if (filters?.end_date) {
        query = query.lte('activity_date', filters.end_date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId && (options?.enabled !== false),
    ...options,
  });
}

export function useCreateCRMActivity() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activity: Omit<CRMActivityInsert, 'company_id'>) => {
      if (!companyId) throw new Error('No company_id available');

      const { data, error } = await supabase
        .from('crm_activities')
        .insert({ ...activity, company_id: companyId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_activities'] });
      toast.success('Activity logged successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to log activity: ${error.message}`);
    },
  });
}

export function useUpdateCRMActivity() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: CRMActivityUpdate & { id: string }) => {
      if (!companyId) throw new Error('No company_id available');

      const { data, error } = await supabase
        .from('crm_activities')
        .update(updates)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_activities'] });
      toast.success('Activity updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update activity: ${error.message}`);
    },
  });
}

export function useDeleteCRMActivity() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activityId: string) => {
      if (!companyId) throw new Error('No company_id available');

      const { error } = await supabase
        .from('crm_activities')
        .delete()
        .eq('id', activityId)
        .eq('company_id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_activities'] });
      toast.success('Activity deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete activity: ${error.message}`);
    },
  });
}

// ============================================================================
// PIPELINE STATS AND ANALYTICS HOOKS
// ============================================================================

export interface PipelineStats {
  totalLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  totalOpportunities: number;
  totalValue: number;
  avgDealSize: number;
  conversionRate: number;
  byStage: Record<string, { count: number; value: number }>;
  bySource: Record<string, { count: number; converted: number }>;
}

export function usePipelineStats(options?: Omit<UseQueryOptions<PipelineStats, Error>, 'queryKey' | 'queryFn'>) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['pipeline_stats', companyId],
    queryFn: async (): Promise<PipelineStats> => {
      if (!companyId) throw new Error('No company_id available');

      // Fetch leads
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id, status, lead_source, converted_at');

      if (leadsError) throw leadsError;

      // Fetch opportunities
      const { data: opportunities, error: oppsError } = await supabase
        .from('opportunities')
        .select('id, stage, estimated_value')
        .eq('company_id', companyId);

      if (oppsError) throw oppsError;

      // Calculate stats
      const totalLeads = leads?.length || 0;
      const qualifiedLeads = leads?.filter(l => l.status === 'qualified').length || 0;
      const convertedLeads = leads?.filter(l => l.converted_at).length || 0;
      const totalOpportunities = opportunities?.length || 0;
      const totalValue = opportunities?.reduce((sum, o) => sum + (o.estimated_value || 0), 0) || 0;
      const avgDealSize = totalOpportunities > 0 ? totalValue / totalOpportunities : 0;
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

      // Group by stage
      const byStage: Record<string, { count: number; value: number }> = {};
      opportunities?.forEach(opp => {
        if (!byStage[opp.stage]) {
          byStage[opp.stage] = { count: 0, value: 0 };
        }
        byStage[opp.stage].count++;
        byStage[opp.stage].value += opp.estimated_value || 0;
      });

      // Group by source
      const bySource: Record<string, { count: number; converted: number }> = {};
      leads?.forEach(lead => {
        const source = lead.lead_source || 'Unknown';
        if (!bySource[source]) {
          bySource[source] = { count: 0, converted: 0 };
        }
        bySource[source].count++;
        if (lead.converted_at) {
          bySource[source].converted++;
        }
      });

      return {
        totalLeads,
        qualifiedLeads,
        convertedLeads,
        totalOpportunities,
        totalValue,
        avgDealSize,
        conversionRate,
        byStage,
        bySource,
      };
    },
    enabled: !!companyId && (options?.enabled !== false),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// ============================================================================
// LEAD SCORING HOOK (AI-powered)
// ============================================================================

export interface LeadScore {
  overall_score: number;
  demographic_score: number;
  behavioral_score: number;
  engagement_score: number;
  fit_score: number;
  intent_score: number;
  timing_score: number;
  confidence: number;
  conversion_probability: number;
  estimated_deal_size: number;
  estimated_close_time_days: number;
  insights: string[];
  risk_factors: string[];
  next_best_actions: string[];
}

export function useLeadScore(leadId: string | undefined, options?: Omit<UseQueryOptions<LeadScore | null, Error>, 'queryKey' | 'queryFn'>) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['lead_score', leadId],
    queryFn: async (): Promise<LeadScore | null> => {
      // Call the AI lead scoring edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-lead-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ lead_id: leadId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to calculate lead score');
      }

      return response.json();
    },
    enabled: !!leadId && !!session?.access_token && (options?.enabled !== false),
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

// ============================================================================
// CONVERT LEAD TO OPPORTUNITY
// ============================================================================

export function useConvertLeadToOpportunity() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      opportunityData
    }: {
      leadId: string;
      opportunityData: Partial<OpportunityInsert>;
    }) => {
      if (!companyId) throw new Error('No company_id available');

      // Get the lead data
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (leadError) throw leadError;

      // Create the opportunity
      const { data: opportunity, error: oppError } = await supabase
        .from('opportunities')
        .insert({
          name: opportunityData.name || `${lead.company_name || lead.first_name} - Opportunity`,
          description: opportunityData.description || lead.notes,
          estimated_value: opportunityData.estimated_value || lead.estimated_budget || 0,
          probability_percent: opportunityData.probability_percent || 20,
          stage: opportunityData.stage || 'qualification',
          risk_level: opportunityData.risk_level || 'medium',
          lead_id: leadId,
          company_id: companyId,
          ...opportunityData,
        })
        .select()
        .single();

      if (oppError) throw oppError;

      // Update the lead status
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          status: 'converted',
          converted_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (updateError) throw updateError;

      return opportunity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline_stats'] });
      toast.success('Lead converted to opportunity successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to convert lead: ${error.message}`);
    },
  });
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export function useBulkUpdateLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadIds,
      updates
    }: {
      leadIds: string[];
      updates: Partial<LeadUpdate>;
    }) => {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .in('id', leadIds)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(`${data.length} leads updated successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update leads: ${error.message}`);
    },
  });
}

export function useBulkDeleteLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadIds: string[]) => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', leadIds);

      if (error) throw error;
      return leadIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(`${count} leads deleted successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete leads: ${error.message}`);
    },
  });
}

// ============================================================================
// CONTACT BULK OPERATIONS
// ============================================================================

export function useBulkUpdateContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactIds, updates }: { contactIds: string[]; updates: Partial<ContactUpdate> }) => {
      const { data, error } = await supabase
        .from('contacts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .in('id', contactIds)
        .select();

      if (error) throw error;
      return data || [];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success(`${data.length} contacts updated successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update contacts: ${error.message}`);
    },
  });
}

export function useBulkDeleteContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactIds: string[]) => {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .in('id', contactIds);

      if (error) throw error;
      return contactIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success(`${count} contacts deleted successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete contacts: ${error.message}`);
    },
  });
}

export function useMergeContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ primaryId, secondaryIds }: { primaryId: string; secondaryIds: string[] }) => {
      // Get primary contact
      const { data: primary, error: primaryError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', primaryId)
        .single();

      if (primaryError) throw primaryError;

      // Get secondary contacts
      const { data: secondaries, error: secondariesError } = await supabase
        .from('contacts')
        .select('*')
        .in('id', secondaryIds);

      if (secondariesError) throw secondariesError;

      // Merge data - prefer primary, fill gaps from secondaries
      const mergedData: Partial<ContactUpdate> = {
        phone: primary.phone || secondaries?.find(s => s.phone)?.phone,
        mobile: primary.mobile || secondaries?.find(s => s.mobile)?.mobile,
        address: primary.address || secondaries?.find(s => s.address)?.address,
        notes: [primary.notes, ...secondaries.map(s => s.notes)].filter(Boolean).join('\n---\n'),
      };

      // Update primary with merged data
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ ...mergedData, updated_at: new Date().toISOString() })
        .eq('id', primaryId);

      if (updateError) throw updateError;

      // Reassign related records to primary contact
      await supabase
        .from('crm_activities')
        .update({ contact_id: primaryId })
        .in('contact_id', secondaryIds);

      // Delete secondary contacts
      const { error: deleteError } = await supabase
        .from('contacts')
        .delete()
        .in('id', secondaryIds);

      if (deleteError) throw deleteError;

      return { primaryId, mergedCount: secondaryIds.length };
    },
    onSuccess: ({ mergedCount }) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['crm-activities'] });
      toast.success(`Merged ${mergedCount + 1} contacts successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to merge contacts: ${error.message}`);
    },
  });
}

// ============================================================================
// OPPORTUNITY BULK OPERATIONS
// ============================================================================

export function useBulkUpdateOpportunities() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityIds, updates }: { opportunityIds: string[]; updates: Partial<OpportunityUpdate> }) => {
      const { data, error } = await supabase
        .from('opportunities')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .in('id', opportunityIds)
        .select();

      if (error) throw error;
      return data || [];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success(`${data.length} opportunities updated successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update opportunities: ${error.message}`);
    },
  });
}

export function useBulkDeleteOpportunities() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (opportunityIds: string[]) => {
      const { error } = await supabase
        .from('opportunities')
        .delete()
        .in('id', opportunityIds);

      if (error) throw error;
      return opportunityIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success(`${count} opportunities deleted successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete opportunities: ${error.message}`);
    },
  });
}

export function useConvertOpportunityToDeal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (opportunityId: string) => {
      // Get the opportunity
      const { data: opportunity, error: fetchError } = await supabase
        .from('opportunities')
        .select('*')
        .eq('id', opportunityId)
        .single();

      if (fetchError) throw fetchError;

      // Create a deal from the opportunity
      const { data: deal, error: createError } = await supabase
        .from('deals')
        .insert({
          company_id: opportunity.company_id,
          opportunity_id: opportunityId,
          contact_id: opportunity.contact_id,
          lead_id: opportunity.lead_id,
          deal_name: opportunity.name,
          deal_value: opportunity.value,
          stage: 'negotiation',
          probability: opportunity.probability || 75,
          expected_close_date: opportunity.expected_close_date,
          notes: opportunity.notes,
          created_by: user?.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Update opportunity status
      await supabase
        .from('opportunities')
        .update({
          stage: 'closed_won',
          updated_at: new Date().toISOString(),
        })
        .eq('id', opportunityId);

      return deal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast.success('Opportunity converted to deal successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to convert opportunity: ${error.message}`);
    },
  });
}

// ============================================================================
// DEAL BULK OPERATIONS
// ============================================================================

export function useBulkUpdateDeals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dealIds, updates }: { dealIds: string[]; updates: Partial<DealUpdate> }) => {
      const { data, error } = await supabase
        .from('deals')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .in('id', dealIds)
        .select();

      if (error) throw error;
      return data || [];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast.success(`${data.length} deals updated successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update deals: ${error.message}`);
    },
  });
}

export function useBulkDeleteDeals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dealIds: string[]) => {
      const { error } = await supabase
        .from('deals')
        .delete()
        .in('id', dealIds);

      if (error) throw error;
      return dealIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast.success(`${count} deals deleted successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete deals: ${error.message}`);
    },
  });
}

// ============================================================================
// CRM SEARCH HOOKS
// ============================================================================

export interface GlobalSearchResult {
  type: 'lead' | 'contact' | 'opportunity' | 'deal';
  id: string;
  title: string;
  subtitle?: string;
  score?: number;
}

export function useCRMGlobalSearch(query: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['crm_global_search', query],
    queryFn: async (): Promise<GlobalSearchResult[]> => {
      if (!query || query.length < 2) return [];

      const searchPattern = `%${query}%`;
      const results: GlobalSearchResult[] = [];

      // Search leads
      const { data: leads } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email, company_name')
        .or(`first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},email.ilike.${searchPattern},company_name.ilike.${searchPattern}`)
        .limit(10);

      for (const lead of leads || []) {
        results.push({
          type: 'lead',
          id: lead.id,
          title: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || lead.email || 'Unknown',
          subtitle: lead.company_name,
        });
      }

      // Search contacts
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, company')
        .or(`first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},email.ilike.${searchPattern},company.ilike.${searchPattern}`)
        .limit(10);

      for (const contact of contacts || []) {
        results.push({
          type: 'contact',
          id: contact.id,
          title: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email || 'Unknown',
          subtitle: contact.company,
        });
      }

      // Search opportunities
      const { data: opportunities } = await supabase
        .from('opportunities')
        .select('id, name, value')
        .ilike('name', searchPattern)
        .limit(10);

      for (const opp of opportunities || []) {
        results.push({
          type: 'opportunity',
          id: opp.id,
          title: opp.name,
          subtitle: opp.value ? `$${opp.value.toLocaleString()}` : undefined,
        });
      }

      // Search deals
      const { data: deals } = await supabase
        .from('deals')
        .select('id, deal_name, deal_value')
        .ilike('deal_name', searchPattern)
        .limit(10);

      for (const deal of deals || []) {
        results.push({
          type: 'deal',
          id: deal.id,
          title: deal.deal_name,
          subtitle: deal.deal_value ? `$${deal.deal_value.toLocaleString()}` : undefined,
        });
      }

      return results;
    },
    enabled: !!query && query.length >= 2 && (options?.enabled !== false),
  });
}

// ============================================================================
// CRM DASHBOARD STATS
// ============================================================================

export function useCRMDashboardStats(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['crm-dashboard-stats'],
    queryFn: async () => {
      // Get counts in parallel
      const [
        { count: leadCount },
        { count: contactCount },
        { count: opportunityCount },
        { count: dealCount },
        { data: recentLeads },
        { data: recentActivities },
        { data: opportunityValues },
        { data: dealValues },
      ] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('contacts').select('*', { count: 'exact', head: true }),
        supabase.from('opportunities').select('*', { count: 'exact', head: true }),
        supabase.from('deals').select('*', { count: 'exact', head: true }),
        supabase.from('leads').select('id, created_at').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('crm_activities').select('id, created_at').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('opportunities').select('value').not('value', 'is', null),
        supabase.from('deals').select('deal_value').not('deal_value', 'is', null),
      ]);

      const totalOpportunityValue = opportunityValues?.reduce((sum, o) => sum + (o.value || 0), 0) || 0;
      const totalDealValue = dealValues?.reduce((sum, d) => sum + (d.deal_value || 0), 0) || 0;

      return {
        total_leads: leadCount || 0,
        total_contacts: contactCount || 0,
        total_opportunities: opportunityCount || 0,
        total_deals: dealCount || 0,
        leads_this_week: recentLeads?.length || 0,
        activities_this_week: recentActivities?.length || 0,
        total_opportunity_value: totalOpportunityValue,
        total_deal_value: totalDealValue,
        pipeline_value: totalOpportunityValue + totalDealValue,
      };
    },
    enabled: (options?.enabled !== false),
  });
}
